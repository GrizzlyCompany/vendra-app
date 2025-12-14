"use client";

import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { handleSupabaseError } from "@/lib/errors";
import { safeAsync, isObject, safeGet } from "@/lib/safe";
import { validateUser } from "@/lib/validation";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Authentication timeout - please refresh the page'
        }));
      }
    }, 10000); // 10 second timeout

    // Obtener sesión inicial con validación
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        clearTimeout(loadingTimeout);
        
        if (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: handleSupabaseError(error).message,
          }));
          return;
        }

        // Validate session user data (non-blocking validation)
        const user = session?.user;
        if (user && isObject(user)) {
          const validationResult = validateUser(user);
          if (!validationResult.success) {
            console.warn('User data validation warnings:', validationResult.error);
            // Don't fail auth for validation issues - allow the user to continue
          }
        }

        setState(prev => ({
          ...prev,
          user: user ?? null,
          session,
          loading: false,
          error: null,
        }));
      } catch (err) {
        if (!mounted) return;
        clearTimeout(loadingTimeout);
        setState(prev => ({
          ...prev,
          loading: false,
          error: `Authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        }));
      }
    };

    initializeAuth();

    // Escuchar cambios de autenticación con validación
    let subscription: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;

          // Validate session data (non-blocking)
          const user = session?.user;
          if (user && isObject(user)) {
            const validationResult = validateUser(user);
            if (!validationResult.success) {
              console.warn('User data validation warnings from auth state change:', validationResult.error);
              // Don't fail auth for validation issues
            }
          }

          setState(prev => ({
            ...prev,
            user: user ?? null,
            session,
            loading: false,
            error: null,
          }));
        }
      );
      subscription = data.subscription;
    } catch (err) {
      console.warn('Failed to set up auth state listener:', err);
    }

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    return safeAsync(
      async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      undefined,
      (err) => {
        setState(prev => ({
          ...prev,
          error: handleSupabaseError(err).message,
        }));
      }
    );
  };

  return {
    ...state,
    signOut,
  };
}
