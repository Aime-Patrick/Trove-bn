import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lottery, LotteryStatus } from '../schemas/lottery.schema';
import { GroupsService } from '../groups/groups.service';
import { LotteryGateway } from './lottery.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { extractUserId, extractUserName } from '../common/utils/member.util';

@Injectable()
export class LotteryService {
  private readonly logger = new Logger(LotteryService.name);

  private activePracticeSessions = new Map<string, any>();

  constructor(
    @InjectModel(Lottery.name) private lotteryModel: Model<Lottery>,
    private groupsService: GroupsService,
    private lotteryGateway: LotteryGateway,
    private notificationsService: NotificationsService,
  ) {}

  async confirmReadiness(userId: string, groupId: string): Promise<Lottery> {
    let lottery = await this.lotteryModel.findOne({
      groupId,
      status: LotteryStatus.CONFIRMING,
    });

    // Fetch group and user for notification context
    const group = await this.groupsService.findById(groupId);
    const members = await this.groupsService.getGroupMembers(groupId);
    const membersArray = Array.isArray(members) ? members : members.data;
    const joiningUser = membersArray.find((m) => extractUserId(m) === userId);
    const joiningUserName = joiningUser
      ? extractUserName(joiningUser)
      : 'A member';

    if (!lottery) {
      // Create new lottery round if not exists
      lottery = new this.lotteryModel({
        groupId,
        round: group.currentRound,
        status: LotteryStatus.CONFIRMING,
        confirmedMembers: [],
      });

      // Notify all members that a new lottery round is open for participation
      for (const member of membersArray) {
        const memberId = extractUserId(member);
        if (memberId) {
          await this.notificationsService.create(
            memberId,
            'Lottery Open! 🎡',
            `A new lottery round for "${group.name}" is now open. Join now to participate!`,
            'lottery_open',
            groupId,
            'trove://lottery',
          );
        }
      }
    }

    if (!lottery.confirmedMembers.includes(userId)) {
      lottery.confirmedMembers.push(userId);
      await lottery.save();

      // Notify everyone about the new confirmation
      this.lotteryGateway.broadcastLotteryUpdate(groupId, lottery);

      // Send push notifications to other members
      for (const member of membersArray) {
        const memberId = extractUserId(member);
        if (memberId && memberId !== userId) {
          await this.notificationsService.create(
            memberId,
            'Lottery Update 🎡',
            `${joiningUserName} just joined the lottery round!`,
            'lottery_join',
            groupId,
            'trove://lottery',
          );
        }
      }
    }

    return lottery;
  }

  async startSelection(groupId: string): Promise<Lottery> {
    const lottery = await this.lotteryModel.findOne({
      groupId,
      status: LotteryStatus.CONFIRMING,
    });
    const group = await this.groupsService.findById(groupId);
    if (!lottery) throw new BadRequestException('No active confirmation phase');
    if (lottery.confirmedMembers.length === 0)
      throw new BadRequestException('No members confirmed');

    // Determine the full sequence immediately
    const members = await this.groupsService.getGroupMembers(groupId);
    const membersArray = Array.isArray(members) ? members : members.data;
    const pool: string[] = [];
    for (const userId of lottery.confirmedMembers) {
      const member = membersArray.find((m) => extractUserId(m) === userId);
      const slots = member?.slots || 1;
      for (let i = 0; i < slots; i++) {
        pool.push(userId);
      }
    }
    const shuffled = pool.sort(() => Math.random() - 0.5);

    // Update status to SPINNING and save immediately
    lottery.status = LotteryStatus.SPINNING;
    lottery.payoutOrder = []; // Keep it empty during spinning for suspense
    await lottery.save();

    // Notify all members that selection is starting (non-blocking)
    membersArray.forEach((member) => {
      const memberId = extractUserId(member);
      if (memberId) {
        this.notificationsService.create(
          memberId,
          'Selection Starting! 🎰',
          `The lottery selection for "${group.name}" is starting now. Watch the results live!`,
          'lottery_start',
          groupId,
          'trove://lottery',
        ).catch(err => this.logger.error(`Failed to send selection notification to ${memberId}:`, err));
      }
    });

    // Broadcast "SPINNING" status to all clients
    this.lotteryGateway.broadcastLotteryUpdate(groupId, lottery);

    // Trigger completion in the background (non-blocking)
    this.completeSelection(groupId, (lottery._id as any).toString(), shuffled, membersArray).catch(
      (err) =>
        this.logger.error(
          `Background completion failed for group ${groupId}:`,
          err,
        ),
    );

    // Return immediately to avoid 503 timeouts
    return lottery;
  }

