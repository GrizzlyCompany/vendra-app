"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Owner = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role?: string | null;
};

export function OwnerCard({ ownerId }: { ownerId: string | null | undefined }) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [listingsCount, setListingsCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!ownerId) {
          setOwner(null);
          return;
        }
        // Try multiple sources to avoid RLS issues
        const tryFetch = async (table: string) => {
          return await supabase
            .from(table)
            .select("id,name,email,avatar_url,role")
            .eq("id", ownerId)
            .single();
        };
        let data: Record<string, unknown> | null = null;
        let error: unknown = null;
        const tables = ["public_profiles", "profiles", "users"]; // prefer public view first
        for (const t of tables) {
          const res = await tryFetch(t);
          if (!res.error && res.data) {
            data = res.data;
            break;
          }
          error = res.error;
        }
        if (!data) {
          console.debug("owner fetch failed; last error:", error);
          if (active) setOwner(null);
        } else if (active) {
          setOwner({
            id: data.id as string,
            name: (data.name as string) ?? null,
            email: (data.email as string) ?? null,
            avatar_url: (data.avatar_url as string) ?? null,
            role: (data as Record<string, unknown>).role as string ?? null,
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [ownerId]);

  // Count owner's public listings to infer role if needed
  useEffect(() => {
    let active = true;
    async function countListings() {
      if (!ownerId) { setListingsCount(0); return; }
      try {
        const { count } = await supabase
          .from('properties')
          .select('id', { count: 'exact' })
          .eq('owner_id', ownerId);
        if (active) setListingsCount(count ?? 0);
      } catch {
        if (active) setListingsCount(0);
      }
    }
    countListings();
    return () => { active = false; };
  }, [ownerId]);

  // Resolve current authenticated user id to decide navigation target
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSelfId(data.session?.user?.id ?? null);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Avatar src={owner?.avatar_url ?? null} alt={owner?.name ?? "Propietario"} className="w-14 h-14 border bg-muted" />
        <div>
          <p className="font-medium">{owner?.name || (loading ? "Cargando…" : "Propietario")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(() => {
              const raw = (owner?.role || '').toLowerCase();
              if ((listingsCount ?? 0) > 0) return 'Vendedor/Agente';
              if (raw.includes('empresa')) return 'Empresa constructora';
              if (raw.includes('vendedor') || raw.includes('agente')) return 'Vendedor/Agente';
              if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);
              return 'comprador';
            })()}
          </p>
        </div>
      </div>
      {/* Action: go to profile (private if it's me, public otherwise) */}
      {owner?.id ? (
        <Button asChild className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href={owner.id === selfId ? "/profile" : `/profile/view?id=${owner.id}`}>
            {owner.id === selfId ? "Ir a mi perfil" : "Ver perfil"}
          </Link>
        </Button>
      ) : null}
      {/* Email intentionally hidden as requested */}
    </div>
  );
}
