import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';

/**
 * Pagination DTO with optional groupId filter
 */
export class GroupFilteredPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by group ID',
  })
  @IsOptional()
  @IsString()
  groupId?: string;
}

/**
 * Pagination DTO with optional userId filter
 */
export class UserFilteredPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by user ID',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * Pagination DTO with optional groupId filter
 * Note: This is the same as GroupFilteredPaginationDto, but kept separate for clarity
 */
export class ProposalFilteredPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by group ID',
  })
  @IsOptional()
  @IsString()
  groupId?: string;
}

