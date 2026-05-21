import { Controller, Get, Put, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/utils/pagination.util';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SendPushDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @IsString() @IsNotEmpty() body: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() customerIds?: string[];
}

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async getMyNotifications(
    @CurrentUser('id') customerId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.notificationService.getCustomerNotifications(
      customerId,
      pagination.page,
      pagination.limit,
    );
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') customerId: string,
  ) {
    return this.notificationService.markAsRead(id, customerId);
  }

  @Post('push')
  @ApiOperation({ summary: 'Send push notification (admin)' })
  async sendPush(@Body() dto: SendPushDto) {
    return this.notificationService.sendBulkPush(dto.title, dto.body, dto.customerIds);
  }
}
