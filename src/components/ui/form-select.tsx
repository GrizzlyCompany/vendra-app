"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function FormSelect({
    value,
    onChange,
    options,
    placeholder = "Seleccionar...",
    className,
    disabled = false,
}: FormSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        // Use setTimeout to avoid immediate closing on the same click
        const timeoutId = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const selectedOption = options.find(o => o.value === value);
    const displayText = selectedOption?.label || placeholder;

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-10 px-3 flex items-center justify-between gap-2",
                    "rounded-lg border border-border/50 bg-background/50",
                    "text-sm font-medium transition-all duration-200",
                    "hover:border-primary/40 hover:bg-background/80",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    isOpen && "border-primary ring-2 ring-primary/20",
                    disabled && "opacity-50 cursor-not-allowed",
                    !selectedOption && "text-muted-foreground"
                )}
            >
                <span className="truncate">{displayText}</span>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                        isOpen && "rotate-180 text-primary"
                    )}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-full min-w-[160px] bg-background/95 backdrop-blur-lg rounded-xl shadow-xl border border-border/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                className={cn(
                                    "w-full px-3 py-2.5 text-sm text-left cursor-pointer transition-colors flex items-center justify-between",
                                    value === opt.value
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-foreground hover:bg-secondary/30 font-normal"
                                )}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                            >
                                {opt.label}
                                {value === opt.value && (
                                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
