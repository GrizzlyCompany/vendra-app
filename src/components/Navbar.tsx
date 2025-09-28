"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, UserPlus, Home, User, Building2, MessageSquare, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import { useToastContext } from "@/components/ToastProvider";
import { NavbarSkeleton } from "@/components/ui/skeleton";

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const { avatarUrl } = useUserAvatar(user);
  const { error: showError } = useToastContext();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  // Hide navbar on login and signup pages
  const hideOnAuthPages = pathname === '/login' || pathname === '/signup';
  
  if (hideOnAuthPages) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      showError("Sesión cerrada correctamente");
    } catch {
      showError("Error al cerrar sesión");
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  return (
    <header className={`${pathname === '/main' ? '' : 'hidden md:block'} sticky top-0 z-40 bg-background/80 backdrop-blur relative shadow-[0_2px_0_0_hsl(var(--border)/0.22),0_10px_20px_-18px_hsl(var(--border)/0.22)] dark:shadow-[0_2px_0_0_hsl(var(--border)/0.34),0_10px_20px_-18px_hsl(var(--border)/0.34)] mobile-horizontal-safe`}>
      <div className="container mx-auto flex items-center justify-between gap-3 px-3 sm:px-4 py-3 sm:py-4">
        <Link href="/" className="flex items-center gap-2 text-primary" aria-label="Ir al inicio">
          <Image
            src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/logo3.png"
            alt="Logotipo de Vendra"
            width={128}
            height={48}
            className="h-11 sm:h-16 w-auto"
            priority
          />
          <span className="whitespace-nowrap text-2xl font-serif font-extrabold tracking-wide">VENDRA</span>
        </Link>

        

        {/* Search bar (desktop) */}
        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-2xl items-center gap-2" role="search">
          <div className="flex w-full items-center gap-2 rounded-full border bg-background px-3 py-1.5">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar propiedades o agentes"
              className="border-0 focus-visible:ring-0"
              aria-label="Buscar propiedades o agentes"
            />
            <Button type="submit" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" aria-label="Buscar">
              Buscar
            </Button>
          </div>
        </form>

        {!user ? (
          <nav className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" className="text-primary">
              <Link href="/login">
                <LogIn className="size-4" /> Iniciar Sesión
              </Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
              <Link href="/signup">
                <UserPlus className="size-4" /> Registrarse
              </Link>
            </Button>
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" className="font-sans font-normal text-gray-600">
              <Link href="/projects">
                <Building2 className="size-4" /> Proyectos
              </Link>
            </Button>
            <Button asChild variant="ghost" className="font-sans font-normal text-gray-600">
              <Link href="/main">
                <Home className="size-4" /> Main
              </Link>
            </Button>
            <Button asChild variant="ghost" className="font-sans font-normal text-gray-600">
              <Link href="/messages">
                <MessageSquare className="size-4" /> Chat
              </Link>
            </Button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center overflow-hidden rounded-full bg-transparent hover:bg-muted/40"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="size-5 text-muted-foreground" />
                )}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 rounded-md border bg-background/95 backdrop-blur shadow-lg p-1 text-sm"
                >
                  <Link
                    href="/profile"
                    className="block w-full rounded-sm px-3 py-2 hover:bg-muted/60"
                    onClick={() => setMenuOpen(false)}
                  >
                    Perfil
                  </Link>
                  <Link
                    href="/profile/edit"
                    className="block w-full rounded-sm px-3 py-2 hover:bg-muted/60"
                    onClick={() => setMenuOpen(false)}
                  >
                    Preferencias
                  </Link>
                  <Link
                    href="/reports"
                    className="block w-full rounded-sm px-3 py-2 hover:bg-muted/60"
                    onClick={() => setMenuOpen(false)}
                  >
                    Reportes
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); handleSignOut(); }}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <LogOut className="size-4" /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </nav>
        )}

        {/* Mobile: profile avatar or login */}
        <div className="md:hidden flex items-center gap-2">
          {!user ? (
            <Button asChild className="bg-primary text-primary-foreground rounded-full px-3 flex-shrink-0 min-h-[44px]">
              <Link href="/login">Entrar</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                <Bell className="size-5" />
              </Button>
              <Link href="/profile" className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-transparent hover:bg-muted/40">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="size-5 text-muted-foreground" />
                )}
              </Link>
            </>
          )}
        </div>
      </div>
      {/* Bottom gradient divider for better visibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--border)/0.32)] to-transparent dark:via-[hsl(var(--border)/0.45)]" />
    </header>
  );
}
