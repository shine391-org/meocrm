import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly settingsService: SettingsService) {}

  async sendToStaff(message: string): Promise<void> {
    const staffNotificationsEnabled = await this.settingsService.get(
      'notifications.staff.enabled',
    );
    const provider = await this.settingsService.get(
      'notifications.staff.provider',
    );

    if (!staffNotificationsEnabled || provider !== 'telegram') {
      this.logger.log(
        'Skipping staff notification (disabled or provider is not telegram).',
      );
      return;
    }

    // TODO: Implement actual Telegram sending logic
    this.logger.log(`[Mock Telegram] Sending to staff: ${message}`);
  }
}
