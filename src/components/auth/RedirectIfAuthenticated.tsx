"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Props {
  to?: string;
}

export default function RedirectIfAuthenticated({ to = "/dashboard" }: Props) {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const session = data?.session;
        if (session?.user) {
          router.replace(to);
        }
      } catch (e) {
        // noop: if we can't check, do nothing and keep landing visible
      }
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace(to);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router, to]);

  return null;
}
