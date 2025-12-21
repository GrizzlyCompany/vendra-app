"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTranslations } from "next-intl";

export function MobileHeader() {
  const tAuth = useTranslations("auth");
  const { user, loading } = useAuth();

  // Don't show the mobile header if user is authenticated (they'll see the regular navbar)
  if (loading || user) {
    return null;
  }

  return (
    <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur border-b mobile-horizontal-safe mobile-top-safe">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 min-h-[60px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" aria-label="Ir al inicio">
          <Image
            src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/logo3.png"
            alt="Logotipo de Vendra"
            width={96}
            height={36}
            className="h-8 w-auto"
            priority
          />
          <span className="text-lg font-serif font-bold tracking-wide text-primary">VENDRA</span>
        </Link>

        {/* Login Button */}
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full min-h-[44px] px-4">
          <Link href="/login">
            <LogIn className="size-4 mr-2" />
            {tAuth("login")}
          </Link>
        </Button>
      </div>
    </header>
  );
}