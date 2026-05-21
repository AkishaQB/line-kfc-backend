import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { PaginationDto } from '../common/utils/pagination.util';

@ApiTags('stores')
@Controller('stores')
@ApiBearerAuth()
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new store' })
  async create(@Body() dto: CreateStoreDto) {
    return this.storeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all stores' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.storeService.findAll(pagination.page, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  async findById(@Param('id') id: string) {
    return this.storeService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update store' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateStoreDto>) {
    return this.storeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate store' })
  async delete(@Param('id') id: string) {
    return this.storeService.delete(id);
  }
}
