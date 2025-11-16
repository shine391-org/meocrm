import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebhookHMACGuard } from './webhook-hmac.guard';
import { WebhooksService } from './webhooks.service';
import { Public } from '../../auth/decorators/public.decorator';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { WebhookEntity } from './entities/webhook.entity';
import { RequestContextService } from '../../common/context/request-context.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly eventEmitter: EventEmitter2,
    private readonly requestContext: RequestContextService,
  ) {}

  @Post('handler')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(WebhookHMACGuard)
  async handleWebhook(@Body() payload: any) {
    const event = payload?.event;
    const organizationId = payload?.organizationId ?? payload?.data?.organizationId;

    if (!event || typeof event !== 'string') {
      throw new BadRequestException({
        code: 'WEBHOOK_EVENT_INVALID',
        message: 'Webhook payload must include event name.',
      });
    }

    if (!organizationId || typeof organizationId !== 'string') {
      throw new BadRequestException({
        code: 'WEBHOOK_ORG_MISSING',
        message: 'Webhook payload must include organizationId for tenant scoping.',
      });
    }

    if (payload?.data?.organizationId && payload.data.organizationId !== organizationId) {
      throw new BadRequestException({
        code: 'WEBHOOK_ORG_MISMATCH',
        message: 'organizationId mismatch between payload root and data.',
      });
    }

    await this.requestContext.run(async () => {
      this.requestContext.setContext({ organizationId });
      this.eventEmitter.emit(event, {
        ...payload,
        organizationId,
      });
    });
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List configured webhooks' })
  @ApiResponse({ status: 200, type: WebhookEntity, isArray: true })
  async list(@CurrentUser() user: User) {
    const organizationId = this.ensureOrganizationContext(user);
    return this.webhooksService.listWebhooks(organizationId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a webhook subscription' })
  @ApiResponse({ status: 201, type: WebhookEntity })
  async create(@Body() dto: CreateWebhookDto, @CurrentUser() user: User) {
    const organizationId = this.ensureOrganizationContext(user);
    return this.webhooksService.createWebhook(dto, organizationId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a webhook subscription' })
  @ApiResponse({ status: 200, type: WebhookEntity })
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookDto, @CurrentUser() user: User) {
    const organizationId = this.ensureOrganizationContext(user);
    return this.webhooksService.updateWebhook(id, dto, organizationId);
  }

  @Post(':id/test')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Param('id') id: string, @CurrentUser() user: User) {
    const organizationId = this.ensureOrganizationContext(user);

    return this.webhooksService.testWebhook(id, organizationId);
  }

  private ensureOrganizationContext(user: User): string {
    if (!user.organizationId) {
      throw new BadRequestException({
        code: 'USER_ORG_MISSING',
        message: 'User is not associated with an organization.',
      });
    }

    return user.organizationId;
  }
}
