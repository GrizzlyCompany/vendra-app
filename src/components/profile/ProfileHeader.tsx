"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, ChevronLeft } from "lucide-react";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import { PublicProfileData, ProfileStats } from "@/hooks/usePublicProfile";

interface ProfileHeaderProps {
  userId: string;
  profile: PublicProfileData | null;
  stats: ProfileStats | null;
  isLoading: boolean;
  profileError: string | null;
}

export function ProfileHeader({ userId, profile, stats, isLoading, profileError }: ProfileHeaderProps) {
  const router = useRouter();

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

  const handleRateClick = () => {
    // This will be handled in the parent component via setTabValue
  };

  return (
    <>
      {/* Mobile Header */}
      <DetailBackButton className="lg:hidden mb-4">
        <div className="flex items-center justify-between w-full">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-8 h-8 border border-border/30 hover:border-border/50 transition-all duration-200"
          >
            <Link href="/main">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h1 className="text-base font-medium text-foreground truncate mx-2">
            Perfil
          </h1>
          <div className="w-8 h-8" />
        </div>
      </DetailBackButton>

      <Card className="bg-card text-card-foreground flex flex-col gap-6 border py-6 overflow-hidden shadow-lg rounded-2xl">
        <CardHeader className="@container/card-header p-0 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          {/* Banner area */}
          <div
            className="h-20 sm:h-24"
            style={{
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundColor: 'rgb(230, 240, 234)',
              backgroundImage: stats?.bannerUrl ? `url(${stats.bannerUrl})` : undefined,
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
                    {profile?.name ?? (isLoading ? 'Cargando…' : 'Usuario')}
                  </h1>
                </div>
                <div className="mt-1 flex items-center gap-2 justify-center sm:justify-start">
                  <Badge variant="secondary" className="text-xs">
                    {stats?.roleBadge ?? (isLoading ? 'Cargando...' : 'Comprador')}
                  </Badge>
                </div>
                {!isLoading && !profile && (
                  <p className="mt-2 text-sm text-muted-foreground">Perfil no encontrado.</p>
                )}
                {profileError && (
                  <p className="mt-2 text-xs text-muted-foreground">{profileError}</p>
                )}
              </div>
            </div>

            {/* Right side actions: show average and rate button */}
            <div className="mt-3 sm:mt-4 md:mt-0 flex items-center gap-2 sm:gap-3 sm:self-center">
              {stats?.avgRating !== null && stats?.avgRating !== undefined && (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-foreground">
                  <Star className="size-3 sm:size-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{stats.avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({stats.ratingCount ?? 0})</span>
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => {
                // This will be handled by parent component
                const event = new CustomEvent('rateUser', { bubbles: true });
                document.dispatchEvent(event);
              }}>
                Calificar
              </Button>
              <Button
                type="button"
                onClick={handleChatClick}
                className="ml-1"
              >
                <MessageSquare className="mr-2" /> Chat
              </Button>
            </div>
          </div>

          {/* Bio section */}
          {profile?.bio && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
              <h3 className="text-sm font-medium text-foreground mb-2 text-center">Sobre Mi</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed text-center">{profile.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
