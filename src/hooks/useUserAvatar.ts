"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { handleSupabaseError } from "@/lib/errors";

export function useUserAvatar(user: User | null) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    // First check user_metadata
    const metaAvatar = (user.user_metadata as any)?.avatar_url;
    if (metaAvatar) {
      setAvatarUrl(metaAvatar);
      setLoading(false);
      return;
    }

    // Fallback to profiles table
    const fetchAvatar = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        if (error) {
          if (error.code !== 'PGRST116') { // No es error de "no encontrado"
            throw error;
          }
          setAvatarUrl(null);
        } else {
          setAvatarUrl(data?.avatar_url ?? null);
        }
      } catch (err) {
        if (!mounted) return;
        setError(handleSupabaseError(err).message);
        setAvatarUrl(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAvatar();

    return () => {
      mounted = false;
    };
  }, [user]);

  return { avatarUrl, loading, error };
}
