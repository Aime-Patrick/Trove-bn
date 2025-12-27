import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  PROPOSAL = 'proposal',
  INFO = 'info',
  ALERT = 'alert',
  ANNOUNCEMENT = 'announcement',
  LOTTERY_JOIN = 'lottery_join',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ required: true, enum: NotificationType, default: NotificationType.INFO })
  type: string;

  @Prop({ required: false })
  actionId?: string; // ID of the proposal or related entity

  @Prop({ required: false })
  url?: string; // Deep link URL

  @Prop({ default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
