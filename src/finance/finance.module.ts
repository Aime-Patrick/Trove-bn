import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import {
  Contribution,
  ContributionSchema,
} from '../schemas/contribution.schema';
import { Payout, PayoutSchema } from '../schemas/payout.schema';
import { Savings, SavingsSchema } from '../schemas/savings.schema';
import { GroupsModule } from '../groups/groups.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contribution.name, schema: ContributionSchema },
      { name: Payout.name, schema: PayoutSchema },
      { name: Savings.name, schema: SavingsSchema },
    ]),
    GroupsModule,
    NotificationsModule,
    UsersModule,
  ],
  providers: [FinanceService],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
