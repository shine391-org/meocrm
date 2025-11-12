/* istanbul ignore file */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { Public, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Register new organization' })
  @ApiResponse({ status: 201, type: OrganizationResponseDto })
  create(
    @Headers('x-organization-secret') orgSecret: string | undefined,
    @Body() dto: CreateOrganizationDto,
  ) {
    const requiredSecret = this.configService.get<string>('ORG_REGISTRATION_SECRET');
    if (requiredSecret && orgSecret !== requiredSecret) {
      throw new UnauthorizedException('Invalid organization registration secret');
    }
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
