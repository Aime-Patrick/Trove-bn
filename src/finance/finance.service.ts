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
    return contribution.save();
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
    return contribution.save();
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
    await payout.save();

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
