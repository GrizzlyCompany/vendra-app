"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";

export default function AuthenticatedBottomNav() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setShow(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setShow(!!session);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  if (!show) return null;
  return <BottomNav />;
}
