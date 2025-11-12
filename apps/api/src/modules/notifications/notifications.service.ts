import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
  ) {}

  async sendTelegramDigest(message: string): Promise<void> {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      this.logger.error('Telegram bot token or chat ID is not configured');
      return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const timeoutMs =
      Number(this.configService.get<string>('TELEGRAM_TIMEOUT_MS')) || 5000;

    try {
      await axios.post(
        url,
        {
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        },
        { timeout: timeoutMs },
      );
      this.logger.log('Successfully sent Telegram digest');
    } catch (error) {
      this.logger.error('Failed to send Telegram digest', error instanceof Error ? error.stack : error);
      throw (error instanceof Error ? error : new Error('Failed to send Telegram digest'));
    }
  }

  async sendToStaff(message: string): Promise<void> {
    const staffNotificationsEnabled = await this.settingsService.get(
      'notifications.staff.enabled',
    );
    const provider = await this.settingsService.get(
      'notifications.staff.provider',
    );

    if (!staffNotificationsEnabled || provider !== 'telegram') {
      this.logger.log(
        'Skipping staff notification (disabled or provider mismatch).',
      );
      return;
    }

    await this.sendTelegramDigest(message);
  }
}
