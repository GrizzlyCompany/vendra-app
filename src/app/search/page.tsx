"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, User, MapPin } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import type { Property } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState<string>("");
  const [locationSel, setLocationSel] = useState<string>("all");
  const [allLocations, setAllLocations] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string | null; email: string | null; role: string | null }>>([]);

  // Initialize from URL
  useEffect(() => {
    const qp = searchParams.get("q") ?? "";
    const loc = searchParams.get("location") ?? "";
    setQ(qp);
    setLocationSel(loc || "all");
  }, [searchParams]);

  // Load locations once
  useEffect(() => {
    let active = true;
    async function loadLocations() {
      const { data } = await supabase.from("properties").select("location");
      if (!active) return;
      const set = new Set<string>();
      (data ?? []).forEach((row: any) => { if (row.location) set.add(row.location); });
      setAllLocations(Array.from(set).sort());
    }
    loadLocations();
    return () => { active = false; };
  }, []);

  // Fetch results when q/location changes
  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      setError(null);

      // Properties query
      let pQuery = supabase
        .from("properties")
        .select("id,title,description,price,location,images,owner_id,type")
        .order("inserted_at", { ascending: false });

      const term = (q || "").trim();
      if (term) {
        const like = `%${term}%`;
        pQuery = pQuery.or(`title.ilike.${like},description.ilike.${like},location.ilike.${like},type.ilike.${like}`);
      }
      if (locationSel !== "all") {
        pQuery = pQuery.eq("location", locationSel);
      }

      const [{ data: pData, error: pErr }] = await Promise.all([
        pQuery,
      ]);

      if (!active) return;
      if (pErr) {
        setError(pErr.message);
        setProperties([]);
      } else {
        const normalized = (pData ?? []).map((p: any) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : (p.images ? [String(p.images)] : null),
        })) as Property[];
        setProperties(normalized);
      }

      // Agents query (optional): search users by name/email (no role restriction)
      try {
        const like = `%${(q || "").trim()}%`;
        const { data: aData } = await supabase
          .from("users")
          .select("id,name,email,role")
          .or(`name.ilike.${like},email.ilike.${like}`)
          .limit(10);
        if (!active) return;
        setAgents((aData ?? []) as any);
      } catch (_e) {
        // Ignore agent errors (e.g., RLS/schema issues) and keep agents empty
        if (!active) return;
        setAgents([]);
      }

      setLoading(false);
    }
    run();
    return () => { active = false; };
  }, [q, locationSel]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (locationSel !== "all") params.set("location", locationSel);
    router.push(params.toString() ? `/search?${params.toString()}` : "/search");
  };

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe">
      <div className="container mx-auto">
        <h1 className="font-serif text-3xl text-foreground">Resultados de búsqueda</h1>
        <form onSubmit={submitSearch} className="mt-6 space-y-4">
          <div className="space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:gap-4 sm:items-end">
            <div className="flex-1">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Search className="size-4 text-primary" />
                Buscar propiedad
              </label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ej. Apartamento, Juan Pérez, Bávaro"
                className="h-12 text-base"
              />
            </div>
            <div className="sm:w-48">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="size-4 text-primary" />
                Ubicación
              </label>
              <Select
                value={locationSel}
                onChange={(e) => setLocationSel(e.target.value)}
                className="h-12 text-base"
              >
                <option value="all">Todas las ubicaciones</option>
                {allLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1 sm:flex-none sm:w-auto rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 font-medium">
              <Search className="size-4 mr-2" />
              Buscar
            </Button>
            {(q || locationSel !== "all") && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQ("");
                  setLocationSel("all");
                  router.push("/search");
                }}
                className="px-4 h-12"
              >
                Limpiar
              </Button>
            )}
          </div>
        </form>

        {loading && (
          <div className="mt-8 space-y-6">
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-48 mb-4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="aspect-video bg-muted animate-pulse"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-muted rounded flex-1"></div>
                        <div className="h-8 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
        {error && (
          <Card className="mt-8 p-6 border-red-200 bg-red-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">⚠</span>
              </div>
              <div>
                <h3 className="font-medium text-red-800">Error al buscar</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {!loading && !error && (
          <div className="mt-8 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl sm:text-2xl text-foreground">
                  Propiedades <span className="text-muted-foreground font-normal">({properties.length})</span>
                </h2>
                {properties.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {properties.length} {properties.length === 1 ? 'resultado' : 'resultados'}
                  </div>
                )}
              </div>
              {properties.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="text-muted-foreground mb-4">
                    <Search className="size-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No se encontraron propiedades</p>
                    <p className="text-sm mt-2">Intenta con otros términos de búsqueda</p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {properties.map((p) => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
              )}
            </section>

            {agents.length > 0 && (
              <section className="lg:hidden">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
                      <User className="size-4" />
                      Agentes ({agents.length})
                    </h2>
                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="mt-4 space-y-3">
                    {agents.map((a) => (
                      <Card key={a.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="size-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {a.name || a.email || "Agente"}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">{a.email}</div>
                            {a.role && (
                              <div className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {a.role}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </details>
              </section>
            )}

            <aside className="hidden lg:block lg:col-span-1">
              <h2 className="mb-4 font-serif text-xl text-foreground flex items-center gap-2">
                <User className="size-5" />
                Agentes ({agents.length})
              </h2>
              {agents.length === 0 ? (
                <Card className="p-6 text-center">
                  <User className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No se encontraron agentes</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {agents.map((a) => (
                    <Card key={a.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {a.name || a.email || "Agente"}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{a.email}</div>
                          {a.role && (
                            <div className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {a.role}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe"><div className="container mx-auto text-muted-foreground">Cargando…</div></main>}>
      <SearchContent />
    </Suspense>
  );
}
