import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('contributions')
  @ApiOperation({ summary: 'Get contributions for a group' })
  async getContributions(@Query('groupId') groupId: string) {
    return this.financeService.getContributions(groupId);
  }

  @Post('contributions')
  @ApiOperation({ summary: 'Log a contribution' })
  async createContribution(@Body() createContributionDto: CreateContributionDto, @Request() req: any) {
    return this.financeService.logContribution(req.user.userId, createContributionDto.groupId, createContributionDto.amount);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Get payouts for a group' })
  async getPayouts(@Query('groupId') groupId: string) {
    return this.financeService.getPayouts(groupId);
  }

  @Post('payouts/:id/approve')
  @ApiOperation({ summary: 'Approve a payout' })
  async approvePayout(@Param('id') id: string, @Request() req: any) {
    return this.financeService.approvePayout(req.user.userId, id);
  }

  @Post('manual-contribution')
  @ApiOperation({ summary: 'Admin: Record a manual contribution' })
  async recordManualContribution(@Body() data: { userId: string, groupId: string, amount: number }, @Request() req: any) {
    return this.financeService.recordManualContribution(req.user.userId, data.userId, data.groupId, data.amount);
  }

  @Post('manual-payout')
  @ApiOperation({ summary: 'Admin: Record a manual payout' })
  async recordManualPayout(@Body() data: { userId: string, groupId: string, amount: number }, @Request() req: any) {
    return this.financeService.recordManualPayout(req.user.userId, data.userId, data.groupId, data.amount);
  }

  @Get('savings')
  @ApiOperation({ summary: 'Get user savings' })
  async getSavings(@Request() req: any) {
    return this.financeService.getUserSavings(req.user.userId);
  }
}
