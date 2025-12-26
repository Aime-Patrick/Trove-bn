import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  async findAll(@Query('groupId') groupId: string) {
    return this.proposalsService.findAll(groupId);
  }

  @Post()
  async create(@Request() req, @Body() body: any) {
    return this.proposalsService.create(
      body.groupId,
      req.user.userId,
      body.type,
      body.data,
      body.description,
    );
  }

  @Post(':id/vote')
  async vote(@Request() req, @Param('id') id: string, @Body('vote') vote: boolean) {
    return this.proposalsService.vote(id, req.user.userId, vote);
  }
}
