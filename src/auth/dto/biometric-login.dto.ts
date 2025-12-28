import {
  IsNotEmpty,
  IsString,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BiometricLoginDto {
  @ApiProperty({
    example: '+250788123456',
    description: 'Phone number including country code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +250788123456)',
  })
  phoneNumber: string;

  @ApiProperty({
    example: 'join',
    description: 'Intent of the authentication (join or create)',
    required: false,
  })
  @IsString()
  @IsOptional()
  intent?: string;

  @ApiProperty({
    example: 'TRV-1234',
    description: 'Invite code to join a group',
    required: false,
  })
  @IsString()
  @IsOptional()
  inviteCode?: string;
}

