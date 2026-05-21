import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsInt,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TriggerType } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TriggerType, description: 'Campaign trigger type' })
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @ApiPropertyOptional({ description: 'Target audience criteria (JSON)' })
  @IsOptional()
  @IsObject()
  targetAudience?: Record<string, any>;

  @ApiProperty({ description: 'Coupon ID to distribute' })
  @IsString()
  @IsNotEmpty()
  couponId: string;

  @ApiProperty({ description: 'Campaign start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Campaign end date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ default: false, description: 'Whether campaign recurs' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of coupon issuances' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxIssuances?: number;
}
