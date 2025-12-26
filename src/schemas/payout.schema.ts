import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum PayoutStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

@Schema({ timestamps: true })
export class Payout extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Group', required: true })
  groupId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  approvedBy: string;

  @Prop()
  approvedAt: Date;

  @Prop()
  paidAt: Date;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);
