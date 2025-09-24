"use client";

import { SplashScreen } from "@/components/SplashScreen";
import { useSplashScreen } from "@/hooks/useSplashScreen";

export function SplashScreenWrapper() {
  const { showSplash, hideSplash } = useSplashScreen();

  if (!showSplash) {
    return null;
  }

  return <SplashScreen onComplete={hideSplash} />;
}
