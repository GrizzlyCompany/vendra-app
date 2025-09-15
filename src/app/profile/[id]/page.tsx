"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PropertyCard } from "@/components/PropertyCard";
import type { Property } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Building, MessageSquare } from "lucide-react";

// Public profile page for arbitrary user by id
// This is distinct from src/app/profile/page.tsx which shows the session user's own profile

type PublicProfile = {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  role?: string | null;
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [myComment, setMyComment] = useState<string>("");
  const [showRate, setShowRate] = useState<boolean>(false);
  const [savingRate, setSavingRate] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<'listed' | 'reviews'>('listed');
  const [recentRatings, setRecentRatings] = useState<Array<{ rating: number; comment: string | null; created_at: string }>>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!userId) return;
      setLoading(true);
      setError(null);
      setProfileError(null);
      try {
        // Fetch profile from a public view/table, falling back as needed
        const fetchFrom = async (table: string) =>
          await supabase
            .from(table)
            // Only select columns that exist across all fallback tables to avoid errors
            .select("id,name,email,bio,avatar_url,role")
            .eq("id", userId)
            .maybeSingle();

        let p: any = null;
        for (const table of ["public_profiles", "profiles", "users"]) {
          const { data, error } = await fetchFrom(table);
          if (data && !error) {
            p = data;
            break;
          }
          if (error) {
            // keep last error for visibility
            setProfileError(error.message ?? String(error));
          }
        }

        // Fetch properties by owner_id (only public fields)
        const { data: props, error: propsErr } = await supabase
          .from("properties")
          .select("id,title,description,price,location,images,owner_id,type,inserted_at")
          .eq("owner_id", userId)
          .order("inserted_at", { ascending: false });
        if (propsErr) {
          setError(propsErr.message ?? String(propsErr));
        }

        // Member since & banner: try public_profiles fields if available
        try {
          let pp: any = null;
          // First try selecting banner_url; if column doesn't exist, fallback to only inserted_at
          const first = await supabase
            .from("public_profiles")
            .select("inserted_at,banner_url")
            .eq("id", userId)
            .maybeSingle();
          if (first.error) {
            const second = await supabase
              .from("public_profiles")
              .select("inserted_at")
              .eq("id", userId)
              .maybeSingle();
            pp = second.data ?? null;
          } else {
            pp = first.data ?? null;
          }
          if (pp?.inserted_at) {
            const d = new Date(pp.inserted_at as any);
            setMemberSince(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`);
          } else {
            setMemberSince(null);
          }
          if (pp && typeof pp.banner_url === 'string' && pp.banner_url.length > 0) {
            setBannerUrl(pp.banner_url as string);
          } else {
            setBannerUrl(null);
          }
        } catch {}

        if (!active) return;
        setProfile(
          p
            ? {
                id: p.id,
                name: p.name ?? null,
                email: p.email ?? null,
                bio: p.bio ?? null,
                avatar_url: p.avatar_url ?? null,
                role: p.role ?? null,
              }
            : null
        );
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

        // Load ratings (average, count, and my rating if authenticated)
        try {
          // Aggregates (anonymous)
          const { data: allRatings, count } = await supabase
            .from('user_ratings')
            .select('rating', { count: 'exact' })
            .eq('target_user_id', userId);
          const ratings = (allRatings ?? []) as { rating: number }[];
          const total = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
          const c = count ?? ratings.length;
          setRatingCount(c);
          setAvgRating(c > 0 ? total / c : null);
          // Recent list (anonymous)
          const { data: recent } = await supabase
            .from('user_ratings')
            .select('rating,comment,created_at')
            .eq('target_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);
          setRecentRatings((recent ?? []) as any);
        } catch {}

        try {
          const { data: sess } = await supabase.auth.getSession();
          const reviewer = sess.session?.user?.id ?? null;
          if (reviewer && reviewer !== userId) {
            const { data: mine } = await supabase
              .from('user_ratings')
              .select('rating,comment')
              .eq('target_user_id', userId)
              .eq('reviewer_id', reviewer)
              .maybeSingle();
            if (mine) {
              setMyRating(mine.rating ?? null);
              setMyComment(mine.comment ?? "");
            }
          }
        } catch {}
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? String(e));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [userId]);

  const hasListings = useMemo(() => (properties?.length ?? 0) > 0, [properties]);
  const roleBadge = useMemo(() => {
    if (hasListings) return "Vendedor/Agente";
    if (profile?.role && profile.role.trim().length > 0) {
      const r = profile.role.toLowerCase();
      if (r.includes("vendedor") || r.includes("agente")) return "Vendedor/Agente";
      if (r.includes("empresa")) return "Empresa constructora";
      return "Comprador";
    }
    return "Comprador";
  }, [profile?.role, hasListings]);

  if (!userId) return null;

  return (
    <main className="container mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 mobile-bottom-safe mobile-horizontal-safe">

      <Card className="bg-card text-card-foreground flex flex-col gap-6 border py-6 overflow-hidden shadow-lg rounded-2xl">
        <CardHeader className="@container/card-header p-0 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
          {/* Banner area to match private layout */}
          <div
            className="h-20 sm:h-24"
            style={{
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundColor: 'rgb(230, 240, 234)',
              backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
            }}
          />
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center sm:items-center -mt-12 sm:-mt-14 lg:-mt-16">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="relative flex shrink-0 overflow-hidden rounded-full h-20 w-20 sm:h-24 sm:w-24 lg:h-32 lg:w-32 border-4 border-background bg-background">
                <Avatar src={profile?.avatar_url ?? null} alt={profile?.name ?? 'Usuario'} className="h-full w-full" />
              </div>
              <div className="pt-2 sm:pt-3 lg:pt-4 text-center sm:text-left">
                <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-primary truncate max-w-[80vw] sm:max-w-none">
                    {profile?.name ?? (loading ? 'Cargando…' : 'Usuario')}
                  </h1>
                </div>
                <div className="mt-1 flex items-center gap-2 justify-center sm:justify-start">
                  <Badge variant="secondary" className="text-xs">{roleBadge}</Badge>
                </div>
                {!loading && !profile && (
                  <p className="mt-2 text-sm text-muted-foreground">Perfil no encontrado.</p>
                )}
                {profileError && (
                  <p className="mt-2 text-xs text-muted-foreground">{profileError}</p>
                )}
              </div>
            </div>
            {/* Right side actions: show average and rate button */}
            <div className="mt-3 sm:mt-4 md:mt-0 flex items-center gap-2 sm:gap-3 sm:self-center">
              {avgRating !== null && (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-foreground">
                  <Star className="size-3 sm:size-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({ratingCount})</span>
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => { setTabValue('reviews'); setShowRate(true); }}>
                Calificar
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  const { data: sess } = await supabase.auth.getSession();
                  const me = sess.session?.user?.id ?? null;
                  if (!me) {
                    router.push(`/login?redirect_url=/profile/${userId}`);
                    return;
                  }
                  if (me === userId) {
                    alert('No puedes iniciar chat contigo mismo.');
                    return;
                  }
                  router.push(`/messages?to=${userId}`);
                }}
                className="ml-1"
              >
                <MessageSquare className="mr-2" /> Chat
              </Button>
            </div>
          </div>

          {/* Bio section */}
          {profile?.bio && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
              <h3 className="text-sm font-medium text-foreground mb-2">Sobre Mi</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Metrics row */}
          <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 border-t pt-4 sm:pt-6">
            <div className="text-center sm:text-left">
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="mt-1 text-sm font-medium text-foreground break-all">{profile?.email ?? '—'}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs text-muted-foreground">Miembro desde</div>
              <div className="mt-1 text-sm font-medium text-foreground">{memberSince ?? '—'}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs text-muted-foreground">Propiedades</div>
              <div className="mt-1 text-sm font-medium text-foreground">{properties.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs styled like private profile page */}
      <Tabs value={tabValue} onValueChange={(v:any)=>setTabValue(v)} className="w-full mt-3 sm:mt-4">
        <TabsList className="w-full overflow-x-auto flex gap-1 sm:gap-2 px-1 py-1 sm:grid sm:grid-cols-2">
          <TabsTrigger className="shrink-0 text-xs sm:text-sm px-2 sm:px-3" value="listed"><Building className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Propiedades</TabsTrigger>
          <TabsTrigger className="shrink-0 text-xs sm:text-sm px-2 sm:px-3" value="reviews"><Star className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Valoraciones</TabsTrigger>
        </TabsList>
        <TabsContent value="listed">
          <Card className="mt-3 sm:mt-4">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Propiedades de {profile?.name ?? "este usuario"}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="rounded-md border bg-muted/30 p-4 sm:p-6 text-sm text-muted-foreground">Cargando…</div>
              ) : error ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 sm:p-6 text-sm text-destructive">
                  {error}
                </div>
              ) : properties.length === 0 ? (
                <div className="rounded-md border bg-muted/30 p-4 sm:p-6 text-sm text-muted-foreground">Este usuario aún no tiene propiedades publicadas.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {properties.map((p) => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reviews">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Valoraciones</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Rate form (toggle) */}
              {showRate && (
                <div className="mb-4 rounded-md border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {[1,2,3,4,5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`p-1 rounded ${ (myRating ?? 0) >= n ? 'text-amber-400' : 'text-muted-foreground'}`}
                        onClick={() => setMyRating(n)}
                        aria-label={`Calificar ${n}`}
                      >
                        <Star className={`size-6 ${ (myRating ?? 0) >= n ? 'fill-amber-400' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    placeholder="Escribe un comentario (opcional)"
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    rows={3}
                  />
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowRate(false)} disabled={savingRate}>Cancelar</Button>
                    <Button type="button" onClick={async () => {
                      try {
                        const { data: sess } = await supabase.auth.getSession();
                        const reviewer = sess.session?.user?.id ?? null;
                        if (!reviewer) {
                          router.push(`/login?redirect_url=/profile/${userId}`);
                          return;
                        }
                        if (reviewer === userId) {
                          alert('No puedes calificar tu propio perfil.');
                          return;
                        }
                        if (!myRating) {
                          alert('Selecciona una calificación.');
                          return;
                        }
                        setSavingRate(true);
                        await supabase
                          .from('user_ratings')
                          .upsert(
                            { target_user_id: userId, reviewer_id: reviewer, rating: myRating, comment: myComment ?? null },
                            { onConflict: 'target_user_id,reviewer_id' }
                          );
                        // Refresh aggregates
                        const { data: allRatings, count } = await supabase
                          .from('user_ratings')
                          .select('rating', { count: 'exact' })
                          .eq('target_user_id', userId);
                        const ratings = (allRatings ?? []) as { rating: number }[];
                        const total = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
                        const c = count ?? ratings.length;
                        setRatingCount(c);
                        setAvgRating(c > 0 ? total / c : null);
                        // Refresh recent list
                        const { data: recent } = await supabase
                          .from('user_ratings')
                          .select('rating,comment,created_at')
                          .eq('target_user_id', userId)
                          .order('created_at', { ascending: false })
                          .limit(20);
                        setRecentRatings((recent ?? []) as any);
                        setShowRate(false);
                        setTabValue('reviews');
                      } finally {
                        setSavingRate(false);
                      }
                    }} disabled={savingRate}>
                      {savingRate ? 'Guardando…' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              )}

              {!showRate && ratingCount === 0 && (
                <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">Aún no hay valoraciones.</div>
              )}

              {/* Anonymous ratings list */}
              {!showRate && ratingCount > 0 && (
                <div className="space-y-3">
                  {recentRatings.map((r, idx) => (
                    <div key={idx} className="rounded-md border p-3">
                      <div className="flex items-center gap-2 text-amber-500">
                        {[1,2,3,4,5].map((n) => (
                          <Star key={n} className={`size-4 ${n <= (Number(r.rating)||0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                      {r.comment && (<p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{r.comment}</p>)}
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
        
      </Tabs>
    </main>
  );
}
