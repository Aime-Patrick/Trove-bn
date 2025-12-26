import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private isInitialized = false;

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  onModuleInit() {
    try {
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        this.isInitialized = true;
        this.logger.log('Firebase Admin initialized successfully.');
      } else {
        this.logger.warn('firebase-service-account.json not found. Push notifications will be logged only.');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin:', error.message);
    }
  }

  async sendPushNotification(userId: string, title: string, body: string, data?: any) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.deviceToken) {
      this.logger.log(`User ${userId} has no device token. Skipping push notification.`);
      return;
    }

    if (this.isInitialized) {
      try {
        const message = {
          notification: { title, body },
          data: data ? this.mapDataToString(data) : {},
          token: user.deviceToken,
        };

        const response = await admin.messaging().send(message);
        this.logger.log(`Successfully sent push notification to ${userId}: ${response}`);
      } catch (error) {
        this.logger.error(`Error sending push notification to ${userId}:`, error.message);
      }
    } else {
      this.logger.log(`[MOCK PUSH] To: ${userId} (${user.deviceToken}) | Title: ${title} | Body: ${body}`);
    }
  }

  private mapDataToString(data: any): { [key: string]: string } {
    const mapped: { [key: string]: string } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        mapped[key] = String(data[key]);
      }
    }
    return mapped;
  }
}
