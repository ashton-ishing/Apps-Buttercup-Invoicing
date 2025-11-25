import { createClient } from '@supabase/supabase-js';

// User provided credentials
const supabaseUrl = 'https://ykeleczkajugieljjxlb.supabase.co';
// Note: Ideally this should be an 'anon' key starting with 'ey...'. 
// The user provided 'sb_publishable_...' which we will try to use.
const supabaseKey = 'sb_publishable_MothI5aMIYdmVfyyJ8IsSw_JPPEAo22';

export const supabase = createClient(supabaseUrl, supabaseKey);
