import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddStampDto } from './dto/add-stamp.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { generateSecureToken } from '../common/utils/crypto.util';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get stamp cards for a customer
   */
  async getStampCards(customerId: string) {
    return this.prisma.loyaltyCard.findMany({
      where: { customerId },
      include: {
        stamps: {
          orderBy: { earnedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific stamp card
   */
  async getStampCard(cardId: string) {
    const card = await this.prisma.loyaltyCard.findUnique({
      where: { id: cardId },
      include: {
        stamps: {
          orderBy: { earnedAt: 'desc' },
          include: { store: true },
        },
      },
    });

    if (!card) throw new NotFoundException('Stamp card not found');
    return card;
  }

  /**
   * Add a stamp to a card
   */
  async addStamp(dto: AddStampDto) {
    const card = await this.prisma.loyaltyCard.findUnique({
      where: { id: dto.cardId },
    });

    if (!card) throw new NotFoundException('Stamp card not found');
    if (card.isCompleted) throw new BadRequestException('Stamp card already completed');

    // Add stamp
    await this.prisma.loyaltyStamp.create({
      data: {
        cardId: dto.cardId,
        storeId: dto.storeId,
      },
    });

    // Update filled slots
    const newFilledSlots = card.filledSlots + 1;
    const isCompleted = newFilledSlots >= card.totalSlots;

    const updated = await this.prisma.loyaltyCard.update({
      where: { id: dto.cardId },
      data: {
        filledSlots: newFilledSlots,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
      include: { stamps: true },
    });

    // If completed, issue reward coupon
    if (isCompleted && card.rewardCouponId) {
      await this.issueRewardCoupon(card.customerId, card.rewardCouponId);
    }

    return updated;
  }

  /**
   * Get points balance and history
   */
  async getPointsInfo(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        points: true,
        totalPoints: true,
        tier: true,
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const recentTransactions = await this.prisma.pointTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      ...customer,
      recentTransactions,
    };
  }

  /**
   * Add points to a customer
   */
  async addPoints(
    customerId: string,
    points: number,
    type: 'EARNED' | 'BONUS' | 'ADJUSTMENT',
    description: string,
    referenceId?: string,
  ) {
    const [customer] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: {
          points: { increment: points },
          totalPoints: { increment: points },
        },
      }),
      this.prisma.pointTransaction.create({
        data: {
          customerId,
          points,
          type,
          description,
          referenceId,
        },
      }),
    ]);

    // Check tier upgrade
    await this.recalculateTier(customerId);

    return customer;
  }

  /**
   * Redeem points for a reward
   */
  async redeemPoints(customerId: string, dto: RedeemPointsDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    if (customer.points < dto.points) {
      throw new BadRequestException(
        `Insufficient points. Available: ${customer.points}, Required: ${dto.points}`,
      );
    }

    const [updatedCustomer] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { points: { decrement: dto.points } },
      }),
      this.prisma.pointTransaction.create({
        data: {
          customerId,
          points: -dto.points,
          type: 'REDEEMED',
          description: dto.description || 'Points redeemed for reward',
          referenceId: dto.rewardId,
        },
      }),
    ]);

    return updatedCustomer;
  }

  /**
   * Get tier information and progress
   */
  async getTierInfo(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const tiers = [
      { name: 'BRONZE', threshold: 0, benefits: ['Basic member benefits'] },
      { name: 'SILVER', threshold: 2000, benefits: ['2x points on weekends', '5% discount'] },
      { name: 'GOLD', threshold: 5000, benefits: ['3x points on weekends', '10% discount', 'Birthday gift'] },
      { name: 'PLATINUM', threshold: 10000, benefits: ['5x points on weekends', '15% discount', 'Birthday gift', 'Exclusive access'] },
    ];

    const currentTierIndex = tiers.findIndex((t) => t.name === customer.tier);
    const nextTier = tiers[currentTierIndex + 1];

    return {
      currentTier: tiers[currentTierIndex],
      nextTier: nextTier || null,
      totalPoints: customer.totalPoints,
      pointsToNextTier: nextTier ? Math.max(0, nextTier.threshold - customer.totalPoints) : 0,
      progress: nextTier
        ? Math.min(100, Math.round((customer.totalPoints / nextTier.threshold) * 100))
        : 100,
    };
  }

  /**
   * Issue a reward coupon to a customer
   */
  private async issueRewardCoupon(customerId: string, couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) return;

    const qrToken = generateSecureToken();

    await this.prisma.couponAssignment.create({
      data: {
        couponId,
        customerId,
        qrToken,
        expiresAt: coupon.expirationDate,
      },
    });

    this.logger.log(`Reward coupon ${couponId} issued to customer ${customerId}`);
  }

  /**
   * Recalculate customer tier
   */
  private async recalculateTier(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) return;

    let newTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

    if (customer.totalPoints >= 10000) newTier = 'PLATINUM';
    else if (customer.totalPoints >= 5000) newTier = 'GOLD';
    else if (customer.totalPoints >= 2000) newTier = 'SILVER';
    else newTier = 'BRONZE';

    if (newTier !== customer.tier) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { tier: newTier },
      });
      this.logger.log(`Customer ${customerId} upgraded to ${newTier}`);
    }
  }
}
