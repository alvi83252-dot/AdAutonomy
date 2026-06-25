import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

export function getEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}
