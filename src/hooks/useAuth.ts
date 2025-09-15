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

    // Obtener sesión inicial con validación
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: handleSupabaseError(error).message,
        }));
        return;
      }

      // Validate session user data
      const user = session?.user;
      if (user && isObject(user)) {
        const validationResult = validateUser(user);
        if (!validationResult.success) {
          console.warn('Invalid user data from session:', validationResult.error);
        }
      }

      setState(prev => ({
        ...prev,
        user: user ?? null,
        session,
        loading: false,
        error: null,
      }));
    });

    // Escuchar cambios de autenticación con validación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Validate session data
        const user = session?.user;
        if (user && isObject(user)) {
          const validationResult = validateUser(user);
          if (!validationResult.success) {
            console.warn('Invalid user data from auth state change:', validationResult.error);
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
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

