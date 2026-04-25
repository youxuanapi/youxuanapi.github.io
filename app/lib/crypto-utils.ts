import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_DERIVATION_SALT = 'youxuanai-prompt-v1';

function getKey(): Buffer {
  const secret = process.env.PROMPT_SECRET_KEY;
  if (!secret) {
    throw new Error('PROMPT_SECRET_KEY is not configured in environment variables');
  }
  return crypto.scryptSync(secret, KEY_DERIVATION_SALT, 32);
}

export function encryptPrompt(text: string): string {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]).toString('base64');

    return result;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt prompt');
  }
}

export function decryptPrompt(hash: string): string {
  try {
    const key = getKey();
    const buffer = Buffer.from(hash, 'base64');

    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt prompt - invalid key or corrupted data');
  }
}

export function generateSecureId(): string {
  return crypto.randomUUID();
}
