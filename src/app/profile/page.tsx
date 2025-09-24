"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PropertyCard } from "@/components/PropertyCard";
import { useFavorites } from "@/hooks/useFavorites";
import type { Property } from "@/types";
import { Star, Settings, Heart, CheckCircle, Building, LogOut, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
// BottomNav now rendered globally when authenticated

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  role: string | null;
  avatar_url?: string | null;
  subscription_active?: boolean | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tabs are managed by shadcn Tabs; no manual tab state needed
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimers = useRef<Record<string, number>>({});
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showBioEditor, setShowBioEditor] = useState(false);
  const [bioText, setBioText] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const editMenuRef = useRef<HTMLDivElement | null>(null);
  const editBtnRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [availableBanners, setAvailableBanners] = useState<{ name: string; url: string }[]>([]);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [recentRatings, setRecentRatings] = useState<Array<{ rating: number; comment: string | null; created_at: string }>>([]);
  const { favorites: savedProperties, loading: loadingSaved, removeFromFavorites } = useFavorites();

  // Handle removing property from saved list
  const handleRemoveFromSaved = async (propertyId: string) => {
    try {
      await removeFromFavorites(propertyId);
    } catch (error) {
      console.error('Error removing property from saved:', error);
    }
  };

  const loadBanners = async () => {
    try {
      const { data: files, error: listErr } = await supabase.storage
        .from('banners')
        .list('', { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
      if (listErr) {
        console.debug('banners list error', listErr);
        setAvailableBanners([]);
        return;
      }
      const names = Array.isArray(files)
        ? files
            .filter((f) => f && typeof f.name === 'string' && !f.name.endsWith('/'))
            .map((f) => f.name)
        : ([] as string[]);

      const items = names.map((name) => {
        const { data: pub } = supabase.storage.from('banners').getPublicUrl(name);
        return { name, url: pub.publicUrl };
      });

      // Verify images actually load before showing
      const verified = await Promise.all(
        items.map(
          (item) =>
            new Promise<typeof item | null>((resolve) => {
              try {
                const img = new Image();
                img.onload = () => resolve(item);
                img.onerror = () => resolve(null);
                img.src = item.url;
              } catch {
                resolve(null);
              }
            })
        )
      );
      setAvailableBanners(verified.filter(Boolean) as { name: string; url: string }[]);
    } catch (e) {
      console.debug('error listing banners', e);
      setAvailableBanners([]);
    }
  };

  // Derived role badge: if user has listings, show Vendedor/Agente; otherwise Comprador
  const hasListings = useMemo(() => (properties?.length ?? 0) > 0, [properties]);
  const roleBadge = useMemo(() => {
    // If user has listings, they act as seller/agent regardless of stored role
    if (hasListings) return "Vendedor/Agente";
    // Otherwise fall back to stored role if any
    if (profile?.role && profile.role.trim().length > 0) {
      const r = profile.role;
      return r.charAt(0).toUpperCase() + r.slice(1);
    }
    return "Comprador";
  }, [profile?.role, hasListings]);

  // Delete a property and its images (best-effort)
  // First-click arms confirmation; second-click performs deletion without window.confirm
  const onDeleteProperty = async (prop: Property) => {
    if (confirmId !== prop.id) {
      setConfirmId(prop.id);
      try {
        // auto-cancel after 6s
        if (confirmTimers.current[prop.id]) {
          window.clearTimeout(confirmTimers.current[prop.id]);
        }
        confirmTimers.current[prop.id] = window.setTimeout(() => {
          setConfirmId((curr) => (curr === prop.id ? null : curr));
          delete confirmTimers.current[prop.id];
        }, 6000);
      } catch {}
      return;
    }
    // second click confirmed
    setConfirmId(null);
    setDeletingId(prop.id);
    try {
      // Resolve user id if not yet available
      let uid = sessionUserId;
      if (!uid) {
        try {
          uid = (await supabase.auth.getSession()).data.session?.user?.id ?? null;
        } catch {
          uid = null;
        }
      }
      if (!uid) {
        alert("No se pudo determinar el usuario actual. Intenta refrescar la página.");
        return;
      }
      // No window.confirm here; already confirmed by second click
      // Try to delete storage images first (non-blocking for the DB delete)
      try {
        const urls = prop.images ?? [];
        const paths = urls
          .map((u) => {
            // Expecting .../storage/v1/object/public/property-images/<path>
            const marker = "/object/public/property-images/";
            const idx = u.indexOf(marker);
            return idx >= 0 ? u.slice(idx + marker.length) : null;
          })
          .filter((p): p is string => !!p);
        if (paths.length > 0) {
          await supabase.storage.from("property-images").remove(paths);
        }
      } catch (_e) {
        // ignore storage errors
      }
      // Delete DB row (guard by owner)
      const { error: delErr } = await supabase
        .from("properties")
        .delete()
        .eq("id", prop.id)
        .eq("owner_id", uid);
      if (delErr) {
        console.error("Delete property failed", delErr);
        alert(`No se pudo eliminar: ${delErr.message}`);
        return;
      }
      // Update local state and, if no listings remain, downgrade role to comprador (unless empresa_constructora)
      setProperties((prev) => {
        const next = prev.filter((p) => p.id !== prop.id);
        if (next.length === 0) {
          try {
            supabase
              .from("users")
              .update({ role: "comprador" })
              .eq("id", uid!)
              .neq("role", "empresa_constructora");
          } catch {}
        }
        return next;
      });
      alert("Publicación eliminada correctamente.");
    } finally {
      setDeletingId(null);
    }
  };

  // Save bio function
  const onSaveBio = async () => {
    try {
      setSavingBio(true);
      const uid = sessionUserId ?? (await supabase.auth.getSession()).data.session?.user?.id ?? null;
      if (!uid) {
        alert("No se pudo identificar al usuario. Intenta iniciar sesión nuevamente.");
        return;
      }
      
      const { error } = await supabase
        .from("users")
        .update({ bio: bioText || null })
        .eq("id", uid);
        
      if (error) {
        alert(`Error al guardar la biografía: ${error.message}`);
        return;
      }
      
      // Update local state
      setProfile(prev => prev ? { ...prev, bio: bioText || null } : prev);
      setShowBioEditor(false);
      alert("Biografía actualizada correctamente");
    } catch (e: any) {
      alert(`Error inesperado al guardar biografía: ${e?.message ?? e}`);
    } finally {
      setSavingBio(false);
    }
  };

  // Save selected banner url to auth metadata
  const onSaveBanner = async () => {
    try {
      setSavingBanner(true);
      // Save in auth metadata
      await supabase.auth.updateUser({ data: { banner_url: bannerUrl ?? null } });
      // Also persist banner to public_profiles for public display
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id ?? null;
        if (uid) {
          await supabase
            .from('public_profiles')
            .upsert({ id: uid, banner_url: bannerUrl ?? null })
            .eq('id', uid);
        }
      } catch {}
      setShowBannerModal(false);
    } catch (e) {
      console.debug("save banner error", e);
      alert("No se pudo guardar el banner. Intenta de nuevo.");
    } finally {
      setSavingBanner(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Check session
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id ?? null;
        if (!uid) {
          router.replace("/login");
          return;
        }
        if (!active) return;
        setSessionUserId(uid);
        // member since from auth created_at
        const created = sess.session?.user?.created_at;
        if (created) {
          const d = new Date(created);
          setMemberSince(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`);
        }

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("id,name,email,bio,role,avatar_url,subscription_active")
          .eq("id", uid)
          .single();

        if (!active) return;
        if (profileError) {
          const msg = profileError.message || "";
          // If the 'users' table doesn't exist or schema cache not updated, fallback to session
          if (msg.includes("schema cache") || msg.includes("relation") || msg.includes("users")) {
            const session = (await supabase.auth.getSession()).data.session;
            const user = session?.user;
            const email = user?.email ?? null;
            const prettyFromEmail = (() => {
              if (!email) return null;
              const local = email.split("@")[0] ?? "";
              const normalized = local.replace(/[._-]+/g, " ").trim();
              if (!normalized) return null;
              return normalized
                .split(" ")
                .filter(Boolean)
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                .join(" ");
            })();
            setProfile({
              id: uid,
              name: user?.user_metadata?.name ?? prettyFromEmail ?? "Usuario",
              email: user?.email ?? null,
              bio: null,
              role: null,
              avatar_url: user?.user_metadata?.avatar_url ?? null,
              subscription_active: null,
            } as ProfileRow);
          } else {
            setError(profileError.message);
          }
        } else {
          // Sync role with auth metadata if needed
          const authUser = (await supabase.auth.getUser()).data.user;
          const metaRole = (authUser?.user_metadata as any)?.role as string | undefined;
          const dbRole = (profileData as any)?.role as string | undefined;
          if (metaRole && metaRole !== dbRole) {
            await supabase.from("users").upsert({ id: uid, role: metaRole }).eq("id", uid);
            (profileData as any).role = metaRole;
          }
          // Redirect company accounts to dashboard (dashboard is su perfil)
          const effectiveRole = ((profileData as any)?.role ?? metaRole) as string | undefined;
          if (effectiveRole === "empresa_constructora") {
            router.replace("/dashboard");
            return;
          }

          // Backfill display fields from auth metadata if missing
          // Compute a safe display name: prefer auth metadata; ignore DB name if it equals the email
          const dbName = (profileData as any)?.name as string | null;
          const dbEmail = (profileData as any)?.email as string | null;
          const authName = (authUser?.user_metadata as any)?.name as string | null;
          const prettyFromEmail = (() => {
            const email = authUser?.email ?? dbEmail ?? null;
            if (!email) return null;
            const local = email.split("@")[0] ?? "";
            const normalized = local.replace(/[._-]+/g, " ").trim();
            if (!normalized) return null;
            return normalized
              .split(" ")
              .filter(Boolean)
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(" ");
          })();
          const displayName = (authName && authName.trim().length > 0)
            ? authName
            : (dbName && dbName.trim().length > 0 && dbName !== dbEmail)
              ? dbName
              : prettyFromEmail ?? null;

          const merged: ProfileRow = {
            ...(profileData as ProfileRow),
            name: displayName,
            avatar_url:
              (profileData as any)?.avatar_url ??
              (authUser?.user_metadata as any)?.avatar_url ??
              null,
          } as ProfileRow;
          setProfile(merged);
        }

        // Fetch user's properties
        const { data: props, error: propsError } = await supabase
          .from("properties")
          .select("id,title,description,price,location,images,owner_id,type,inserted_at")
          .eq("owner_id", uid)
          .order("inserted_at", { ascending: false });

        if (!active) return;
        if (propsError) {
          setError((prev) => prev ?? propsError.message);
        } else {
          const normalized: Property[] = (props ?? []).map((p: any) => ({
            id: String(p.id),
            title: String(p.title),
            description: p.description ?? null,
            price: Number(p.price) || 0,
            location: String(p.location ?? ""),
            images: Array.isArray(p.images) ? p.images : (p.images ? [String(p.images)] : null),
            owner_id: String(p.owner_id),
            type: p.type ?? null,
            inserted_at: (p.inserted_at as string) ?? new Date().toISOString(),
          }));
          setProperties(normalized);
        }

        // Load banner selection
        try {
          const sessNow = await supabase.auth.getSession();
          const bannerMeta = (sessNow.data.session?.user?.user_metadata as any)?.banner_url as string | undefined;
          if (bannerMeta) setBannerUrl(bannerMeta);
        } catch {}

        // Load verified banners (only those that actually load)
        await loadBanners();
        // Load my ratings aggregate
        try {
          const { data: allRatings, count } = await supabase
            .from('user_ratings')
            .select('rating', { count: 'exact' })
            .eq('target_user_id', uid);
          const ratings = (allRatings ?? []) as { rating: number }[];
          const total = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
          const c = count ?? ratings.length;
          setRatingCount(c);
          setAvgRating(c > 0 ? total / c : null);
        } catch {}
        // Load recent ratings list
        try {
          const { data: recent } = await supabase
            .from('user_ratings')
            .select('rating,comment,created_at')
            .eq('target_user_id', uid)
            .order('created_at', { ascending: false })
            .limit(20);
          setRecentRatings((recent ?? []) as any);
        } catch {}
      } catch (e: any) {
        if (active) setError(e?.message ?? "Error inesperado");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  const initials = useMemo(() => {
    const name = profile?.name?.trim();
    if (!name) return "US";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`;
  }, [profile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Avatar: open file picker and upload to Supabase, then update profile
  const onPickAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.value = ""; // permite re-seleccionar el mismo archivo
    fileInputRef.current?.click();
  };
  const onAvatarFile = async (file?: File | null) => {
    if (!file) return;
    // Show instant local preview
    try {
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
    } catch {}
    try {
      const uid = sessionUserId ?? (await supabase.auth.getSession()).data.session?.user?.id ?? null;
      if (!uid) {
        alert("No se pudo identificar al usuario. Intenta iniciar sesión nuevamente.");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type || "image/jpeg" });
      console.debug("storage upload result", { path, upData, upErr });
      if (upErr) {
        alert(`Error al subir la imagen: ${upErr.message}`);
        return;
      }
      const storedPath = upData?.path ?? path;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(storedPath);
      const publicUrl = pub?.publicUrl ?? null;
      if (!publicUrl) {
        alert("No se pudo obtener la URL pública del avatar.");
        return;
      }
      const { data: updData, error: updErr } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", uid)
        .select("id");
      if (updErr) {
        alert(`La imagen se subió pero no se pudo guardar en el perfil: ${updErr.message}`);
      } else if (!updData || updData.length === 0) {
        // No row was updated (posible que el usuario no exista aún en 'users'): upsert
        const { error: upsertErr } = await supabase
          .from("users")
          .upsert({ id: uid, avatar_url: publicUrl });
        if (upsertErr) {
          console.debug("users upsert error", upsertErr);
          alert(`No se pudo crear/actualizar el perfil con el avatar: ${upsertErr.message}`);
        }
      }
      console.debug("avatar_url saved to users", { uid, publicUrl });
      // Persist also in auth metadata as fallback source on reload
      try {
        await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      } catch {}
      setProfile((prev) =>
        prev
          ? { ...prev, avatar_url: publicUrl }
          : {
              id: (sessionUserId as string) || "",
              name: null,
              email: null,
              bio: null,
              role: null,
              avatar_url: publicUrl,
              subscription_active: null,
            }
      );
      setAvatarPreview(publicUrl);
    } catch (e: any) {
      alert(`Error inesperado al subir avatar: ${e?.message ?? e}`);
    }
  };

  // Close edit menu on outside click or ESC and handle repositioning
  useEffect(() => {
    if (!showEditMenu) return;
    
    // Force update menu position when it opens
    const updatePosition = () => {
      if (editMenuRef.current && editBtnRef.current) {
        const rect = editBtnRef.current.getBoundingClientRect();
        const menuHeight = 200; // Approximate menu height
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const isMobile = window.innerWidth < 640; // sm breakpoint
        
        const menu = editMenuRef.current;
        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
          menu.style.top = `${rect.top - menuHeight - 8}px`;
        } else {
          menu.style.top = `${rect.bottom + 8}px`;
        }
        
        if (isMobile) {
          // Center the menu horizontally on mobile
          const menuWidth = 224; // 56 * 4 = w-56
          menu.style.left = `${(window.innerWidth - menuWidth) / 2}px`;
          menu.style.right = 'auto';
        } else {
          // Desktop: align to button right edge
          menu.style.right = `${window.innerWidth - rect.right}px`;
          menu.style.left = 'auto';
        }
      }
    };
    
    // Update position on open
    setTimeout(updatePosition, 0);
    
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (editMenuRef.current?.contains(t)) return;
      if (editBtnRef.current?.contains(t as Node)) return;
      setShowEditMenu(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowEditMenu(false);
    };
    
    const onResize = () => {
      updatePosition();
    };
    
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", updatePosition);
    
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [showEditMenu]);

  if (loading) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-10 mobile-bottom-safe">
        <div className="w-full max-w-full sm:max-w-[85%] lg:max-w-[70%] mx-auto px-4 sm:px-6 text-center text-muted-foreground">Cargando perfil…</div>
        {/** BottomNav is global now */}
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-10 mobile-bottom-safe">
        <div className="w-full max-w-full sm:max-w-[85%] lg:max-w-[70%] mx-auto px-4 sm:px-6">
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
        </div>
        {/** BottomNav is global now */}
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-2 sm:px-4 py-6 sm:py-10 mobile-bottom-safe mobile-horizontal-safe">
      {/* Mobile Header with "Perfil" and back button - visible only on mobile/tablet */}
      <DetailBackButton className="lg:hidden mb-4 sticky top-0 bg-background z-10">
        <div className="flex items-center justify-between w-full">
          {/* Back Button */}
          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-8 h-8 border border-border/30 hover:border-border/50 transition-all duration-200"
          >
            <Link href="/">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
          
          {/* Center Title */}
          <h1 className="text-base font-medium text-foreground truncate mx-2">
            Perfil
          </h1>
          
          {/* Spacer for alignment */}
          <div className="w-8 h-8" />
        </div>
      </DetailBackButton>

      <div className="w-full max-w-full sm:max-w-[85%] lg:max-w-[70%] mx-auto px-2 sm:px-4 lg:px-6 space-y-6 sm:space-y-8">
        {/* Profile header styled like provided UI */}
        <Card className="overflow-hidden shadow-lg rounded-2xl">
          <CardHeader className="p-0">
            <div
              className="h-20 sm:h-24"
              style={{
                backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: bannerUrl ? undefined : '#e6f0ea',
              }}
            />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between items-center sm:items-start -mt-12 sm:-mt-14 lg:-mt-16">
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 lg:h-32 lg:w-32 border-4 border-background bg-background" src={(avatarPreview || profile?.avatar_url) ?? null} initials={initials} />
                <div className="pt-2 sm:pt-3 lg:pt-4 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-primary">{profile?.name ?? "Usuario"}</h1>
                    {(hasListings || roleBadge.toLowerCase().includes("vendedor")) && (
                      <Badge variant="secondary" className="gap-1 pl-2 text-xs">
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                        Vendedor
                      </Badge>
                    )}
                    {/* Settings and logout buttons container */}
                    <div className="flex items-center gap-2 ml-1">
                      {/* Edit gear button */}
                      <div className="relative">
                        <Button
                          ref={editBtnRef}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                          variant="outline"
                          aria-label="Editar perfil"
                          aria-haspopup="menu"
                          aria-expanded={showEditMenu}
                          onClick={() => setShowEditMenu((s) => !s)}
                        >
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        {showEditMenu && (
                          <div
                            ref={editMenuRef}
                            role="menu"
                            aria-label="Editar perfil"
                            className="absolute right-0 mt-2 w-56 rounded-lg border bg-background shadow-lg z-20 overflow-hidden"
                            style={{
                              position: 'fixed',
                              top: editBtnRef.current ? (() => {
                                const rect = editBtnRef.current.getBoundingClientRect();
                                const menuHeight = 200; // Approximate menu height
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const spaceAbove = rect.top;
                                
                                // If not enough space below but enough above, position above
                                if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                                  return rect.top - menuHeight - 8;
                                }
                                // Otherwise position below
                                return rect.bottom + 8;
                              })() : 'auto',
                              // Conditional positioning based on screen size
                              ...(window.innerWidth < 640 ? {
                                // Mobile: center horizontally
                                left: (window.innerWidth - 224) / 2, // 224px = w-56
                                right: 'auto'
                              } : {
                                // Desktop: align to button right edge
                                right: editBtnRef.current ? window.innerWidth - editBtnRef.current.getBoundingClientRect().right : 'auto',
                                left: 'auto'
                              }),
                              maxHeight: '80vh',
                              overflowY: 'auto'
                            }}
                          >
                            <button
                              role="menuitem"
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={() => {
                                setShowEditMenu(false);
                                setBioText(profile?.bio || "");
                                setShowBioEditor(true);
                              }}
                            >
                              Editar biografía
                            </button>
                            <button
                              role="menuitem"
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={() => {
                                setShowEditMenu(false);
                                onPickAvatar();
                              }}
                            >
                              Editar foto de perfil
                            </button>
                            <button
                              role="menuitem"
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={async () => {
                                setShowEditMenu(false);
                                setShowBannerModal(true);
                                await loadBanners();
                              }}
                            >
                              Editar banner
                            </button>
                            <button
                              role="menuitem"
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={() => {
                                setShowEditMenu(false);
                                router.push("/profile/edit");
                              }}
                            >
                              Editar información del perfil
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Logout button - only visible on mobile */}
                      <Button
                        className="h-8 px-3 sm:hidden flex items-center gap-1"
                        variant="destructive"
                        aria-label="Cerrar sesión"
                        onClick={signOut}
                      >
                        <LogOut className="h-3 w-3" />
                        <span className="text-xs">Cerrar sesión</span>
                      </Button>
                    </div>
                    {/* Hidden file input for avatar selection (kept here for proximity) */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onAvatarFile(e.target.files?.[0])}
                    />
                  </div>
                  <div className="flex items-center justify-center sm:justify-start text-amber-500 mt-1 sm:mt-2">
                    {avgRating !== null ? (
                      <>
                        {[1,2,3,4,5].map((n) => (
                          <Star key={n} className={`w-4 h-4 sm:w-5 sm:h-5 ${n <= Math.round(avgRating) ? 'fill-current' : 'text-muted-foreground fill-muted'}`} />
                        ))}
                        <span className="text-muted-foreground text-xs sm:text-sm ml-2">{avgRating.toFixed(1)} ({ratingCount} valoraciones)</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              {/* Right column removed; gear button moved next to name */}
            </div>

            {/* Bio section */}
            {profile?.bio && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t text-center">
                <h3 className="text-sm font-medium text-foreground mb-2">Sobre Mi</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
              </div>
            )}

            <div className="mt-4 sm:mt-6 border-t pt-4 sm:pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">Email</span>
                <span className="font-semibold text-sm break-all">{profile?.email ?? "-"}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">Miembro desde</span>
                <span className="font-semibold text-sm">{memberSince ?? "-"}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">Propiedades</span>
                <span className="font-semibold text-sm">{properties.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/** Banner selection modal */}
        {showBannerModal && (
          <div className="fixed inset-0 z-30 grid place-items-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowBannerModal(false)} />
            <div className="relative z-40 w-full max-w-3xl rounded-lg border bg-background p-3 sm:p-4 shadow-xl">
              <h3 className="text-base font-semibold mb-2">Elegir banner</h3>
              <p className="text-sm text-muted-foreground mb-4">Selecciona uno de los banners disponibles.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 max-h-[50vh] sm:max-h-[60vh] overflow-auto">
                {availableBanners.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setBannerUrl(b.url)}
                    className={`relative rounded-md overflow-hidden border aspect-[6/1] focus:outline-none focus:ring-2 focus:ring-ring ${bannerUrl===b.url? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
                    aria-label={`Elegir ${b.name}`}
                  >
                    <img src={b.url} alt={b.name} className="h-full w-full object-cover" />
                  </button>
                ))}
                {availableBanners.length===0 && (
                  <div className="text-sm text-muted-foreground">Aún no hay banners disponibles.</div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowBannerModal(false)} disabled={savingBanner} className="w-full sm:w-auto">Cancelar</Button>
                <Button onClick={onSaveBanner} disabled={savingBanner || !bannerUrl} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                  {savingBanner ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/** Bio editor modal */}
        {showBioEditor && (
          <div className="fixed inset-0 z-30 grid place-items-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowBioEditor(false)} />
            <div className="relative z-40 w-full max-w-2xl rounded-lg border bg-background p-3 sm:p-4 shadow-xl">
              <h3 className="text-base font-semibold mb-2">Editar biografía</h3>
              <p className="text-sm text-muted-foreground mb-4">Escribe una breve introducción sobre ti (máximo 500 caracteres).</p>
              <textarea 
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={bioText} 
                onChange={(e) => setBioText(e.target.value)} 
                placeholder="Escribe una breve introducción sobre ti..."
                maxLength={500}
                rows={4}
                disabled={savingBio}
              />
              <p className="mt-1 text-xs text-muted-foreground">{bioText.length}/500 caracteres</p>
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                <button 
                  className="px-4 py-2 text-sm border rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 w-full sm:w-auto" 
                  onClick={() => setShowBioEditor(false)} 
                  disabled={savingBio}
                >
                  Cancelar
                </button>
                <button 
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50 w-full sm:w-auto" 
                  onClick={onSaveBio} 
                  disabled={savingBio}
                >
                  {savingBio ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs styled like provided UI */}
        <Tabs defaultValue="listed" className="w-full">
          <TabsList className="w-full overflow-x-auto flex gap-1 sm:gap-2 px-1 py-1 sm:grid sm:grid-cols-3">
            <TabsTrigger className="shrink-0 text-xs sm:text-sm px-2 sm:px-3" value="listed"><Building className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Propiedades</TabsTrigger>
            <TabsTrigger className="shrink-0 text-xs sm:text-sm px-2 sm:px-3" value="reviews"><Star className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Valoraciones</TabsTrigger>
            <TabsTrigger className="shrink-0 text-xs sm:text-sm px-2 sm:px-3" value="saved"><Heart className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Guardadas</TabsTrigger>
          </TabsList>
          <TabsContent value="listed">
            <Card className="mt-3 sm:mt-4">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Propiedades Publicadas</CardTitle>
                <Button asChild className="h-9 w-auto sm:h-9 sm:w-auto sm:px-4 px-2 sm:p-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/properties/new">
                    <span className="flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Nueva +</span>
                    </span>
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {properties.length === 0 ? (
                  <div className="text-center py-8 sm:py-16">
                    <p className="text-muted-foreground mb-3 sm:mb-4">Aún no has publicado propiedades.</p>
                    <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2">
                      <Button asChild className="w-full sm:w-auto">
                        <Link href="/properties/new">Listar una propiedad</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="/profile/edit">Completar información</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    {properties.map((p) => (
                      <PropertyCard
                        key={p.id}
                        property={p}
                        showEdit
                        onDelete={onDeleteProperty}
                        state={deletingId === p.id ? 'deleting' : confirmId === p.id ? 'confirm-pending' : 'idle'}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reviews">
            <Card className="mt-3 sm:mt-4">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Valoraciones</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {ratingCount === 0 ? (
                  <div className="rounded-md border bg-muted/30 p-4 sm:p-6 text-sm text-muted-foreground">Aún no hay valoraciones.</div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {recentRatings.map((r, idx) => (
                      <div key={idx} className="rounded-md border p-3 sm:p-4">
                        <div className="flex items-center gap-2 text-amber-500">
                          {[1,2,3,4,5].map((n) => (
                            <Star key={n} className={`size-3 sm:size-4 ${n <= (Number(r.rating)||0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                          ))}
                        </div>
                        {r.comment && (<p className="mt-2 text-xs sm:text-sm text-foreground whitespace-pre-wrap">{r.comment}</p>)}
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                          <span>Anónimo</span>
                          <span>•</span>
                          <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString()}</time>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="saved">
            <Card className="mt-3 sm:mt-4">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Propiedades Guardadas</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingSaved ? (
                  <div className="rounded-md border bg-muted/30 p-4 sm:p-6 text-sm text-muted-foreground">Cargando propiedades guardadas...</div>
                ) : savedProperties.length === 0 ? (
                  <div className="rounded-md border bg-muted/30 p-4 sm:p-6 text-sm text-muted-foreground">No tienes propiedades guardadas.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {savedProperties.map((property) => (
                      <div key={property.id} className="relative">
                        <PropertyCard property={property} />
                        <button
                          onClick={() => handleRemoveFromSaved(property.id)}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-sm transition-colors"
                          title="Quitar de guardadas"
                        >
                          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/** BottomNav is global now */}
    </main>
  );
}
