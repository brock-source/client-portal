import bcrypt from "bcrypt";

/**
 * Hash OTP code before storing in database
 * Uses bcrypt with salt rounds = 10
 */
export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

/**
 * Verify OTP code against stored hash
 */
export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Generate random string of specified length
 */
export function generateRandomString(length: number): string {
  return Math.random().toString(36).substring(2, 2 + length);
}
