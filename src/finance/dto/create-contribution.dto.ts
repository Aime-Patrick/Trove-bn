import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContributionDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  amount: number;

  // userId extracted from JWT
}
