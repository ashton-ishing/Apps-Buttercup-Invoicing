import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallbacks for local development
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ykeleczkajugieljjxlb.supabase.co';
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZWxlY3prYWp1Z2llbGpqeGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzcxODcsImV4cCI6MjA3OTYxMzE4N30.i1rXSrVtp5xO46KsrsbR9OlPObdJDCzjRgjEnDeJALA';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const createClerkSupabaseClient = async (session) => {
  try {
    // Try to get Clerk token, but since RLS policies allow all (using true),
    // we can use the anon key directly
    const token = await session.getToken({ template: 'supabase' });
    
    if (token) {
      // If token exists, use it (requires Supabase to be configured to accept Clerk JWTs)
      return createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
    } else {
      // No token - use anon key (works because RLS policies allow all)
      console.log('Using Supabase anon key (RLS policies allow all operations)');
      return createClient(supabaseUrl, supabaseKey);
    }
  } catch (error) {
    // If token retrieval fails, use anon key
    console.log('Using Supabase anon key (RLS policies allow all operations)');
    return createClient(supabaseUrl, supabaseKey);
  }
};
