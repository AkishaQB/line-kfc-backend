import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils/pagination.util';
import { CustomerTier } from '@prisma/client';

export class CustomerQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by name, email, phone, or LINE ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CustomerTier, description: 'Filter by tier' })
  @IsOptional()
  @IsEnum(CustomerTier)
  tier?: CustomerTier;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
