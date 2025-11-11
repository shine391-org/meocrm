
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebhooksService {
  constructor(@InjectQueue('webhook-sender') private webhookQueue: Queue) {}

  async enqueueWebhook(payload: any, endpointUrl: string, secret: string): Promise<void> {
    const deliveryId = uuidv4();
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    await this.webhookQueue.add(
      'send-webhook',
      {
        deliveryId,
        endpointUrl,
        body,
        signature,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 8s, 32s, 128s (2m 8s), ~5m 28s
        },
      },
    );
  }
}
