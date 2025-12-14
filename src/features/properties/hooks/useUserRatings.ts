import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export interface UserRating {
  rating: number;
  comment: string | null;
  created_at: string;
}

interface UseUserRatingsReturn {
  recentRatings: UserRating[];
  myRating: number | null;
  myComment: string;
  avgRating: number | null;
  ratingCount: number;
  isLoading: boolean;
  error: string | null;
  setMyRating: (rating: number) => void;
  setMyComment: (comment: string) => void;
  submitRating: () => Promise<void>;
  showRateForm: boolean;
  setShowRateForm: (show: boolean) => void;
}

export function useUserRatings(userId: string | null, currentUserId: string | null): UseUserRatingsReturn {
  const [recentRatings, setRecentRatings] = useState<UserRating[]>([]);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [myComment, setMyComment] = useState<string>("");
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRateForm, setShowRateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load ratings data
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    const loadRatings = async () => {
      try {
        // Load aggregate data (anonymous)
        const { data: allRatings, count } = await supabase
          .from('user_ratings')
          .select('rating', { count: 'exact' })
          .eq('target_user_id', userId);

        const ratings = (allRatings ?? []) as { rating: number }[];
        const total = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        const c = count ?? ratings.length;
        setRatingCount(c);
        setAvgRating(c > 0 ? total / c : null);

        // Load recent ratings list (anonymous)
        const { data: recent } = await supabase
          .from('user_ratings')
          .select('rating,comment,created_at')
          .eq('target_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        setRecentRatings((recent ?? []) as UserRating[]);

        if (!active) return;

        // Load user's own rating if authenticated and not the profile owner
        if (currentUserId && currentUserId !== userId) {
          try {
            const { data: mine } = await supabase
              .from('user_ratings')
              .select('rating,comment')
              .eq('target_user_id', userId)
              .eq('reviewer_id', currentUserId)
              .maybeSingle();

            if (mine && active) {
              setMyRating(mine.rating ?? null);
              setMyComment(mine.comment ?? "");
            }
          } catch (e) {
            // Ignore individual rating fetch errors
          }
        }
      } catch (error: any) {
        if (!active) return;
        setError(error?.message ?? "Error loading ratings");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadRatings();
    return () => {
      active = false;
    };
  }, [userId, currentUserId]);

  // Submit rating function
  const submitRating = async () => {
    if (!currentUserId || !myRating) return;

    setIsSubmitting(true);
    try {
      await supabase
        .from('user_ratings')
        .upsert(
          { target_user_id: userId, reviewer_id: currentUserId, rating: myRating, comment: myComment.trim() || null },
          { onConflict: 'target_user_id,reviewer_id' }
        );

      // Refresh ratings data
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
      setRecentRatings((recent ?? []) as UserRating[]);

      setShowRateForm(false);
    } catch (error: any) {
      setError(error?.message ?? "Error submitting rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    recentRatings,
    myRating,
    myComment,
    avgRating,
    ratingCount,
    isLoading,
    error,
    setMyRating,
    setMyComment,
    submitRating,
    showRateForm,
    setShowRateForm,
  };
}
