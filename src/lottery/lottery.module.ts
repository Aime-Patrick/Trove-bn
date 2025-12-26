import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LotteryService } from './lottery.service';
import { LotteryController } from './lottery.controller';
import { LotteryGateway } from './lottery.gateway';
import { Lottery, LotterySchema } from '../schemas/lottery.schema';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lottery.name, schema: LotterySchema }]),
    GroupsModule,
  ],
  providers: [LotteryService, LotteryGateway],
  controllers: [LotteryController],
  exports: [LotteryService],
})
export class LotteryModule {}
