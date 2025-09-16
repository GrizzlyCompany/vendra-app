import { createClient } from "@supabase/supabase-js";

// Get environment variables with fallbacks
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url && typeof window !== 'undefined') {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL no está definido en las variables de entorno");
  }
  return url || 'https://placeholder.supabase.co'; // Fallback for build time
};

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key && typeof window !== 'undefined') {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY no está definido en las variables de entorno");
  }
  return key || 'placeholder-key'; // Fallback for build time
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
