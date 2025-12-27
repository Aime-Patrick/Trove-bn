import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { LotteryModule } from './lottery/lottery.module';
import { FinanceModule } from './finance/finance.module';
import { InvitesModule } from './invites/invites.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProposalsModule } from './proposals/proposals.module';
import { RequestLoggerMiddleware } from './common/middleware/logger.middleware';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost/trove'),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    GroupsModule,
    LotteryModule,
    FinanceModule,
    InvitesModule,
    NotificationsModule,
    ProposalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
