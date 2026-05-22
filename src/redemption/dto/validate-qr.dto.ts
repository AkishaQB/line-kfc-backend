import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponCodeDto {
  @ApiProperty({ description: 'Coupon code to validate for redemption' })
  @IsString()
  @IsNotEmpty()
  couponCode: string;

  @ApiPropertyOptional({ description: 'Store ID where redemption is happening' })
  @IsOptional()
  @IsString()
  storeId?: string;
}
