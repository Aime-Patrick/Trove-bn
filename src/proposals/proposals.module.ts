import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { Proposal, ProposalSchema } from './schemas/proposal.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Proposal.name, schema: ProposalSchema },
    ]),
    NotificationsModule,
    GroupsModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
