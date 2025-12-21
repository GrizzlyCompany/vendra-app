"use client";

import { useState } from "react";
import { Home, PlusCircle, BarChart3, User2, LogOut, Menu, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import Image from "next/image";
import { useTranslations } from "next-intl";

export type DashboardSection = "mis" | "agregar" | "estadisticas" | "perfil" | "mensajes";

export function Sidebar({ section, onChange }: { section: DashboardSection; onChange: (s: DashboardSection) => void }) {
  const t = useTranslations("dashboard.sidebar");
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: "mis" as const, label: t("myProperties"), icon: Home },
    { id: "agregar" as const, label: t("addProject"), icon: PlusCircle },
    { id: "estadisticas" as const, label: t("stats"), icon: BarChart3 },
    { id: "mensajes" as const, label: t("messages"), icon: MessageCircle },
    { id: "perfil" as const, label: t("profile"), icon: User2 },
  ];

  const NavItem = ({ id, label, icon: Icon }: { id: DashboardSection; label: string; icon: React.ComponentType<{ className?: string }> }) => (
    <button
      type="button"
      onClick={() => {
        onChange(id);
        setIsMobileMenuOpen(false);
      }}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition-all duration-300 text-left relative overflow-hidden",
        section === id
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5"
      )}
    >
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
        section !== id && "bg-gradient-to-r from-white/10 to-transparent"
      )} />

      <Icon className={cn(
        "size-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
        section === id ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
      )} />
      <span className="font-medium tracking-wide">{label}</span>

      {section === id && (
        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      )}
    </button>
  );

  // Mobile menu button
  const MobileMenuButton = () => (
    <div className="md:hidden fixed top-4 left-4 z-50 mobile-top-safe">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="rounded-full w-12 h-12 shadow-xl bg-primary/90 backdrop-blur-md text-primary-foreground hover:bg-primary border border-white/10"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0 mobile-horizontal-safe border-r border-white/10 bg-sidebar/95 backdrop-blur-xl">
          <div className="h-full flex flex-col mobile-bottom-safe bg-gradient-to-b from-sidebar to-sidebar/90">
            <div className="p-8 pt-12">
              <div className="flex items-center gap-3 mb-1">
                {/* Logo placeholder - replace with actual Image component if logo available */}
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-xl">V</div>
                <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">VENDRA</h2>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider pl-11">{t("company")}</p>
            </div>

            <nav className="flex-1 px-4 space-y-2">
              {menuItems.map((item) => (
                <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon} />
              ))}
            </nav>
            <div className="p-6 mt-auto">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all duration-300"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-5 w-5" />
                {t("logout")}
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
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 z-30 hidden w-72 border-r border-white/10 bg-sidebar/95 backdrop-blur-2xl md:flex md:flex-col shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-serif font-bold text-2xl">V</div>
            <h2 className="text-2xl font-serif font-bold text-sidebar-foreground tracking-tight">VENDRA</h2>
          </div>
          <div className="flex items-center gap-2 pl-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{t("panel")}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-2">
          {menuItems.map((item) => (
            <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-white/5 bg-white/5 backdrop-blur-md m-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold shadow-md">
              <User2 className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{t("myAccount")}</p>
              <p className="text-xs text-muted-foreground truncate">{t("viewProfile")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all duration-300"
          >
            <LogOut className="size-3.5" />
            {t("logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
