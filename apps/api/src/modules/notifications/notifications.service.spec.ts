import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';
import axios from 'axios';

jest.mock('axios');

describe('NotificationsService', () => {
  let service: NotificationsService;
  const config = {
    get: jest.fn(),
  };
  const settings = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: ConfigService, useValue: config },
        { provide: SettingsService, useValue: settings },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
    config.get.mockReset();
    settings.get.mockReset();
    (axios.post as jest.Mock).mockReset();
  });

  it('skips Telegram digest when credentials are missing', async () => {
    config.get.mockReturnValueOnce(undefined);

    const loggerError = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

    await service.sendTelegramDigest('hello');

    expect(loggerError).toHaveBeenCalledWith('Telegram bot token or chat ID is not configured');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('sends Telegram digest when config exists', async () => {
    config.get.mockReturnValueOnce('bot-token').mockReturnValueOnce('@channel');
    (axios.post as jest.Mock).mockResolvedValue({ data: { ok: true } });
    const loggerLog = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

    await service.sendTelegramDigest('hello world');

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.telegram.org/botbot-token/sendMessage',
      expect.objectContaining({ chat_id: '@channel', text: 'hello world' }),
    );
    expect(loggerLog).toHaveBeenCalledWith('Successfully sent Telegram digest');
  });

  it('skips staff notifications when disabled', async () => {
    settings.get.mockResolvedValueOnce(false);
    settings.get.mockResolvedValueOnce('telegram');
    const loggerLog = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

    await service.sendToStaff('message');

    expect(loggerLog).toHaveBeenCalledWith('Skipping staff notification (disabled or provider mismatch).');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('relays staff notifications to Telegram when enabled', async () => {
    settings.get.mockResolvedValueOnce(true);
    settings.get.mockResolvedValueOnce('telegram');
    config.get.mockReturnValueOnce('token').mockReturnValueOnce('chat');
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });

    await service.sendToStaff('alert');

    expect(axios.post).toHaveBeenCalled();
  });
});
