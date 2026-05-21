import { IsInt, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RedeemPointsDto {
  @ApiProperty({ description: 'Number of points to redeem' })
  @IsInt()
  @Min(1)
  points: number;

  @ApiPropertyOptional({ description: 'Reward ID' })
  @IsOptional()
  @IsString()
  rewardId?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}
