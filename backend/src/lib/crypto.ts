import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const algorithm = 'aes-256-cbc';
const keyHex = process.env.ENCRYPTION_KEY || '';
const keyBuffer = Buffer.from(keyHex, 'hex');

if (keyBuffer.length !== 32) {
  console.warn('⚠️  ENCRYPTION_KEY is missing or not 32 bytes; encryption/decryption will fail.');
}

export function encrypt(text: string): string {
  if (keyBuffer.length !== 32) {
    throw new Error('Invalid encryption key');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (keyBuffer.length !== 32) {
    throw new Error('Invalid encryption key');
  }
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
