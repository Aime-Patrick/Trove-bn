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

GroupMemberSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    
    // Flatten populated userId if it exists
    if (ret.userId && typeof ret.userId === 'object') {
      const user = ret.userId as any;
      (ret as any).name = user.name;
      (ret as any).phoneNumber = user.phoneNumber;
      (ret as any).userId = user._id || user.id;
    }
    
    delete (ret as any)._id;
  },
});
