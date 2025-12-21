"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PropertyDetailView } from "@/features/properties/components/PropertyDetailView";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

function PropertyDetailContent() {
    const t = useTranslations("properties");
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    if (!id) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <p className="text-muted-foreground mb-4">{t("noPropertySpecified")}</p>
                <Button asChild>
                    <Link href="/main">{t("backToHome")}</Link>
                </Button>
            </div>
        );
    }

    return <PropertyDetailView id={id} />;
}

export default function PropertyViewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
            </div>
        }>
            <PropertyDetailContent />
        </Suspense>
    );
}
