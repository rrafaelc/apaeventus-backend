import * as crypto from 'crypto';
import { constants } from 'src/constants/constants';

export function encrypt(text: string): string {
  const aesKey = constants.aesKey;
  const aesIv = constants.aesIv;

  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, aesIv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export function decrypt(encryptedText: string): string {
  const aesKey = constants.aesKey;
  const aesIv = constants.aesIv;

  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, aesIv);
  let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
