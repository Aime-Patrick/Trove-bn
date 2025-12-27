import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Group extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  adminId: string;

  @Prop({ required: true })
  slotPrice: number;

  @Prop({ required: true })
  contributionAmount: number;

  @Prop({ required: true, default: 1 })
  payoutFrequency: number;

  @Prop({ required: true, default: 10 })
  savingsPercentage: number;

  @Prop({ required: true, default: 10 })
  maxMembers: number;

  @Prop({ required: true, default: 1 })
  currentRound: number;

  @Prop({ required: true, default: 'RWF' })
  currency: string;

  @Prop({ required: true, unique: true })
  inviteCode: string;

  @Prop()
  nextLotteryAt?: Date;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

GroupSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete (ret as any)._id;
  },
});
