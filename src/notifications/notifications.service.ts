import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { Announcement, AnnouncementDocument } from './schemas/announcement.schema';
import { NotificationsGateway } from './notifications.gateway';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(Announcement.name) private announcementModel: Model<AnnouncementDocument>,
    private notificationsGateway: NotificationsGateway,
    private pushNotificationService: PushNotificationService,
  ) {}

  async create(userId: string, title: string, body: string, type: string, actionId?: string, url?: string): Promise<Notification> {
    const notification = new this.notificationModel({
      userId,
      title,
      body,
      type,
      actionId,
      url,
    });
    const savedNotification = await notification.save();
    
    // Send real-time update
    this.notificationsGateway.sendNotification(userId, savedNotification);
    
    // Send push notification
    this.pushNotificationService.sendPushNotification(userId, title, body, { type, actionId, url });
    
    return savedNotification;
  }

  async findAll(userId: string): Promise<Notification[]> {
    return this.notificationModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(id, { read: true });
  }

  async sendAnnouncementToGroup(groupId: string, senderId: string, title: string, body: string, memberUserIds: string[]): Promise<void> {
    // Save persistent announcement
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 1 week expiry

    const announcement = new this.announcementModel({
      groupId,
      title,
      body,
      senderId,
      expiresAt,
    });
    await announcement.save();

    // Send individual notifications
    for (const userId of memberUserIds) {
      await this.create(userId, title, body, 'announcement');
    }
  }

  async getGroupAnnouncements(groupId: string): Promise<Announcement[]> {
    const now = new Date();
    return this.announcementModel
      .find({ 
        groupId, 
        expiresAt: { $gt: now } 
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async deleteExpiredAnnouncements(): Promise<number> {
    const now = new Date();
    const result = await this.announcementModel.deleteMany({
      expiresAt: { $lt: now }
    });
    return result.deletedCount;
  }

  async updateAnnouncement(id: string, title: string, body: string): Promise<Announcement | null> {
    return this.announcementModel.findByIdAndUpdate(id, { title, body }, { new: true }).exec();
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.announcementModel.findByIdAndDelete(id).exec();
  }

  async toggleAnnouncementActive(id: string, isActive: boolean): Promise<Announcement | null> {
    return this.announcementModel.findByIdAndUpdate(id, { isActive }, { new: true }).exec();
  }
}
