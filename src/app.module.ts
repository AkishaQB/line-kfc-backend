import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LineModule } from './line/line.module';
import { CustomerModule } from './customer/customer.module';
import { CouponModule } from './coupon/coupon.module';
import { CampaignModule } from './campaign/campaign.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { RedemptionModule } from './redemption/redemption.module';
import { NotificationModule } from './notification/notification.module';
import { StoreModule } from './store/store.module';
import { PosModule } from './pos/pos.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100,  // 100 requests per minute
      },
    ]),

    // Cron jobs
    ScheduleModule.forRoot(),

    // BullMQ job queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),

    // Core modules
    PrismaModule,
    AuthModule,
    LineModule,
    CustomerModule,
    CouponModule,
    CampaignModule,
    LoyaltyModule,
    RedemptionModule,
    NotificationModule,
    StoreModule,
    PosModule,
    AdminModule,
  ],
})
export class AppModule {}
