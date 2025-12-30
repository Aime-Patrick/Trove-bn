import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Proposal,
  ProposalDocument,
  ProposalStatus,
  ProposalType,
} from './schemas/proposal.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { GroupsService } from '../groups/groups.service';
import {
  PaginationDto,
  PaginatedResult,
  paginate,
} from '../common/dto/pagination.dto';
import { extractUserId } from '../common/utils/member.util';

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
    private notificationsService: NotificationsService,
    private groupsService: GroupsService,
  ) {}

  async create(
    groupId: string,
    proposerId: string,
    type: ProposalType,
    data: Record<string, unknown>,
    description: string,
  ): Promise<Proposal> {
    const proposal = new this.proposalModel({
      groupId,
      proposerId,
      type,
      data,
      description,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
    });

    const savedProposal = await proposal.save();

    // Notify all group members
    const members = await this.groupsService.getGroupMembers(groupId);
    const membersArray = Array.isArray(members) ? members : members.data;
    const proposalId =
      (
        savedProposal as unknown as { _id?: { toString: () => string } }
      )._id?.toString() || '';

    for (const member of membersArray) {
      const memberUserId = extractUserId(member);
      if (memberUserId && memberUserId !== proposerId) {
        await this.notificationsService.create(
          memberUserId,
          'New Proposal',
          `A new proposal has been created: ${description}`,
          'proposal',
          proposalId,
        );
      }
    }

    return savedProposal;
  }

  async vote(
    proposalId: string,
    userId: string,
    vote: boolean,
  ): Promise<Proposal> {
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) throw new BadRequestException('Proposal not found');
    if (proposal.status !== ProposalStatus.PENDING)
      throw new BadRequestException('Proposal is closed');
    if (new Date() > proposal.expiresAt)
      throw new BadRequestException('Proposal has expired');

    // Update vote
    proposal.votes.set(userId, vote);

    // Recalculate counts
    let yes = 0;
    let no = 0;
    for (const v of proposal.votes.values()) {
      if (v) yes++;
      else no++;
    }
    proposal.yesVotes = yes;
    proposal.noVotes = no;

    // Check for consensus (simple majority for now, or unanimous?)
    // Let's say > 50% of total members need to vote YES to pass immediately?
    // Or just wait for expiry?
    // For MVP, let's auto-approve if > 50% of members vote YES
    const members = await this.groupsService.getGroupMembers(proposal.groupId);
    const membersArray = Array.isArray(members) ? members : members.data;
    const totalMembers = membersArray.length;

    if (yes > totalMembers / 2) {
      proposal.status = ProposalStatus.APPROVED;
      await this.executeProposal(proposal);

      // Notify group about approval
      for (const member of membersArray) {
        const memberUserId = extractUserId(member);
        if (memberUserId) {
          await this.notificationsService.create(
            memberUserId,
            'Proposal Passed!',
            `The proposal "${proposal.description}" has been approved by the group.`,
            'proposal_approved',
            proposal.groupId,
            'trove://proposals',
          );
        }
      }
    } else if (no >= totalMembers / 2) {
      proposal.status = ProposalStatus.REJECTED;

      // Notify group about rejection
      for (const member of membersArray) {
        const memberUserId = extractUserId(member);
        if (memberUserId) {
          await this.notificationsService.create(
            memberUserId,
            'Proposal Declined',
            `The proposal "${proposal.description}" did not receive enough votes.`,
            'proposal_rejected',
            proposal.groupId,
            'trove://proposals',
          );
        }
      }
    }

    return proposal.save();
  }

  async executeProposal(proposal: Proposal): Promise<void> {
    const proposalId =
      (
        proposal as unknown as { _id?: { toString: () => string } }
      )._id?.toString() || '';
    const { type, data, groupId } = proposal;

    try {
      switch (type) {
        case ProposalType.UPDATE_SLOT_PRICE:
          if (
            data?.slotPrice &&
            typeof data.slotPrice === 'number' &&
            data.slotPrice > 0
          ) {
            await this.groupsService.updateGroup(groupId, {
              slotPrice: data.slotPrice,
            });
            this.logger.log(
              `Proposal ${proposalId}: Updated slot price to ${data.slotPrice}`,
            );
          } else {
            throw new BadRequestException(
              'Invalid slot price value in proposal data',
            );
          }
          break;

        case ProposalType.UPDATE_PAYOUT_FREQUENCY:
          if (
            data?.payoutFrequency &&
            typeof data.payoutFrequency === 'number' &&
            data.payoutFrequency > 0
          ) {
            await this.groupsService.updateGroup(groupId, {
              payoutFrequency: data.payoutFrequency,
            });
            this.logger.log(
              `Proposal ${proposalId}: Updated payout frequency to ${data.payoutFrequency}`,
            );
          } else {
            throw new BadRequestException(
              'Invalid payout frequency value in proposal data',
            );
          }
          break;

        case ProposalType.UPDATE_SAVINGS_PERCENTAGE:
          if (
            data?.savingsPercentage &&
            typeof data.savingsPercentage === 'number' &&
            data.savingsPercentage >= 0 &&
            data.savingsPercentage <= 100
          ) {
            await this.groupsService.updateGroup(groupId, {
              savingsPercentage: data.savingsPercentage,
            });
            this.logger.log(
              `Proposal ${proposalId}: Updated savings percentage to ${data.savingsPercentage}%`,
            );
          } else {
            throw new BadRequestException(
              'Invalid savings percentage value in proposal data (must be 0-100)',
            );
          }
          break;

        case ProposalType.OTHER:
          // For other types, just log - no automatic execution
          this.logger.log(
            `Proposal ${proposalId}: Type 'OTHER' - manual execution required`,
          );
          break;

        default:
          throw new BadRequestException(`Unknown proposal type: ${type}`);
      }
    } catch (error) {
      this.logger.error(`Error executing proposal ${proposalId}:`, error);
      throw error;
    }
  }

  async findAll(
    groupId: string,
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<Proposal> | Proposal[]> {
    const query = this.proposalModel.find({ groupId }).sort({ createdAt: -1 });

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        query.skip(skip).limit(limit).exec(),
        this.proposalModel.countDocuments({ groupId }).exec(),
      ]);

      return paginate(data, page, limit, total);
    }

    return query.exec();
  }
}
