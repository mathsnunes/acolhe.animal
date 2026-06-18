import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM symmetric encryption for sensitive field storage (Asaas API keys).
 * Key loaded from FINANCE_ENCRYPTION_KEY env var (32-byte hex string).
 * Fails hard at call time if the env var is missing — never silently degrades.
 *
 * Ciphertext format: `<iv_hex>:<auth_tag_hex>:<encrypted_hex>`
 */

const getKey = (): Buffer => {
  const hex = process.env.FINANCE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'FINANCE_ENCRYPTION_KEY must be a 32-byte hex string (64 chars). Generate with: openssl rand -hex 32',
    );
  }
  return Buffer.from(hex, 'hex');
};

export const encrypt = (plaintext: string): string => {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decrypt = (ciphertext: string): string => {
  const key = getKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const ivHex = parts[0]!;
  const tagHex = parts[1]!;
  const encHex = parts[2]!;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
};
