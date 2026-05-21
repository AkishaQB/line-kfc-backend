import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('reports/redemptions')
  @ApiOperation({ summary: 'Get redemption report' })
  async getRedemptionReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getRedemptionReport(startDate, endDate);
  }

  @Get('reports/customers')
  @ApiOperation({ summary: 'Get customer analytics' })
  async getCustomerReport() {
    return this.adminService.getCustomerReport();
  }
}
