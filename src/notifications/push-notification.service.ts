import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private isInitialized = false;
  private expo = new Expo();

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  onModuleInit() {
    try {
      let serviceAccount: admin.ServiceAccount | null = null;

      // Option 1: Load from base64 environment variable (for deployment)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const decoded = Buffer.from(
          process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
          'base64',
        ).toString('utf-8');
        serviceAccount = JSON.parse(decoded);
        this.logger.log(
          'Firebase credentials loaded from environment variable.',
        );
      }
      // Option 2: Load from file (for local development)
      else {
        const serviceAccountPath = path.join(
          process.cwd(),
          'firebase-service-account.json',
        );

        if (fs.existsSync(serviceAccountPath)) {
          serviceAccount = JSON.parse(
            fs.readFileSync(serviceAccountPath, 'utf8'),
          );
          this.logger.log('Firebase credentials loaded from file.');
        }
      }

      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        this.isInitialized = true;
        this.logger.log('Firebase Admin initialized successfully.');
      } else {
        this.logger.warn(
          'No Firebase credentials found. Push notifications will be logged only.',
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin:', error.message);
    }
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.deviceToken) {
      this.logger.log(
        `User ${userId} has no device token. Skipping push notification.`,
      );
      return;
    }

    if (user.deviceToken.startsWith('ExponentPushToken') || user.deviceToken.startsWith('ExpoPushToken')) {
      await this.sendExpoPushNotification(userId, user.deviceToken, title, body, data);
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
        this.logger.log(
          `Successfully sent push notification to ${userId}: ${response}`,
        );
      } catch (error) {
        this.logger.error(
          `Error sending push notification to ${userId}:`,
          error.message,
        );

        // If the token is invalid or not found, clear it from the user record
        if (
          error.code === 'messaging/registration-token-not-registered' ||
          error.message?.includes('Requested entity was not found') ||
          error.message?.includes('invalid-registration-token')
        ) {
          this.logger.warn(`Clearing invalid device token for user ${userId}`);
          await this.userModel.findByIdAndUpdate(userId, {
            $unset: { deviceToken: 1 },
          });
        }
      }
    } else {
      this.logger.log(
        `[MOCK PUSH] To: ${userId} (${user.deviceToken}) | Title: ${title} | Body: ${body}`,
      );
    }
  }

  private async sendExpoPushNotification(
    userId: string,
    token: string,
    title: string,
    body: string,
    data?: any,
  ) {
    if (!Expo.isExpoPushToken(token)) {
      this.logger.error(`Push token ${token} is not a valid Expo push token`);
      return;
    }

    const message: ExpoPushMessage = {
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      channelId: 'default',
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      this.logger.log(`Expo push notification sent to ${userId}: ${JSON.stringify(tickets)}`);
      
      // NOTE: In a production app, you should check tickets for errors and handle them
    } catch (error) {
      this.logger.error(`Error sending Expo push notification to ${userId}:`, error.message);
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
