import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ContributionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

@Schema({ timestamps: true })
export class Contribution extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Group', required: true })
  groupId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    required: true,
    enum: ContributionStatus,
    default: ContributionStatus.PENDING,
  })
  status: ContributionStatus;

  @Prop({ required: true })
  dueDate: Date;

  @Prop()
  paidDate: Date;
}

export const ContributionSchema = SchemaFactory.createForClass(Contribution);

ContributionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete (ret as any)._id;
  },
});
