"use client";

import React, { useState, useRef, useEffect } from "react";

export function CustomSelect({
    icon: Icon,
    label,
    value,
    onChange,
    options
}: {
    icon: any,
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: { value: string, label: string }[]
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <div className="flex-1 px-4 py-2 relative group" ref={containerRef}>
            <label className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground/60 mb-0.5 block">{label}</label>

            {/* Trigger */}
            <div
                className="flex items-center cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Icon className="size-4 text-primary/60 mr-2 flex-shrink-0" />
                <p className="text-sm font-medium text-foreground truncate select-none flex-1">
                    {selectedLabel}
                </p>
                {/* Chevron */}
                <svg
                    xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`ml-2 text-muted-foreground/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-full min-w-[180px] bg-background rounded-xl shadow-xl border border-border/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${value === opt.value
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-foreground hover:bg-secondary/20 font-normal'
                                    }`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                            >
                                {opt.label}
                                {value === opt.value && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
