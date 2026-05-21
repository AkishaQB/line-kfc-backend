import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { AssignCouponDto } from './dto/assign-coupon.dto';
import { CouponQueryDto } from './dto/coupon-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('coupons')
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // ==================== Admin Endpoints ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new coupon (admin)' })
  async create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all coupons (admin)' })
  async findAll(@Query() query: CouponQueryDto) {
    return this.couponService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coupon by ID (admin)' })
  async findById(@Param('id') id: string) {
    return this.couponService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update coupon (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete coupon (admin)' })
  async delete(@Param('id') id: string) {
    return this.couponService.softDelete(id);
  }

  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign coupon to customers (admin)' })
  async assign(@Param('id') id: string, @Body() dto: AssignCouponDto) {
    return this.couponService.assignToCustomers(id, dto);
  }

  // ==================== Customer Endpoints ====================

  @Get('my/active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my active coupons (customer)' })
  async getMyCoupons(@CurrentUser('id') customerId: string) {
    return this.couponService.getCustomerCoupons(customerId);
  }

  @Get('my/:assignmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coupon detail with QR code (customer)' })
  async getMyCouponDetail(
    @CurrentUser('id') customerId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.couponService.getCustomerCouponDetail(assignmentId, customerId);
  }
}
