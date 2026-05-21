import { PrismaClient, CouponType, DiscountType, TriggerType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ==================== Admins ====================
  const passwordHash = await bcrypt.hash('admin123', 10);

  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@coupon.local' },
    update: {},
    create: {
      email: 'superadmin@coupon.local',
      passwordHash,
      role: 'SUPER_ADMIN',
      name: 'Super Admin',
    },
  });

  const marketingAdmin = await prisma.admin.upsert({
    where: { email: 'marketing@coupon.local' },
    update: {},
    create: {
      email: 'marketing@coupon.local',
      passwordHash,
      role: 'MARKETING_ADMIN',
      name: 'Marketing Manager',
    },
  });

  const storeOperator = await prisma.admin.upsert({
    where: { email: 'store@coupon.local' },
    update: {},
    create: {
      email: 'store@coupon.local',
      passwordHash,
      role: 'STORE_OPERATOR',
      name: 'Store Manager',
    },
  });

  console.log('✅ Admins seeded');

  // ==================== Stores ====================
  const stores = await Promise.all([
    prisma.store.upsert({
      where: { code: 'KFC-001' },
      update: {},
      create: {
        name: 'KFC Central Plaza',
        code: 'KFC-001',
        address: '999 Central Plaza, Floor 3',
        city: 'Bangkok',
        latitude: 13.7563,
        longitude: 100.5018,
        phone: '02-123-4567',
      },
    }),
    prisma.store.upsert({
      where: { code: 'KFC-002' },
      update: {},
      create: {
        name: 'KFC Siam Paragon',
        code: 'KFC-002',
        address: '991 Siam Paragon, Floor G',
        city: 'Bangkok',
        latitude: 13.7462,
        longitude: 100.5347,
        phone: '02-234-5678',
      },
    }),
    prisma.store.upsert({
      where: { code: 'KFC-003' },
      update: {},
      create: {
        name: 'KFC MBK Center',
        code: 'KFC-003',
        address: '444 MBK Center, Floor 5',
        city: 'Bangkok',
        latitude: 13.7445,
        longitude: 100.5299,
        phone: '02-345-6789',
      },
    }),
    prisma.store.upsert({
      where: { code: 'KFC-004' },
      update: {},
      create: {
        name: 'KFC Terminal 21',
        code: 'KFC-004',
        address: '2 Sukhumvit Soi 19',
        city: 'Bangkok',
        latitude: 13.7379,
        longitude: 100.5604,
        phone: '02-456-7890',
      },
    }),
    prisma.store.upsert({
      where: { code: 'KFC-005' },
      update: {},
      create: {
        name: 'KFC EmQuartier',
        code: 'KFC-005',
        address: '693 Sukhumvit Road',
        city: 'Bangkok',
        latitude: 13.7310,
        longitude: 100.5696,
        phone: '02-567-8901',
      },
    }),
  ]);

  console.log('✅ Stores seeded');

  // ==================== Coupons ====================
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const coupons = await Promise.all([
    prisma.coupon.upsert({
      where: { code: 'WELCOME20' },
      update: {},
      create: {
        code: 'WELCOME20',
        type: CouponType.PERCENTAGE,
        title: 'Welcome 20% Off',
        description: 'Get 20% off your first order! Welcome to our loyalty program.',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maxDiscount: 200,
        startDate: now,
        expirationDate: sixtyDaysLater,
        usageLimit: 1000,
        perUserLimit: 1,
        termsConditions: 'Valid for new customers only. Cannot be combined with other offers.',
      },
    }),
    prisma.coupon.upsert({
      where: { code: 'SAVE50' },
      update: {},
      create: {
        code: 'SAVE50',
        type: CouponType.FIXED,
        title: '฿50 Off Your Order',
        description: 'Save ฿50 on orders above ฿300.',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 50,
        minOrderAmount: 300,
        startDate: now,
        expirationDate: thirtyDaysLater,
        usageLimit: 500,
      },
    }),
    prisma.coupon.upsert({
      where: { code: 'FREEDRINK' },
      update: {},
      create: {
        code: 'FREEDRINK',
        type: CouponType.FREE_ITEM,
        title: 'Free Pepsi',
        description: 'Get a free Pepsi with any bucket meal!',
        startDate: now,
        expirationDate: thirtyDaysLater,
        usageLimit: 2000,
        termsConditions: 'Valid with bucket meals only. One per transaction.',
      },
    }),
    prisma.coupon.upsert({
      where: { code: 'BOGO-WINGS' },
      update: {},
      create: {
        code: 'BOGO-WINGS',
        type: CouponType.BOGO,
        title: 'Buy 1 Get 1 Hot Wings',
        description: 'Buy one Hot Wings and get another one free!',
        startDate: now,
        expirationDate: thirtyDaysLater,
        usageLimit: 300,
      },
    }),
    prisma.coupon.upsert({
      where: { code: 'LOYALTY-REWARD' },
      update: {},
      create: {
        code: 'LOYALTY-REWARD',
        type: CouponType.LOYALTY_REWARD,
        title: 'Loyalty Reward: Free Zinger',
        description: 'Congratulations! Enjoy a free Zinger burger as a loyalty reward.',
        startDate: now,
        expirationDate: sixtyDaysLater,
        usageLimit: null,
        perUserLimit: 1,
      },
    }),
  ]);

  console.log('✅ Coupons seeded');

  // ==================== Sample Customers ====================
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { lineUserId: 'U_demo_user_001' },
      update: {},
      create: {
        lineUserId: 'U_demo_user_001',
        displayName: 'Somchai Demo',
        points: 1500,
        totalPoints: 3500,
        tier: 'SILVER',
        lastActiveAt: now,
      },
    }),
    prisma.customer.upsert({
      where: { lineUserId: 'U_demo_user_002' },
      update: {},
      create: {
        lineUserId: 'U_demo_user_002',
        displayName: 'Suda Demo',
        points: 500,
        totalPoints: 800,
        tier: 'BRONZE',
        lastActiveAt: now,
      },
    }),
    prisma.customer.upsert({
      where: { lineUserId: 'U_demo_user_003' },
      update: {},
      create: {
        lineUserId: 'U_demo_user_003',
        displayName: 'Chai Premium',
        points: 8500,
        totalPoints: 12000,
        tier: 'PLATINUM',
        lastActiveAt: now,
      },
    }),
  ]);

  console.log('✅ Customers seeded');

  // ==================== Sample Assignments ====================
  for (const customer of customers) {
    for (const coupon of coupons.slice(0, 3)) {
      await prisma.couponAssignment.create({
        data: {
          couponId: coupon.id,
          customerId: customer.id,
          qrToken: randomUUID(),
          expiresAt: coupon.expirationDate,
        },
      });
    }
  }

  console.log('✅ Coupon assignments seeded');

  // ==================== Sample Loyalty Cards ====================
  for (const customer of customers) {
    await prisma.loyaltyCard.create({
      data: {
        customerId: customer.id,
        name: 'Bucket Meal Stamp Card',
        description: 'Collect 10 stamps to earn a free Zinger!',
        totalSlots: 10,
        filledSlots: Math.floor(Math.random() * 8),
        rewardCouponId: coupons[4].id,
      },
    });
  }

  console.log('✅ Loyalty cards seeded');

  // ==================== Sample Campaign ====================
  await prisma.campaign.create({
    data: {
      name: 'Welcome Campaign',
      description: 'Auto-send welcome coupon to new users',
      triggerType: TriggerType.NEW_USER,
      couponId: coupons[0].id,
      startDate: now,
      endDate: sixtyDaysLater,
      status: 'ACTIVE',
    },
  });

  await prisma.campaign.create({
    data: {
      name: 'Birthday Special',
      description: 'Send free drink coupon on customer birthdays',
      triggerType: TriggerType.BIRTHDAY,
      couponId: coupons[2].id,
      startDate: now,
      endDate: sixtyDaysLater,
      status: 'ACTIVE',
      isRecurring: true,
    },
  });

  console.log('✅ Campaigns seeded');

  console.log('🎉 Database seeded successfully!');
  console.log('\n📋 Admin credentials:');
  console.log('  Super Admin: superadmin@coupon.local / admin123');
  console.log('  Marketing:   marketing@coupon.local / admin123');
  console.log('  Store Ops:   store@coupon.local / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
