import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export interface PublicProfileData {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string | null;
}

export interface ProfileStats {
  memberSince: string | null;
  bannerUrl: string | null;
  avgRating: number | null;
  ratingCount: number;
  hasListings: boolean;
  roleBadge: string;
}

interface UsePublicProfileReturn {
  profile: PublicProfileData | null;
  profileError: string | null;
  isProfileLoading: boolean;
  stats: ProfileStats | null;
  isStatsLoading: boolean;
  statsError: string | null;
}

export function usePublicProfile(userId: string | null): UsePublicProfileReturn {
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Load profile data
  useEffect(() => {
    if (!userId) {
      setIsProfileLoading(false);
      return;
    }

    let active = true;
    setIsProfileLoading(true);
    setProfileError(null);

    const loadProfile = async () => {
      try {
        // Fetch from public_profiles table
        let { data: publicProfile, error: publicProfileError } = await supabase
          .from("public_profiles")
          .select("id,name,email,bio,avatar_url,role")
          .eq("id", userId)
          .maybeSingle();

        if (publicProfileError) {
          // If profile doesn't exist, try to create it from users table
          if (publicProfileError.code === 'PGRST116' || publicProfileError.message?.includes('No rows found')) {
            console.log(`Profile not found for user ${userId}, attempting to create from users table...`);

            // Try to create the profile from the users table
            try {
              const { data: userData } = await supabase
                .from("users")
                .select("id,name,email,bio,avatar_url,role")
                .eq("id", userId)
                .single();

              if (userData) {
                // Create the public profile
                const { data: newProfile, error: createError } = await supabase
                  .from("public_profiles")
                  .insert({
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    bio: userData.bio,
                    avatar_url: userData.avatar_url,
                    role: userData.role,
                  })
                  .select()
                  .single();

                if (newProfile) {
                  console.log(`Successfully created public profile for user ${userId}`);
                  publicProfile = newProfile;
                } else if (createError) {
                  console.error("Error creating public profile:", createError);
                  throw new Error(createError.message ?? "Error creating profile");
                }
              } else {
                // If even users table doesn't have it, this might be a very new user
                // Create a minimal profile using auth metadata (if available)
                const { data: authUser } = await supabase.auth.getUser();
                if (authUser.user && authUser.user.id === userId) {
                  const userMeta = authUser.user.user_metadata || {};
                  const { data: newProfile, error: createError } = await supabase
                    .from("public_profiles")
                    .insert({
                      id: userId,
                      name: userMeta.name || userMeta.email?.split('@')[0] || 'Usuario',
                      email: authUser.user.email || null,
                      bio: null,
                      avatar_url: null,
                      role: userMeta.role || 'comprador',
                    })
                    .select()
                    .single();

                  if (newProfile) {
                    console.log(`Successfully created minimal profile for user ${userId}`);
                    publicProfile = newProfile;
                  } else if (createError) {
                    console.error("Error creating minimal profile:", createError);
                    // Try one more time to load an existing profile in case of race conditions
                    const { data: retryProfile } = await supabase
                      .from("public_profiles")
                      .select("id,name,email,bio,avatar_url,role")
                      .eq("id", userId)
                      .maybeSingle();
                    publicProfile = retryProfile;
                  }
                }
              }

              // If still no profile, try one final query
              if (!publicProfile) {
                const { data: retryProfile, error: retryError } = await supabase
                  .from("public_profiles")
                  .select("id,name,email,bio,avatar_url,role")
                  .eq("id", userId)
                  .maybeSingle();

                if (retryProfile) {
                  publicProfile = retryProfile;
                } else if (retryError) {
                  console.warn("Still no profile found after attempts:", retryError);
                }
              }
            } catch (createProfileError) {
              console.error("Failed to create profile:", createProfileError);
              // Continue with null profile but don't throw error
            }
          } else {
            throw new Error(publicProfileError.message ?? "Error loading profile");
          }
        }

        if (!active) return;

        if (publicProfile) {
          // Fetch the latest full_name from seller_applications as highest priority
          let fullName: string | null = null;
          try {
            const { data: sellerApp } = await supabase
              .from("seller_applications")
              .select("full_name")
              .eq("user_id", userId)
              .in("status", ["draft", "submitted", "needs_more_info", "approved"] as any)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            fullName = sellerApp?.full_name ?? null;
          } catch (e) {
            console.debug("Error fetching seller application full name", e);
          }

          const displayName = fullName && fullName.trim().length > 0
            ? fullName
            : publicProfile?.name ?? null;

          setProfile({
            id: publicProfile.id,
            name: displayName,
            email: publicProfile.email ?? null,
            bio: publicProfile.bio ?? null,
            avatar_url: publicProfile.avatar_url ?? null,
            role: publicProfile.role ?? null,
          });
        } else {
          // No profile found even after attempts to create it
          setProfile(null);
          setProfileError("Profile not found. Please try refreshing the page or contact support if the issue persists.");
        }
      } catch (error: any) {
        if (!active) return;
        console.error("Error loading profile:", error);
        setProfileError(error?.message ?? "Unknown error loading profile");
        // Don't set profile to null so we don't trigger loading state loops
      } finally {
        if (active) setIsProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [userId]);

  // Load stats data
  useEffect(() => {
    if (!userId) {
      setIsStatsLoading(false);
      return;
    }

    let active = true;
    setIsStatsLoading(true);
    setStatsError(null);

    const loadStats = async () => {
      try {
        // Load member since & banner
        let memberSince: string | null = null;
        let bannerUrl: string | null = null;

        try {
          const { data: profileData, error } = await supabase
            .from("public_profiles")
            .select("inserted_at,banner_url")
            .eq("id", userId)
            .maybeSingle();

          if (error && !profileData) {
            // Fallback query without banner_url if column doesn't exist
            const { data: fallbackData } = await supabase
              .from("public_profiles")
              .select("inserted_at")
              .eq("id", userId)
              .maybeSingle();

            if (fallbackData?.inserted_at) {
              const d = new Date(fallbackData.inserted_at);
              memberSince = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            }
          } else if (profileData) {
            if (profileData.inserted_at) {
              const d = new Date(profileData.inserted_at as any);
              memberSince = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            }
            if (typeof profileData.banner_url === 'string' && profileData.banner_url.length > 0) {
              bannerUrl = profileData.banner_url;
            }
          }
        } catch {
          // Ignore errors for optional data
        }

        // Load ratings stats
        let avgRating: number | null = null;
        let ratingCount = 0;
        let hasListings = false;
        let roleBadge = "Comprador";

        try {
          const { data: allRatings, count } = await supabase
            .from('user_ratings')
            .select('rating', { count: 'exact' })
            .eq('target_user_id', userId);

          const ratings = (allRatings ?? []) as { rating: number }[];
          const total = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
          ratingCount = count ?? ratings.length;
          avgRating = ratingCount > 0 ? total / ratingCount : null;

          // Check if user has listings to determine role badge
          if (profile?.role === 'empresa_constructora') {
            const { data: projects } = await supabase
              .from("projects")
              .select("id", { count: 'exact' })
              .eq("owner_id", userId);
            hasListings = (projects?.length ?? 0) > 0;
            roleBadge = "Empresa constructora";
          } else {
            const { data: properties } = await supabase
              .from("properties")
              .select("id", { count: 'exact' })
              .eq("owner_id", userId);
            hasListings = (properties?.length ?? 0) > 0;

            if (profile?.role && profile.role.trim().length > 0) {
              const r = profile.role.toLowerCase();
              if (r === 'empresa_constructora' || r.includes("empresa")) {
                roleBadge = "Empresa constructora";
              } else if (r.includes("vendedor") || r.includes("agente")) {
                roleBadge = "Vendedor/Agente";
              }
            } else if (hasListings) {
              roleBadge = "Vendedor/Agente";
            }
          }
        } catch {
          // Ignore rating errors
        }

        if (!active) return;

        setStats({
          memberSince,
          bannerUrl,
          avgRating,
          ratingCount,
          hasListings,
          roleBadge,
        });
      } catch (error: any) {
        if (!active) return;
        setStatsError(error?.message ?? "Error loading stats");
      } finally {
        if (active) setIsStatsLoading(false);
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, [userId, profile?.role]);

  return {
    profile,
    profileError,
    isProfileLoading,
    stats,
    isStatsLoading,
    statsError,
  };
}
