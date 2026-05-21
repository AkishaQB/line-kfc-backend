import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { generateSecureToken } from '../common/utils/crypto.util';

@Processor('campaign')
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('process-campaign')
  async processCampaign(job: Job<{ campaignId: string }>) {
    const { campaignId } = job.data;
    this.logger.log(`Processing campaign: ${campaignId}`);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { coupon: true },
    });

    if (!campaign || campaign.status !== 'ACTIVE') {
      this.logger.warn(`Campaign ${campaignId} is not active, skipping`);
      return;
    }

    // Build target audience query
    const targetQuery = this.buildTargetQuery(campaign);

    // Get eligible customers
    const customers = await this.prisma.customer.findMany({
      where: targetQuery,
      select: { id: true },
    });

    this.logger.log(`Campaign ${campaignId}: ${customers.length} eligible customers`);

    let issuedCount = 0;

    for (const customer of customers) {
      // Check max issuances
      if (campaign.maxIssuances && campaign.issuedCount + issuedCount >= campaign.maxIssuances) {
        break;
      }

      // Check if customer already has this coupon from this campaign
      const existing = await this.prisma.couponAssignment.findFirst({
        where: {
          couponId: campaign.couponId,
          customerId: customer.id,
          isRedeemed: false,
        },
      });

      if (existing && !campaign.isRecurring) {
        continue;
      }

      // Assign coupon
      const qrToken = generateSecureToken();

      await this.prisma.couponAssignment.create({
        data: {
          couponId: campaign.couponId,
          customerId: customer.id,
          qrToken,
          expiresAt: campaign.coupon.expirationDate,
        },
      });

      issuedCount++;
    }

    // Update issued count
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        issuedCount: { increment: issuedCount },
      },
    });

    this.logger.log(`Campaign ${campaignId}: issued ${issuedCount} coupons`);
  }

  private buildTargetQuery(campaign: any): any {
    const query: any = { isActive: true };
    const targetAudience = campaign.targetAudience as any;

    switch (campaign.triggerType) {
      case 'NEW_USER':
        // Users created in the last 24 hours
        query.createdAt = {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };
        break;
      case 'BIRTHDAY':
        // Users with birthday today
        const today = new Date();
        query.birthday = {
          not: null,
        };
        break;
      case 'PURCHASE_MILESTONE':
        if (targetAudience?.minPoints) {
          query.totalPoints = { gte: targetAudience.minPoints };
        }
        break;
      case 'INACTIVITY':
        // Users inactive for X days
        const inactiveDays = targetAudience?.inactiveDays || 30;
        query.lastActiveAt = {
          lt: new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000),
        };
        break;
      default:
        // MANUAL or REFERRAL — target all active users
        if (targetAudience?.tier) {
          query.tier = targetAudience.tier;
        }
        break;
    }

    return query;
  }
}
