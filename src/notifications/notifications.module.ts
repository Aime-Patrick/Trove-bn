import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push-notification.service';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  Announcement,
  AnnouncementSchema,
} from './schemas/announcement.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => GroupsModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    PushNotificationService,
  ],
  exports: [NotificationsService, PushNotificationService],
})
export class NotificationsModule {}
