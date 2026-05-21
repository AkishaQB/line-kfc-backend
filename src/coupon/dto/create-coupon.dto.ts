import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType, DiscountType, CouponStatus } from '@prisma/client';

export class CreateCouponDto {
  @ApiPropertyOptional({ description: 'Coupon code (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ enum: CouponType, description: 'Coupon type' })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ description: 'Coupon title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Coupon description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DiscountType, description: 'Discount type' })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({ description: 'Discount value' })
  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount to use coupon' })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum discount cap' })
  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Coupon image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsOptional()
  @IsString()
  termsConditions?: string;

  @ApiProperty({ description: 'Start date (ISO string)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Expiration date (ISO string)' })
  @IsDateString()
  expirationDate: string;

  @ApiPropertyOptional({ description: 'Max total uses (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ default: 1, description: 'Max uses per customer' })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional({ enum: CouponStatus, default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;
}
