import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client to verify user token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    // if (authError || !user) {
    //   return new Response(JSON.stringify({ error: 'Unauthorized (Internal Check)' }), {
    //     status: 200,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //   })
    // }

    const WISE_API_KEY = Deno.env.get('WISE_API_KEY')
    // const WISE_PROFILE_ID = Deno.env.get('WISE_PROFILE_ID') // We will fetch this dynamically

    if (!WISE_API_KEY) {
      throw new Error('Missing Wise configuration')
    }

    // 0. Auto-detect Profile ID
    const profilesResp = await fetch('https://api.wise.com/v2/profiles', {
        headers: { 'Authorization': `Bearer ${WISE_API_KEY}` }
    })

    if (!profilesResp.ok) {
         const errorText = await profilesResp.text();
         throw new Error(`Wise API Error (Profiles): ${profilesResp.status} ${errorText}`)
    }

    const profiles = await profilesResp.json();
    
    // DEBUG: Capture all profile IDs to show in error if needed
    const profileDebugInfo = profiles.map((p: any) => `${p.id} (${p.type})`).join(', ');

    const intervalStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const intervalEnd = new Date().toISOString()

    let allActivities: any[] = [];
    let successProfileId = null;

    // 1. Try to fetch TRANSFERS for EVERY profile found
    // This is a fallback for EU/UK users where 'activities' and 'statements' are blocked by PSD2 for Personal Tokens
    for (const profile of profiles) {
        try {
            // Fetch transfers (limit 100, created recently)
            const transfersResp = await fetch(
              `https://api.wise.com/v1/transfers?profile=${profile.id}&limit=100&createdDateStart=${intervalStart}&createdDateEnd=${intervalEnd}`,
              {
                headers: {
                  'Authorization': `Bearer ${WISE_API_KEY}`,
                },
              }
            )

            if (transfersResp.ok) {
                const data = await transfersResp.json();
                // Transfers endpoint returns an array directly
                if (Array.isArray(data)) {
                    allActivities.push(...data);
                    successProfileId = profile.id;
                }
            } else {
                console.log(`Failed to fetch transfers for profile ${profile.id}: ${transfersResp.status}`);
            }
        } catch (e) {
            console.log(`Error fetching transfers for profile ${profile.id}:`, e);
        }
    }

    if (!successProfileId) {
         throw new Error(`Wise API Error: Could not fetch transfers for any profile. Found profiles: [${profileDebugInfo}]. This likely means your Personal Token is restricted from viewing data due to PSD2 (EU/UK) regulations.`)
    }

    const activities = allActivities;

    if (activities.length === 0) {
        return new Response(JSON.stringify({ 
            data: [], 
            debug: `No transfers found for Profile(s) [${profileDebugInfo}] between ${intervalStart} and ${intervalEnd}`,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // 2. Transform to our app's format
    const formattedTransactions = activities.map((tx: any) => ({
      id: tx.id,
      date: tx.created.split('T')[0],
      amount: tx.targetValue, // The amount sent
      type: 'Debit', // Transfers are almost always debits (sending money)
      description: `Transfer to ${tx.targetAccount || 'Recipient'}`, // Transfers don't always have clear descriptions
      currency: tx.targetCurrency,
      reconciled: false 
    }))
    
    // Sort by date desc
    formattedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return new Response(JSON.stringify({ data: formattedTransactions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Return 200 so client can read the error message body
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

