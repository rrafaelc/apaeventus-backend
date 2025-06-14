import * as crypto from 'crypto';
import { CryptoConstants } from 'src/constants/crypto.constants';

const algorithm = 'aes-256-cbc';
const secretKey = CryptoConstants.crypto_secret_key!;
const iv = Buffer.alloc(16, 0);

export function encrypt(text: string) {
  const key = crypto
    .createHash('sha256')
    .update(secretKey)
    .digest('base64')
    .substring(0, 32);

  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(encrypted: string) {
  const key = crypto
    .createHash('sha256')
    .update(secretKey)
    .digest('base64')
    .substring(0, 32);

  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
