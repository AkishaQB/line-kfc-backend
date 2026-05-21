import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { LineLoginDto } from './dto/line-login.dto';
import { LineVerifyDto } from './dto/line-verify.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post('line/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange LINE auth code for access token' })
  @ApiResponse({ status: 200, description: 'LINE login successful' })
  @ApiResponse({ status: 401, description: 'LINE authentication failed' })
  async lineLogin(@Body() dto: LineLoginDto) {
    return this.authService.lineLogin(dto);
  }

  @Post('line/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a LINE access token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async verifyLineToken(@Body() dto: LineVerifyDto) {
    return this.authService.verifyLineToken(dto.accessToken);
  }
}
