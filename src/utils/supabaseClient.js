import { createClient } from '@supabase/supabase-js';

// These should be environment variables in a real app (VITE_SUPABASE_URL, etc.)
// For now, we'll allow them to be passed in or set later.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

