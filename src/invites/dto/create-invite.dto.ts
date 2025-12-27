import { IsNotEmpty, IsString, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInviteDto {
  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: 'group_id_123' })
  @IsString()
  @IsNotEmpty()
  groupId: string;
}
