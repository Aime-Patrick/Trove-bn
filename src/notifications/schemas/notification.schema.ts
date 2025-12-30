import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  PROPOSAL = 'proposal',
  PROPOSAL_APPROVED = 'proposal_approved',
  PROPOSAL_REJECTED = 'proposal_rejected',
  INFO = 'info',
  ALERT = 'alert',
  ANNOUNCEMENT = 'announcement',
  LOTTERY_JOIN = 'lottery_join',
  LOTTERY_OPEN = 'lottery_open',
  LOTTERY_START = 'lottery_start',
  LOTTERY_PRACTICE = 'lottery_practice',
  LOTTERY_SCHEDULED = 'lottery_scheduled',
  LOTTERY_SKIPPED = 'lottery_skipped',
  MEMBER_JOINED = 'member_joined',
  GROUP_UPDATED = 'group_updated',
  CONTRIBUTION_RECEIVED = 'contribution_received',
  CONTRIBUTION_RECORDED = 'contribution_recorded',
  PAYOUT_READY = 'payout_ready',
  PAYOUT_COMPLETED = 'payout_completed',
  PAYOUT_SELECTED = 'payout_selected',
  INVITE_ACCEPTED = 'invite_accepted',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({
    required: true,
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: string;

  @Prop({ required: false })
  actionId?: string; // ID of the proposal or related entity

  @Prop({ required: false })
  url?: string; // Deep link URL

  @Prop({ default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
