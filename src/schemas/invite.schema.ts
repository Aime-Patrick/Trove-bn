import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Invite extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Group', required: true })
  groupId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  invitedBy: string;

  @Prop({
    required: true,
    enum: ['pending', 'used', 'expired'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  usedBy: string;

  @Prop({ required: false })
  expiresAt: Date;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);

InviteSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete (ret as any)._id;
  },
});
