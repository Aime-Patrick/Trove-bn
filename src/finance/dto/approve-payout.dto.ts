import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApprovePayoutDto {
  // adminId extracted from JWT
  // This DTO might be empty if we only rely on URL param and JWT,
  // but keeping it for future extensibility or if we want to pass notes.
}
