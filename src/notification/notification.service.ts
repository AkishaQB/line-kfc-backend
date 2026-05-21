import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';
import { NotificationType } from '@prisma/client';
import { createPaginatedResult, getPaginationSkip } from '../common/utils/pagination.util';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineService: LineService,
    @InjectQueue('notification') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Get notifications for a customer
   */
  async getCustomerNotifications(customerId: string, page = 1, limit = 20) {
    const skip = getPaginationSkip(page, limit);

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { customerId } }),
    ]);

    return createPaginatedResult(items, total, page, limit);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, customerId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, customerId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Send a notification to a customer (stores in DB + LINE push)
   */
  async sendNotification(
    customerId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
  ) {
    // Store notification
    const notification = await this.prisma.notification.create({
      data: {
        customerId,
        type,
        title,
        body,
        data,
      },
    });

    // Send LINE push message
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (customer?.lineUserId) {
      try {
        await this.lineService.pushMessage(customer.lineUserId, `${title}\n${body}`);
      } catch (error) {
        this.logger.error(`Failed to send LINE push: ${error.message}`);
      }
    }

    return notification;
  }

  /**
   * Admin: send push notification to multiple customers
   */
  async sendBulkPush(title: string, body: string, customerIds?: string[]) {
    await this.notificationQueue.add('bulk-push', {
      title,
      body,
      customerIds,
    });

    return { message: 'Push notification queued for delivery' };
  }

  /**
   * Cron: Send coupon expiry reminders
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendExpiryReminders() {
    // Find coupons expiring in 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const today = new Date();

    const expiringAssignments = await this.prisma.couponAssignment.findMany({
      where: {
        isRedeemed: false,
        expiresAt: {
          gte: today,
          lte: tomorrow,
        },
      },
      include: {
        coupon: true,
        customer: true,
      },
    });

    for (const assignment of expiringAssignments) {
      await this.sendNotification(
        assignment.customerId,
        'COUPON_EXPIRING',
        '⏰ Coupon Expiring Soon!',
        `Your coupon "${assignment.coupon.title}" expires today! Use it before it's gone.`,
      );
    }

    if (expiringAssignments.length > 0) {
      this.logger.log(`Sent ${expiringAssignments.length} expiry reminders`);
    }
  }
}
