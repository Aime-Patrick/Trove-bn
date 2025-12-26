import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contribution, ContributionStatus } from '../schemas/contribution.schema';
import { Payout, PayoutStatus } from '../schemas/payout.schema';
import { Savings } from '../schemas/savings.schema';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Contribution.name) private contributionModel: Model<Contribution>,
    @InjectModel(Payout.name) private payoutModel: Model<Payout>,
    @InjectModel(Savings.name) private savingsModel: Model<Savings>,
    private groupsService: GroupsService,
  ) {}

  async logContribution(userId: string, groupId: string, amount: number): Promise<Contribution> {
    const contribution = new this.contributionModel({
      userId,
      groupId,
      amount,
      status: ContributionStatus.PAID,
      paidDate: new Date(),
    });
    return contribution.save();
  }

  async recordManualContribution(adminId: string, userId: string, groupId: string, amount: number): Promise<Contribution> {
    const contribution = new this.contributionModel({
      userId,
      groupId,
      amount,
      status: ContributionStatus.PAID,
      paidDate: new Date(),
      recordedBy: adminId,
      isManual: true,
    });
    return contribution.save();
  }

  async approvePayout(adminId: string, payoutId: string): Promise<Payout> {
    const payout = await this.payoutModel.findById(payoutId);
    if (!payout) throw new BadRequestException('Payout not found');
    if (payout.status === PayoutStatus.PAID) throw new BadRequestException('Payout already paid');

    // Get group settings for savings percentage
    // For MVP, we'll assume a fixed 10% if not found
    const savingsAmount = payout.amount * 0.1;
    const finalPayoutAmount = payout.amount - savingsAmount;

    payout.status = PayoutStatus.PAID;
    payout.approvedBy = adminId;
    payout.approvedAt = new Date();
    payout.paidAt = new Date();
    await payout.save();

    // Log Automatic Savings
    const savings = new this.savingsModel({
      userId: payout.userId,
      groupId: payout.groupId,
      amount: savingsAmount,
      source: 'auto',
      payoutId: (payout as any)._id,
    });
    await savings.save();

    console.log(`Payout ${payoutId} approved. Savings deducted: ${savingsAmount}`);
    return payout;
  }

  async recordManualPayout(adminId: string, userId: string, groupId: string, amount: number): Promise<Payout> {
    // For manual payouts, we still deduct savings
    const savingsAmount = amount * 0.1;
    
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
      payoutId: (payout as any)._id,
    });
    await savings.save();

    return payout;
  }

  async getUserSavings(userId: string): Promise<Savings[]> {
    return this.savingsModel.find({ userId }).exec();
  }
  async getContributions(groupId: string): Promise<Contribution[]> {
    return this.contributionModel.find({ groupId }).sort({ createdAt: -1 }).exec();
  }

  async getPayouts(groupId: string): Promise<Payout[]> {
    return this.payoutModel.find({ groupId }).sort({ createdAt: -1 }).exec();
  }
}
