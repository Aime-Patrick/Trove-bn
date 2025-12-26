import { Controller, Post, Body, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LotteryService } from './lottery.service';
import { StartLotteryDto } from './dto/start-lottery.dto';
import { ConfirmParticipationDto } from './dto/confirm-participation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('lottery')
@ApiBearerAuth()
@Controller('lottery')
@UseGuards(JwtAuthGuard)
export class LotteryController {
  constructor(private lotteryService: LotteryService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start lottery selection process' })
  async startLottery(@Body() startLotteryDto: StartLotteryDto) {
    return this.lotteryService.startSelection(startLotteryDto.groupId);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm participation in current round' })
  async confirmParticipation(
    @Body() confirmParticipationDto: ConfirmParticipationDto,
    @Request() req: any,
  ) {
    return this.lotteryService.confirmReadiness(req.user.userId, confirmParticipationDto.groupId); 
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current lottery status' })
  async getStatus(@Query('groupId') groupId: string) {
    return this.lotteryService.getStatus(groupId);
  }
}
