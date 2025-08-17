import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Güvenli Object.entries kullanımı için utility fonksiyon
 * @param obj - Kontrol edilecek obje
 * @returns Güvenli entries array veya boş array
 */
export const safeObjectEntries = <T extends Record<string, any>>(obj: T | null | undefined): [string, any][] => {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.entries(obj);
  }
  return [];
};

/**
 * Güvenli Object.keys kullanımı için utility fonksiyon
 * @param obj - Kontrol edilecek obje
 * @returns Güvenli keys array veya boş array
 */
export const safeObjectKeys = <T extends Record<string, any>>(obj: T | null | undefined): string[] => {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.keys(obj);
  }
  return [];
};

/**
 * Güvenli Object.values kullanımı için utility fonksiyon
 * @param obj - Kontrol edilecek obje
 * @returns Güvenli values array veya boş array
 */
export const safeObjectValues = <T extends Record<string, any>>(obj: T | null | undefined): any[] => {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.values(obj);
  }
  return [];
};
