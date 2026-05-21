import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination.util';
import { CouponStatus, CouponType } from '@prisma/client';

export class CouponQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by title or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CouponStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @ApiPropertyOptional({ enum: CouponType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;
}
