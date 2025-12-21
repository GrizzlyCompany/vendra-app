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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("dashboard.properties");
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
          showError(t("loadError"), error.message);
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
      const typeLabel = item.source === "property" ? t("property") : t("project");
      showSuccess(t("delete"), t("deleteSuccess", { type: typeLabel }));
    } catch (err) {
      const error = handleSupabaseError(err);
      showError(t("deleteError"), error.message);
    }
  };

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-serif font-bold text-foreground">{t("title")}</h2>
        <Button onClick={onAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <Plus className="mr-2 size-4" /> {t("newProject")}
        </Button>
      </div>

      {!user ? (
        <div className="rounded-2xl border border-dashed border-muted-foreground/25 p-12 text-center text-muted-foreground bg-muted/5">
          {t("loginRequired")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <div
              key={p.id}
              className="group relative h-[400px] w-full rounded-[1.5rem] overflow-hidden bg-background shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
            >
              {/* Background Image with Zoom Effect */}
              <div className="absolute inset-0 overflow-hidden">
                <Image
                  src={p.images?.[0] ?? "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop"}
                  alt={p.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-300" />
              </div>

              {/* Floating Status / Type Badge */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <span className={`px-2.5 py-1 rounded-full backdrop-blur-md text-[10px] font-bold uppercase tracking-wide border shadow-sm ${p.source === 'project' ? 'bg-primary/90 text-white border-primary/20' : 'bg-secondary/90 text-secondary-foreground border-white/20'}`}>
                  {p.source === 'project' ? t("project") : t("property")}
                </span>
              </div>

              {/* Action Buttons (Edit/Delete) - Top Right */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-4 group-hover:translate-x-0">
                <Link href={p.source === "project" ? `/projects/${p.id}/edit` : `/properties/${p.id}/edit`}>
                  <button className="h-9 w-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-lg" title={t("edit")}>
                    <Edit className="w-4 h-4" />
                  </button>
                </Link>
                <button
                  onClick={() => handleDelete(p)}
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-red-500 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-lg"
                  title={t("delete")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Content Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end h-full">
                <div className="transform translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                  <h3 className="font-serif text-2xl font-bold text-white mb-1.5 leading-tight drop-shadow-md line-clamp-2">
                    <Link href={p.source === "project" ? `/projects/${p.id}` : `/properties/view?id=${p.id}`} className="hover:text-primary transition-colors">
                      {p.title}
                    </Link>
                  </h3>

                  <div className="flex items-center text-white/80 text-sm mb-4">
                    {/* Using a simple generic icon here effectively */}
                    <span className="truncate opacity-90">{p.location || t("noLocation")}</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">{t("price")}</span>
                      <span className="text-lg font-bold text-emerald-400 shadow-black drop-shadow-sm">
                        {typeof p.price === "number" && isFinite(p.price)
                          ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(p.price)
                          : (p.priceRangeText || t("consult"))}
                      </span>
                    </div>

                    <Link href={p.source === "project" ? `/projects/${p.id}` : `/properties/view?id=${p.id}`}>
                      <div className="flex items-center gap-1 text-sm font-medium text-white hover:text-primary transition-colors">
                        {t("details")}
                        {/* Simple arrow icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground bg-muted/5 rounded-[2rem] border border-dashed border-muted-foreground/20">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4 text-muted-foreground">
                <Plus className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-serif font-medium text-foreground mb-1">{t("empty")}</h3>
              <p className="text-sm text-muted-foreground mb-6">{t("emptyDesc")}</p>
              <Button onClick={onAdd} variant="outline" className="rounded-full">{t("createNow")}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}