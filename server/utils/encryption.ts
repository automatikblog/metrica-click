import CryptoJS from 'crypto-js';

/**
 * Get encryption key from environment or generate a default one
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('ENCRYPTION_KEY not set in environment, using default key (not secure for production)');
    return 'metricaclick-default-key-2025';
  }
  return key;
}

/**
 * Encrypt a token or sensitive string
 */
export function encryptToken(token: string): string {
  try {
    const key = getEncryptionKey();
    const encrypted = CryptoJS.AES.encrypt(token, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a token or sensitive string
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const key = getEncryptionKey();
    const decrypted = CryptoJS.AES.decrypt(encryptedToken, key);
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Failed to decrypt token - invalid key or corrupted data');
    }
    
    return decryptedString;
  } catch (error) {
    console.error('Error decrypting token:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Hash a string using SHA256
 */
export function hashString(input: string): string {
  return CryptoJS.SHA256(input).toString();
}

/**
 * Generate a random string for use as encryption key or salt
 */
export function generateRandomKey(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Verify if a token can be decrypted (validation)
 */
export function validateEncryptedToken(encryptedToken: string): boolean {
  try {
    const decrypted = decryptToken(encryptedToken);
    return decrypted.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Create a secure storage object for sensitive data
 */
export function createSecureStorage(data: Record<string, any>): string {
  try {
    const jsonString = JSON.stringify(data);
    return encryptToken(jsonString);
  } catch (error) {
    console.error('Error creating secure storage:', error);
    throw new Error('Failed to create secure storage');
  }
}

/**
 * Retrieve data from secure storage
 */
export function retrieveSecureStorage(encryptedData: string): Record<string, any> {
  try {
    const decryptedJson = decryptToken(encryptedData);
    return JSON.parse(decryptedJson);
  } catch (error) {
    console.error('Error retrieving secure storage:', error);
    throw new Error('Failed to retrieve secure storage');
  }
}