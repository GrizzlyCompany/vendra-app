"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { handleSupabaseError } from "@/lib/errors";

type DashboardItem = {
  id: string;
  title: string;
  location: string;
  images: string[] | null;
  // Uno de estos dos campos para mostrar precio/rango
  price?: number | null;
  priceRangeText?: string | null;
  createdAt?: string | null;
  source: "property" | "project";
};

export function PropertiesSection({ onAdd }: { onAdd: () => void }) {
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToastContext();
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchData = async () => {
      try {
        // Fetch propiedades
        const { data: props, error: propsErr } = await supabase
          .from("properties")
          .select("id,title,price,location,images,owner_id,inserted_at")
          .eq("owner_id", user.id)
          .order("inserted_at", { ascending: false });

        // Fetch proyectos
        const { data: projs, error: projsErr } = await supabase
          .from("projects")
          .select("id,project_name,city_province,address,images,unit_price_range,created_at,owner_id")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (propsErr) {
          throw handleSupabaseError(propsErr);
        }
        if (projsErr) {
          throw handleSupabaseError(projsErr);
        }

        const mappedProps: DashboardItem[] = (props ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          location: p.location,
          images: Array.isArray(p.images) ? p.images : (p.images ? [String(p.images)] : null),
          price: typeof p.price === "number" ? p.price : null,
          priceRangeText: null,
          createdAt: p.inserted_at ?? null,
          source: "property",
        }));

        const mappedProjs: DashboardItem[] = (projs ?? []).map((pr: any) => ({
          id: pr.id,
          title: pr.project_name,
          location: pr.city_province || pr.address || "",
          images: Array.isArray(pr.images) ? pr.images : (pr.images ? [String(pr.images)] : null),
          price: null,
          priceRangeText: pr.unit_price_range ?? null,
          createdAt: pr.created_at ?? null,
          source: "project",
        }));

        const combined = [...mappedProps, ...mappedProjs].sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });

        if (mounted) {
          setItems(combined);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const error = handleSupabaseError(err);
          showError("Error al cargar propiedades", error.message);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [user, authLoading, showError]);

  const handleDelete = async (item: DashboardItem) => {
    try {
      let result;

      if (item.source === "property") {
        result = await supabase
          .from("properties")
          .delete()
          .eq("id", item.id)
          .eq("owner_id", user?.id);
      } else {
        result = await supabase
          .from("projects")
          .delete()
          .eq("id", item.id)
          .eq("owner_id", user?.id);
      }

      if (result.error) {
        throw handleSupabaseError(result.error);
      }

      // Update the state to remove the deleted item
      setItems(prevItems => prevItems.filter(i => i.id !== item.id));
      showSuccess("Eliminado", `${item.source === "property" ? "Propiedad" : "Proyecto"} eliminado correctamente`);
    } catch (err) {
      const error = handleSupabaseError(err);
      showError("Error al eliminar", error.message);
    }
  };

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={onAdd} className="bg-[#1C4B2E] text-white hover:bg-[#163c25]">
          <Plus className="mr-2 size-4" /> Agregar nueva propiedad
        </Button>
      </div>

      {!user ? (
        <div className="text-center py-8 text-[#6B7280]">
          Debes iniciar sesión para ver tus propiedades
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="overflow-hidden rounded-2xl border shadow-md">
              <div className="relative aspect-video w-full bg-muted">
                <Link href={p.source === "project" ? `/projects/${p.id}` : `/properties/${p.id}`}>
                  <Image
                    src={p.images?.[0] ?? "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop"}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </Link>
              </div>
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  <Link href={p.source === "project" ? `/projects/${p.id}` : `/properties/${p.id}`} className="hover:underline">
                    {p.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-[#6B7280]">
                  <span>{p.location}</span>
                  <span>
                    {typeof p.price === "number" && isFinite(p.price)
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(p.price)
                      : (p.priceRangeText || "—")}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button asChild variant="outline" className="rounded-lg" size="sm">
                    <Link href={p.source === "project" ? `/projects/${p.id}/edit` : `/properties/${p.id}/edit`}>
                      <Edit className="mr-2 size-4" /> Editar
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-lg"
                    size="sm"
                    onClick={() => handleDelete(p)}
                  >
                    <Trash2 className="mr-2 size-4" /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <div className="text-[#6B7280]">No tienes propiedades publicadas aún.</div>
          )}
        </div>
      )}
    </div>
  );
}