import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  MEMBER = 'member',
  GROUP_ADMIN = 'group_admin',
  SYSTEM_ADMIN = 'system_admin',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.MEMBER })
  role: UserRole;

  @Prop({ required: false })
  avatar: string;

  @Prop({
    required: false,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
  })
  gender: string;

  @Prop({ required: false })
  deviceToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete (ret as any)._id;
    delete (ret as any).password; // Safety: never send password in JSON
  },
});
