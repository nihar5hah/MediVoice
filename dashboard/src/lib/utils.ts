import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export const LANGUAGES: Record<string, string> = { en: 'English', hi: 'Hindi', ta: 'Tamil' };

export const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  initiated: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  needs_follow_up: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};
