import {
  Controller,
  Get,
  Post,
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
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  async findAll(@Query() pagination?: PaginationDto) {
    return this.groupsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details' })
  async findOne(@Param('id') id: string) {
    return this.groupsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  async create(@Body() createGroupDto: CreateGroupDto, @Request() req: any) {
    return this.groupsService.createGroup(req.user.userId, createGroupDto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get group members' })
  async getMembers(
    @Param('id') id: string,
    @Query() pagination?: PaginationDto,
  ) {
    return this.groupsService.getGroupMembers(id, pagination);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to group' })
  async addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.groupsService.joinGroup(addMemberDto.userId, id);
  }

  @Post(':id/members/:memberId/slots')
  @ApiOperation({ summary: 'Update member slots' })
  async updateMemberSlots(
    @Param('memberId') memberId: string,
    @Body('slots') slots: number,
  ) {
    return this.groupsService.updateMemberSlots(memberId, slots);
  }

  @Post(':id/settings')
  @ApiOperation({ summary: 'Update group settings' })
  async updateSettings(@Param('id') id: string, @Body() updateData: any) {
    return this.groupsService.updateGroup(id, updateData);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join group by invite code' })
  async joinByCode(
    @Body('inviteCode') inviteCode: string,
    @Request() req: any,
  ) {
    return this.groupsService.joinByInviteCode(req.user.userId, inviteCode);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Generate a unique one-time invite code' })
  async createInvite(
    @Param('id') id: string,
    @Body('phoneNumber') phoneNumber: string,
    @Request() req: any,
  ) {
    try {
      return await this.groupsService.createInvite(
        id,
        req.user.userId,
        phoneNumber,
      );
    } catch (error) {
      console.error('Error in GroupsController.createInvite:', error);
      throw error;
    }
  }

  @Post(':id/schedule-lottery')
  @ApiOperation({ summary: 'Schedule the next lottery round' })
  async scheduleLottery(
    @Param('id') id: string,
    @Body('nextLotteryAt') nextLotteryAt: string,
  ) {
    return this.groupsService.scheduleNextLottery(id, new Date(nextLotteryAt));
  }
}
