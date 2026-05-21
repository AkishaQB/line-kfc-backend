import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { AssignCouponDto } from './dto/assign-coupon.dto';
import { CouponQueryDto } from './dto/coupon-query.dto';
import { createPaginatedResult, getPaginationSkip } from '../common/utils/pagination.util';
import { generateSecureToken, generateCouponCode } from '../common/utils/crypto.util';
import { generateQrDataUrl, generateQrPayload } from '../common/utils/qr.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new coupon
   */
  async create(dto: CreateCouponDto) {
    // Generate unique code if not provided
    const code = dto.code || generateCouponCode('CPN');

    // Check for duplicate code
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`Coupon code "${code}" already exists`);
    }

    return this.prisma.coupon.create({
      data: {
        code,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        imageUrl: dto.imageUrl,
        termsConditions: dto.termsConditions,
        startDate: new Date(dto.startDate),
        expirationDate: new Date(dto.expirationDate),
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit || 1,
        status: dto.status || 'ACTIVE',
      },
    });
  }

  /**
   * Update a coupon
   */
  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon || coupon.isDeleted) {
      throw new NotFoundException('Coupon not found');
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
      },
    });
  }

  /**
   * Soft delete a coupon
   */
  async softDelete(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.update({
      where: { id },
      data: { isDeleted: true, status: 'INACTIVE' },
    });
  }

  /**
   * Get coupon by ID
   */
  async findById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    if (!coupon || coupon.isDeleted) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  /**
   * List coupons with filtering (admin)
   */
  async findAll(query: CouponQueryDto) {
    const { page = 1, limit = 20, search, status, type } = query;
    const skip = getPaginationSkip(page, limit);

    const where: any = { isDeleted: false };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { assignments: true } },
        },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return createPaginatedResult(items, total, page, limit);
  }

  /**
   * Assign a coupon to customer(s)
   */
  async assignToCustomers(couponId: string, dto: AssignCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon || coupon.isDeleted) {
      throw new NotFoundException('Coupon not found');
    }

    if (coupon.status !== 'ACTIVE') {
      throw new BadRequestException('Coupon is not active');
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const assignments = [];

    for (const customerId of dto.customerIds) {
      // Check per-user limit
      const existingCount = await this.prisma.couponAssignment.count({
        where: {
          couponId,
          customerId,
          isRedeemed: false,
        },
      });

      if (existingCount >= coupon.perUserLimit) {
        this.logger.warn(
          `Customer ${customerId} already has max assignments for coupon ${couponId}`,
        );
        continue;
      }

      const qrToken = generateSecureToken();

      const assignment = await this.prisma.couponAssignment.create({
        data: {
          couponId,
          customerId,
          qrToken,
          expiresAt: coupon.expirationDate,
        },
        include: { coupon: true },
      });

      assignments.push(assignment);
    }

    return assignments;
  }

  /**
   * Get active coupons for a customer
   */
  async getCustomerCoupons(customerId: string) {
    return this.prisma.couponAssignment.findMany({
      where: {
        customerId,
        isRedeemed: false,
        expiresAt: { gt: new Date() },
        coupon: {
          status: 'ACTIVE',
          isDeleted: false,
        },
      },
      include: { coupon: true },
      orderBy: { expiresAt: 'asc' },
    });
  }

  /**
   * Get customer coupon assignment with QR code
   */
  async getCustomerCouponDetail(assignmentId: string, customerId: string) {
    const assignment = await this.prisma.couponAssignment.findFirst({
      where: {
        id: assignmentId,
        customerId,
      },
      include: { coupon: true },
    });

    if (!assignment) {
      throw new NotFoundException('Coupon assignment not found');
    }

    // Generate QR code
    const hmacSecret = this.configService.get<string>('QR_HMAC_SECRET', 'default');
    const qrPayload = generateQrPayload(assignment.qrToken, hmacSecret);
    const qrDataUrl = await generateQrDataUrl(qrPayload);

    return {
      ...assignment,
      qrCode: qrDataUrl,
    };
  }

  /**
   * Cron: Expire coupons past their expiration date
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireCoupons() {
    const result = await this.prisma.coupon.updateMany({
      where: {
        status: 'ACTIVE',
        expirationDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} coupons`);
    }
  }
}
