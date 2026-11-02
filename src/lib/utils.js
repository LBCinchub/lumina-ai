import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

// Record timestamps (created_date, updated_date) arrive in UTC without a zone
// suffix; a plain `new Date()` would read them as local time.
export function serverDate(value) {
  const s = String(value || '');
  return new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
}