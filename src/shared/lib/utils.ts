import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { DisplayDateOptions } from '@/shared/lib/display-format.util'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
  formatOrganisationTime,
} from '@/shared/lib/organisation-display-format.store'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(
  date: Date | string | null | undefined,
  options?: DisplayDateOptions,
): string {
  return formatOrganisationDate(date, options)
}

export function formatDateTime(
  date: Date | string | null | undefined,
  options?: DisplayDateOptions,
): string {
  return formatOrganisationDateTime(date, options)
}

export function formatTime(date: Date | string, options?: DisplayDateOptions): string {
  return formatOrganisationTime(date, options)
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.substring(0, length)}...` : str
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .trim()
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 9)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), ms)
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
