import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: format,
    timeStyle: 'short',
  }).format(new Date(date));
}

export function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
