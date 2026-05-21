import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { createPaginatedResult, getPaginationSkip } from '../common/utils/pagination.util';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStoreDto) {
    const existing = await this.prisma.store.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Store code "${dto.code}" already exists`);

    return this.prisma.store.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateStoreDto>) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    return this.prisma.store.update({ where: { id }, data: dto });
  }

  async findById(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        _count: { select: { redemptions: true } },
      },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async findAll(page = 1, limit = 20) {
    const skip = getPaginationSkip(page, limit);

    const [items, total] = await Promise.all([
      this.prisma.store.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { redemptions: true } } },
      }),
      this.prisma.store.count(),
    ]);

    return createPaginatedResult(items, total, page, limit);
  }

  async delete(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    return this.prisma.store.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
