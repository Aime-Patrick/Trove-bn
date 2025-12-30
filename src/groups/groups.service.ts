import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group } from '../schemas/group.schema';
import { GroupMember } from '../schemas/group-member.schema';
import { Invite } from '../invites/schemas/invite.schema';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LotteryGateway } from '../lottery/lottery.gateway';
import {
  PaginationDto,
  PaginatedResult,
  paginate,
} from '../common/dto/pagination.dto';
import { extractUserId } from '../common/utils/member.util';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<Group>,
    @InjectModel(GroupMember.name) private memberModel: Model<GroupMember>,
    @InjectModel(Invite.name) private inviteModel: Model<Invite>,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => LotteryGateway))
    private lotteryGateway: LotteryGateway,
  ) {}

  async createGroup(
    adminId: string,
    groupData: Partial<Group>,
  ): Promise<Group> {
    const inviteCode = await this.generateUniqueInviteCode();
    const newGroup = new this.groupModel({ ...groupData, adminId, inviteCode });
    const savedGroup = await newGroup.save();

    // Auto-add admin as member
    const groupId =
      (
        savedGroup as unknown as { _id?: { toString: () => string } }
      )._id?.toString() || '';
    if (groupId) {
      await this.joinGroup(adminId, groupId);
    }

    return savedGroup;
  }

  private async generateUniqueInviteCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // Check both Group and Invite models for uniqueness
      const existingGroup = await this.groupModel.findOne({ inviteCode: code });
      const existingInvite = await this.inviteModel.findOne({ code });
      if (!existingGroup && !existingInvite) isUnique = true;
    }
    return code;
  }

  async createInvite(
    groupId: string,
    invitedBy: string,
    phoneNumber?: string,
  ): Promise<Invite> {
    console.log(
      `Generating invite for group ${groupId} by user ${invitedBy}${phoneNumber ? ` for ${phoneNumber}` : ''}`,
    );
    try {
      if (phoneNumber) {
        // Check if user exists and is already in the group
        const user = await this.usersService.findByPhone(phoneNumber);
        if (user) {
          const userId =
            (
              user as unknown as {
                _id?: { toString: () => string };
                id?: string;
              }
            )._id?.toString() ||
            (user as unknown as { id?: string }).id ||
            '';
          const existingMember = await this.memberModel.findOne({
            userId,
            groupId,
          });
          if (existingMember) {
            throw new BadRequestException(
              'This user is already a member of the group',
            );
          }
        }

        // Check for existing pending invite
        const existingInvite = await this.inviteModel.findOne({
          phoneNumber,
          groupId,
          status: 'pending',
        });
        if (existingInvite) {
          return existingInvite;
        }
      }

      const code = await this.generateUniqueInviteCode();
      console.log(`Generated unique code: ${code}`);
      const invite = new this.inviteModel({
        code,
        groupId,
        invitedBy,
        phoneNumber,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
      });
      const savedInvite = await invite.save();
      const inviteId =
        (
          savedInvite as unknown as { _id?: { toString: () => string } }
        )._id?.toString() || '';
      console.log(`Invite saved successfully: ${inviteId}`);
      return savedInvite;
    } catch (error) {
      console.error('Error in createInvite:', error);
      throw error;
    }
  }

  async joinByInviteCode(
    userId: string,
    inviteCode: string,
  ): Promise<GroupMember> {
    const upperCode = inviteCode.toUpperCase();

    // First check for a unique one-time invite
    const invite = await this.inviteModel.findOne({
      code: upperCode,
      status: 'pending',
    });
    if (invite) {
      const member = await this.joinGroup(userId, invite.groupId);
      invite.status = 'used';
      invite.usedBy = userId;
      await invite.save();

      // Notify the inviter
      const user = await this.usersService.findById(userId);
      const userName = user?.name || 'A new member';
      const group = await this.groupModel.findById(invite.groupId);

      await this.notificationsService.create(
        invite.invitedBy,
        'Invite Accepted!',
        `${userName} has joined "${group?.name || 'your group'}" using your invite code!`,
        'invite_accepted',
        invite.groupId,
        'trove://group-details',
      );

      return member;
    }

    // Fallback to group-wide invite code (for backward compatibility)
    const group = await this.groupModel.findOne({ inviteCode: upperCode });
    if (!group) throw new BadRequestException('Invalid or expired invite code');

    const groupId =
      (
        group as unknown as { _id?: { toString: () => string } }
      )._id?.toString() || '';
    if (!groupId) throw new BadRequestException('Invalid group ID');
    return this.joinGroup(userId, groupId);
  }

  async joinGroup(userId: string, groupId: string): Promise<GroupMember> {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new BadRequestException('Group not found');

    const existingMember = await this.memberModel.findOne({ userId, groupId });
    if (existingMember) throw new BadRequestException('User already in group');

    const memberCount = await this.memberModel.countDocuments({ groupId });
    if (memberCount >= group.maxMembers)
      throw new BadRequestException('Group is full');

    // Calculate Buy-in Fee for mid-round joining
    // Formula: SlotPrice + (SlotPrice / 2 * NumberOfMembersWhoReceivedPayout)
    const membersWhoReceivedPayout = await this.memberModel.countDocuments({
      groupId,
      hasReceivedPayout: true,
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

    console.log(
      `User ${userId} joined group ${groupId}. Buy-in fee: ${buyInFee}`,
    );

    const user = await this.usersService.findById(userId);
    const userName = user?.name || 'A new member';

    const savedMember = await newMember.save();
    this.lotteryGateway.broadcastMemberJoined(groupId, savedMember);

    // Notify Admin
    await this.notificationsService.create(
      group.adminId,
      'New Member Joined!',
      `${userName} has joined your group "${group.name}".`,
      'member_joined',
      groupId,
      'trove://group-details',
    );

    // Notify all other members
    const members = await this.getGroupMembers(groupId);
    const membersArray = Array.isArray(members) ? members : members.data;
    for (const member of membersArray) {
      const memberId = extractUserId(member);
      if (memberId && memberId !== userId) {
        await this.notificationsService.create(
          memberId,
          'New Member Joined!',
          `${userName} has joined the group "${group.name}".`,
          'member_joined',
          groupId,
          'trove://group-details',
        );
      }
    }

    return savedMember;
  }

  async getGroupMembers(
    groupId: string,
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<GroupMember> | GroupMember[]> {
    const query = this.memberModel.find({ groupId }).populate('userId');

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        query.skip(skip).limit(limit).exec(),
        this.memberModel.countDocuments({ groupId }).exec(),
      ]);

      return paginate(data, page, limit, total);
    }

    return query.exec();
  }

  async findAll(
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<Group> | Group[]> {
    const query = this.groupModel.find();

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        query.skip(skip).limit(limit).exec(),
        this.groupModel.countDocuments().exec(),
      ]);

      // Ensure all groups have invite codes (migration for existing groups)
      for (const group of data) {
        if (!group.inviteCode) {
          group.inviteCode = await this.generateUniqueInviteCode();
          await group.save();
        }
      }

      return paginate(data, page, limit, total);
    }

    const groups = await query.exec();
    // Ensure all groups have invite codes (migration for existing groups)
    for (const group of groups) {
      if (!group.inviteCode) {
        group.inviteCode = await this.generateUniqueInviteCode();
        await group.save();
      }
    }
    return groups;
  }

  async findById(id: string): Promise<Group> {
    const group = await this.groupModel.findById(id).exec();
    if (!group) throw new BadRequestException('Group not found');

    // Ensure invite code exists
    if (!group.inviteCode) {
      group.inviteCode = await this.generateUniqueInviteCode();
      await group.save();
    }

    return group;
  }

  async updateGroup(id: string, updateData: Partial<Group>): Promise<Group> {
    const group = await this.groupModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!group) throw new BadRequestException('Group not found');

    this.lotteryGateway.broadcastGroupUpdate(id, group);

    // Notify all members
    const members = await this.getGroupMembers(id);
    const membersArray = Array.isArray(members) ? members : members.data;
    for (const member of membersArray) {
      const memberId = extractUserId(member);
      if (memberId) {
        await this.notificationsService.create(
          memberId,
          'Group Updated',
          `The group "${group.name}" has been updated by the admin.`,
          'group_updated',
          id,
          'trove://group-details',
        );
      }
    }

    return group;
  }

  async scheduleNextLottery(
    groupId: string,
    nextLotteryAt: Date,
  ): Promise<Group> {
    const group = await this.groupModel
      .findByIdAndUpdate(groupId, { nextLotteryAt }, { new: true })
      .exec();
    if (!group) throw new BadRequestException('Group not found');

    // Notify all members about the new schedule
    const members = await this.getGroupMembers(groupId);
    const membersArray = Array.isArray(members) ? members : members.data;
    const dateStr = nextLotteryAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (const member of membersArray) {
      const memberId = extractUserId(member);
      if (memberId) {
        await this.notificationsService.create(
          memberId,
          'Lottery Scheduled!',
          `The next lottery for "${group.name}" is scheduled for ${dateStr}. Be ready!`,
          'lottery_scheduled',
          groupId,
          'trove://home',
        );
      }
    }

    return group;
  }

  async findScheduledGroups(date: Date): Promise<Group[]> {
    return this.groupModel
      .find({
        nextLotteryAt: { $lte: date },
      })
      .exec();
  }

  async updateMemberSlots(
    memberId: string,
    slots: number,
  ): Promise<GroupMember> {
    if (slots < 1)
      throw new BadRequestException('Member must have at least 1 slot');
    const member = await this.memberModel
      .findByIdAndUpdate(memberId, { slots }, { new: true })
      .exec();
    if (!member) throw new BadRequestException('Member not found');
    return member;
  }
}
