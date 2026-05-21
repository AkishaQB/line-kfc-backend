import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dashboard analytics summary
   */
  async getDashboard() {
    const [
      totalCustomers,
      activeCustomers,
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      todayRedemptions,
      activeCampaigns,
      totalPoints,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { isActive: true } }),
      this.prisma.coupon.count({ where: { isDeleted: false } }),
      this.prisma.coupon.count({ where: { status: 'ACTIVE', isDeleted: false } }),
      this.prisma.redemption.count({ where: { status: 'COMPLETED' } }),
      this.prisma.redemption.count({
        where: {
          status: 'COMPLETED',
          redeemedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      this.prisma.customer.aggregate({ _sum: { totalPoints: true } }),
    ]);

    // Tier distribution
    const tierDistribution = await this.prisma.customer.groupBy({
      by: ['tier'],
      _count: { tier: true },
    });

    // Recent redemptions
    const recentRedemptions = await this.prisma.redemption.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        assignment: { include: { coupon: true } },
        customer: true,
        store: true,
      },
    });

    // Redemptions last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRedemptions = await this.prisma.redemption.groupBy({
      by: ['redeemedAt'],
      where: {
        status: 'COMPLETED',
        redeemedAt: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    return {
      overview: {
        totalCustomers,
        activeCustomers,
        totalCoupons,
        activeCoupons,
        totalRedemptions,
        todayRedemptions,
        activeCampaigns,
        totalPointsIssued: totalPoints._sum.totalPoints || 0,
      },
      tierDistribution: tierDistribution.map((t) => ({
        tier: t.tier,
        count: t._count.tier,
      })),
      recentRedemptions,
      dailyRedemptions,
    };
  }

  /**
   * Redemption report
   */
  async getRedemptionReport(startDate?: string, endDate?: string) {
    const where: any = { status: 'COMPLETED' };

    if (startDate) {
      where.redeemedAt = { ...where.redeemedAt, gte: new Date(startDate) };
    }
    if (endDate) {
      where.redeemedAt = { ...where.redeemedAt, lte: new Date(endDate) };
    }

    const [total, byStore, byCoupon] = await Promise.all([
      this.prisma.redemption.count({ where }),
      this.prisma.redemption.groupBy({
        by: ['storeId'],
        where,
        _count: true,
        _sum: { pointsEarned: true },
      }),
      this.prisma.redemption.findMany({
        where,
        include: { assignment: { include: { coupon: true } } },
      }),
    ]);

    return {
      total,
      byStore,
      couponBreakdown: byCoupon.reduce((acc: any, r) => {
        const couponTitle = r.assignment.coupon.title;
        acc[couponTitle] = (acc[couponTitle] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  /**
   * Customer analytics
   */
  async getCustomerReport() {
    const [total, newThisMonth, tierDistribution, topCustomers] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.customer.groupBy({
        by: ['tier'],
        _count: { tier: true },
        _avg: { totalPoints: true },
      }),
      this.prisma.customer.findMany({
        take: 10,
        orderBy: { totalPoints: 'desc' },
        select: {
          id: true,
          displayName: true,
          tier: true,
          points: true,
          totalPoints: true,
          _count: { select: { redemptions: true } },
        },
      }),
    ]);

    return {
      total,
      newThisMonth,
      tierDistribution,
      topCustomers,
    };
  }
}
