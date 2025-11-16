import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';

const AES_GCM_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH_BYTES = 32;
const GCM_IV_LENGTH_BYTES = 12;

export interface EncryptedSecretPayload {
  version: 'aes-256-gcm';
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface LegacySecretPayload {
  legacySecret: string;
}

export type StoredSecretPayload = EncryptedSecretPayload | LegacySecretPayload | null;

export const isEncryptedSecretPayload = (value: unknown): value is EncryptedSecretPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const payload = value as Record<string, unknown>;
  return (
    payload.version === 'aes-256-gcm' &&
    typeof payload.iv === 'string' &&
    typeof payload.authTag === 'string' &&
    typeof payload.ciphertext === 'string'
  );
};

export const isLegacySecretPayload = (value: unknown): value is LegacySecretPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const payload = value as Record<string, unknown>;
  return typeof payload.legacySecret === 'string' && payload.legacySecret.length > 0;
};

export const loadAesKeyFromHex = (hexKey?: string): Buffer => {
  if (!hexKey) {
    throw new Error('WEBHOOK_SECRET_KEY is not configured');
  }
  const normalized = hexKey.trim();
  if (!/^[0-9a-f]+$/i.test(normalized)) {
    throw new Error('WEBHOOK_SECRET_KEY must be a hex string');
  }
  const keyBuffer = Buffer.from(normalized, 'hex');
  if (keyBuffer.length !== KEY_LENGTH_BYTES) {
    throw new Error('WEBHOOK_SECRET_KEY must represent 32 bytes (64 hex chars)');
  }
  return keyBuffer;
};

export const encryptSecret = (plaintext: string, key: Buffer): EncryptedSecretPayload => {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty secret');
  }
  const iv = randomBytes(GCM_IV_LENGTH_BYTES);
  const cipher = createCipheriv(AES_GCM_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: 'aes-256-gcm',
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
};

export const decryptSecret = (payload: EncryptedSecretPayload, key: Buffer): string => {
  try {
    const iv = Buffer.from(payload.iv, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    const decipher = createDecipheriv(AES_GCM_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  } catch (error) {
    const logger = new Logger('CryptoUtil');
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to decrypt webhook secret', {
      sanitized: true,
      message: message.slice(0, 200),
    });
    throw new Error('Failed to decrypt webhook secret');
  }
};
