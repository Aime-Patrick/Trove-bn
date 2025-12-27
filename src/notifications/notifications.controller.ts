import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendAnnouncementDto } from './dto/send-announcement.dto';
import { GroupsService } from '../groups/groups.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { extractUserId } from '../common/utils/member.util';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly groupsService: GroupsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({ status: 200, description: 'Return all notifications' })
  async findAll(@Request() req, @Query() pagination?: PaginationDto) {
    return this.notificationsService.findAll(req.user.userId, pagination);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('announcement')
  @ApiOperation({ summary: 'Send announcement to all group members' })
  @ApiResponse({ status: 201, description: 'Announcement sent to all members' })
  async sendAnnouncement(@Request() req, @Body() dto: SendAnnouncementDto) {
    const members = await this.groupsService.getGroupMembers(dto.groupId);
    const membersArray = Array.isArray(members) ? members : members.data;
    const memberUserIds = membersArray
      .map((m) => extractUserId(m))
      .filter(Boolean);

    await this.notificationsService.sendAnnouncementToGroup(
      dto.groupId,
      req.user.userId,
      dto.title,
      dto.body,
      memberUserIds,
    );

    return {
      message: 'Announcement sent to all members',
      count: memberUserIds.length - 1,
    };
  }

  @Get('announcements/:groupId')
  @ApiOperation({ summary: 'Get announcements for a group' })
  @ApiResponse({ status: 200, description: 'Return announcements' })
  async getAnnouncements(
    @Param('groupId') groupId: string,
    @Query() pagination?: PaginationDto,
    @Query('includeExpired') includeExpired?: string,
  ) {
    const includeExpiredBool = includeExpired === 'true' || includeExpired === '1';
    return this.notificationsService.getGroupAnnouncements(groupId, pagination, includeExpiredBool);
  }

  @Put('announcement/:id')
  @ApiOperation({ summary: 'Update an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated' })
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() body: { title: string; body: string },
  ) {
    return this.notificationsService.updateAnnouncement(
      id,
      body.title,
      body.body,
    );
  }

  @Delete('announcement/:id')
  @ApiOperation({ summary: 'Delete an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement deleted' })
  async deleteAnnouncement(@Param('id') id: string) {
    await this.notificationsService.deleteAnnouncement(id);
    return { message: 'Announcement deleted' };
  }

  @Put('announcement/:id/toggle')
  @ApiOperation({ summary: 'Toggle announcement active state' })
  @ApiResponse({ status: 200, description: 'Announcement toggled' })
  async toggleAnnouncementActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.notificationsService.toggleAnnouncementActive(id, isActive);
  }
}
