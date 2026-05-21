import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { LineLoginDto } from './dto/line-login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Admin login with email/password
   */
  async adminLogin(dto: AdminLoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  /**
   * LINE Login — exchange authorization code for token + profile
   */
  async lineLogin(dto: LineLoginDto) {
    const channelId = this.configService.get<string>('LINE_LOGIN_CHANNEL_ID');
    const channelSecret = this.configService.get<string>('LINE_LOGIN_CHANNEL_SECRET');
    const callbackUrl = this.configService.get<string>('LINE_LOGIN_CALLBACK_URL');

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: dto.code,
        redirect_uri: callbackUrl || '',
        client_id: channelId || '',
        client_secret: channelSecret || '',
      }),
    });

    if (!tokenResponse.ok) {
      this.logger.error('LINE token exchange failed');
      throw new UnauthorizedException('LINE authentication failed');
    }

    const tokenData = await tokenResponse.json();

    // Get user profile
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new UnauthorizedException('Failed to get LINE profile');
    }

    const profile = await profileResponse.json();

    // Upsert customer
    const customer = await this.prisma.customer.upsert({
      where: { lineUserId: profile.userId },
      update: {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
        lastActiveAt: new Date(),
      },
      create: {
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
        lastActiveAt: new Date(),
      },
    });

    // Generate JWT for customer
    const payload = {
      sub: customer.id,
      lineUserId: customer.lineUserId,
      type: 'customer',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      lineAccessToken: tokenData.access_token,
      customer: {
        id: customer.id,
        displayName: customer.displayName,
        pictureUrl: customer.pictureUrl,
        points: customer.points,
        tier: customer.tier,
      },
    };
  }

  /**
   * Verify a LINE access token
   */
  async verifyLineToken(accessToken: string) {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `access_token=${accessToken}`,
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid LINE access token');
    }

    return response.json();
  }
}
