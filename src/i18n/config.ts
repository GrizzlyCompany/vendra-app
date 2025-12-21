// i18n configuration
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

export const localeNames: Record<Locale, string> = {
    es: 'Español',
    en: 'English'
};

// Storage key for language preference
export const LANGUAGE_STORAGE_KEY = 'vendra-language';
