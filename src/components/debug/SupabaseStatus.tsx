"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface SupabaseStatus {
  connected: boolean;
  error?: string;
  url?: string;
  hasValidConfig: boolean;
}

export function SupabaseStatus() {
  const [status, setStatus] = useState<SupabaseStatus>({
    connected: false,
    hasValidConfig: false
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if environment variables are present
        const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
        const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        setStatus(prev => ({
          ...prev,
          hasValidConfig: hasUrl && hasKey,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL
        }));

        // Try to make a simple query to test connection
        const { data, error } = await supabase
          .from('properties')
          .select('id')
          .limit(1);

        if (error) {
          setStatus(prev => ({
            ...prev,
            connected: false,
            error: error.message
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            connected: true,
            error: undefined
          }));
        }
      } catch (err) {
        setStatus(prev => ({
          ...prev,
          connected: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
      }
    };

    checkConnection();
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-card border rounded-lg p-3 text-xs shadow-lg z-50 max-w-sm">
      <div className="font-semibold mb-2">🔗 Supabase Status</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Config:</span>
          <span className={status.hasValidConfig ? 'text-green-600' : 'text-red-600'}>
            {status.hasValidConfig ? '✅ Valid' : '❌ Invalid'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Connection:</span>
          <span className={status.connected ? 'text-green-600' : 'text-red-600'}>
            {status.connected ? '✅ Connected' : '❌ Failed'}
          </span>
        </div>
        {status.url && (
          <div className="text-muted-foreground truncate">
            URL: {status.url}
          </div>
        )}
        {status.error && (
          <div className="text-red-600 mt-2 text-wrap">
            Error: {status.error}
          </div>
        )}
      </div>
    </div>
  );
}