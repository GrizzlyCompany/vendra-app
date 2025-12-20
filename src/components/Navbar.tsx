"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LogIn, LogOut, UserPlus, Home, User, Building2,
  MessageSquare, Bell, Search, Command, MapPin,
  DollarSign, Briefcase, Settings, UserPen
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import { useToastContext } from "@/components/ToastProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessages } from "@/features/messaging/hooks/useUnreadMessages";

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const { avatarUrl } = useUserAvatar(user);
  const { unreadCount } = useUnreadMessages();
  const { error: showError } = useToastContext();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Robust check for pathname handling trailing slashes and index.html commonly found in static exports/Capacitor
  const normalizedPathname = (pathname || '/')
    .replace(/\/index\.html$/, '')
    .replace(/\/index$/, '')
    .replace(/\.html$/, '')
    .replace(/\/$/, '') || '/';

  const isAuthPage = normalizedPathname === '/login' || normalizedPathname === '/signup' || normalizedPathname === '/reset-password';

  // List of routes that have their own custom mobile header
  const routesWithCustomHeader = [
    '/',
    '/main',
    '/search',
    '/profile',
    '/messages',
    '/projects',
    '/properties/view',
    '/seller/apply',
    '/about',
    '/admin'
  ];

  const hasCustomMobileHeader = routesWithCustomHeader.includes(normalizedPathname);

  if (isAuthPage) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      showError("Sesión cerrada correctamente");
    } catch {
      showError("Error al cerrar sesión");
    }
  };

  const onSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = q.trim();
    setSearchOpen(false);
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  // Determine the logo link target based on user authentication status
  const logoLink = user ? "/main" : "/";

  return (
    <header
      className={`${hasCustomMobileHeader ? 'hidden md:block' : ''} sticky top-0 z-40 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-all duration-200 mobile-horizontal-safe mobile-top-safe`}
      suppressHydrationWarning
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4" suppressHydrationWarning>
        {/* Logo */}
        <Link href={logoLink} className="flex items-center gap-2 group transition-opacity hover:opacity-90" aria-label="Ir al inicio">
          <div className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-lg shadow-sm">
            <Image
              src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/logo3.png"
              alt="Logotipo de Vendra"
              fill
              className="object-cover"
              priority
            />
          </div>
          <span className="whitespace-nowrap text-xl sm:text-2xl font-serif font-bold tracking-tight text-primary">VENDRA</span>
        </Link>

        {/* Search Bar - Desktop Command Palette Trigger */}
        <div className="hidden md:flex flex-1 max-w-xl items-center">
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="relative h-10 w-full justify-start rounded-xl border-muted-foreground/20 bg-muted/50 px-4 py-2 text-sm text-muted-foreground shadow-none hover:bg-muted/80 hover:text-foreground transition-all duration-200"
              >
                <Search className="mr-2 h-4 w-4" />
                <span className="inline-flex">Buscar propiedades...</span>
                <kbd className="pointer-events-none absolute right-2 top-2.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden rounded-xl border-none shadow-2xl bg-background/95 backdrop-blur-3xl ring-1 ring-black/5 dark:ring-white/10">
              <DialogHeader className="px-4 py-3 border-b border-border/40">
                <DialogTitle className="sr-only">Buscar</DialogTitle>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    placeholder="¿Qué estás buscando?"
                    className="flex-1 border-none bg-transparent px-0 py-0 text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
                    autoFocus
                  />
                </div>
              </DialogHeader>
              <div className="p-2 space-y-4">
                {q.length === 0 && (
                  <div className="px-2 py-4">
                    <p className="text-xs font-medium text-muted-foreground mb-3 px-2">Sugerencias rápidas</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" className="justify-start h-auto py-3 px-3 rounded-lg hover:bg-muted/80" onClick={() => { setQ("Departamento en alquiler"); onSearch(); }}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium">Departamentos</div>
                            <div className="text-xs text-muted-foreground">Ver opciones disponibles</div>
                          </div>
                        </div>
                      </Button>
                      <Button variant="ghost" className="justify-start h-auto py-3 px-3 rounded-lg hover:bg-muted/80" onClick={() => { setQ("Casas en venta"); onSearch(); }}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                            <Home className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium">Casas</div>
                            <div className="text-xs text-muted-foreground">Encuentra tu hogar</div>
                          </div>
                        </div>
                      </Button>
                      <Button variant="ghost" className="justify-start h-auto py-3 px-3 rounded-lg hover:bg-muted/80" onClick={() => { router.push('/search?type=agent'); setSearchOpen(false); }}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            <Briefcase className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium">Agentes</div>
                            <div className="text-xs text-muted-foreground">Contacta profesionales</div>
                          </div>
                        </div>
                      </Button>
                      <Button variant="ghost" className="justify-start h-auto py-3 px-3 rounded-lg hover:bg-muted/80" onClick={() => { router.push('/projects'); setSearchOpen(false); }}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium">Proyectos</div>
                            <div className="text-xs text-muted-foreground">Nuevos desarrollos</div>
                          </div>
                        </div>
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex justify-end px-2 pt-2 border-t border-border/40">
                  <Button size="sm" onClick={() => onSearch()} className="gap-2 rounded-lg">
                    Buscar ahora <Search className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Right Section */}
        {!user ? (
          <nav className="hidden md:flex items-center gap-3">
            <Button asChild variant="ghost" className="text-foreground hover:bg-muted/60 hover:text-primary transition-colors">
              <Link href="/login">
                <LogIn className="mr-2 size-4" /> Iniciar Sesión
              </Link>
            </Button>
            <Button asChild className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
              <Link href="/signup">
                <UserPlus className="mr-2 size-4" /> Registrarse
              </Link>
            </Button>
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
              <Link href="/projects" title="Proyectos">
                <Building2 className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
              <Link href="/main" title="Inicio">
                <Home className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors relative">
              <Link href="/messages" title="Mensajes">
                <MessageSquare className="size-5" />
                {mounted && unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-background animate-pulse"></span>
                )}
              </Link>
            </Button>

            <div className="ml-2 relative pl-2 border-l border-border/50" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-background transition-all hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <User className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
                )}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-3 w-56 transform rounded-xl border border-border/50 bg-background/95 p-1 backdrop-blur-xl shadow-xl transition-all animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="px-2 py-2 mb-1 border-b border-border/50">
                    <p className="text-sm font-medium text-foreground">Mi cuenta</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="p-1 space-y-0.5">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/80"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="h-4 w-4" /> Perfil
                    </Link>
                    <Link
                      href="/profile/edit"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/80"
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserPen className="h-4 w-4" /> Información del perfil
                    </Link>
                    <Link
                      href="/preferences"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/80"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" /> Preferencias
                    </Link>
                    <Link
                      href="/reports"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/80"
                      onClick={() => setMenuOpen(false)}
                    >
                      <AlertCircle className="h-4 w-4" /> Reportes
                    </Link>
                  </div>
                  <div className="mt-1 border-t border-border/50 p-1">
                    <button
                      onClick={() => { setMenuOpen(false); handleSignOut(); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="size-4" /> Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </nav>
        )}

        {/* Mobile: profile avatar or login (Simplified for now, can be expanded) */}
        <div className="md:hidden flex items-center gap-3" suppressHydrationWarning>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            onClick={() => setSearchOpen(true)}
            suppressHydrationWarning
          >
            <Search className="size-5" />
          </Button>
          {!user ? (
            <Button asChild size="sm" className="rounded-full">
              <Link href="/login">Entrar</Link>
            </Button>
          ) : (
            <Link href="/profile" className="relative h-8 w-8 overflow-hidden rounded-full border border-border">
              {mounted && avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-full w-full p-1.5 text-muted-foreground" />
              )}
            </Link>
          )}
        </div>
      </div>
      {/* Subtle gradient line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
    </header>
  );
}

// Icon helper
function AlertCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
