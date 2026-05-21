import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddStampDto {
  @ApiProperty({ description: 'Loyalty card ID' })
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @ApiPropertyOptional({ description: 'Store ID where stamp was earned' })
  @IsOptional()
  @IsString()
  storeId?: string;
}
