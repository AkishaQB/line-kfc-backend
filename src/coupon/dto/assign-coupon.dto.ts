import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignCouponDto {
  @ApiProperty({ description: 'Customer IDs to assign the coupon to', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  customerIds: string[];
}
