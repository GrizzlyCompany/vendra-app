"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { subscribeToSplashState } from "@/hooks/useSplashScreen";

export default function AuthenticatedBottomNav() {
  const [show, setShow] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setShow(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setShow(!!session);
    });

    // Subscribe to splash screen state
    const unsubscribeSplash = subscribeToSplashState((isSplashVisible) => {
      setSplashVisible(isSplashVisible);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
      unsubscribeSplash();
    };
  }, []);

  // Hide if no session OR if splash is visible
  if (!show || splashVisible) return null;
  return <BottomNav />;
}