  private async completeSelection(
    groupId: string,
    lotteryId: string,
    shuffled: string[],
    membersArray: any[],
  ): Promise<void> {
    try {
      // Wait for 5 seconds to allow frontend animations to play
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const lottery = await this.lotteryModel.findById(lotteryId);
      if (!lottery) {
        this.logger.error(`Lottery ${lotteryId} not found for completion`);
        return;
      }

      // Set final sequence and complete the lottery
      lottery.payoutOrder = shuffled;
      lottery.status = LotteryStatus.COMPLETED;
      // Set the first person in the sequence as the "selectedId" for UI highlights
      lottery.selectedId = shuffled[0];
      const winner = membersArray.find(
        (m) => extractUserId(m) === lottery.selectedId,
      );
      lottery.selectedName = winner ? extractUserName(winner) : 'Member';

      await lottery.save();

      // Broadcast the final "COMPLETED" status with the full sequence
      this.lotteryGateway.broadcastLotteryUpdate(groupId, lottery);
    } catch (error) {
      this.logger.error(
        `Error in background completeSelection for group ${groupId}:`,
        error,
      );
    }
  }

  async startPracticeSelection(groupId: string): Promise<void> {
    try {
      const group = await this.groupsService.findById(groupId);
      const members = await this.groupsService.getGroupMembers(groupId);
      const membersArray = Array.isArray(members) ? members : members.data;

      if (!membersArray || membersArray.length === 0) {
        this.logger.warn(
          `No members found for group ${groupId} to start practice.`,
        );
        return;
      }

      // Notify all members that practice mode is starting (non-blocking)
      membersArray.forEach((member) => {
        const memberId = extractUserId(member);
        if (memberId) {
          this.notificationsService.create(
            memberId,
            'Practice Mode Started! 🧪',
            `A practice lottery round for "${group.name}" has started. Watch how the selection works!`,
            'lottery_practice',
            groupId,
            'trove://lottery',
          ).catch(err => this.logger.error(`Failed to send practice notification to ${memberId}:`, err));
        }
      });

      // Shuffle all members for the practice round
      const pool: string[] = [];
      for (const member of membersArray) {
        const userId = extractUserId(member);
        if (userId) {
          const slots = member.slots || 1;
          for (let i = 0; i < slots; i++) {
            pool.push(userId);
          }
        }
      }
      const shuffled = pool.sort(() => Math.random() - 0.5);

      // Broadcast "SPINNING" status with practice flag
      const practiceData = {
        groupId,
        status: LotteryStatus.SPINNING,
        isPractice: true,
        payoutOrder: [],
      };
      
      this.activePracticeSessions.set(groupId, practiceData);
      this.lotteryGateway.broadcastLotteryUpdate(groupId, practiceData);

      // Trigger completion in the background (non-blocking)
      this.completePracticeSelection(
        groupId,
        shuffled,
        membersArray,
        group.currentRound,
      ).catch((err) =>
        this.logger.error(
          `Background practice completion failed for group ${groupId}:`,
          err,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error in startPracticeSelection for group ${groupId}:`,
        error,
      );
      throw error;
    }
  }

  private async completePracticeSelection(
    groupId: string,
    shuffled: string[],
    membersArray: any[],
    currentRound: number,
  ): Promise<void> {
    try {
      // Wait for 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Broadcast "PRACTICE" status with the full sequence
      const winnerId = shuffled[0];
      const winner = membersArray.find((m) => extractUserId(m) === winnerId);

      const practiceResult = {
        groupId,
        status: LotteryStatus.PRACTICE,
        isPractice: true,
        payoutOrder: shuffled,
        selectedId: winnerId,
        selectedName: winner ? extractUserName(winner) : 'Member',
        round: currentRound,
      };

      this.activePracticeSessions.set(groupId, practiceResult);
      this.lotteryGateway.broadcastLotteryUpdate(groupId, practiceResult);
    } catch (error) {
      this.logger.error(
        `Error in background completePracticeSelection for group ${groupId}:`,
        error,
      );
    }
  }

  async resetPractice(groupId: string): Promise<void> {
    // Just broadcast a reset signal to all clients in the group
    this.activePracticeSessions.delete(groupId);
    this.lotteryGateway.broadcastLotteryUpdate(groupId, {
      groupId,
      status: LotteryStatus.CONFIRMING,
      isPractice: false,
      payoutOrder: [],
      confirmedMembers: [], // This will be refreshed by clients if they are in a real round
    });
  }

  async getStatus(groupId: string): Promise<any | null> {
    // Check if there's an active practice session first
    if (this.activePracticeSessions.has(groupId)) {
      return this.activePracticeSessions.get(groupId);
    }

    return this.lotteryModel
      .findOne({ groupId })
      .sort({ createdAt: -1 })
      .exec();
  }
}
