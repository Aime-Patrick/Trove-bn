import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendAnnouncementDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Group ID' })
  @IsString()
  groupId: string;

  @ApiProperty({
    example: 'Meeting Tomorrow',
    description: 'Announcement subject/title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Please attend the group meeting at 5pm.',
    description: 'Announcement message body',
  })
  @IsString()
  body: string;
}
