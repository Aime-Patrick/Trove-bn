import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalType } from '../schemas/proposal.schema';

export class CreateProposalDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Group ID' })
  @IsString()
  groupId: string;

  @ApiProperty({
    example: 'UPDATE_SLOT_PRICE',
    enum: ProposalType,
    description: 'Type of proposal',
  })
  @IsEnum(ProposalType)
  type: ProposalType;

  @ApiPropertyOptional({
    example: { title: 'Change contribution amount', amount: 200 },
    description: 'Additional data for the proposal',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiProperty({
    example: 'We need to increase the slot price to cover expenses',
    description: 'Description and reason for the proposal',
  })
  @IsString()
  description: string;
}
