import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LineAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing LINE access token');
    }

    try {
      // Verify the LINE access token
      const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `access_token=${token}`,
      });

      if (!response.ok) {
        throw new UnauthorizedException('Invalid LINE access token');
      }

      const tokenInfo = await response.json();

      // Verify channel ID matches
      const channelId = this.configService.get<string>('LINE_LOGIN_CHANNEL_ID');
      if (channelId && tokenInfo.client_id !== channelId) {
        throw new UnauthorizedException('Token does not belong to this channel');
      }

      // Get LINE user profile
      const profileResponse = await fetch('https://api.line.me/v2/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new UnauthorizedException('Failed to get LINE profile');
      }

      const profile = await profileResponse.json();

      // Find or create customer
      let customer = await this.prisma.customer.findUnique({
        where: { lineUserId: profile.userId },
      });

      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            lineUserId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            statusMessage: profile.statusMessage,
          },
        });
      }

      request.customer = customer;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('LINE authentication failed');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
