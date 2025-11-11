
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import axios from 'axios';

@Processor('webhook-sender')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  @Process('send-webhook')
  async handleSendWebhook(job: Job<any>): Promise<void> {
    const { deliveryId, endpointUrl, body, signature } = job.data;
    this.logger.log(`Attempt #${job.attemptsMade + 1}: Sending webhook ${deliveryId} to ${endpointUrl}`);

    try {
      await axios.post(endpointUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-MeoCRM-Signature': signature,
          'X-MeoCRM-Delivery': deliveryId,
        },
        timeout: 10000, // 10 seconds timeout
      });
      this.logger.log(`Webhook ${deliveryId} sent successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.warn(`Failed to send webhook ${deliveryId}. Error: ${message}`);
      // Bull will automatically retry based on the job's backoff strategy.
      // If all retries fail, the job will be moved to the 'failed' state.
      throw error; // Re-throw to let Bull know the job failed
    }
  }
}
