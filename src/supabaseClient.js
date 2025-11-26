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
    const token = await session.getToken({ template: 'supabase' });
    
    if (!token) {
      console.warn('No Clerk token retrieved for Supabase. Make sure Clerk JWT template "supabase" is configured.');
      // Fall back to using the anon key without auth
      return createClient(supabaseUrl, supabaseKey);
    }
    
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  } catch (error) {
    console.error('Error creating authenticated Supabase client:', error);
    // Fall back to using the anon key without auth
    return createClient(supabaseUrl, supabaseKey);
  }
};
