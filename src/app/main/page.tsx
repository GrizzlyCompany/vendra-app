"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PropertyCard } from "@/components/PropertyCard";
import type { Property } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Home, DollarSign, Search, X } from "lucide-react";

function MainContent() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        .select("id,title,description,price,location,images,owner_id,type")
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

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe">
      <div className="container mx-auto">
        {/* Hero + Filters */}
        <Card className="mb-8 rounded-2xl shadow-lg overflow-visible bg-background border-0 relative before:content-[''] before:absolute before:inset-y-2 before:left-0.5 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[hsl(var(--border))]/20 before:to-transparent after:content-[''] after:absolute after:inset-y-2 after:right-0.5 after:w-px after:bg-gradient-to-b after:from-transparent after:via-[hsl(var(--border))]/20 after:to-transparent">
          <CardContent className="p-8 md:p-10">
            <h1 className="font-serif text-4xl md:text-6xl font-bold text-primary text-center">Vende rápido. Compra feliz.</h1>
            <p className="mt-3 text-center text-muted-foreground max-w-2xl mx-auto">Descubre una cuidada selección de las mejores propiedades. Tu nuevo comienzo te espera.</p>

            {/* Filters bar */}
            <div className="mt-6 rounded-2xl bg-background p-4 sm:p-3 shadow-lg overflow-visible transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 max-w-5xl mx-auto border-0 relative before:content-[''] before:absolute before:inset-y-2 before:left-0.5 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[hsl(var(--border))]/18 before:to-transparent after:content-[''] after:absolute after:inset-y-2 after:right-0.5 after:w-px after:bg-gradient-to-b after:from-transparent after:via-[hsl(var(--border))]/18 after:to-transparent">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" /> Ubicación</label>
                  <Select
                    className="h-12 w-full rounded-full border bg-[hsl(var(--background))] border-slate-300/50 dark:border-slate-600/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10"
                    value={locationSel}
                    onChange={(e) => setLocationSel(e.target.value)}
                  >
                    <option value="all">Todas las Ubicaciones</option>
                    {allLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Home className="size-4" /> Tipo de Propiedad</label>
                  <Select
                    className="h-12 w-full rounded-full border bg-[hsl(var(--background))] border-slate-300/50 dark:border-slate-600/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10"
                    value={typeSel}
                    onChange={(e) => setTypeSel(e.target.value)}
                  >
                    <option value="all">Todos los Tipos</option>
                    <option value="Casa">Casa</option>
                    <option value="Apartamento">Apartamento</option>
                    <option value="Terreno">Terreno</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Villa">Villa</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="size-4" /> Precio Mín.</label>
                  <Input
                    type="number"
                    min={0}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="0"
                    className="h-12 rounded-full border bg-[hsl(var(--background))] border-slate-300/50 dark:border-slate-600/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="size-4" /> Precio Máx.</label>
                  <Select
                    className="h-12 w-full rounded-full border bg-[hsl(var(--background))] border-slate-300/50 dark:border-slate-600/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                  >
                    <option value="any">Cualquiera</option>
                    <option value="100000">100,000</option>
                    <option value="300000">300,000</option>
                    <option value="500000">500,000</option>
                    <option value="1000000">1,000,000</option>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-4 sm:col-span-2 md:col-span-1">
                  <Button onClick={() => setRefresh((v) => v + 1)} className="h-12 w-full sm:flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px]">
                    <Search className="size-4 mr-2" /> Buscar
                  </Button>
                  <Button onClick={() => { setLocationSel("all"); setTypeSel("all"); setPriceMin("0"); setPriceMax("any"); setRefresh((v) => v + 1); }} variant="ghost" className="h-12 w-full sm:w-auto rounded-full min-h-[48px]">
                    <X className="size-4 mr-2" /> Limpiar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center text-muted-foreground">Cargando propiedades…</div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-6">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <h2 className="mb-4 font-serif text-2xl text-foreground">Listados Destacados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
              {properties.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground">
                  Ninguna propiedad coincide con tus filtros actuales.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function MainPage() {
  return (
    <Suspense fallback={<main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe"><div className="container mx-auto text-muted-foreground">Cargando…</div></main>}>
      <MainContent />
    </Suspense>
  );
}
