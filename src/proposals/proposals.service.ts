import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proposal, ProposalDocument, ProposalStatus } from './schemas/proposal.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
    private notificationsService: NotificationsService,
    private groupsService: GroupsService,
  ) {}

  async create(
    groupId: string,
    proposerId: string,
    type: any,
    data: any,
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
    for (const member of members) {
      // Handle populated userId (can be an object with _id or a string)
      const memberUserId = typeof member.userId === 'object' 
        ? (member.userId as any)._id?.toString() 
        : member.userId?.toString();
      
      if (memberUserId && memberUserId !== proposerId) {
        await this.notificationsService.create(
          memberUserId,
          'New Proposal',
          `A new proposal has been created: ${description}`,
          'proposal',
          (savedProposal as any)._id.toString(),
        );
      }
    }

    return savedProposal;
  }

  async vote(proposalId: string, userId: string, vote: boolean): Promise<Proposal> {
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) throw new BadRequestException('Proposal not found');
    if (proposal.status !== ProposalStatus.PENDING) throw new BadRequestException('Proposal is closed');
    if (new Date() > proposal.expiresAt) throw new BadRequestException('Proposal has expired');

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
    const totalMembers = members.length;

    if (yes > totalMembers / 2) {
      proposal.status = ProposalStatus.APPROVED;
      // TODO: Execute the change (using a strategy pattern or switch case)
      await this.executeProposal(proposal);
    } else if (no >= totalMembers / 2) {
      proposal.status = ProposalStatus.REJECTED;
    }

    return proposal.save();
  }

  async executeProposal(proposal: Proposal) {
    // Logic to apply changes based on proposal.type and proposal.data
    // This would likely involve calling methods on GroupsService
    console.log(`Executing proposal ${(proposal as any)._id}: ${proposal.type}`);
    // Example:
    // if (proposal.type === 'UPDATE_SLOT_PRICE') {
    //   await this.groupsService.update(proposal.groupId, { slotPrice: proposal.data.amount });
    // }
  }

  async findAll(groupId: string): Promise<Proposal[]> {
    return this.proposalModel.find({ groupId }).sort({ createdAt: -1 }).exec();
  }
}
