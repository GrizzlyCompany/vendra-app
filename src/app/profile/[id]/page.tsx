"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Star, CheckCircle, MessageSquare, ChevronLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import Link from "next/link";
import { PropertyCard } from "@/features/properties/components/PropertyCard";

// Custom hooks
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useUserListings } from "@/features/properties/hooks/useUserListings";
import { useUserRatings } from "@/features/properties/hooks/useUserRatings";
import { ReviewsTabContent } from "@/components/profile/ReviewsTabContent";

export default function PublicProfilePage() {
  const params = useParams();
  const userIdParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const userId = userIdParam || null;
  const router = useRouter();

  // Early return if no userId
  if (!userId) return null;

  // Get current user for ratings
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      setCurrentUserId(data.session?.user?.id ?? null);
    };
    getCurrentUser();
  }, []);

  // Custom hooks for data
  const {
    profile,
    profileError,
    isProfileLoading,
    stats,
    isStatsLoading
  } = usePublicProfile(userId);

  const {
    properties,
    projects,
    listingsError,
    isListingsLoading
  } = useUserListings(userId, profile?.role ?? null);

  const {
    recentRatings,
    myRating,
    myComment,
    avgRating,
    ratingCount,
    isLoading: isRatingsLoading,
    error: ratingsError,
    setMyRating,
    setMyComment,
    submitRating,
    showRateForm,
    setShowRateForm,
  } = useUserRatings(userId, currentUserId);

  const handleChatClick = async () => {
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
  };

  const isLoading = isProfileLoading || isStatsLoading;
  const listingsCount = profile?.role === 'empresa_constructora' ? projects.length : properties.length;
  const initials = profile?.name ? profile.name.slice(0, 2).toUpperCase() : "US";

  if (isLoading) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-10 mobile-bottom-safe">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mt-20">
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-serif">Cargando perfil...</p>
        </div>
      </main>
    );
  }

  if (profileError) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-10 mobile-bottom-safe">
        <div className="max-w-md mx-auto text-center mt-20">
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
            <p>{profileError}</p>
          </div>
          <Button className="mt-4" onClick={() => router.push('/main')}>Volver al inicio</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-8 sm:py-12 mobile-bottom-safe mobile-horizontal-safe">

      {/* Mobile Header */}
      <DetailBackButton className="lg:hidden mb-6 sticky top-0 bg-background/95 backdrop-blur-sm z-30 py-2">
        <div className="flex items-center justify-between w-full">
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

          <h1 className="text-lg font-serif font-bold text-primary truncate mx-2">
            Perfil de Usuario
          </h1>

          <div className="w-8 h-8" />
        </div>
      </DetailBackButton>

      <div className="w-full max-w-5xl mx-auto space-y-8 sm:space-y-12">

        {/* Premium Floating Header */}
        <div className="relative mb-24 sm:mb-28">
          {/* Banner */}
          <div
            className="h-48 sm:h-64 rounded-[2rem] shadow-xl overflow-hidden relative group"
            style={{
              backgroundImage: stats?.bannerUrl ? `url(${stats.bannerUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'hsl(40, 20%, 95%)',
            }}
          >
            {!stats?.bannerUrl && (
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <Building className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Avatar & Info Card */}
          <div className="absolute -bottom-16 sm:-bottom-20 left-0 right-0 px-4 sm:px-8 flex justify-center">
            <div className="bg-background/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-end gap-4 max-w-3xl w-full mx-auto">

              {/* Avatar */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0">
                <Avatar
                  className="h-24 w-24 sm:h-32 sm:w-32 border-[6px] border-background shadow-lg ring-1 ring-black/5"
                  src={profile?.avatar_url ?? null}
                  initials={initials}
                />
                {/* Verification Badge (simulated) */}
                <div className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full p-1 shadow-md" title="Usuario Verificado">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Info */}
              <div className="text-center sm:text-left flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary truncate">
                    {profile?.name ?? "Usuario"}
                  </h1>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-none px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold shadow-sm">
                    {stats?.roleBadge ?? "Miembro"}
                  </Badge>
                </div>
                {/* Bio */}
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-md mx-auto sm:mx-0">
                  {profile?.bio || "Este usuario no ha añadido una biografía."}
                </p>

                {/* Metrics Mobile Row */}
                <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-foreground/80">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-bold">{stats?.avgRating ? stats.avgRating.toFixed(1) : "N/A"}</span>
                    <span className="text-muted-foreground text-xs">({stats?.ratingCount ?? 0})</span>
                  </div>
                  <div className="h-4 w-px bg-border/50" />
                  <div className="flex items-center gap-1">
                    <Building className="w-4 h-4 text-primary" />
                    <span className="font-bold">{listingsCount}</span>
                    <span className="text-muted-foreground text-xs">props</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0 mt-3 sm:mt-0 w-full sm:w-auto">
                <Button
                  onClick={handleChatClick}
                  className="flex-1 sm:flex-none rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Chat
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRateForm(true);
                    // Scroll to reviews tab? We can just open form
                  }}
                  className="flex-1 sm:flex-none rounded-full border-primary/20 text-primary hover:bg-primary/5"
                >
                  <Star className="w-4 h-4 mr-2" /> Valorar
                </Button>
              </div>

            </div>
          </div>
        </div>

        {/* Content Tabs - Minimalist Pill Style */}
        <Tabs defaultValue="listed" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-secondary/10 p-1 rounded-full h-auto inline-flex shadow-inner">
              <TabsTrigger className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300" value="listed">
                <Building className="mr-2 h-4 w-4" /> {profile?.role === 'empresa_constructora' ? 'Proyectos' : 'Propiedades'}
              </TabsTrigger>
              <TabsTrigger className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300" value="reviews">
                <Star className="mr-2 h-4 w-4" /> Valoraciones
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="listed" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {listingsCount === 0 ? (
              <div className="text-center py-20 bg-secondary/5 rounded-3xl border border-dashed border-border px-4">
                <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Building className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-serif text-primary mb-2">Sin propiedades publicadas</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Este usuario actualmente no tiene propiedades activas en el mercado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* TODO: Handle 'projects' if role is constructor. For now mapping properties */}
                {profile?.role === 'empresa_constructora' ? (
                  projects.map((proj: any) => (
                    <div key={proj.id} className="p-4 border rounded-xl">Proyectos no implementados visualmente aún.</div>
                    // Placeholder as ProjectCard might differ
                  ))
                ) : (
                  properties.map((p) => (
                    <PropertyCard key={p.id} property={p} />
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Reusing the ReviewsTabContent logic but wrapping it in our styling if needed,
                    or just dropping the component in if it handles its own UI well. 
                    Given standard UI, let's use the component but it might look slightly 'cardy'.
                    Ideally we'd inline for consistency, but for logic complexity let's render it 
                    inside a container matching the theme.
                */}
            <div className="bg-card/50 rounded-3xl p-1">
              <ReviewsTabContent
                userId={userId}
                ratings={recentRatings}
                myRating={myRating}
                myComment={myComment}
                showRateForm={showRateForm}
                isSubmitting={isRatingsLoading}
                ratingCount={ratingCount}
                onSetMyRating={setMyRating}
                onSetMyComment={setMyComment}
                onSubmitRating={submitRating}
                onShowRateForm={setShowRateForm}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
