import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi, WebhookEvent, MessageEvent, FollowEvent, UnfollowEvent } from '@line/bot-sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private client: messagingApi.MessagingApiClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const channelAccessToken = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
    if (channelAccessToken) {
      this.client = new messagingApi.MessagingApiClient({
        channelAccessToken,
      });
    }
  }

  /**
   * Handle incoming webhook events
   */
  async handleWebhook(events: WebhookEvent[]) {
    for (const event of events) {
      try {
        switch (event.type) {
          case 'follow':
            await this.handleFollow(event as FollowEvent);
            break;
          case 'unfollow':
            await this.handleUnfollow(event as UnfollowEvent);
            break;
          case 'message':
            await this.handleMessage(event as MessageEvent);
            break;
          default:
            this.logger.debug(`Unhandled event type: ${event.type}`);
        }
      } catch (error) {
        this.logger.error(`Error handling event: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Handle new follower — auto-register customer
   */
  private async handleFollow(event: FollowEvent) {
    const userId = event.source.userId;
    if (!userId) return;

    this.logger.log(`New follower: ${userId}`);

    try {
      // Get profile
      const profile = await this.client.getProfile(userId);

      // Upsert customer
      const customer = await this.prisma.customer.upsert({
        where: { lineUserId: userId },
        update: {
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
          isActive: true,
          lastActiveAt: new Date(),
        },
        create: {
          lineUserId: userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
          lastActiveAt: new Date(),
        },
      });

      // Send welcome message
      await this.sendWelcomeMessage(userId, profile.displayName);

      // Create welcome notification
      await this.prisma.notification.create({
        data: {
          customerId: customer.id,
          type: 'WELCOME',
          title: 'Welcome! 🎉',
          body: `Welcome to our loyalty program, ${profile.displayName}! Start collecting points and earning rewards today.`,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling follow event: ${error.message}`);
    }
  }

  /**
   * Handle unfollow — mark customer inactive
   */
  private async handleUnfollow(event: UnfollowEvent) {
    const userId = event.source.userId;
    if (!userId) return;

    this.logger.log(`User unfollowed: ${userId}`);

    await this.prisma.customer.updateMany({
      where: { lineUserId: userId },
      data: { isActive: false },
    });
  }

  /**
   * Handle text messages — keyword routing
   */
  private async handleMessage(event: MessageEvent) {
    if (event.message.type !== 'text') return;

    const userId = event.source.userId;
    if (!userId) return;

    const text = event.message.text.toLowerCase().trim();

    // Update last active
    await this.prisma.customer.updateMany({
      where: { lineUserId: userId },
      data: { lastActiveAt: new Date() },
    });

    // Keyword routing
    switch (true) {
      case text.includes('coupon') || text.includes('クーポン'):
        await this.replyWithCouponInfo(event.replyToken, userId);
        break;
      case text.includes('point') || text.includes('ポイント'):
        await this.replyWithPointsInfo(event.replyToken, userId);
        break;
      case text.includes('reward') || text.includes('リワード'):
        await this.replyWithRewardsInfo(event.replyToken, userId);
        break;
      case text.includes('help') || text.includes('ヘルプ'):
        await this.replyWithHelp(event.replyToken);
        break;
      default:
        await this.replyWithDefaultMessage(event.replyToken);
    }
  }

  /**
   * Send welcome message with flex message
   */
  private async sendWelcomeMessage(userId: string, displayName: string) {
    if (!this.client) return;

    await this.client.pushMessage({
      to: userId,
      messages: [
        {
          type: 'flex',
          altText: `Welcome, ${displayName}!`,
          contents: {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://via.placeholder.com/1024x512/E4002B/FFFFFF?text=Welcome',
              size: 'full',
              aspectRatio: '20:13',
              aspectMode: 'cover',
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `Welcome, ${displayName}! 🎉`,
                  weight: 'bold',
                  size: 'xl',
                },
                {
                  type: 'text',
                  text: 'Start earning points and redeeming exclusive coupons today!',
                  size: 'sm',
                  color: '#666666',
                  margin: 'md',
                  wrap: true,
                },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'Open App',
                    uri: `https://liff.line.me/${this.configService.get('LIFF_ID')}`,
                  },
                  style: 'primary',
                  color: '#E4002B',
                },
              ],
            },
          },
        },
      ],
    });
  }

  /**
   * Reply with coupon information
   */
  private async replyWithCouponInfo(replyToken: string, userId: string) {
    if (!this.client) return;

    const customer = await this.prisma.customer.findUnique({
      where: { lineUserId: userId },
      include: {
        couponAssignments: {
          where: { isRedeemed: false, expiresAt: { gt: new Date() } },
          include: { coupon: true },
          take: 5,
        },
      },
    });

    const couponCount = customer?.couponAssignments?.length || 0;

    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: couponCount > 0
            ? `🎟️ You have ${couponCount} active coupon(s)! Open the app to view and redeem them.`
            : `🎟️ No active coupons right now. Check back later for new promotions!`,
        },
      ],
    });
  }

  /**
   * Reply with points information
   */
  private async replyWithPointsInfo(replyToken: string, userId: string) {
    if (!this.client) return;

    const customer = await this.prisma.customer.findUnique({
      where: { lineUserId: userId },
    });

    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: customer
            ? `⭐ Points Balance: ${customer.points}\n🏆 Tier: ${customer.tier}\n💰 Lifetime Points: ${customer.totalPoints}`
            : 'Please follow our account first to start earning points!',
        },
      ],
    });
  }

  /**
   * Reply with rewards info
   */
  private async replyWithRewardsInfo(replyToken: string, userId: string) {
    if (!this.client) return;

    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '🎁 Open the app to view available rewards and redeem your points!',
        },
      ],
    });
  }

  /**
   * Reply with help message
   */
  private async replyWithHelp(replyToken: string) {
    if (!this.client) return;

    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '📋 Available Commands:\n• "coupon" - View your coupons\n• "points" - Check your points\n• "rewards" - View rewards\n• "help" - Show this message',
        },
      ],
    });
  }

  /**
   * Reply with default message
   */
  private async replyWithDefaultMessage(replyToken: string) {
    if (!this.client) return;

    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '👋 Thanks for your message! Type "help" to see available commands or open our app for the full experience.',
        },
      ],
    });
  }

  /**
   * Send a push message to a specific user
   */
  async pushMessage(userId: string, message: string) {
    if (!this.client) return;

    await this.client.pushMessage({
      to: userId,
      messages: [{ type: 'text', text: message }],
    });
  }

  /**
   * Send a push message to multiple users
   */
  async multicast(userIds: string[], message: string) {
    if (!this.client || userIds.length === 0) return;

    await this.client.multicast({
      to: userIds,
      messages: [{ type: 'text', text: message }],
    });
  }
}
