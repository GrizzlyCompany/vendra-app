"use client";

import { PublicProfileData, ProfileStats } from "@/hooks/usePublicProfile";

interface ProfileMetricsProps {
  profile: PublicProfileData | null;
  stats: ProfileStats | null;
  listingsCount: number;
}

export function ProfileMetrics({ profile, stats, listingsCount }: ProfileMetricsProps) {
  return (
    <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 border-t pt-4 sm:pt-6">
      <div className="text-center sm:text-left">
        <div className="text-xs text-muted-foreground">Email</div>
        <div className="mt-1 text-sm font-medium text-foreground break-all">{profile?.email ?? '—'}</div>
      </div>
      <div className="text-center sm:text-left">
        <div className="text-xs text-muted-foreground">Miembro desde</div>
        <div className="mt-1 text-sm font-medium text-foreground">{stats?.memberSince ?? '—'}</div>
      </div>
      <div className="text-center sm:text-left">
        <div className="text-xs text-muted-foreground">
          {profile?.role === 'empresa_constructora' ? 'Proyectos' : 'Propiedades'}
        </div>
        <div className="mt-1 text-sm font-medium text-foreground">
          {listingsCount}
        </div>
      </div>
    </div>
  );
}
