"use client";

import Link from "next/link";

export function Footer() {
    return (
        <footer className="hidden md:block border-t border-border/40 bg-background/80 backdrop-blur-sm py-6 mt-auto">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="font-serif font-semibold text-primary">Vendra</span>
                        <span>© {new Date().getFullYear()} VENDRA APP SRL</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="hover:text-primary transition-colors">
                            Términos y Condiciones
                        </Link>
                        <Link href="/privacy" className="hover:text-primary transition-colors">
                            Política de Privacidad
                        </Link>
                        <Link href="/about" className="hover:text-primary transition-colors">
                            Acerca de
                        </Link>
                        <Link href="/faq" className="hover:text-primary transition-colors">
                            FAQs
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
