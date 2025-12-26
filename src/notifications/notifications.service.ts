import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { NotificationsGateway } from './notifications.gateway';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private notificationsGateway: NotificationsGateway,
    private pushNotificationService: PushNotificationService,
  ) {}

  async create(userId: string, title: string, body: string, type: string, actionId?: string): Promise<Notification> {
    const notification = new this.notificationModel({
      userId,
      title,
      body,
      type,
      actionId,
    });
    const savedNotification = await notification.save();
    
    // Send real-time update
    this.notificationsGateway.sendNotification(userId, savedNotification);
    
    // Send push notification
    this.pushNotificationService.sendPushNotification(userId, title, body, { type, actionId });
    
    return savedNotification;
  }

  async findAll(userId: string): Promise<Notification[]> {
    return this.notificationModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(id, { read: true });
  }
}
