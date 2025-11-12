import axios from 'axios';
import { NotificationsService } from './notifications.service';

jest.mock('axios');

describe('NotificationsService', () => {
  const axiosMock = axios as jest.Mocked<typeof axios>;
  let configMock: { get: jest.Mock };
  let settingsMock: { get: jest.Mock };
  let service: NotificationsService;

  beforeEach(() => {
    configMock = { get: jest.fn() };
    settingsMock = { get: jest.fn() };
    service = new NotificationsService(configMock as any, settingsMock as any);
    (service as any).logger = {
      log: jest.fn(),
      error: jest.fn(),
    };
    axiosMock.post.mockReset();
  });

  it('logs an error when Telegram credentials are missing', async () => {
    configMock.get.mockReturnValue(undefined);

    await service.sendTelegramDigest('hello');

    expect((service as any).logger.error).toHaveBeenCalledWith(
      'Telegram bot token or chat ID is not configured',
    );
    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  it('posts to Telegram API when credentials are configured', async () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'token';
      if (key === 'TELEGRAM_CHAT_ID') return '123';
      if (key === 'TELEGRAM_TIMEOUT_MS') return '4500';
      return undefined;
    });
    axiosMock.post.mockResolvedValue({ data: { ok: true } });

    await service.sendTelegramDigest('update!');

    expect(axiosMock.post).toHaveBeenCalledWith(
      'https://api.telegram.org/bottoken/sendMessage',
      expect.objectContaining({
        chat_id: '123',
        text: 'update!',
      }),
      { timeout: 4500 },
    );
    expect((service as any).logger.log).toHaveBeenCalledWith('Successfully sent Telegram digest');
  });

  it('rethrows when Telegram API call fails', async () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'token';
      if (key === 'TELEGRAM_CHAT_ID') return '123';
      if (key === 'TELEGRAM_TIMEOUT_MS') return '1000';
      return undefined;
    });
    axiosMock.post.mockRejectedValue(new Error('network down'));

    await expect(service.sendTelegramDigest('oops')).rejects.toThrow('network down');
    expect((service as any).logger.error).toHaveBeenCalled();
  });

  it('skips staff notifications when feature flag is disabled', async () => {
    settingsMock.get.mockResolvedValueOnce(false);

    await service.sendToStaff('payload');

    expect((service as any).logger.log).toHaveBeenCalledWith(
      'Skipping staff notification (disabled or provider mismatch).',
    );
    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  it('skips staff notifications when provider is not Telegram', async () => {
    settingsMock.get.mockResolvedValueOnce(true).mockResolvedValueOnce('email');

    await service.sendToStaff('payload');

    expect((service as any).logger.log).toHaveBeenCalledWith(
      'Skipping staff notification (disabled or provider mismatch).',
    );
    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  it('delegates to Telegram digest when staff notifications are enabled', async () => {
    settingsMock.get.mockResolvedValueOnce(true).mockResolvedValueOnce('telegram');
    const digestSpy = jest.spyOn(service, 'sendTelegramDigest').mockResolvedValue(undefined);

    await service.sendToStaff('important');

    expect(digestSpy).toHaveBeenCalledWith('important');
  });
});
