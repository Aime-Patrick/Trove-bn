import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Family Savings' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  slotPrice: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  contributionAmount: number;

  @ApiProperty({ example: 1, description: 'Frequency in weeks' })
  @IsNumber()
  @Min(1)
  payoutFrequency: number;

  @ApiProperty({ example: 10, description: 'Percentage to save' })
  @IsNumber()
  @Min(0)
  savingsPercentage: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(2)
  maxMembers: number;

  @ApiProperty({ example: 'Group description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'RWF', required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}
