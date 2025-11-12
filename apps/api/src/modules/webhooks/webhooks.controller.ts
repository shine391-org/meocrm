/* istanbul ignore file */
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebhookHMACGuard } from './webhook-hmac.guard';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { WebhookEntity } from './entities/webhook.entity';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('handler')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(WebhookHMACGuard)
  async handleWebhook(@Body() payload: any) {
    if (payload.event) {
      this.eventEmitter.emit(payload.event, payload);
    }
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List configured webhooks' })
  @ApiResponse({ status: 200, type: WebhookEntity, isArray: true })
  async list(@CurrentUser() user: User) {
    return this.webhooksService.listWebhooks(user.organizationId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a webhook subscription' })
  @ApiResponse({ status: 201, type: WebhookEntity })
  async create(@Body() dto: CreateWebhookDto, @CurrentUser() user: User) {
    return this.webhooksService.createWebhook(dto, user.organizationId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a webhook subscription' })
  @ApiResponse({ status: 200, type: WebhookEntity })
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookDto, @CurrentUser() user: User) {
    return this.webhooksService.updateWebhook(id, dto, user.organizationId);
  }

  @Post(':id/test')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async testWebhook(@Param('id') id: string, @CurrentUser() user: User) {
    return this.webhooksService.testWebhook(id, user.organizationId);
  }
}
