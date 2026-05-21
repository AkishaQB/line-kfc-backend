import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';

@Processor('notification')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineService: LineService,
  ) {}

  @Process('bulk-push')
  async handleBulkPush(
    job: Job<{ title: string; body: string; customerIds?: string[] }>,
  ) {
    const { title, body, customerIds } = job.data;
    this.logger.log(`Processing bulk push: ${title}`);

    const where: any = { isActive: true };
    if (customerIds && customerIds.length > 0) {
      where.id = { in: customerIds };
    }

    const customers = await this.prisma.customer.findMany({
      where,
      select: { id: true, lineUserId: true },
    });

    const message = `${title}\n${body}`;

    // Create notification records in batch
    await this.prisma.notification.createMany({
      data: customers.map((c) => ({
        customerId: c.id,
        type: 'CAMPAIGN' as const,
        title,
        body,
      })),
    });

    // Send LINE messages in batches of 500
    const lineUserIds = customers.map((c) => c.lineUserId).filter(Boolean) as string[];
    const batchSize = 500;

    for (let i = 0; i < lineUserIds.length; i += batchSize) {
      const batch = lineUserIds.slice(i, i + batchSize);
      try {
        await this.lineService.multicast(batch, message);
      } catch (error) {
        this.logger.error(`Failed to send batch ${i / batchSize}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk push complete: sent to ${customers.length} customers`);
  }
}
