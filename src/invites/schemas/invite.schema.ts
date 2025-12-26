import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InviteDocument = Invite & Document;

@Schema({ timestamps: true })
export class Invite {
  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  groupId: string;

  @Prop({ required: true })
  invitedBy: string; // Admin User ID

  @Prop({ default: 'pending', enum: ['pending', 'accepted', 'expired'] })
  status: string;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);
