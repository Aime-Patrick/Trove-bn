import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async update(id: string, updateData: any): Promise<User | null> {
    const data = { ...updateData };
    if (data.expoPushToken) {
      data.deviceToken = data.expoPushToken;
      delete data.expoPushToken;
    }
    return this.userModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }
}
