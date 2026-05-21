import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { createPaginatedResult, getPaginationSkip } from '../common/utils/pagination.util';
import { CustomerTier } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get customer by ID
   */
  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        couponAssignments: {
          where: { isRedeemed: false, expiresAt: { gt: new Date() } },
          include: { coupon: true },
          orderBy: { assignedAt: 'desc' },
        },
        loyaltyCards: {
          where: { isCompleted: false },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            redemptions: true,
            notifications: { where: { isRead: false } },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  /**
   * Get customer by LINE user ID
   */
  async findByLineUserId(lineUserId: string) {
    return this.prisma.customer.findUnique({
      where: { lineUserId },
    });
  }

  /**
   * Update customer profile
   */
  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        phone: dto.phone,
        email: dto.email,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      },
    });
  }

  /**
   * List customers with pagination (admin)
   */
  async findAll(query: CustomerQueryDto) {
    const { page = 1, limit = 20, search, tier, isActive } = query;
    const skip = getPaginationSkip(page, limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { lineUserId: { contains: search } },
      ];
    }

    if (tier) {
      where.tier = tier;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              couponAssignments: true,
              redemptions: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return createPaginatedResult(items, total, page, limit);
  }

  /**
   * Get points history for a customer
   */
  async getPointsHistory(customerId: string, page = 1, limit = 20) {
    const skip = getPaginationSkip(page, limit);

    const [items, total] = await Promise.all([
      this.prisma.pointTransaction.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pointTransaction.count({ where: { customerId } }),
    ]);

    return createPaginatedResult(items, total, page, limit);
  }

  /**
   * Calculate and update customer tier based on total points
   */
  async recalculateTier(customerId: string): Promise<CustomerTier> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    let newTier: CustomerTier;
    const totalPoints = customer.totalPoints;

    if (totalPoints >= 10000) {
      newTier = 'PLATINUM';
    } else if (totalPoints >= 5000) {
      newTier = 'GOLD';
    } else if (totalPoints >= 2000) {
      newTier = 'SILVER';
    } else {
      newTier = 'BRONZE';
    }

    if (newTier !== customer.tier) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { tier: newTier },
      });
    }

    return newTier;
  }
}
