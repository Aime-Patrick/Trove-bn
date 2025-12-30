import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Contribution,
  ContributionStatus,
} from '../schemas/contribution.schema';
import { Payout, PayoutStatus } from '../schemas/payout.schema';
import { Savings } from '../schemas/savings.schema';
import { GroupsService } from '../groups/groups.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import {
  PaginationDto,
  PaginatedResult,
  paginate,
} from '../common/dto/pagination.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Contribution.name)
    private contributionModel: Model<Contribution>,
    @InjectModel(Payout.name) private payoutModel: Model<Payout>,
    @InjectModel(Savings.name) private savingsModel: Model<Savings>,
    private groupsService: GroupsService,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {}

  async logContribution(
    userId: string,
    groupId: string,
    amount: number,
  ): Promise<Contribution> {
    const contribution = new this.contributionModel({
      userId,
      groupId,
      amount,
      status: ContributionStatus.PAID,
      paidDate: new Date(),
    });
    const savedContribution = await contribution.save();

    // Notify Admin
    const group = await this.groupsService.findById(groupId);
    const user = await this.usersService.findById(userId);
    const userName = user?.name || 'A member';

    await this.notificationsService.create(
      group.adminId,
      'Contribution Received',
      `${userName} has contributed ${amount} to "${group.name}".`,
      'contribution_received',
      groupId,
      'trove://group-details',
    );

    return savedContribution;
  }

  async recordManualContribution(
    adminId: string,
    userId: string,
    groupId: string,
    amount: number,
  ): Promise<Contribution> {
    const contribution = new this.contributionModel({
      userId,
      groupId,
      amount,
      status: ContributionStatus.PAID,
      paidDate: new Date(),
      recordedBy: adminId,
      isManual: true,
    });
    const savedContribution = await contribution.save();

    // Notify User
    const group = await this.groupsService.findById(groupId);
    await this.notificationsService.create(
      userId,
      'Contribution Recorded',
      `An admin has recorded a contribution of ${amount} for you in "${group.name}".`,
      'contribution_recorded',
      groupId,
      'trove://group-details',
    );

    return savedContribution;
  }

  async approvePayout(adminId: string, payoutId: string): Promise<Payout> {
    const payout = await this.payoutModel.findById(payoutId);
    if (!payout) throw new BadRequestException('Payout not found');
    if (payout.status === PayoutStatus.PAID)
      throw new BadRequestException('Payout already paid');

    // Get group settings for savings percentage
    const group = await this.groupsService.findById(payout.groupId);
    const savingsPercentage = group.savingsPercentage || 10; // Default to 10% if not set
    const savingsAmount = (payout.amount * savingsPercentage) / 100;
    const finalPayoutAmount = payout.amount - savingsAmount;

    payout.status = PayoutStatus.PAID;
    payout.approvedBy = adminId;
    payout.approvedAt = new Date();
    payout.paidAt = new Date();
    const savedPayout = await payout.save();

    // Log Automatic Savings
    const savings = new this.savingsModel({
      userId: payout.userId,
      groupId: payout.groupId,
      amount: savingsAmount,
      source: 'auto',
      payoutId: (payout as unknown as { _id: unknown })._id,
    });
    await savings.save();

    console.log(
      `Payout ${payoutId} approved. Savings deducted: ${savingsAmount}`,
    );

    // Notify User
    await this.notificationsService.create(
      payout.userId,
      'Payout Ready!',
      `Your support of ${finalPayoutAmount} from "${group.name}" is now available.`,
      'payout_ready',
      payout.groupId,
      'trove://finance',
    );

    // Notify Group
    const user = await this.usersService.findById(payout.userId);
    const userName = user?.name || 'A member';
    const members = await this.groupsService.getGroupMembers(payout.groupId);
    const membersArray = Array.isArray(members) ? members : members.data;

    for (const member of membersArray) {
      const memberId =
        (member.userId as unknown as { _id?: { toString: () => string } })
          ._id?.toString() ||
        (member.userId as unknown as { id?: string }).id ||
        '';
      if (memberId && memberId !== payout.userId) {
        await this.notificationsService.create(
          memberId,
          'Payout Completed',
          `${userName} has been selected for this round's payout in "${group.name}".`,
          'payout_completed',
          payout.groupId,
          'trove://finance',
        );
      }
    }

    return payout;
  }

  async recordManualPayout(
    adminId: string,
    userId: string,
    groupId: string,
    amount: number,
  ): Promise<Payout> {
    // Get group settings for savings percentage
    const group = await this.groupsService.findById(groupId);
    const savingsPercentage = group.savingsPercentage || 10; // Default to 10% if not set
    const savingsAmount = (amount * savingsPercentage) / 100;

    const payout = new this.payoutModel({
      userId,
      groupId,
      amount,
      status: PayoutStatus.PAID,
      approvedBy: adminId,
      approvedAt: new Date(),
      paidAt: new Date(),
      isManual: true,
    });
    await payout.save();

    // Log Automatic Savings
    const savings = new this.savingsModel({
      userId,
      groupId,
      amount: savingsAmount,
      source: 'auto',
      payoutId: (payout as unknown as { _id: unknown })._id,
    });
    await savings.save();

    return payout;
  }

  async getUserSavings(
    userId: string,
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<Savings> | Savings[]> {
    const query = this.savingsModel.find({ userId }).sort({ createdAt: -1 });

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        query.skip(skip).limit(limit).exec(),
        this.savingsModel.countDocuments({ userId }).exec(),
      ]);

      return paginate(data, page, limit, total);
    }

    return query.exec();
  }

  async getContributions(
    groupId: string,
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<Contribution> | Contribution[]> {
    const query = this.contributionModel
      .find({ groupId })
      .sort({ createdAt: -1 });

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        query.skip(skip).limit(limit).exec(),
        this.contributionModel.countDocuments({ groupId }).exec(),
      ]);

      return paginate(data, page, limit, total);
    }

    return query.exec();
  }

  async getPayouts(
    groupId: string,
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<Payout> | Payout[]> {
    const query = this.payoutModel.find({ groupId }).sort({ createdAt: -1 });

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        query.skip(skip).limit(limit).exec(),
        this.payoutModel.countDocuments({ groupId }).exec(),
      ]);

      return paginate(data, page, limit, total);
    }

    return query.exec();
  }
}
