import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import express from 'express';

export const API_PORT_DEFAULT = 2003;
export const PORT_MIN = 1;
export const PORT_MAX = 65535;
export const WEBHOOK_RAW_BODY_DEFAULT = '1mb';

export function resolveApiPort(configService: ConfigService, fallback = API_PORT_DEFAULT): number {
  const port = configService.get<string>('PORT');
  if (port) {
    return parsePort(port, 'PORT');
  }

  const apiPort = configService.get<string>('API_PORT');
  if (apiPort) {
    return parsePort(apiPort, 'API_PORT');
  }

  return fallback;
}

export function resolveWebhookRawLimit(
  configService: ConfigService,
  defaultLimit = WEBHOOK_RAW_BODY_DEFAULT,
): string {
  return configService.get<string>('WEBHOOK_MAX_BODY') ?? defaultLimit;
}

export function createWebhookRawMiddleware(limit: string) {
  return express.raw({ type: '*/*', limit });
}

function parsePort(value: string, source: 'PORT' | 'API_PORT'): number {
  const parsed = Number.parseInt(value, 10);
  const isValid = Number.isInteger(parsed) && parsed >= PORT_MIN && parsed <= PORT_MAX;
  if (!isValid) {
    throw new InternalServerErrorException(
      `${source} must be an integer between ${PORT_MIN} and ${PORT_MAX}. Received "${value}".`,
    );
  }
  return parsed;
}
