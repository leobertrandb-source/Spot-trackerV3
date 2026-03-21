import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
 
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
 
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!)
 
    const { coachId, provider, mappings } = await req.json()
 
    if (!coachId || !provider || !Array.isArray(mappings)) {
      return new Response(JSON.stringify({ error: 'Payload invalide.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
 
    const { data: links, error: linksError } = await supabase
      .from('coach_clients')
      .select('client_id')
      .eq('coach_id', coachId)
 
    if (linksError) throw linksError
 
    const allowedAthleteIds = new Set((links || []).map((row) => row.client_id))
 
    let linked = 0
    let skipped = 0
 
    for (const mapping of mappings) {
      const athleteId = String(mapping?.athlete_id || '').trim()
      const externalId = String(mapping?.external_id || '').trim()
      const playerName = String(mapping?.player_name || '').trim()
 
      if (!athleteId || !allowedAthleteIds.has(athleteId)) {
        skipped++
        continue
      }
 
      const finalExternalId = externalId || playerName
      if (!finalExternalId) {
        skipped++
        continue
      }
 
      const { error } = await supabase
        .from('athlete_external_ids')
        .upsert(
          {
            athlete_id: athleteId,
            provider,
            external_id: finalExternalId,
          },
          { onConflict: 'athlete_id,provider,external_id' }
        )
 
      if (error) throw error
 
      linked++
    }
 
    return new Response(
      JSON.stringify({
        success: true,
        stats: { linked, skipped },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Erreur serveur.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
