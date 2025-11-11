
import { Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramProvider {
  private readonly logger = new Logger(TelegramProvider.name);

  async sendMessage(botToken: string, chatId: string, message: string): Promise<void> {
    try {
      const bot = new Telegraf(botToken);
      await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      this.logger.log(`Sent Telegram message to chat ID ${chatId}`);
    } catch (error) {
      this.logger.error(`Failed to send Telegram message to chat ID ${chatId}`, error);
      throw error;
    }
  }
}
