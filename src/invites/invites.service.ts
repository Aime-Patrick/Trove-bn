import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invite, InviteDocument } from './schemas/invite.schema';
import { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class InvitesService {
  constructor(@InjectModel(Invite.name) private inviteModel: Model<InviteDocument>) {}

  async createInvite(adminId: string, createInviteDto: CreateInviteDto): Promise<Invite> {
    // Check if pending invite already exists
    const existingInvite = await this.inviteModel.findOne({
      phoneNumber: createInviteDto.phoneNumber,
      groupId: createInviteDto.groupId,
      status: 'pending',
    });

    if (existingInvite) {
      return existingInvite;
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const newInvite = new this.inviteModel({
      ...createInviteDto,
      code,
      invitedBy: adminId,
    });

    return newInvite.save();
  }

  async validateInvite(phoneNumber: string, code: string): Promise<Invite> {
    const invite = await this.inviteModel.findOne({
      phoneNumber,
      code,
      status: 'pending',
    });

    if (!invite) {
      throw new BadRequestException('Invalid or expired invite code for this phone number.');
    }

    return invite;
  }

  async acceptInvite(inviteId: string): Promise<void> {
    await this.inviteModel.findByIdAndUpdate(inviteId, { status: 'accepted' });
  }
}
