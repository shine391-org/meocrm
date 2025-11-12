import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecretPayload,
  isLegacySecretPayload,
  loadAesKeyFromHex,
} from './crypto.util';

describe('crypto util helpers', () => {
  const hexKey =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('identifies encrypted payloads and legacy payloads correctly', () => {
    expect(isEncryptedSecretPayload(null)).toBe(false);
    expect(isLegacySecretPayload({})).toBe(false);

    const encryptedPayload = {
      version: 'aes-256-gcm' as const,
      iv: Buffer.alloc(12).toString('base64'),
      authTag: Buffer.alloc(16).toString('base64'),
      ciphertext: Buffer.alloc(16).toString('base64'),
    };
    expect(isEncryptedSecretPayload(encryptedPayload)).toBe(true);

    expect(isLegacySecretPayload({ legacySecret: 'shh' })).toBe(true);
  });

  it('validates AES key inputs', () => {
    expect(() => loadAesKeyFromHex()).toThrow('WEBHOOK_SECRET_KEY is not configured');
    expect(() => loadAesKeyFromHex('abcd')).toThrow('WEBHOOK_SECRET_KEY must represent 32 bytes (64 hex chars)');

    const key = loadAesKeyFromHex(hexKey);
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('encrypts and decrypts secrets end-to-end', () => {
    const key = loadAesKeyFromHex(hexKey);
    expect(() => encryptSecret('', key)).toThrow('Cannot encrypt empty secret');

    const payload = encryptSecret('webhook-secret', key);
    expect(isEncryptedSecretPayload(payload)).toBe(true);
    const plaintext = decryptSecret(payload, key);
    expect(plaintext).toBe('webhook-secret');
  });
});
