import * as bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function generateCode(prefix: string, number: number): string {
  return `${prefix}${String(number).padStart(6, '0')}`;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement<T>(array: T[]): T {
  if (!array.length) {
    throw new Error('randomElement requires a non-empty array');
  }
  return array[Math.floor(Math.random() * array.length)];
}

export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
