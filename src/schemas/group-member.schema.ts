import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class GroupMember extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Group', required: true })
  groupId: string;

  @Prop({ required: true, default: Date.now })
  joinedAt: Date;

  @Prop({ required: true, default: false })
  hasReceivedPayout: boolean;

  @Prop()
  payoutOrder: number;

  @Prop({ required: true, default: 0 })
  totalContributions: number;

  @Prop({ required: true, default: 0 })
  totalSavings: number;
}

export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);
