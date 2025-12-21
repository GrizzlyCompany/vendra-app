"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { locales, localeNames, Locale } from "@/i18n/config";

interface LanguageSelectorProps {
    variant?: "icon" | "full";
    className?: string;
}

export function LanguageSelector({ variant = "icon", className = "" }: LanguageSelectorProps) {
    const { locale, setLocale } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const getLabel = (loc: Locale) => loc.toUpperCase();

    return (
        <div className={`relative ${className}`} ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-border/50 bg-background/80 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all text-sm font-semibold"
                aria-label="Cambiar idioma"
            >
                {variant === "full" ? (
                    <>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground mr-1">{localeNames[locale]}</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted/50 border border-border/30">{getLabel(locale)}</span>
                    </>
                ) : (
                    <>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted/50 border border-border/30">{getLabel(locale)}</span>
                    </>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50">
                    {locales.map((loc) => (
                        <button
                            key={loc}
                            onClick={() => {
                                setLocale(loc);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${locale === loc
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted/30 border border-border/20 w-8 text-center">{getLabel(loc)}</span>
                                <span className="font-medium">{localeNames[loc]}</span>
                            </div>
                            {locale === loc && <Check className="h-4 w-4" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
