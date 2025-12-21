import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string | Date | undefined | null, locale: string = 'es') {
  if (!date) return locale === 'es' ? "Reciente" : "Recent";
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  const isEs = locale === 'es';

  let interval = seconds / 31536000;
  if (interval > 1) {
    const num = Math.floor(interval);
    if (isEs) return `Hace ${num} ${num === 1 ? 'año' : 'años'}`;
    return `${num} ${num === 1 ? 'year' : 'years'} ago`;
  }

  interval = seconds / 2592000;
  if (interval > 1) {
    const num = Math.floor(interval);
    if (isEs) return `Hace ${num} ${num === 1 ? 'mes' : 'meses'}`;
    return `${num} ${num === 1 ? 'month' : 'months'} ago`;
  }

  interval = seconds / 86400;
  if (interval > 1) {
    const num = Math.floor(interval);
    if (isEs) return `Hace ${num} ${num === 1 ? 'día' : 'días'}`;
    return `${num} ${num === 1 ? 'day' : 'days'} ago`;
  }

  interval = seconds / 3600;
  if (interval > 1) {
    const num = Math.floor(interval);
    if (isEs) return `Hace ${num} ${num === 1 ? 'hora' : 'horas'}`;
    return `${num} ${num === 1 ? 'hour' : 'hours'} ago`;
  }

  interval = seconds / 60;
  if (interval > 1) {
    const num = Math.floor(interval);
    if (isEs) return `Hace ${num} ${num === 1 ? 'minuto' : 'minutos'}`;
    return `${num} ${num === 1 ? 'minute' : 'minutes'} ago`;
  }

  return isEs ? "Hace un momento" : "Just now";
}
