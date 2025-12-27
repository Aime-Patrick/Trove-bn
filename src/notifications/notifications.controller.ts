import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendAnnouncementDto } from './dto/send-announcement.dto';
import { GroupsService } from '../groups/groups.service';

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
  async findAll(@Request() req) {
    return this.notificationsService.findAll(req.user.userId);
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
    const memberUserIds = members.map(m => 
      typeof m.userId === 'object' ? (m.userId as any)._id?.toString() : m.userId?.toString()
    ).filter(Boolean);
    
    await this.notificationsService.sendAnnouncementToGroup(
      dto.groupId,
      req.user.userId,
      dto.title,
      dto.body,
      memberUserIds,
    );
    
    return { message: 'Announcement sent to all members', count: memberUserIds.length - 1 };
  }

  @Get('announcements/:groupId')
  @ApiOperation({ summary: 'Get active announcements for a group' })
  @ApiResponse({ status: 200, description: 'Return active announcements' })
  async getAnnouncements(@Param('groupId') groupId: string) {
    return this.notificationsService.getGroupAnnouncements(groupId);
  }

  @Put('announcement/:id')
  @ApiOperation({ summary: 'Update an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated' })
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() body: { title: string; body: string },
  ) {
    return this.notificationsService.updateAnnouncement(id, body.title, body.body);
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
