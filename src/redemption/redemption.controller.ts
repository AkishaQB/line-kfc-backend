import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RedemptionService } from './redemption.service';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { CompleteRedemptionDto } from './dto/complete-redemption.dto';
import { PaginationDto } from '../common/utils/pagination.util';

@ApiTags('redemptions')
@Controller('redemptions')
@ApiBearerAuth()
export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a QR code from POS/cashier scan' })
  async validate(@Body() dto: ValidateQrDto) {
    return this.redemptionService.validateQr(dto);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Complete a redemption' })
  async redeem(@Body() dto: CompleteRedemptionDto) {
    return this.redemptionService.completeRedemption(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get redemption logs (admin)' })
  async getAll(@Query() pagination: PaginationDto) {
    return this.redemptionService.getRedemptions(pagination.page, pagination.limit);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get store-level redemption logs' })
  async getByStore(
    @Param('storeId') storeId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.redemptionService.getStoreRedemptions(storeId, pagination.page, pagination.limit);
  }
}
