import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const rawKey = process.env.AI_CREDENTIAL_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error('AI credential encryption key is not configured');
  }

  return createHash('sha256').update(rawKey).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(encryptedValue: string) {
  const [ivValue, authTagValue, encryptedContent] = encryptedValue.split(':');

  if (!ivValue || !authTagValue || !encryptedContent) {
    throw new Error('Invalid encrypted secret format');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivValue, 'base64');
  const authTag = Buffer.from(authTagValue, 'base64');
  const encrypted = Buffer.from(encryptedContent, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function getSecretPreview(value: string) {
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
