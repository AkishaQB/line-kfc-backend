import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { AddStampDto } from './dto/add-stamp.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('loyalty')
@Controller('loyalty')
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('cards')
  @ApiOperation({ summary: 'Get my stamp cards' })
  async getMyCards(@CurrentUser('id') customerId: string) {
    return this.loyaltyService.getStampCards(customerId);
  }

  @Get('cards/:id')
  @ApiOperation({ summary: 'Get stamp card detail' })
  async getCard(@Param('id') id: string) {
    return this.loyaltyService.getStampCard(id);
  }

  @Post('stamps')
  @ApiOperation({ summary: 'Add a stamp (POS/store triggered)' })
  async addStamp(@Body() dto: AddStampDto) {
    return this.loyaltyService.addStamp(dto);
  }

  @Get('points')
  @ApiOperation({ summary: 'Get points balance and history' })
  async getPoints(@CurrentUser('id') customerId: string) {
    return this.loyaltyService.getPointsInfo(customerId);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem points for a reward' })
  async redeemPoints(
    @CurrentUser('id') customerId: string,
    @Body() dto: RedeemPointsDto,
  ) {
    return this.loyaltyService.redeemPoints(customerId, dto);
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Get tier info and progress' })
  async getTierInfo(@CurrentUser('id') customerId: string) {
    return this.loyaltyService.getTierInfo(customerId);
  }
}
