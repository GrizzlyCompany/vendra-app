"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { Locale, defaultLocale, locales, LANGUAGE_STORAGE_KEY } from "@/i18n/config";

// Import messages statically
import esMessages from "@/i18n/messages/es.json";
import enMessages from "@/i18n/messages/en.json";

const messages: Record<Locale, typeof esMessages> = {
    es: esMessages,
    en: enMessages,
};

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}

// Get saved locale from localStorage or detect from browser
function getSavedLocale(): Locale {
    if (typeof window === "undefined") return defaultLocale;

    // Check localStorage first
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && locales.includes(saved as Locale)) {
        return saved as Locale;
    }

    // Detect browser language
    const browserLang = navigator.language.split("-")[0];
    if (locales.includes(browserLang as Locale)) {
        return browserLang as Locale;
    }

    return defaultLocale;
}

interface LanguageProviderProps {
    children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
    const [locale, setLocaleState] = useState<Locale>(defaultLocale);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // Get saved locale after hydration
        const savedLocale = getSavedLocale();
        setLocaleState(savedLocale);
        setIsHydrated(true);
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
    };

    // During SSR or before hydration, use default locale
    const currentLocale = isHydrated ? locale : defaultLocale;

    return (
        <LanguageContext.Provider value={{ locale: currentLocale, setLocale }}>
            <NextIntlClientProvider
                locale={currentLocale}
                messages={messages[currentLocale]}
                timeZone="America/Santo_Domingo"
            >
                {children}
            </NextIntlClientProvider>
        </LanguageContext.Provider>
    );
}
