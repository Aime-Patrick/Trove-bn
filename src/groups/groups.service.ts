import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group } from '../schemas/group.schema';
import { GroupMember } from '../schemas/group-member.schema';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<Group>,
    @InjectModel(GroupMember.name) private memberModel: Model<GroupMember>,
  ) {}

  async createGroup(adminId: string, groupData: Partial<Group>): Promise<Group> {
    const newGroup = new this.groupModel({ ...groupData, adminId });
    const savedGroup = await newGroup.save();
    
    // Auto-add admin as member
    await this.joinGroup(adminId, (savedGroup as any)._id.toString());
    
    return savedGroup;
  }

  async joinGroup(userId: string, groupId: string): Promise<GroupMember> {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new BadRequestException('Group not found');

    const existingMember = await this.memberModel.findOne({ userId, groupId });
    if (existingMember) throw new BadRequestException('User already in group');

    const memberCount = await this.memberModel.countDocuments({ groupId });
    if (memberCount >= group.maxMembers) throw new BadRequestException('Group is full');

    // Calculate Buy-in Fee for mid-round joining
    // Formula: SlotPrice + (SlotPrice / 2 * NumberOfMembersWhoReceivedPayout)
    const membersWhoReceivedPayout = await this.memberModel.countDocuments({ 
      groupId, 
      hasReceivedPayout: true 
    });

    let buyInFee = group.slotPrice;
    if (membersWhoReceivedPayout > 0) {
      buyInFee += (group.slotPrice / 2) * membersWhoReceivedPayout;
    }

    const newMember = new this.memberModel({
      userId,
      groupId,
      joinedAt: new Date(),
    });

    console.log(`User ${userId} joined group ${groupId}. Buy-in fee: ${buyInFee}`);
    return newMember.save();
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return this.memberModel.find({ groupId }).populate('userId').exec();
  }

  async findAll(): Promise<Group[]> {
    return this.groupModel.find().exec();
  }

  async findById(id: string): Promise<Group> {
    const group = await this.groupModel.findById(id).exec();
    if (!group) throw new BadRequestException('Group not found');
    return group;
  }
}
