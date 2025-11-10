import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { Public, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Register new organization' })
  @ApiResponse({ status: 201, type: OrganizationResponseDto })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user organization' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  findMine(@CurrentUser() user: any) {
    return this.organizationsService.findById(user.organizationId);
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current organization profile' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  updateMine(@CurrentUser() user: any, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(user.organizationId, dto);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Lookup organization by slug (public)' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  findPublicBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }
}
