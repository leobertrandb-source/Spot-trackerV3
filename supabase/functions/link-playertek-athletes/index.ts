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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Variables Supabase manquantes.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const authHeader = req.headers.get('Authorization') || ''
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { coachId, provider, mappings } = await req.json()
    if (!coachId || !provider || !Array.isArray(mappings)) {
      return new Response(JSON.stringify({ error: 'Payload invalide.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: links, error: linksError } = await supabaseAdmin.from('coach_clients').select('client_id').eq('coach_id', coachId)
    if (linksError) throw linksError

    const allowedAthleteIds = new Set((links || []).map((row) => row.client_id))
    let linked = 0
    let skipped = 0

    for (const mapping of mappings) {
      const athleteId = String(mapping?.athlete_id || '').trim()
      const externalId = String(mapping?.external_id || '').trim()
      const playerName = String(mapping?.player_name || '').trim()
      if (!athleteId || !allowedAthleteIds.has(athleteId)) { skipped += 1; continue }
      const finalExternalId = externalId || playerName
      if (!finalExternalId) { skipped += 1; continue }

      const { error: upsertError } = await supabaseAdmin
        .from('athlete_external_ids')
        .upsert({ athlete_id: athleteId, provider, external_id: finalExternalId }, { onConflict: 'provider,external_id' })
      if (upsertError) throw upsertError
      linked += 1
    }

    return new Response(JSON.stringify({ success: true, stats: { linked, skipped } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error?.message || 'Erreur serveur.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
