"use client";

import { useState } from "react";
import { Home, PlusCircle, BarChart3, User2, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export type DashboardSection = "mis" | "agregar" | "estadisticas" | "perfil";

const menuItems = [
  { id: "mis" as const, label: "Mis Propiedades", icon: Home },
  { id: "agregar" as const, label: "Agregar Propiedad", icon: PlusCircle },
  { id: "estadisticas" as const, label: "Estadísticas", icon: BarChart3 },
  { id: "perfil" as const, label: "Perfil", icon: User2 },
];

export function Sidebar({ section, onChange }: { section: DashboardSection; onChange: (s: DashboardSection) => void }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ id, label, icon: Icon }: { id: DashboardSection; label: string; icon: React.ComponentType<{ className?: string }> }) => (
    <button
      type="button"
      onClick={() => {
        onChange(id);
        setIsMobileMenuOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors text-left min-h-[48px]",
        section === id
          ? "bg-primary text-primary-foreground"
          : "text-foreground/80 hover:bg-muted hover:text-foreground active:bg-muted/80"
      )}
    >
      <Icon className="size-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  );

  // Mobile menu button
  const MobileMenuButton = () => (
    <div className="md:hidden fixed top-4 left-4 z-50 mobile-top-safe">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button 
            size="icon" 
            className="rounded-full w-14 h-14 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 mobile-horizontal-safe">
          <div className="h-full flex flex-col mobile-bottom-safe">
            <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Dashboard</h2>
              <p className="text-sm text-muted-foreground">Empresa Constructora</p>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => (
                <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon} />
              ))}
            </nav>
            <div className="p-4 border-t mt-auto">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 min-h-[48px]"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <>
      <MobileMenuButton />
      <div className="md:hidden h-20 mobile-top-safe"></div> {/* Spacer for mobile menu button */}
      <aside className="fixed left-0 top-16 bottom-0 z-20 hidden h-[calc(100dvh-64px)] w-64 border-r bg-background px-4 py-4 md:flex md:flex-col mobile-horizontal-safe">
      <div className="mt-6 grid gap-1">
        {menuItems.map((item) => (
          <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon} />
        ))}
      </div>

      <div className="mt-auto px-2">
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <LogOut className="size-4" />
          Cerrar Sesión
        </button>
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">Dashboard Empresa</div>
    </aside>
    </>
  );
}
