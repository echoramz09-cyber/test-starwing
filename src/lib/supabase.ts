import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || 'https://vkqgkdjchfiduhsckooe.supabase.co';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_uKpZ_0EPbWT-D1caC2qGxA_jZDuhrM_';
  return { url, key };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  const { url, key } = getSupabaseConfig();
  
  if (!url || !key) return null;
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
};

// For backward compatibility in existing code
export const supabase = getSupabase()!;
