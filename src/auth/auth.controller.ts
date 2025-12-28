import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { BiometricLoginDto } from './dto/biometric-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto.phoneNumber);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login/register' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and user info' })
  @ApiResponse({ status: 401, description: 'Invalid OTP' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(
      verifyOtpDto.phoneNumber,
      verifyOtpDto.otp,
      verifyOtpDto.intent,
      verifyOtpDto.inviteCode,
    );
  }

  @Post('biometric-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with biometric authentication (skips OTP)' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and user info' })
  @ApiResponse({ status: 401, description: 'User not found or invalid credentials' })
  async biometricLogin(@Body() biometricLoginDto: BiometricLoginDto) {
    return this.authService.biometricLogin(
      biometricLoginDto.phoneNumber,
      biometricLoginDto.intent,
      biometricLoginDto.inviteCode,
    );
  }
}
