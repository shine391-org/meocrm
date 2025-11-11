import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendTelegramDigest(message: string): Promise<void> {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      this.logger.error('Telegram bot token or chat ID is not configured');
      return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      });
      this.logger.log('Successfully sent Telegram digest');
    } catch (error) {
      this.logger.error('Failed to send Telegram digest', error instanceof Error ? error.stack : error);
    }
  }
}
