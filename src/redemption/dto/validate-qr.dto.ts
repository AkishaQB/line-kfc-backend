import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateQrDto {
  @ApiProperty({ description: 'QR code payload (JSON string with token, timestamp, signature)' })
  @IsString()
  @IsNotEmpty()
  qrPayload: string;

  @ApiPropertyOptional({ description: 'Store ID where redemption is happening' })
  @IsOptional()
  @IsString()
  storeId?: string;
}
