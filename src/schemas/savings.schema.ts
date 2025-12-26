import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Savings extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Group', required: true })
  groupId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['auto', 'manual'], default: 'auto' })
  source: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payout' })
  payoutId: string;
}

export const SavingsSchema = SchemaFactory.createForClass(Savings);
