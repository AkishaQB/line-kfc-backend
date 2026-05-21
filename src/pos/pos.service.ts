import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a coupon from POS system
   */
  async validateCoupon(qrToken: string) {
    const assignment = await this.prisma.couponAssignment.findUnique({
      where: { qrToken },
      include: {
        coupon: true,
        customer: true,
      },
    });

    if (!assignment) {
      throw new BadRequestException('Invalid coupon');
    }

    if (assignment.isRedeemed) {
      throw new BadRequestException('Coupon already redeemed');
    }

    if (new Date() > assignment.expiresAt) {
      throw new BadRequestException('Coupon expired');
    }

    return {
      valid: true,
      coupon: {
        title: assignment.coupon.title,
        type: assignment.coupon.type,
        discountType: assignment.coupon.discountType,
        discountValue: assignment.coupon.discountValue,
        minOrderAmount: assignment.coupon.minOrderAmount,
      },
      customer: {
        displayName: assignment.customer.displayName,
        tier: assignment.customer.tier,
      },
    };
  }

  /**
   * Ingest a POS transaction for points
   */
  async ingestTransaction(data: {
    customerId: string;
    storeId: string;
    amount: number;
    transactionRef: string;
  }) {
    // Calculate points (e.g., 1 point per $1 spent)
    const points = Math.floor(data.amount);

    // Award points
    const [customer] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: data.customerId },
        data: {
          points: { increment: points },
          totalPoints: { increment: points },
          lastActiveAt: new Date(),
        },
      }),
      this.prisma.pointTransaction.create({
        data: {
          customerId: data.customerId,
          points,
          type: 'EARNED',
          description: `Purchase at store - $${data.amount}`,
          referenceId: data.transactionRef,
        },
      }),
    ]);

    return {
      pointsEarned: points,
      totalPoints: customer.points,
      tier: customer.tier,
    };
  }
}
