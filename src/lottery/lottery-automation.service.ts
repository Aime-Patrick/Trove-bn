import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lottery, LotteryStatus } from '../schemas/lottery.schema';
import { LotteryService } from './lottery.service';
import { GroupsService } from '../groups/groups.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LotteryAutomationService {
  private readonly logger = new Logger(LotteryAutomationService.name);

  constructor(
    @InjectModel(Lottery.name) private lotteryModel: Model<Lottery>,
    private lotteryService: LotteryService,
    private groupsService: GroupsService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledLotteries() {
    const now = new Date();

    // Find groups with scheduled lotteries that have passed
    const groups = await this.groupsService.findScheduledGroups(now);

    for (const group of groups) {
      try {
        const groupId =
          (
            group as unknown as { _id?: { toString: () => string } }
          )._id?.toString() || '';
        if (!groupId) continue;

        // Check if there's an active confirmation phase for this group
        const lottery = await this.lotteryModel.findOne({
          groupId,
          status: LotteryStatus.CONFIRMING,
        });

        if (lottery) {
          // Check if at least 3 members have confirmed
          if (lottery.confirmedMembers.length >= 3) {
            this.logger.log(
              `Automatically starting lottery for group ${group.name} (${groupId})`,
            );

            // Clear the scheduled time to prevent re-triggering
            await this.groupsService.updateGroup(
              groupId,
              {
                nextLotteryAt: undefined,
              },
              false,
            );

            // Start the selection process
            await this.lotteryService.startSelection(groupId);
          } else {
            // Not enough members, notify the admin
            await this.notificationsService.create(
              group.adminId,
              'Lottery Skipped',
              `The scheduled lottery for "${group.name}" was skipped because only ${lottery.confirmedMembers.length} members confirmed (minimum 3 required).`,
              'lottery_skipped',
              groupId,
              'trove://lottery',
            );
            this.logger.warn(
              `Scheduled lottery for group ${group.name} skipped: only ${lottery.confirmedMembers.length} members confirmed (minimum 3 required).`,
            );
          }
        } else {
          // No confirmation phase active, clear the scheduled time
          await this.groupsService.updateGroup(
            groupId,
            {
              nextLotteryAt: undefined,
            },
            false,
          );
          this.logger.warn(
            `Scheduled lottery for group ${group.name} cleared: no active confirmation phase found.`,
          );
        }
      } catch (error) {
        const groupId =
          (
            group as unknown as {
              _id?: { toString: () => string };
              name?: string;
            }
          )._id?.toString() || 'unknown';
        this.logger.error(
          `Error processing scheduled lottery for group ${groupId}:`,
          error,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredAnnouncements() {
    this.logger.log('Cleaning up expired announcements...');
    const deletedCount =
      await this.notificationsService.deleteExpiredAnnouncements();
    this.logger.log(`Deleted ${deletedCount} expired announcements.`);
  }
}
