import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/utils/pagination.util';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN' as any, 'MARKETING_ADMIN' as any)
@ApiBearerAuth()
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  async create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all campaigns' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.campaignService.findAll(pagination.page, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  async findById(@Param('id') id: string) {
    return this.campaignService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update campaign' })
  async update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignService.update(id, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a campaign' })
  async activate(@Param('id') id: string) {
    return this.campaignService.activate(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a campaign' })
  async pause(@Param('id') id: string) {
    return this.campaignService.pause(id);
  }
}
