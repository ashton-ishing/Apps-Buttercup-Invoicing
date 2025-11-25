import { createClient } from '@supabase/supabase-js';

// User provided credentials
export const supabaseUrl = 'https://ykeleczkajugieljjxlb.supabase.co';
// Note: Ideally this should be an 'anon' key starting with 'ey...'. 
// The user provided 'sb_publishable_...' which we will try to use.
export const supabaseKey = 'sb_publishable_MothI5aMIYdmVfyyJ8IsSw_JPPEAo22';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const createClerkSupabaseClient = async (session) => {
  const token = await session.getToken({ template: 'supabase' });
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};
