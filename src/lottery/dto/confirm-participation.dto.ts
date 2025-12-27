import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmParticipationDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  // userId will be extracted from JWT
}
