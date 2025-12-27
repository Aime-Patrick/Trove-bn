import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Group', required: true })
  groupId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

AnnouncementSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete (ret as any)._id;
  },
});
