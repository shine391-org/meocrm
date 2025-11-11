import { Controller, Post, UseGuards, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebhookHMACGuard } from './webhook-hmac.guard';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

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

  @Post(':id/test')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async testWebhook(@Param('id') id: string) {
    return this.webhooksService.testWebhook(id);
  }
}
