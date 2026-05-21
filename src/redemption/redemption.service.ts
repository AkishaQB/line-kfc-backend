import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { CompleteRedemptionDto } from './dto/complete-redemption.dto';
import { verifyQrPayload } from '../common/utils/qr.util';
import { createPaginatedResult, getPaginationSkip } from '../common/utils/pagination.util';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RedemptionService {
  private readonly logger = new Logger(RedemptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate a QR token from POS/cashier scan
   */
  async validateQr(dto: ValidateQrDto) {
    const hmacSecret = this.configService.get<string>('QR_HMAC_SECRET', 'default');
    const expiryMinutes = this.configService.get<number>('QR_TOKEN_EXPIRY_MINUTES', 5);

    // Verify QR payload signature and expiry
    const verification = verifyQrPayload(dto.qrPayload, hmacSecret, expiryMinutes);

    if (!verification.valid) {
      throw new BadRequestException(verification.error);
    }

    // Find the coupon assignment by QR token
    const assignment = await this.prisma.couponAssignment.findUnique({
      where: { qrToken: verification.token! },
      include: {
        coupon: true,
        customer: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Coupon not found');
    }

    // Anti-fraud checks
    if (assignment.isRedeemed) {
      throw new BadRequestException('Coupon already redeemed');
    }

    if (new Date() > assignment.expiresAt) {
      throw new BadRequestException('Coupon has expired');
    }

    if (assignment.coupon.status !== 'ACTIVE') {
      throw new BadRequestException('Coupon is no longer active');
    }

    // Create pending redemption
    const redemption = await this.prisma.redemption.create({
      data: {
        assignmentId: assignment.id,
        customerId: assignment.customerId,
        storeId: dto.storeId,
        status: 'PENDING',
        transactionRef: uuidv4(),
      },
      include: {
        assignment: { include: { coupon: true } },
        customer: true,
      },
    });

    return {
      redemptionId: redemption.id,
      transactionRef: redemption.transactionRef,
      coupon: {
        title: assignment.coupon.title,
        type: assignment.coupon.type,
        discountType: assignment.coupon.discountType,
        discountValue: assignment.coupon.discountValue,
      },
      customer: {
        displayName: assignment.customer.displayName,
        tier: assignment.customer.tier,
      },
    };
  }

  /**
   * Complete a redemption (mark as used, award points)
   */
  async completeRedemption(dto: CompleteRedemptionDto) {
    const redemption = await this.prisma.redemption.findUnique({
      where: { id: dto.redemptionId },
      include: {
        assignment: { include: { coupon: true } },
        customer: true,
      },
    });

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    if (redemption.status !== 'PENDING') {
      throw new BadRequestException(`Redemption is already ${redemption.status.toLowerCase()}`);
    }

    // Complete the redemption in a transaction
    const [updatedRedemption] = await this.prisma.$transaction([
      // Mark redemption as completed
      this.prisma.redemption.update({
        where: { id: dto.redemptionId },
        data: {
          status: 'COMPLETED',
          pointsEarned: dto.pointsEarned || 10,
          redeemedAt: new Date(),
        },
      }),
      // Mark assignment as redeemed
      this.prisma.couponAssignment.update({
        where: { id: redemption.assignmentId },
        data: { isRedeemed: true },
      }),
      // Increment coupon used count
      this.prisma.coupon.update({
        where: { id: redemption.assignment.couponId },
        data: { usedCount: { increment: 1 } },
      }),
      // Award points
      this.prisma.customer.update({
        where: { id: redemption.customerId },
        data: {
          points: { increment: dto.pointsEarned || 10 },
          totalPoints: { increment: dto.pointsEarned || 10 },
        },
      }),
      // Log point transaction
      this.prisma.pointTransaction.create({
        data: {
          customerId: redemption.customerId,
          points: dto.pointsEarned || 10,
          type: 'EARNED',
          description: `Coupon redeemed: ${redemption.assignment.coupon.title}`,
          referenceId: redemption.id,
        },
      }),
    ]);

    return updatedRedemption;
  }

  /**
   * Get redemption logs (admin)
   */
  async getRedemptions(page = 1, limit = 20) {
    const skip = getPaginationSkip(page, limit);

    const [items, total] = await Promise.all([
      this.prisma.redemption.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignment: { include: { coupon: true } },
          customer: true,
          store: true,
        },
      }),
      this.prisma.redemption.count(),
    ]);

    return createPaginatedResult(items, total, page, limit);
  }

  /**
   * Get redemptions by store
   */
  async getStoreRedemptions(storeId: string, page = 1, limit = 20) {
    const skip = getPaginationSkip(page, limit);

    const [items, total] = await Promise.all([
      this.prisma.redemption.findMany({
        where: { storeId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignment: { include: { coupon: true } },
          customer: true,
        },
      }),
      this.prisma.redemption.count({ where: { storeId } }),
    ]);

    return createPaginatedResult(items, total, page, limit);
  }
}
