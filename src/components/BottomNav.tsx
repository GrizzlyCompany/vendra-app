"use client";

import React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/roleUtils";
import { motion } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setUserRole(null);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const role = await getUserRole(user.id);
        setUserRole(role);
      } catch (error) {
        console.debug("Error fetching user role:", error);
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [user]);

  // Determine profile destination based on user role
  const getProfileHref = () => {
    if (userRole === "empresa_constructora") {
      return "/dashboard";
    }
    return "/profile";
  };

  const items: NavItem[] = [
    { href: "/main", label: "Inicio", Icon: Home },
    { href: "/search", label: "Buscar", Icon: Search },
    { href: "/properties/new", label: "Publicar", Icon: PlusSquare },
    // Only show Proyectos for logged-in users
    ...(user ? [{ href: "/projects", label: "Proyectos", Icon: Briefcase }] : []),
    { href: getProfileHref(), label: "Perfil", Icon: User },
  ];

  // Function to determine if a nav item is active
  const isNavItemActive = (itemHref: string, itemLabel: string) => {
    // Special handling for profile/dashboard
    if (itemLabel === "Perfil") {
      // For empresa_constructora users, active when on /dashboard
      if (userRole === "empresa_constructora") {
        return pathname === "/dashboard" || pathname?.startsWith("/dashboard/");
      }
      // For regular users, active when on /profile
      return pathname === "/profile" || pathname?.startsWith("/profile/");
    }

    // For other items, exact match or starts with the href
    return pathname === itemHref || pathname?.startsWith(itemHref + "/");
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 pointer-events-none flex justify-center pb-[env(safe-area-inset-bottom)] lg:hidden"
      suppressHydrationWarning
    >
      <nav
        id="bottom-nav"
        aria-label="Navegación inferior"
        className="pointer-events-auto mx-4 mb-1 bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 rounded-full overflow-hidden transition-transform duration-300"
      >
        <ul className="flex items-center justify-between px-2 py-1 gap-1 min-w-[320px] max-w-md mx-auto" suppressHydrationWarning>
          {mounted && items.map(({ href, label, Icon }) => {
            const active = isNavItemActive(href, label);

            return (
              <li key={`${href}-${label}`} className="relative flex-1">
                <Link
                  href={href}
                  className={cn(
                    "relative flex flex-col items-center justify-center h-14 w-full rounded-full transition-all duration-300",
                    active ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground active:scale-95"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-0 bg-primary/10 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}

                  <span className="relative z-10 flex flex-col items-center gap-1">
                    <Icon className={cn("h-5 w-5 transition-transform duration-300", active && "scale-110")} /> {/* Removed fill for cleaner look, adjust if filled icons desired */}
                    {/* Optional: Hide label on active for simpler look, or keep small */}
                    <span className={cn("text-[10px] font-medium leading-none transition-opacity duration-300", active ? "opacity-100 font-bold" : "opacity-70")}>
                      {label}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default BottomNav;