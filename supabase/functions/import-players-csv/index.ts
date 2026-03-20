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
      return new Response(
        JSON.stringify({ error: 'Variables Supabase manquantes.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('Authorization') || ''

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { coachId, players } = await req.json()

    if (!coachId || !Array.isArray(players)) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let created = 0
    let linked = 0
    let invited = 0
    let skipped = 0

    for (const row of players) {
      const email = String(row?.email || '').trim().toLowerCase()
      const firstName = String(row?.first_name || '').trim()
      const lastName = String(row?.last_name || '').trim()
      const fullName = `${firstName} ${lastName}`.trim()

      if (!email || !fullName) {
        skipped += 1
        continue
      }

      const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle()

      if (existingProfileError) throw existingProfileError

      let profileId = existingProfile?.id || null

      if (!profileId) {
        const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name: fullName,
            role: 'athlete',
          },
        })

        if (inviteResult.error) throw inviteResult.error
        invited += 1

        const invitedUserId = inviteResult.data.user?.id

        if (invitedUserId) {
          const { error: upsertProfileError } = await supabaseAdmin
            .from('profiles')
            .upsert(
              {
                id: invitedUserId,
                email,
                full_name: fullName,
                role: 'athlete',
              },
              { onConflict: 'id' }
            )

          if (upsertProfileError) throw upsertProfileError
          profileId = invitedUserId
          created += 1
        } else {
          const { data: profileByEmail, error: profileByEmailError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()

          if (profileByEmailError) throw profileByEmailError
          profileId = profileByEmail?.id || null
        }
      }

      if (!profileId) {
        skipped += 1
        continue
      }

      const { error: linkError } = await supabaseAdmin
        .from('coach_clients')
        .upsert(
          {
            coach_id: coachId,
            client_id: profileId,
          },
          { onConflict: 'coach_id,client_id' }
        )

      if (linkError) throw linkError
      linked += 1
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: { created, linked, invited, skipped },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Erreur serveur.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
