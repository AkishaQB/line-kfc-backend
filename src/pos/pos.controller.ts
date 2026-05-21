import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PosValidateDto {
  @ApiProperty() @IsString() @IsNotEmpty() qrToken: string;
}

class PosTransactionDto {
  @ApiProperty() @IsString() @IsNotEmpty() customerId: string;
  @ApiProperty() @IsString() @IsNotEmpty() storeId: string;
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() transactionRef?: string;
}

@ApiTags('pos')
@Controller('pos')
@ApiSecurity('api-key')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('validate-coupon')
  @ApiOperation({ summary: 'Validate coupon from POS system' })
  async validateCoupon(@Body() dto: PosValidateDto) {
    return this.posService.validateCoupon(dto.qrToken);
  }

  @Post('transaction')
  @ApiOperation({ summary: 'Ingest POS transaction for points' })
  async ingestTransaction(@Body() dto: PosTransactionDto) {
    return this.posService.ingestTransaction({
      customerId: dto.customerId,
      storeId: dto.storeId,
      amount: dto.amount,
      transactionRef: dto.transactionRef || `POS-${Date.now()}`,
    });
  }
}
