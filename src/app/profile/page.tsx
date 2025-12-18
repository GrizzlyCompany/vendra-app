"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { useFavorites } from "@/features/properties/hooks/useFavorites";
import type { Property } from "@/types";
import { Star, Settings, Heart, CheckCircle, Building, LogOut, ChevronLeft, UserPen, Camera, Image, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import { syncUserRole } from "@/lib/roleUtils";
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

  // Move the processProfileData function inside the component so it has access to setProfile and router
  const processProfileData = async (profileData: any, authUser: any, userId: string) => {
    // Sync role with auth metadata if needed
    // Force refresh auth user data to get latest metadata
    const effectiveRole = await syncUserRole(userId) ?? undefined;
    if (effectiveRole === "empresa_constructora") {
      router.replace("/dashboard");
      return;
    }

    // Fetch the latest full_name from seller_applications
    let fullName = null;
    try {
      const { data: sellerApp } = await supabase
        .from("seller_applications")
        .select("full_name")
        .eq("user_id", userId)
        .in("status", ["draft", "submitted", "needs_more_info", "approved"] as any)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      fullName = sellerApp?.full_name ?? null;
    } catch (e) {
      console.debug("Error fetching seller application full name", e);
    }

    // Backfill display fields from auth metadata if missing
    // Compute a safe display name: prefer full_name from seller_applications, then DB name, then auth metadata
    const dbName = profileData?.name as string | null;
    const dbEmail = profileData?.email as string | null;
    const authName = authUser?.user_metadata?.name as string | null;
    const prettyFromEmail = (() => {
      const email = authUser?.email ?? dbEmail ?? null;
      if (!email) return null;
      const local = email.split("@")[0] ?? "";
      const normalized = local.replace(/[._-]+/g, " ").trim();
      if (!normalized) return null;
      return normalized
        .split(" ")
        .filter(Boolean)
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
    })();

    // Priority: full_name from seller_applications > DB name > auth metadata > email-based name
    const displayName = fullName && fullName.trim().length > 0
      ? fullName
      : (dbName && dbName.trim().length > 0 && dbName !== dbEmail)
        ? dbName
        : (authName && authName.trim().length > 0)
          ? authName
          : prettyFromEmail ?? null;

    const merged: ProfileRow = {
      ...profileData,
      name: displayName,
      avatar_url:
        profileData?.avatar_url ??
        authUser?.user_metadata?.avatar_url ??
        null,
    } as ProfileRow;
    setProfile(merged);
  };
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
      // Predefined premium banners (Unsplash)
      const PREDEFINED_BANNERS = [
        { name: "Edificios Modernos", url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop" },
        { name: "Oficina Minimalista", url: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=2574&auto=format&fit=crop" },
        { name: "Espacio de Trabajo", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2669&auto=format&fit=crop" },
        { name: "Tecnología", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" },
        { name: "Arquitectura", url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2670&auto=format&fit=crop" },
        { name: "Diseño Interior", url: "https://images.unsplash.com/photo-1449824913929-7b77f555872a?q=80&w=2574&auto=format&fit=crop" }
      ];

      // Fetch from Supabase storage
      const { data: files, error: listErr } = await supabase.storage
        .from('banners')
        .list('', { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });

      let storageBanners: { name: string; url: string }[] = [];

      if (!listErr && files && Array.isArray(files)) {
        const names = files
          .filter((f) => f && typeof f.name === 'string' && !f.name.endsWith('/'))
          .map((f) => f.name);

        storageBanners = names.map((name) => {
          const { data: pub } = supabase.storage.from('banners').getPublicUrl(name);
          return { name, url: pub.publicUrl };
        });
      }

      // Combine predefined and storage banners
      const allBanners = [...PREDEFINED_BANNERS, ...storageBanners];

      setAvailableBanners(allBanners);
    } catch (e) {
      console.debug('error listing banners', e);
      // Fallback to predefined if error
      setAvailableBanners([
        { name: "Edificios Modernos", url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop" },
        { name: "Oficina Minimalista", url: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=2574&auto=format&fit=crop" },
        { name: "Espacio de Trabajo", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2669&auto=format&fit=crop" }
      ]);
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
      } catch { }
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
          } catch { }
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
      } catch { }
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

        // Fetch profile with robust error handling
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("id,name,email,bio,role,avatar_url,subscription_active")
          .eq("id", uid)
          .maybeSingle(); // Changed from single() to maybeSingle()

        if (!active) return;

        // Handle case where no profile data exists
        if (!profileData && !profileError) {
          // Try to create a minimal profile from auth data
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser?.user) {
            const userMeta = authUser.user.user_metadata || {};

            // Create minimal user profile
            const { error: insertError } = await supabase
              .from("users")
              .insert({
                id: uid,
                email: authUser.user.email || '',
                name: userMeta.name || authUser.user.email?.split('@')[0] || 'Usuario',
                role: userMeta.role || 'comprador',
                subscription_active: false,
              });

            if (!insertError) {
              // Retry fetching the profile
              const { data: retryProfileData, error: retryProfileError } = await supabase
                .from("users")
                .select("id,name,email,bio,role,avatar_url,subscription_active")
                .eq("id", uid)
                .maybeSingle();

              if (retryProfileData && !retryProfileError) {
                processProfileData(retryProfileData, authUser.user, uid);
              } else {
                setError("No se pudo cargar el perfil. Por favor, contacte al soporte.");
              }
            } else {
              setError("No se pudo crear el perfil. Por favor, contacte al soporte.");
            }
          } else {
            setError("No se pudo obtener la información del usuario.");
          }
        } else if (profileError) {
          console.error("Error fetching user profile:", profileError);
          setError(profileError.message);
        } else {
          // Process profile data normally
          const { data: { user: authUser } } = await supabase.auth.getUser();
          processProfileData(profileData, authUser, uid);
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
        } catch { }

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
        } catch { }
        // Load recent ratings list
        try {
          const { data: recent } = await supabase
            .from('user_ratings')
            .select('rating,comment,created_at')
            .eq('target_user_id', uid)
            .order('created_at', { ascending: false })
            .limit(20);
          setRecentRatings((recent ?? []) as any);
        } catch { }
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
    } catch { }
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
      } catch { }
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
      // Check if click is inside menu or button (including SVG children)
      if (editMenuRef.current?.contains(t)) return;
      if (editBtnRef.current?.contains(t)) return;
      setShowEditMenu(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowEditMenu(false);
    };

    const onResize = () => {
      updatePosition();
    };

    // Use requestAnimationFrame to delay adding the listener
    // This ensures the current click event finishes before we start listening
    let frameId: number;
    let listenersAdded = false;

    frameId = requestAnimationFrame(() => {
      // Double RAF to ensure we're past the current event cycle
      frameId = requestAnimationFrame(() => {
        window.addEventListener("mousedown", onDown);
        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", updatePosition);
        listenersAdded = true;
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
      if (listenersAdded) {
        window.removeEventListener("mousedown", onDown);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", updatePosition);
      }
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
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-6 py-8 sm:py-12 mobile-bottom-safe mobile-horizontal-safe">
      {/* Mobile Header with "Perfil" and back button - visible only on mobile/tablet */}
      <DetailBackButton className="lg:hidden mb-6 sticky top-0 bg-background/95 backdrop-blur-sm z-30 py-2">
        <div className="flex items-center justify-between w-full">
          {/* Back Button */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full text-foreground hover:bg-secondary/20 w-8 h-8 transition-all duration-200"
          >
            <Link href="/main">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>

          {/* Center Title */}
          <h1 className="text-lg font-serif font-bold text-primary truncate mx-2">
            Mi Perfil
          </h1>

          {/* Spacer for alignment */}
          <div className="w-8 h-8" />
        </div>
      </DetailBackButton>

      <div className="w-full max-w-5xl mx-auto space-y-8 sm:space-y-12">

        {/* Premium Profile Header */}
        <div className="relative mb-24 sm:mb-28">
          {/* Banner */}
          <div
            className="h-56 sm:h-72 rounded-[2rem] shadow-xl overflow-hidden relative group"
            style={{
              backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: bannerUrl ? undefined : 'hsl(40, 20%, 95%)', // Soft Cream Placeholder
            }}
          >
            {!bannerUrl && (
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <Building className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/30 transition-all duration-500" />

            {/* Edit Cover Trigger */}
            <button
              onClick={async () => {
                setShowBannerModal(true);
                await loadBanners();
              }}
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar & Info Floating Card */}
          <div className="absolute -bottom-20 sm:-bottom-24 left-0 right-0 px-1 sm:px-8 flex justify-center">
            <div className="bg-background/95 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 max-w-3xl w-full mx-auto">

              {/* Avatar */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0">
                <Avatar
                  className="h-24 w-24 sm:h-32 sm:w-32 border-[6px] border-background shadow-lg ring-1 ring-black/5"
                  src={(avatarPreview || profile?.avatar_url) ?? null}
                  initials={initials}
                />
                <div className="absolute bottom-1 right-1 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="bg-primary text-white rounded-full p-1.5 shadow-md hover:bg-primary/90 hover:scale-105 transition-all ring-2 ring-background"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="end"
                      className="w-64 p-2 rounded-2xl border border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl mb-2 animate-in fade-in zoom-in-95 duration-200"
                    >
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Configuración
                      </div>

                      <DropdownMenuItem
                        onClick={() => { setBioText(profile?.bio || ""); setShowBioEditor(true); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/10 focus:bg-primary/10 text-sm font-medium transition-colors"
                      >
                        <div className="p-1.5 bg-blue-100/50 text-blue-600 rounded-lg">
                          <UserPen className="w-4 h-4" />
                        </div>
                        Editar biografía
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onPickAvatar()}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/10 focus:bg-primary/10 text-sm font-medium transition-colors"
                      >
                        <div className="p-1.5 bg-purple-100/50 text-purple-600 rounded-lg">
                          <Camera className="w-4 h-4" />
                        </div>
                        Cambiar foto de perfil
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={async () => { setShowBannerModal(true); await loadBanners(); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/10 focus:bg-primary/10 text-sm font-medium transition-colors"
                      >
                        <div className="p-1.5 bg-emerald-100/50 text-emerald-600 rounded-lg">
                          <Image className="w-4 h-4" />
                        </div>
                        Cambiar banner
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="my-1 bg-border/40" />

                      <DropdownMenuItem
                        onClick={signOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                      >
                        <div className="p-1.5 bg-red-100/50 text-red-600 rounded-lg">
                          <LogOut className="w-4 h-4" />
                        </div>
                        Cerrar sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Info */}
              <div className="text-center sm:text-left flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary truncate">
                    {profile?.name ?? "Usuario"}
                  </h1>
                  {(hasListings || roleBadge.toLowerCase().includes("vendedor")) && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold shadow-sm">
                      Vendedor
                    </Badge>
                  )}
                </div>
                {/* Bio Snippet */}
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-md mx-auto sm:mx-0">
                  {profile?.bio || "Sin biografía. Añade una descripción para conectar mejor con tus clientes."}
                </p>
              </div>

              {/* Stat Pills */}
              <div className="flex gap-2 sm:gap-4 shrink-0 mt-3 sm:mt-0">
                <div className="text-center px-4 py-2 bg-secondary/10 rounded-2xl border border-secondary/20">
                  <div className="text-lg font-bold text-primary">{properties.length}</div>
                  <div className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Propiedades</div>
                </div>
                <div className="text-center px-4 py-2 bg-secondary/10 rounded-2xl border border-secondary/20">
                  <div className="text-lg font-bold text-primary">{avgRating ? avgRating.toFixed(1) : "-"}</div>
                  <div className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Rating</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Hidden inputs / Modals remain */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatarFile(e.target.files?.[0])} />
        {showBannerModal && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-4xl bg-background rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8">
              <h3 className="text-2xl font-serif font-bold text-primary mb-2">Galería de Portadas</h3>
              <p className="text-muted-foreground mb-6">Elige una imagen que defina tu estilo.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {availableBanners.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setBannerUrl(b.url)}
                    className={`relative rounded-xl overflow-hidden aspect-video group transition-all duration-300 transform hover:scale-105 ${bannerUrl === b.url ? 'ring-4 ring-primary ring-offset-2' : ''}`}
                  >
                    <img src={b.url} alt={b.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    {bannerUrl === b.url && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><CheckCircle className="text-white w-8 h-8 drop-shadow-md" /></div>}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <Button variant="ghost" onClick={() => setShowBannerModal(false)} className="rounded-full">Cancelar</Button>
                <Button onClick={onSaveBanner} disabled={savingBanner || !bannerUrl} className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                  {savingBanner ? 'Guardando...' : 'Aplicar Portada'}
                </Button>
              </div>
            </div>
          </div>
        )}
        {showBioEditor && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-xl bg-background rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8">
              <h3 className="text-2xl font-serif font-bold text-primary mb-2">Tu Historia</h3>
              <textarea
                className="w-full mt-4 min-h-[150px] rounded-xl border-border/50 bg-secondary/5 p-4 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                placeholder="Cuéntanos sobre ti..."
                maxLength={500}
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowBioEditor(false)} className="rounded-full">Cancelar</Button>
                <Button onClick={onSaveBio} disabled={savingBio} className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white shadow-lg">
                  Guardar Biografía
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content Tabs - Minimalist Pill Style */}
        <Tabs defaultValue="listed" className="w-full">
          <div className="flex justify-center mb-8 overflow-x-auto pb-2 scrollbar-hide px-4 -mx-4">
            <TabsList className="bg-secondary/10 p-1 rounded-full h-auto inline-flex shadow-inner min-w-max">
              <TabsTrigger className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300" value="listed">
                <Building className="mr-2 h-4 w-4" /> Mis Propiedades
              </TabsTrigger>
              <TabsTrigger className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300" value="reviews">
                <Star className="mr-2 h-4 w-4" /> Opiniones
              </TabsTrigger>
              <TabsTrigger className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300" value="saved">
                <Heart className="mr-2 h-4 w-4" /> Favoritos
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="listed" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {properties.length === 0 ? (
              <div className="text-center py-20 bg-secondary/5 rounded-3xl border border-dashed border-border">
                <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Building className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-serif text-primary mb-2">Tu portafolio está vacío</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">Comienza a publicar propiedades hoy mismo y llega a miles de compradores.</p>
                <Button asChild className="rounded-full px-8 h-12 bg-primary text-white shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all">
                  <Link href="/properties/new">Crear primera propiedad</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {properties.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    showEdit
                    onDelete={onDeleteProperty}
                    state={deletingId === p.id ? 'deleting' : confirmId === p.id ? 'confirm-pending' : 'idle'}
                  />
                ))}
                {/* Add New Card */}
                <Link href="/properties/new" className="group flex flex-col items-center justify-center h-full min-h-[300px] rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                    <Building className="w-8 h-8 text-primary/60 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-serif font-bold text-lg text-primary">Añadir Propiedad</span>
                  <span className="text-sm text-muted-foreground mt-1">Expandir mi portafolio</span>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-3xl mx-auto">
              {ratingCount === 0 ? (
                <div className="text-center py-16 bg-secondary/5 rounded-3xl border border-dashed border-border">
                  <div className="inline-block p-4 rounded-full bg-background shadow-sm mb-4">
                    <Star className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground">Aún no has recibido valoraciones.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {recentRatings.map((r, idx) => (
                    <div key={idx} className="bg-background p-6 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-1 text-amber-500 mb-3">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`size-4 ${n <= (Number(r.rating) || 0) ? 'fill-current' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                      {r.comment && (<p className="text-foreground/80 leading-relaxed italic">"{r.comment}"</p>)}
                      <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-primary">Usuario Verificado</span>
                        <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString()}</time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {savedProperties.length === 0 ? (
              <div className="text-center py-16 bg-secondary/5 rounded-3xl border border-dashed border-border">
                <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-primary font-medium">Tu lista de deseos está vacía.</p>
                <p className="text-sm text-muted-foreground mt-1">Explora propiedades y guárdalas aquí para verlas después.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedProperties.map((property) => (
                  <div key={property.id} className="relative group">
                    <PropertyCard property={property} />
                    <button
                      onClick={() => handleRemoveFromSaved(property.id)}
                      className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-red-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-10"
                      title="Quitar de guardadas"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}


