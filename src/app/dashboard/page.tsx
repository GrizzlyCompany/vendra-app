"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Sidebar, type DashboardSection } from "@/components/dashboard/Sidebar";
import { PropertiesSection } from "@/components/dashboard/Properties";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { handleSupabaseError } from "@/lib/errors";
import { syncUserRole } from "@/lib/roleUtils";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user, loading: authLoading } = useAuth();
  const { error: showError } = useToastContext();
  const router = useRouter();
  const [section, setSection] = useState<DashboardSection>("mis");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    let mounted = true;
    const checkAuthorization = async () => {
      try {
        // Sync user role between auth metadata and database
        const effectiveRole = await syncUserRole(user.id) ?? "";
        if (!mounted) return;

        if (effectiveRole === "empresa_constructora") {
          setAuthorized(true);
        } else {
          showError(t("noPermissions"));
          router.push("/profile");
        }
      } catch (err) {
        if (mounted) {
          const error = handleSupabaseError(err);
          showError(t("errorVerifyingPermissions"), error.message);
          router.push("/profile");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuthorization();

    return () => { mounted = false; };
  }, [user, authLoading, router, showError]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100dvh-64px)] bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t("verifyingPermissions")}</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return <div className="min-h-[calc(100dvh-64px)] bg-background" />;
  }

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-background/50 font-sans mobile-bottom-safe mobile-horizontal-safe">
      {/* Sidebar background visual for desktop */}
      <div className="hidden md:block fixed inset-y-0 left-0 w-72 bg-gradient-to-br from-sidebar via-sidebar/95 to-background z-0" />

      {/* Sidebar Component */}
      <Sidebar section={section} onChange={setSection} />

      {/* Main content Area */}
      <div className="md:pl-72 transition-all duration-300 relative z-10">

        {/* Sticky Header with Blur */}
        <header className="sticky top-0 z-20 border-b border-white/5 bg-background/80 backdrop-blur-xl mobile-top-safe supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-20 items-center justify-between px-6 lg:px-10">
            <div className="flex flex-col">
              <h1 className="font-serif text-2xl md:text-3xl text-foreground font-bold tracking-tight">
                {section === "mis" && t("myProperties")}
                {section === "agregar" && t("newProject")}
                {section === "estadisticas" && t("analytics")}
                {section === "mensajes" && t("sidebar.messages")}
                {section === "perfil" && t("sidebar.profile")}
              </h1>
              <p className="text-xs text-muted-foreground font-medium hidden md:block mt-0.5">
                {section === "mis" && t("managePortfolio")}
                {section === "agregar" && t("publishProperty")}
                {section === "estadisticas" && t("analyzePerformance")}
                {section === "mensajes" && t("communicateClients")}
                {section === "perfil" && t("accountSettings")}
              </p>
            </div>

            {/* Quick Actions / Status Placeholder */}
            <div className="hidden md:flex items-center gap-4">
              <div className="h-9 px-4 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-2 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {t("activeSystem")}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="mx-auto max-w-7xl px-4 sm:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 mx-safe">
          <div className="min-h-[500px]">
            {section === "mis" && <PropertiesSection onAdd={() => setSection("agregar")} />}
            {section === "agregar" && <DynamicAddPropertySection />}
            {section === "estadisticas" && <DynamicStatsSection />}
            {section === "mensajes" && <DynamicMessagesSection />}
            {section === "perfil" && <DynamicProfileSection />}
          </div>
        </main>
      </div>
    </div>
  );
}

const DynamicAddPropertySection = dynamic(
  () => import("@/components/dashboard/AddProperty").then(m => m.AddPropertySection),
  { loading: () => <DeferredLoader namespace="dashboard" keyName="loadingForm" /> }
);

const DynamicStatsSection = dynamic(
  () => import("@/components/dashboard/Stats").then(m => m.StatsSection),
  { loading: () => <DeferredLoader namespace="dashboard" keyName="loadingStats" /> }
);

const DynamicMessagesSection = dynamic(
  () => import("@/components/dashboard/Messages").then(m => m.MessagesSection),
  { loading: () => <DeferredLoader namespace="dashboard" keyName="loadingMessages" /> }
);

const DynamicProfileSection = dynamic(
  () => import("@/components/dashboard/Profile").then(m => m.ProfileSection),
  { loading: () => <DeferredLoader namespace="dashboard" keyName="loadingProfile" /> }
);

function DeferredLoader({ namespace, keyName }: { namespace: string; keyName: string }) {
  const t = useTranslations(namespace);
  return <div className="text-muted-foreground">{t(keyName)}</div>;
}
