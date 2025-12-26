import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  async findAll() {
    return this.groupsService.findAll();
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
  async getMembers(@Param('id') id: string) {
    return this.groupsService.getGroupMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to group' })
  async addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.groupsService.joinGroup(addMemberDto.userId, id);
  }

  @Post(':id/settings')
  @ApiOperation({ summary: 'Update group settings' })
  async updateSettings(@Param('id') id: string, @Body() updateData: any) {
    return this.groupsService.updateGroup(id, updateData);
  }
}
