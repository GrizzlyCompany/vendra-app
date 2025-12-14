"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Sidebar, type DashboardSection } from "@/components/dashboard/Sidebar";
import { PropertiesSection } from "@/components/dashboard/Properties";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { handleSupabaseError } from "@/lib/errors";
import { syncUserRole } from "@/lib/roleUtils";

export default function DashboardPage() {
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
          showError("No tienes permisos para acceder al dashboard");
          router.push("/profile");
        }
      } catch (err) {
        if (mounted) {
          const error = handleSupabaseError(err);
          showError("Error al verificar permisos", error.message);
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
          <p className="mt-2 text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return <div className="min-h-[calc(100dvh-64px)] bg-background" />;
  }

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-background font-sans mobile-bottom-safe mobile-horizontal-safe">
      {/* Sidebar */}
      <Sidebar section={section} onChange={setSection} />

      {/* Main content */}
      <div className="md:pl-72 transition-all duration-300">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-background/80 backdrop-blur-md mobile-top-safe">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
            <h1 className="font-serif text-xl lg:text-2xl text-primary">
              {section === "mis" && "Mis Propiedades"}
              {section === "agregar" && "Agregar Proyecto"}
              {section === "estadisticas" && "Estadísticas"}
              {section === "mensajes" && "Mensajes"}
              {section === "perfil" && "Perfil"}
            </h1>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          {section === "mis" && <PropertiesSection onAdd={() => setSection("agregar")} />}
          {section === "agregar" && <DynamicAddPropertySection />}
          {section === "estadisticas" && <DynamicStatsSection />}
          {section === "mensajes" && <DynamicMessagesSection />}
          {section === "perfil" && <DynamicProfileSection />}
        </main>
      </div>
    </div>
  );
}

const DynamicAddPropertySection = dynamic(
  () => import("@/components/dashboard/AddProperty").then(m => m.AddPropertySection),
  { loading: () => <div className="text-muted-foreground">Cargando formulario…</div> }
);

const DynamicStatsSection = dynamic(
  () => import("@/components/dashboard/Stats").then(m => m.StatsSection),
  { loading: () => <div className="text-muted-foreground">Cargando estadísticas…</div> }
);

const DynamicMessagesSection = dynamic(
  () => import("@/components/dashboard/Messages").then(m => m.MessagesSection),
  { loading: () => <div className="text-muted-foreground">Cargando mensajes…</div> }
);

const DynamicProfileSection = dynamic(
  () => import("@/components/dashboard/Profile").then(m => m.ProfileSection),
  { loading: () => <div className="text-muted-foreground">Cargando perfil…</div> }
);
