"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Star } from "lucide-react";

// Custom hooks
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useUserListings } from "@/hooks/useUserListings";
import { useUserRatings } from "@/hooks/useUserRatings";

// Components
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileMetrics } from "@/components/profile/ProfileMetrics";
import { ListingsTabContent } from "@/components/profile/ListingsTabContent";
import { ReviewsTabContent } from "@/components/profile/ReviewsTabContent";

// Public profile page for arbitrary user by id
// This is distinct from src/app/profile/page.tsx which shows the session user's own profile

export default function PublicProfilePage() {
  const params = useParams();
  const userIdParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const userId = userIdParam || null;

  // Early return if no userId
  if (!userId) return null;

  // Get current user for ratings
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<'listed' | 'reviews'>('listed');

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

  // Handle rate button click from header
  useEffect(() => {
    const handleRateEvent = () => {
      setTabValue('reviews');
      setShowRateForm(true);
    };

    document.addEventListener('rateUser', handleRateEvent);
    return () => document.removeEventListener('rateUser', handleRateEvent);
  }, []);

  const isLoading = isProfileLoading || isStatsLoading;
  const hasError = profileError || listingsError;
  const listingsCount = profile?.role === 'empresa_constructora' ? projects.length : properties.length;

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-4 mobile-bottom-safe mobile-horizontal-safe">
      {/* Profile Header */}
      <ProfileHeader
        userId={userId}
        profile={profile}
        stats={stats}
        isLoading={isLoading}
        profileError={profileError}
      />

      {/* Profile Metrics */}
      {profile && stats && (
        <ProfileMetrics profile={profile} stats={stats} listingsCount={listingsCount} />
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onValueChange={(v: string) => setTabValue(v as 'listed' | 'reviews')} className="w-full mt-3 sm:mt-4">
        <TabsList className="w-full overflow-x-auto flex gap-1 sm:gap-2 px-1 py-1 sm:grid sm:grid-cols-2">
          <TabsTrigger className="shrink-0 text-xs sm:text-sm px-2 sm:px-3" value="listed">
            <Building className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            {profile?.role === 'empresa_constructora' ? 'Proyectos' : 'Propiedades'}
          </TabsTrigger>
          <TabsTrigger className="shrink-0 text-xs sm:text-sm px-2 sm:px-3" value="reviews">
            <Star className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Valoraciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listed">
          <ListingsTabContent
            profile={{ name: profile?.name ?? null, role: profile?.role ?? null }}
            properties={properties}
            projects={projects}
            isLoading={isListingsLoading}
            error={listingsError}
          />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewsTabContent
            userId={userId}
            ratings={recentRatings}
            myRating={myRating}
            myComment={myComment}
            showRateForm={showRateForm}
            isSubmitting={isRatingsLoading} // Actual loading state from hook
            ratingCount={ratingCount}
            onSetMyRating={setMyRating}
            onSetMyComment={setMyComment}
            onSubmitRating={submitRating}
            onShowRateForm={setShowRateForm}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
