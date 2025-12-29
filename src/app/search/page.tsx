"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
// Removed native components to use premium custom UI
import { Button } from "@/components/ui/button";
import { Search, User, MapPin, ChevronLeft, Home, Building, X } from "lucide-react";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import type { Property } from "@/types";
import Link from "next/link";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import { CustomSelect } from "@/components/ui/custom-select";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState<string>("");
  const [locationSel, setLocationSel] = useState<string>("all");
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [searchType, setSearchType] = useState<"property" | "agent">("property");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string | null; email: string | null; role: string | null; avatar_url: string | null }>>([]);

  // Initialize from URL
  useEffect(() => {
    const qp = searchParams.get("q") ?? "";
    const loc = searchParams.get("location") ?? "";
    const type = searchParams.get("type") ?? "property";
    setQ(qp);
    setLocationSel(loc || "all");
    setSearchType(type === "agent" ? "agent" : "property");
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

  // Fetch results
  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      setError(null);

      if (searchType === "property") {
        let pQuery: any = supabase
          .from("properties")
          .select("id,title,description,price,location,images,owner_id,type,role_priority")
          .order("role_priority", { ascending: false })
          .order("inserted_at", { ascending: false });

        const term = (q || "").trim();
        if (term) {
          const like = `%${term}%`;
          pQuery = pQuery.or(`title.ilike.${like},description.ilike.${like},location.ilike.${like},type.ilike.${like}`);
        }
        if (locationSel !== "all") {
          pQuery = pQuery.eq("location", locationSel);
        }

        const [{ data: pData, error: pErr }] = await Promise.all([pQuery]);

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
        setAgents([]);
      } else {
        if (q && q.trim()) {
          try {
            const like = `%${q.trim()}%`;
            const { data: aData, error: aErr } = await supabase
              .from("public_profiles")
              .select("id,name,email,role,avatar_url")
              .or(`name.ilike.${like},email.ilike.${like}`)
              .limit(20);
            if (!active) return;
            if (aErr) {
              setError(aErr.message);
              setAgents([]);
            } else {
              // Now verify these users against seller_applications to ensure they are actually agents
              const users = (aData ?? []) as any[];
              if (users.length > 0) {
                const userIds = users.map(u => u.id);
                const { data: appData } = await supabase
                  .from("seller_applications")
                  .select("user_id, status")
                  .in("user_id", userIds);

                const validApps = new Set(
                  appData?.filter(app => app.status === 'approved' || app.status === 'submitted').map(app => app.user_id)
                );

                // Map users, downgrading role if no valid app exists
                const verifiedUsers = users.map(u => {
                  // If role is agent/seller/company but no valid app, downgrade to null or comprador
                  if ((u.role === 'agente' || u.role === 'vendedor' || u.role === 'empresa_constructora') && !validApps.has(u.id)) {
                    return { ...u, role: 'comprador' };
                  }
                  return u;
                });
                setAgents(verifiedUsers);
              } else {
                setAgents([]);
              }
            }
          } catch (err) {
            if (!active) return;
            setError((err as Error).message);
            setAgents([]);
          }
        } else {
          setAgents([]);
        }
        setProperties([]);
      }
      setLoading(false);
    }
    run();
    return () => { active = false; };
  }, [q, locationSel, searchType]);

  const submitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchType === "agent" && !q.trim()) return;

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (locationSel !== "all") params.set("location", locationSel);
    if (searchType === "agent") params.set("type", "agent");
    router.push(params.toString() ? `/search?${params.toString()}` : "/search");
  };

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-6 mobile-bottom-safe mobile-horizontal-safe">
      {/* Mobile Header */}
      <DetailBackButton className="md:hidden mb-6 sticky top-0 bg-background/95 backdrop-blur-sm z-30 py-2 mobile-top-safe">
        <div className="flex items-center justify-between w-full">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full text-foreground hover:bg-secondary/20 w-8 h-8 transition-all duration-200"
          >
            <Link href="/">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-serif font-bold text-primary truncate mx-2">
            Búsqueda
          </h1>
          <div className="w-8 h-8" />
        </div>
      </DetailBackButton>

      <div className="container mx-auto max-w-7xl space-y-8">

        {/* Type Toggle Pills */}
        <div className="flex justify-center -mb-4 z-30 relative">
          <div className="bg-background/80 backdrop-blur-md rounded-full shadow-sm border border-border/50 p-1 flex gap-1">
            <button
              onClick={() => { setSearchType("property"); const p = new URLSearchParams(window.location.search); p.set("type", "property"); window.history.replaceState({}, "", `?${p}`); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${searchType === "property" ? "bg-primary text-white shadow-md" : "hover:bg-secondary/10 text-muted-foreground"}`}
            >
              Propiedades
            </button>
            <button
              onClick={() => { setSearchType("agent"); const p = new URLSearchParams(window.location.search); p.set("type", "agent"); window.history.replaceState({}, "", `?${p}`); setLocationSel("all"); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${searchType === "agent" ? "bg-primary text-white shadow-md" : "hover:bg-secondary/10 text-muted-foreground"}`}
            >
              Agentes
            </button>
          </div>
        </div>

        {/* Premium Search Filter Pill */}
        <div className="relative sticky md:static top-14 z-20">
          <div className="bg-background/80 backdrop-blur-md border border-border/60 rounded-[2rem] md:rounded-full p-2 shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/40">
            {/* Search Term */}
            <div className="flex-1 px-4 py-2 relative group">
              <label className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground/60 mb-0.5 block">
                {searchType === 'property' ? 'Búsqueda' : 'Nombre / Email'}
              </label>
              <div className="flex items-center">
                <Search className="size-4 text-primary/60 mr-2" />
                <input
                  type="text"
                  placeholder={searchType === 'property' ? "Ej. Villa moderna..." : "Buscar persona..."}
                  className="bg-transparent border-none outline-none text-sm font-medium text-foreground w-full placeholder:text-muted-foreground/50 h-5 p-0 focus:ring-0"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                />
                {q && (
                  <button onClick={() => setQ("")} className="ml-2 text-muted-foreground hover:text-destructive">
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Location Select (Properties Only) */}
            {searchType === 'property' && (
              <div className="md:w-64">
                <CustomSelect
                  icon={MapPin}
                  label="Ubicación"
                  value={locationSel}
                  onChange={setLocationSel}
                  options={[
                    { value: "all", label: "Todas las ubicaciones" },
                    ...allLocations.map(l => ({ value: l, label: l }))
                  ]}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="pl-2 pr-1 py-1 flex items-center justify-end gap-2 md:w-auto mt-2 md:mt-0">
              <Button
                onClick={() => submitSearch()}
                className="rounded-full h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95 w-full md:w-auto"
              >
                <Search className="size-4 md:mr-2" />
                <span className="inline">Buscar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="min-h-[40vh]">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-[4/3] bg-muted/20 rounded-3xl" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-red-50 rounded-3xl border border-red-100">
              <p className="text-red-500 font-medium">Ocurrió un error en la búsqueda</p>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Header Results */}
              <div className="flex items-end justify-between mb-6 px-2">
                <h2 className="font-serif text-2xl text-foreground">
                  {searchType === 'property' ? 'Propiedades' : 'Agentes'}
                  <span className="ml-2 text-sm font-sans text-muted-foreground font-normal">
                    {searchType === 'property' ? properties.length : agents.length} resultados
                  </span>
                </h2>
              </div>

              {/* Content Grid */}
              {searchType === 'property' ? (
                properties.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {properties.map(p => <PropertyCard key={p.id} property={p} />)}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-secondary/5 rounded-[2rem] border border-dashed border-border/60">
                    <Search className="size-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-serif text-primary">No encontramos propiedades</p>
                    <p className="text-sm text-muted-foreground">Intenta cambiar la ubicación o el término de búsqueda.</p>
                  </div>
                )
              ) : (
                // Agents Grid
                agents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map(a => (
                      <div key={a.id} onClick={() => router.push(`/profile/view?id=${a.id}`)} className="bg-background border border-border/50 rounded-2xl p-4 flex items-center gap-4 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group">
                        <div className="size-12 rounded-full bg-secondary/20 flex items-center justify-center text-primary font-bold text-lg group-hover:scale-110 transition-transform overflow-hidden relative">
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt={a.name || "Agent"} className="h-full w-full object-cover" />
                          ) : (
                            a.name?.[0]?.toUpperCase() || <User className="size-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-serif font-bold text-lg truncate group-hover:text-primary transition-colors">{a.name || "Agente"}</h3>
                          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                          {a.role && (
                            <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-foreground/70">
                              {a.role.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-secondary/5 rounded-[2rem] border border-dashed border-border/60">
                    <User className="size-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-serif text-primary">{q ? "No encontramos a nadie" : "Busca un agente"}</p>
                    <p className="text-sm text-muted-foreground">Ingresa el nombre o correo del profesional que buscas.</p>
                  </div>
                )
              )}
            </>
          )}
        </div>

      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-10 mobile-bottom-safe"><div className="text-center text-muted-foreground mt-20">Cargando buscador...</div></main>}>
      <SearchContent />
    </Suspense>
  );
}
