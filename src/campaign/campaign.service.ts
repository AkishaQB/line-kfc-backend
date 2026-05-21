import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { createPaginatedResult, getPaginationSkip } from '../common/utils/pagination.util';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('campaign') private readonly campaignQueue: Queue,
  ) {}

  async create(dto: CreateCampaignDto) {
    // Verify coupon exists
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: dto.couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        targetAudience: dto.targetAudience || {},
        couponId: dto.couponId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isRecurring: dto.isRecurring || false,
        maxIssuances: dto.maxIssuances,
        status: 'DRAFT',
      },
      include: { coupon: true },
    });
  }

  async update(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status === 'COMPLETED') {
      throw new BadRequestException('Cannot update a completed campaign');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { coupon: true },
    });
  }

  async findById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { coupon: true },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async findAll(page = 1, limit = 20) {
    const skip = getPaginationSkip(page, limit);

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { coupon: true },
      }),
      this.prisma.campaign.count(),
    ]);

    return createPaginatedResult(items, total, page, limit);
  }

  async activate(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      throw new BadRequestException('Campaign can only be activated from DRAFT or PAUSED status');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { coupon: true },
    });

    // Queue immediate processing for MANUAL campaigns
    if (campaign.triggerType === 'MANUAL') {
      await this.campaignQueue.add('process-campaign', { campaignId: id });
    }

    return updated;
  }

  async pause(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== 'ACTIVE') {
      throw new BadRequestException('Can only pause active campaigns');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: { coupon: true },
    });
  }

  /**
   * Cron: Process active campaigns
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async processCampaigns() {
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    for (const campaign of activeCampaigns) {
      await this.campaignQueue.add('process-campaign', {
        campaignId: campaign.id,
      });
    }

    // Complete expired campaigns
    await this.prisma.campaign.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: new Date() },
      },
      data: { status: 'COMPLETED' },
    });
  }
}
