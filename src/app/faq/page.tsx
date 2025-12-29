"use client";

import { useTranslations } from "next-intl";
import { MobileHeader } from "@/components/MobileHeader";
import { Footer } from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQPage() {
    const t = useTranslations("pricing.faq"); // Reusing pricing FAQ translations for now + we can add more

    // We can eventually move these to a dedicated "faq" namespace if we have many more
    const faqs = [1, 2, 3, 4, 5, 6, 7];

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <MobileHeader />

            <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-serif font-bold mb-4 text-foreground">Preguntas Frecuentes</h1>
                    <p className="text-muted-foreground">Todo lo que necesitas saber sobre Vendra y nuestros servicios.</p>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-4">
                    {faqs.map((num) => (
                        <AccordionItem key={num} value={`item-${num}`} className="border rounded-xl px-4 bg-card/50">
                            <AccordionTrigger className="text-left font-medium text-lg py-4 hover:no-underline hover:text-primary transition-colors">
                                {t(`q${num}`)}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground pb-4 text-base leading-relaxed">
                                {t(`a${num}`)}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

                <div className="mt-16 text-center bg-primary/5 rounded-2xl p-8 border border-primary/10">
                    <h3 className="font-bold text-xl mb-2">¿Tienes más preguntas?</h3>
                    <p className="text-muted-foreground mb-6">Estamos aquí para ayudarte. Contáctanos directamente.</p>
                    <a href="mailto:soporte@vendra.com" className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                        Contactar Soporte
                    </a>
                </div>
            </main>

            <Footer />
        </div>
    );
}
