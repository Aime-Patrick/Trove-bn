import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartLotteryDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  groupId: string;
}
