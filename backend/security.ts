import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const secret = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = secret();
  return `${salt}.${(await derive(password,salt,64) as Buffer).toString('hex')}`;
}
export async function checkPassword(password: string, stored?: string) {
  const [salt, expected] = (stored || '').split('.');
  const actual = await derive(password,salt || 'unused-account',64) as Buffer;
  return Boolean(expected && expected.length === 128 && timingSafeEqual(actual,Buffer.from(expected,'hex')));
}
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?:string) { super(message); }
}
