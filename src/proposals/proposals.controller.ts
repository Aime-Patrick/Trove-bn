import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProposalsService } from './proposals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProposalDto } from './dto/create-proposal.dto';

@ApiTags('proposals')
@ApiBearerAuth()
@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all proposals for a group' })
  @ApiResponse({ status: 200, description: 'Return all proposals for the group' })
  async findAll(@Query('groupId') groupId: string) {
    return this.proposalsService.findAll(groupId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({ status: 201, description: 'Proposal created successfully' })
  async create(@Request() req, @Body() createProposalDto: CreateProposalDto) {
    return this.proposalsService.create(
      createProposalDto.groupId,
      req.user.userId,
      createProposalDto.type,
      createProposalDto.data,
      createProposalDto.description,
    );
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote on a proposal' })
  @ApiResponse({ status: 200, description: 'Vote recorded successfully' })
  async vote(@Request() req, @Param('id') id: string, @Body('vote') vote: boolean) {
    return this.proposalsService.vote(id, req.user.userId, vote);
  }
}
