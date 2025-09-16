import { createClient } from "@supabase/supabase-js";

// Debug function to log environment variable status
const debugEnvironment = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('🔍 Supabase Environment Check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
    });
  }
};

// Get environment variables with better error handling
const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Debug in development
  debugEnvironment();
  
  // For build time, return placeholders
  if (typeof window === 'undefined') {
    return {
      url: url || 'https://placeholder.supabase.co',
      key: key || 'placeholder-key'
    };
  }
  
  // For runtime, check if variables exist
  if (!url || !key) {
    console.error('❌ Supabase configuration missing:', {
      url: url ? '✅ Set' : '❌ Missing NEXT_PUBLIC_SUPABASE_URL',
      key: key ? '✅ Set' : '❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY'
    });
    
    // Provide a more helpful error for users
    throw new Error(
      `Supabase configuration missing. Please check that environment variables are set correctly:\n` +
      `- NEXT_PUBLIC_SUPABASE_URL: ${url ? '✅' : '❌'}\n` +
      `- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${key ? '✅' : '❌'}`
    );
  }
  
  return { url, key };
};

const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
