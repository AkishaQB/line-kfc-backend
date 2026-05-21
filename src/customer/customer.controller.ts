import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/utils/pagination.util';

@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current customer profile' })
  async getMyProfile(@CurrentUser('id') customerId: string) {
    return this.customerService.findById(customerId);
  }

  @Put('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current customer profile' })
  async updateMyProfile(
    @CurrentUser('id') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(customerId, dto);
  }

  @Get('me/points')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get points history for current customer' })
  async getMyPointsHistory(
    @CurrentUser('id') customerId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.customerService.getPointsHistory(customerId, pagination.page, pagination.limit);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all customers (admin)' })
  async findAll(@Query() query: CustomerQueryDto) {
    return this.customerService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer by ID (admin)' })
  async findById(@Param('id') id: string) {
    return this.customerService.findById(id);
  }
}
