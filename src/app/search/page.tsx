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
        <form onSubmit={submitSearch} className="mt-4 flex flex-col sm:flex-row flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Search className="size-4" /> Término</label>
            <Input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Ej. Apartamento, Juan Pérez, Bávaro" 
              className="h-12 min-h-[48px]"
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[160px]">
            <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" /> Ubicación</label>
            <Select 
              value={locationSel} 
              onChange={(e) => setLocationSel(e.target.value)}
              className="h-12"
            >
              <option value="all">Todas</option>
              {allLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full sm:w-auto rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 min-h-[48px] px-6">Buscar</Button>
        </form>

        {loading && <div className="mt-6 text-muted-foreground">Buscando…</div>}
        {error && (
          <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
        )}

        {!loading && !error && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2">
              <h2 className="mb-4 font-serif text-xl text-foreground">Propiedades ({properties.length})</h2>
              {properties.length === 0 ? (
                <div className="text-muted-foreground">No se encontraron propiedades.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {properties.map((p) => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
              )}
            </section>

            <aside className="lg:col-span-1">
              <h2 className="mb-4 font-serif text-xl text-foreground">Agentes ({agents.length})</h2>
              {agents.length === 0 ? (
                <div className="text-muted-foreground">No se encontraron agentes.</div>
              ) : (
                <ul className="space-y-3">
                  {agents.map((a) => (
                    <li key={a.id} className="rounded-md border p-3">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <div className="font-medium text-foreground">{a.name || a.email || "Agente"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{a.email}</div>
                      {a.role && <div className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{a.role}</div>}
                    </li>
                  ))}
                </ul>
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
