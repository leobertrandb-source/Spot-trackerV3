import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeName(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Variables Supabase manquantes.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { coachId, provider, sessions } = await req.json()

    if (!coachId || !provider || !Array.isArray(sessions)) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { data: links, error: linksError } = await supabase
      .from('coach_clients')
      .select('client_id')
      .eq('coach_id', coachId)

    if (linksError) throw linksError

    const athleteIds = (links || []).map((row) => row.client_id)

    if (!athleteIds.length) {
      return new Response(
        JSON.stringify({ error: 'Aucun athlète lié à ce coach.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const [{ data: externalIds, error: externalIdsError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        supabase
          .from('athlete_external_ids')
          .select('athlete_id, provider, external_id')
          .in('athlete_id', athleteIds)
          .eq('provider', provider),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', athleteIds),
      ])

    if (externalIdsError) throw externalIdsError
    if (profilesError) throw profilesError

    const externalMap = new Map<string, string>()
    for (const row of externalIds || []) {
      const key = `${row.provider}::${String(row.external_id || '').trim().toLowerCase()}`
      if (row.external_id && row.athlete_id) {
        externalMap.set(key, row.athlete_id)
      }
    }

    const nameMap = new Map<string, string>()
    for (const row of profiles || []) {
      const key = normalizeName(row.full_name)
      if (key && row.id) {
        nameMap.set(key, row.id)
      }
    }

    let imported = 0
    let matched_by_external_id = 0
    let matched_by_name = 0
    let skipped = 0

    for (const sessionRow of sessions) {
      const externalId = String(sessionRow?.external_id || '').trim().toLowerCase()
      const playerName = String(sessionRow?.player_name || '').trim()
      const date = String(sessionRow?.date || '').trim()

      if (!playerName || !date) {
        skipped += 1
        continue
      }

      let athleteId: string | null = null

      if (externalId) {
        athleteId = externalMap.get(`${provider}::${externalId}`) || null
        if (athleteId) matched_by_external_id += 1
      }

      if (!athleteId) {
        athleteId = nameMap.get(normalizeName(playerName)) || null
        if (athleteId) matched_by_name += 1
      }

      if (!athleteId) {
        skipped += 1
        continue
      }

      const notesPayload = {
        source: provider,
        player_name: playerName,
        external_id: externalId || null,
        km_total: sessionRow.km_total ?? null,
        vitesse_max: sessionRow.vitesse_max ?? null,
        energy: sessionRow.energy ?? null,
        impacts: sessionRow.impacts ?? null,
        speed_bands: sessionRow.speed_bands ?? null,
      }

      const chargeUa =
        sessionRow.energy ??
        (sessionRow.duree_min && sessionRow.km_total
          ? Math.round(Number(sessionRow.duree_min) * Number(sessionRow.km_total))
          : 0)

      const { error: insertError } = await supabase
        .from('charge_externe_logs')
        .insert({
          user_id: athleteId,
          date,
          charge_ua: chargeUa,
          rpe: sessionRow.rpe ?? 0,
          duree_min: sessionRow.duree_min ?? 0,
          type: 'cardio',
          notes: JSON.stringify(notesPayload),
        })

      if (insertError) throw insertError

      imported += 1
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: { imported, matched_by_external_id, matched_by_name, skipped },
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
