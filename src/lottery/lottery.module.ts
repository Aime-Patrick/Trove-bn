import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LotteryService } from './lottery.service';
import { LotteryController } from './lottery.controller';
import { LotteryGateway } from './lottery.gateway';
import { Lottery, LotterySchema } from '../schemas/lottery.schema';
import { GroupsModule } from '../groups/groups.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LotteryAutomationService } from './lottery-automation.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lottery.name, schema: LotterySchema }]),
    GroupsModule,
    NotificationsModule,
  ],
  providers: [LotteryService, LotteryGateway, LotteryAutomationService],
  controllers: [LotteryController],
  exports: [LotteryService],
})
export class LotteryModule {}
