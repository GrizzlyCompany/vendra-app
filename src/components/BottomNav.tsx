"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUserRole(null);
      return;
    }

    const getUserRole = async () => {
      try {
        // First try to get role from auth metadata
        const authUser = (await supabase.auth.getUser()).data.user;
        const metaRole = (authUser?.user_metadata as any)?.role as string | undefined;
        
        if (metaRole) {
          setUserRole(metaRole);
          return;
        }

        // Fallback to database role
        const { data: profileData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        
        setUserRole(profileData?.role || null);
      } catch (error) {
        console.debug("Error fetching user role:", error);
        setUserRole(null);
      }
    };

    getUserRole();
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
    <nav
      aria-label="Navegación inferior"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 mobile-horizontal-safe"
      style={{
        paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))'
      }}
    >
      <ul className="mx-auto flex max-w-screen-sm items-stretch justify-between gap-1 px-2 py-2.5">
        {items.map(({ href, label, Icon }) => {
          const active = isNavItemActive(href, label);
          
          return (
            <li key={`${href}-${label}`} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-md px-3 py-3 text-xs min-h-[48px] transition-colors",
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60 active:bg-muted/80"
                )}
              >
                <Icon className={cn("h-5 w-5", active ? "text-primary" : "")} />
                <span className="leading-none font-sans">{label}</span>
                {active && (
                  <div className="w-1 h-1 bg-primary rounded-full mt-0.5" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomNav;