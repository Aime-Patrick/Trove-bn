import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum LotteryStatus {
  CONFIRMING = 'confirming',
  SPINNING = 'spinning',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Lottery extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Group', required: true })
  groupId: string;

  @Prop({ required: true })
  round: number;

  @Prop({ required: true, enum: LotteryStatus, default: LotteryStatus.CONFIRMING })
  status: LotteryStatus;

  @Prop({ type: [String], default: [] })
  confirmedMembers: string[];

  @Prop({ type: [String], default: [] })
  payoutOrder: string[];

  @Prop()
  selectedId: string;

  @Prop()
  selectedName: string;

  @Prop()
  startedAt: Date;

  @Prop()
  completedAt: Date;
}

export const LotterySchema = SchemaFactory.createForClass(Lottery);

LotterySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete (ret as any)._id;
  },
});
