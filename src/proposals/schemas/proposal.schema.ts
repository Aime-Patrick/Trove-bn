import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProposalDocument = Proposal & Document;

export enum ProposalType {
  UPDATE_SLOT_PRICE = 'UPDATE_SLOT_PRICE',
  UPDATE_PAYOUT_FREQUENCY = 'UPDATE_PAYOUT_FREQUENCY',
  UPDATE_SAVINGS_PERCENTAGE = 'UPDATE_SAVINGS_PERCENTAGE',
  OTHER = 'OTHER',
}

export enum ProposalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class Proposal {
  @Prop({ required: true })
  groupId: string;

  @Prop({ required: true })
  proposerId: string;

  @Prop({ required: true, enum: ProposalType })
  type: ProposalType;

  @Prop({ required: true, type: Object })
  data: any; // The new value or change details

  @Prop({ required: true })
  description: string;

  @Prop({
    required: true,
    enum: ProposalStatus,
    default: ProposalStatus.PENDING,
  })
  status: ProposalStatus;

  @Prop({ type: Map, of: Boolean, default: {} })
  votes: Map<string, boolean>; // userId -> true (agree) / false (disagree)

  @Prop({ default: 0 })
  yesVotes: number;

  @Prop({ default: 0 })
  noVotes: number;

  @Prop()
  expiresAt: Date;
}

export const ProposalSchema = SchemaFactory.createForClass(Proposal);
