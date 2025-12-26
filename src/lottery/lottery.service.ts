import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lottery, LotteryStatus } from '../schemas/lottery.schema';
import { GroupsService } from '../groups/groups.service';
import { LotteryGateway } from './lottery.gateway';

@Injectable()
export class LotteryService {
  constructor(
    @InjectModel(Lottery.name) private lotteryModel: Model<Lottery>,
    private groupsService: GroupsService,
    private lotteryGateway: LotteryGateway,
  ) {}

  async confirmReadiness(userId: string, groupId: string): Promise<Lottery> {
    let lottery = await this.lotteryModel.findOne({ groupId, status: LotteryStatus.CONFIRMING });
    
    if (!lottery) {
      // Fetch group to get current round
      const group = await this.groupsService.findById(groupId);
      
      // Create new lottery round if not exists
      lottery = new this.lotteryModel({
        groupId,
        round: group.currentRound,
        status: LotteryStatus.CONFIRMING,
        confirmedMembers: [],
      });
    }

    if (!lottery.confirmedMembers.includes(userId)) {
      lottery.confirmedMembers.push(userId);
      await lottery.save();
      
      // Notify everyone about the new confirmation
      this.lotteryGateway.broadcastLotteryUpdate(groupId, lottery);
    }

    return lottery;
  }

  async startSelection(groupId: string): Promise<Lottery> {
    const lottery = await this.lotteryModel.findOne({ groupId, status: LotteryStatus.CONFIRMING });
    if (!lottery) throw new BadRequestException('No active confirmation phase');
    if (lottery.confirmedMembers.length === 0) throw new BadRequestException('No members confirmed');

    lottery.status = LotteryStatus.SPINNING;
    lottery.payoutOrder = [];
    await lottery.save();

    // Sequential Selection Logic
    const pool = [...lottery.confirmedMembers];
    const sequence: string[] = [];

    while (pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const selectedId = pool.splice(randomIndex, 1)[0];
      sequence.push(selectedId);
      
      lottery.payoutOrder = [...sequence];
      await lottery.save();

      // Broadcast each step for real-time animation
      this.lotteryGateway.broadcastLotteryUpdate(groupId, lottery);
      
      // Simulate delay between spins for effect
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    lottery.status = LotteryStatus.COMPLETED;
    await lottery.save();
    this.lotteryGateway.broadcastLotteryUpdate(groupId, lottery);

    return lottery;
  }

  async getStatus(groupId: string): Promise<Lottery | null> {
    return this.lotteryModel.findOne({ groupId }).sort({ createdAt: -1 }).exec();
  }
}
