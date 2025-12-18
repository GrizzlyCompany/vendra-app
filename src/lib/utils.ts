import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string | Date | undefined | null) {
  if (!date) return "Reciente";
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return `Hace ${Math.floor(interval)} años`;

  interval = seconds / 2592000;
  if (interval > 1) return `Hace ${Math.floor(interval)} meses`;

  interval = seconds / 86400;
  if (interval > 1) {
    const days = Math.floor(interval);
    return days === 1 ? "Hace 1 día" : `Hace ${days} días`;
  }

  interval = seconds / 3600;
  if (interval > 1) {
    const hours = Math.floor(interval);
    return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`;
  }

  interval = seconds / 60;
  if (interval > 1) {
    const minutes = Math.floor(interval);
    return minutes === 1 ? "Hace 1 minuto" : `Hace ${minutes} minutos`;
  }

  return "Hace un momento";
}
