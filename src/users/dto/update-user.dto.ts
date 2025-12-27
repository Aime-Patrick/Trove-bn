import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../schemas/user.schema';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://ui-avatars.com/api/?name=John+Doe' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    example: 'Male',
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['Male', 'Female', 'Other', 'Prefer not to say'])
  gender?: string;

  @ApiPropertyOptional({
    example: 'fcm-token-string',
    description: 'Firebase Cloud Messaging device token',
  })
  @IsOptional()
  @IsString()
  deviceToken?: string;
}
