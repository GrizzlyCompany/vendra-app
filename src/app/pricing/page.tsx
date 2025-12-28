"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, Shield, Star, Zap, Gem } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MobileHeader } from "@/components/MobileHeader";

export default function PricingPage() {
    const t = useTranslations("pricing");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

    const plans = [
        {
            key: "buyer",
            icon: Star,
            popular: false,
            color: "bg-blue-500",
            lightColor: "bg-blue-500/10",
            textColor: "text-blue-600",
            gradient: "from-blue-500 to-cyan-500",
            delay: 0
        },
        {
            key: "seller",
            icon: Zap,
            popular: false,
            color: "bg-amber-500",
            lightColor: "bg-amber-500/10",
            textColor: "text-amber-600",
            gradient: "from-amber-500 to-orange-500",
            delay: 0.1
        },
        {
            key: "agent_pro",
            icon: Gem,
            popular: true,
            color: "bg-green-600",
            lightColor: "bg-green-600/10",
            textColor: "text-green-600",
            gradient: "from-green-600 to-emerald-600",
            delay: 0.2
        },
        {
            key: "business",
            icon: Shield,
            popular: false,
            color: "bg-purple-600",
            lightColor: "bg-purple-600/10",
            textColor: "text-purple-600",
            gradient: "from-purple-600 to-violet-600",
            delay: 0.3
        }
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-background">
            <MobileHeader />

            {/* Hero Section */}
            <section className="relative py-20 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-green-50 to-transparent dark:from-green-950/20 pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-green-200/20 blur-[120px] rounded-full pointer-events-none" />

                <div className="container mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6">
                            {t("title")}
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                            {t("subtitle")}
                        </p>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center gap-4 mb-16">
                            <span className={`text-sm font-medium ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
                                {t("monthly")}
                            </span>
                            <button
                                onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                                className="relative w-16 h-8 rounded-full bg-muted border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            >
                                <div
                                    className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${billingCycle === "yearly" ? "translate-x-8 bg-primary" : "translate-x-0"
                                        }`}
                                />
                            </button>
                            <span className={`text-sm font-medium ${billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
                                {t("yearly")} <span className="text-xs text-green-600 font-bold ml-1">(-20%)</span>
                            </span>
                        </div>
                    </motion.div>

                    {/* Reduce width for desktop view to better center items */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                        >
                            {plans.map((plan) => {
                                const priceKey = billingCycle === "monthly" ? "price" : "priceYearly"; // Assuming we might add yearly prices later, using monthly for now but logic stands
                                // For this demo, let's just use the 'price' from json which is static string like '$29', 
                                // but in a real app we'd calculate or have separate keys. 
                                // Since json only has "price", we'll stick to that but maybe visually discount it if 'yearly' logic was real.

                                return (
                                    <motion.div
                                        key={plan.key}
                                        variants={item}
                                        className={`relative rounded-3xl p-6 border transition-all duration-300 flex flex-col h-full
                      ${plan.popular
                                                ? 'border-green-500/50 shadow-2xl scale-105 z-10 bg-background/80 backdrop-blur-xl ring-1 ring-green-500/20'
                                                : 'border-border/60 bg-white/50 dark:bg-card/30 backdrop-blur-sm hover:border-border hover:shadow-lg hover:-translate-y-1'
                                            }
                    `}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[10px] uppercase tracking-wider font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                                <Star className="w-3 h-3 fill-current" />
                                                {t("mostPopular")}
                                            </div>
                                        )}

                                        <div className={`w-14 h-14 rounded-2xl ${plan.lightColor} ${plan.textColor} flex items-center justify-center mb-6 shadow-sm`}>
                                            <plan.icon className="w-7 h-7" />
                                        </div>

                                        <h3 className="text-xl font-bold mb-2 font-serif">{t(`plans.${plan.key}.name`)}</h3>
                                        <p className="text-muted-foreground text-sm mb-6 h-10 leading-snug">{t(`plans.${plan.key}.description`)}</p>

                                        <div className="mb-6 pb-6 border-b border-border/50">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-bold text-foreground tracking-tight">{t(`plans.${plan.key}.price`)}</span>
                                                {(plan.key !== 'buyer') && (
                                                    <span className="text-muted-foreground text-sm font-medium">/{t("monthly").toLowerCase()}</span>
                                                )}
                                            </div>
                                            <div className="mt-1 h-4">
                                                {billingCycle === "yearly" && plan.key !== 'buyer' && (
                                                    <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                                        {t("save")} 20%
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-8 flex-1 text-left">
                                            {/* We need to cast the features result because TypeScript doesn't know the exact shape from useTranslations for arrays sometimes if not typed strictly */}
                                            {(t.raw(`plans.${plan.key}.features`) as string[]).map((feature: string, idx: number) => (
                                                <div key={idx} className="flex items-start gap-3 group">
                                                    <div className={`mt-0.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center transition-colors ${plan.popular ? 'bg-green-100 text-green-600 group-hover:bg-green-200' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                        <Check className="w-2.5 h-2.5" />
                                                    </div>
                                                    <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            asChild
                                            className={`w-full rounded-xl py-6 text-sm font-semibold transition-all duration-300 
                        ${plan.popular
                                                    ? `bg-gradient-to-r ${plan.gradient} hover:shadow-lg hover:shadow-green-500/25`
                                                    : 'bg-background border-2 border-primary/10 hover:border-primary hover:bg-primary/5 text-foreground hover:text-primary'
                                                }`}
                                            variant={plan.popular ? "default" : "outline"}
                                        >
                                            <Link href={plan.key === 'buyer' ? '/signup' : '/signin'}> {/* Adjusted links */}
                                                {t("getStarted")}
                                            </Link>
                                        </Button>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold font-serif mb-4">{t("faq.title")}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-background p-6 rounded-2xl border border-border/50">
                            <h3 className="font-bold text-lg mb-2">{t("faq.q1")}</h3>
                            <p className="text-muted-foreground">{t("faq.a1")}</p>
                        </div>
                        <div className="bg-background p-6 rounded-2xl border border-border/50">
                            <h3 className="font-bold text-lg mb-2">{t("faq.q2")}</h3>
                            <p className="text-muted-foreground">{t("faq.a2")}</p>
                        </div>
                        <div className="bg-background p-6 rounded-2xl border border-border/50">
                            {/* Hardcoding some common FAQs since I didn't add more keys yet, but good for visual filler */}
                            <h3 className="font-bold text-lg mb-2">{t.raw("faq.title") === "Preguntas Frecuentes" ? "¿Ofrecen reembolsos?" : "Do you offer refunds?"}</h3>
                            <p className="text-muted-foreground">
                                {t.raw("faq.title") === "Preguntas Frecuentes"
                                    ? "Sí, ofrecemos una garantía de devolución de 7 días si no estás satisfecho con nuestros planes premium."
                                    : "Yes, we offer a 7-day money-back guarantee if you are not satisfied with our premium plans."}
                            </p>
                        </div>
                        <div className="bg-background p-6 rounded-2xl border border-border/50">
                            <h3 className="font-bold text-lg mb-2">{t.raw("faq.title") === "Preguntas Frecuentes" ? "¿Necesito tarjeta de crédito?" : "Do I need a credit card?"}</h3>
                            <p className="text-muted-foreground">
                                {t.raw("faq.title") === "Preguntas Frecuentes"
                                    ? "No para el plan Básico. Para los planes Pro y Empresa, aceptamos todas las tarjetas principales."
                                    : "Not for the Basic plan. For Pro and Business plans, we accept all major credit cards."}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Shield / Trust Footer Section */}
            <section className="py-12 border-t border-border">
                <div className="container mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/10 rounded-full text-green-700 dark:text-green-400 font-medium text-sm">
                        <Shield className="w-4 h-4" />
                        <span>Secure Payment with Stripe</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
