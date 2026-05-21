import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteRedemptionDto {
  @ApiProperty({ description: 'Redemption ID from validate step' })
  @IsString()
  @IsNotEmpty()
  redemptionId: string;

  @ApiPropertyOptional({ default: 10, description: 'Points to award for this redemption' })
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsEarned?: number;
}
