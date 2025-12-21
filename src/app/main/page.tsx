"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import type { Property } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Home, DollarSign, Search, X, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUnreadMessages } from "@/features/messaging/hooks/useUnreadMessages";
import { useTranslations } from "next-intl";

function MainContent() {
  const t = useTranslations("main");
  const tCommon = useTranslations("common");
  const tProps = useTranslations("properties");
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { unreadCount } = useUnreadMessages();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // All locations for select
  const [allLocations, setAllLocations] = useState<string[]>([]);

  // Filters (controlled inputs)
  const [locationSel, setLocationSel] = useState<string>("all");
  const [typeSel, setTypeSel] = useState<string>("all"); // client-side filter only
  const [priceMin, setPriceMin] = useState<string>("0");
  const [priceMax, setPriceMax] = useState<string>("any");
  const [refresh, setRefresh] = useState(0);
  const [q, setQ] = useState<string>("");

  // Load locations (once)
  useEffect(() => {
    let active = true;
    async function loadLocations() {
      const { data, error } = await supabase
        .from("properties")
        .select("location");
      if (!active) return;
      if (!error && data) {
        const set = new Set<string>();
        for (const row of data) {
          if (row.location) set.add(row.location as string);
        }
        setAllLocations(Array.from(set).sort());
      }
    }
    loadLocations();
    return () => { active = false; };
  }, []);

  // Sync state from URL search params
  useEffect(() => {
    const qParam = searchParams.get("q") ?? "";
    const locParam = searchParams.get("location") ?? "";
    setQ(qParam);
    if (locParam) setLocationSel(locParam);
  }, [searchParams]);

  // Fetch properties with applied filters
  useEffect(() => {
    let active = true;
    async function fetchProperties() {
      setLoading(true);
      setError(null);
      let query = supabase
        .from("properties")
        .select("id,title,description,price,location,images,owner_id,type,bedrooms,bathrooms,area")
        .order("inserted_at", { ascending: false });

      if (locationSel !== "all") {
        query = query.eq("location", locationSel);
      }
      if (q && q.trim().length > 0) {
        const like = `%${q.trim()}%`;
        query = query.or(
          `title.ilike.${like},description.ilike.${like},location.ilike.${like}`
        );
      }
      const min = Number(priceMin || 0);
      if (!Number.isNaN(min) && min > 0) {
        query = query.gte("price", min);
      }
      if (priceMax !== "any") {
        const max = Number(priceMax);
        if (!Number.isNaN(max)) {
          query = query.lte("price", max);
        }
      }

      const { data, error } = await query;
      if (!active) return;
      if (error) {
        setError(error.message);
        setProperties([]);
      } else {
        // Coerce images to string[] | null if stored as text[]/json
        let normalized = (data ?? []).map((p: any) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : (p.images ? [String(p.images)] : null),
        })) as (Property & { type?: string | null })[];

        // Client-side filter by type if property has 'type'
        if (typeSel !== "all") {
          normalized = normalized.filter((p: any) => (p.type ? p.type === typeSel : true));
        }
        setProperties(normalized as Property[]);
      }
      setLoading(false);
    }
    fetchProperties();
    return () => { active = false; };
  }, [locationSel, priceMin, priceMax, typeSel, refresh, q]);

  // Favorites logic
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  // Fetch user and favorites
  useEffect(() => {
    let active = true;
    async function fetchFavorites() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;

      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("favorites")
          .select("property_id")
          .eq("user_id", user.id);

        if (data && active) {
          setFavorites(new Set(data.map(f => f.property_id)));
        }
      }
    }
    fetchFavorites();
    return () => { active = false; };
  }, [refresh]);

  const toggleFavorite = async (propertyId: string) => {
    if (!user) {
      // Prompt logic if needed, or redirect
      alert(t("loginForFavorites"));
      return;
    }

    const newFavorites = new Set(favorites);
    const isFav = newFavorites.has(propertyId);

    if (isFav) {
      newFavorites.delete(propertyId);
      setFavorites(newFavorites);
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("property_id", propertyId);
    } else {
      newFavorites.add(propertyId);
      setFavorites(newFavorites);
      await supabase.from("favorites").insert({ user_id: user.id, property_id: propertyId });
    }
  };

  return (
    <main
      className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-4 mobile-bottom-safe"
      suppressHydrationWarning
    >
      {/* Header with logo and VENDRA text centered - visible only on mobile/tablet */}
      <header className="md:hidden mb-6 py-4 sticky top-0 bg-background z-40 pt-4 mobile-top-safe" suppressHydrationWarning>
        <div className="container mx-auto flex justify-center items-center" suppressHydrationWarning>
          <Link href="/" className="flex items-center gap-2 text-primary" aria-label="Ir al inicio">
            <Image
              src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/logo3.png"
              alt="Logotipo de Vendra"
              width={128}
              height={48}
              className="h-11 sm:h-16 w-auto"
              priority
            />
            <span className="whitespace-nowrap text-2xl sm:text-3xl font-serif font-extrabold tracking-wide">VENDRA</span>
          </Link>
          <Link href="/messages" className="ml-auto mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors relative">
            <MessageSquare className="h-5 w-5" />
            {mounted && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="container mx-auto" suppressHydrationWarning>
        {/* Hero + Filters */}
        <Card className="mb-8 rounded-2xl shadow-lg overflow-visible bg-background border-0 relative before:content-[''] before:absolute before:inset-y-2 before:left-0.5 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[hsl(var(--border))]/20 before:to-transparent after:content-[''] after:absolute after:inset-y-2 after:right-0.5 after:w-px after:bg-gradient-to-b after:from-transparent after:via-[hsl(var(--border))]/20 after:to-transparent" suppressHydrationWarning>
          <CardContent className="p-8 md:p-10" suppressHydrationWarning>
            <h1 className="font-serif text-4xl md:text-6xl font-bold text-primary text-center">{t("heroTitle")}</h1>
            <p className="mt-3 text-center text-muted-foreground max-w-2xl mx-auto">{t("heroSubtitle")}</p>

            {/* Minimalist Filter Bar */}
            <div className="mt-8 relative z-20 max-w-5xl mx-auto" suppressHydrationWarning>
              <div className="bg-background/80 backdrop-blur-md border border-border/60 rounded-[2rem] md:rounded-full p-2 shadow-sm hover:shadow-md transition-shadow duration-300" suppressHydrationWarning>
                <div className="flex flex-col md:flex-row md:items-center gap-2 divide-y md:divide-y-0 md:divide-x divide-border/60" suppressHydrationWarning>

                  {/* Location */}
                  <CustomSelect
                    icon={MapPin}
                    label={tProps("filters.location")}
                    value={locationSel}
                    onChange={setLocationSel}
                    options={[
                      { value: "all", label: t("allZones") },
                      ...allLocations.map(l => ({ value: l, label: l }))
                    ]}
                  />

                  {/* Type */}
                  <CustomSelect
                    icon={Home}
                    label={tProps("filters.type")}
                    value={typeSel}
                    onChange={setTypeSel}
                    options={[
                      { value: "all", label: t("anyType") },
                      { value: "Casa", label: tProps("types.house") },
                      { value: "Apartamento", label: tProps("types.apartment") },
                      { value: "Complejo de Aptos", label: tProps("types.condo") },
                      { value: "Condominio", label: tProps("types.condo") },
                      { value: "Terreno", label: tProps("types.land") },
                      { value: "Comercial", label: tProps("types.commercial") },
                      { value: "Villa", label: tProps("types.house") }
                    ]}
                  />

                  {/* Price Min */}
                  <div className="flex-1 px-4 py-2 relative group" suppressHydrationWarning>
                    <label className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground/60 mb-0.5 block">{tProps("filters.minPrice")}</label>
                    <div className="flex items-center" suppressHydrationWarning>
                      <DollarSign className="size-4 text-primary/60 mr-2" />
                      <input
                        type="number"
                        className="w-full bg-transparent border-none p-0 text-sm font-medium text-foreground focus:ring-0 placeholder:text-muted-foreground/50 h-5"
                        placeholder="0"
                        value={priceMin === "0" ? "" : priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Price Max */}
                  <CustomSelect
                    icon={DollarSign}
                    label={tProps("filters.maxPrice")}
                    value={priceMax}
                    onChange={setPriceMax}
                    options={[
                      { value: "any", label: t("noLimit") },
                      { value: "100000", label: "100k" },
                      { value: "300000", label: "300k" },
                      { value: "500000", label: "500k" },
                      { value: "1000000", label: "1M+" }
                    ]}
                  />

                  {/* Action Buttons */}
                  <div className="pl-2 pr-1 py-1 flex items-center gap-2" suppressHydrationWarning>
                    {(locationSel !== "all" || typeSel !== "all" || priceMin !== "0" || priceMax !== "any") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setLocationSel("all"); setTypeSel("all"); setPriceMin("0"); setPriceMax("any"); setRefresh(v => v + 1); }}
                        className="rounded-full size-10 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                        title={t("clearFilters")}
                      >
                        <X className="size-4" />
                      </Button>
                    )}

                    <Button
                      onClick={() => setRefresh(v => v + 1)}
                      className="rounded-full h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95"
                    >
                      <Search className="size-4 md:mr-2" />
                      <span className="hidden md:inline">{tCommon("search")}</span>
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center text-muted-foreground" suppressHydrationWarning>{t("loadingProperties")}</div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-6">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <h2 className="mb-4 font-serif text-2xl text-foreground">{t("featuredListings")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  isFavorite={favorites.has(p.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
              {properties.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground" suppressHydrationWarning>
                  {t("noMatches")}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

import { CustomSelect } from "@/components/ui/custom-select";

export default function MainPage() {
  const tAuth = useTranslations("auth");

  return (
    <Suspense fallback={<main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe"><div className="container mx-auto text-muted-foreground">{tAuth("startingExperience")}</div></main>}>
      <MainContent />
    </Suspense>
  );
}