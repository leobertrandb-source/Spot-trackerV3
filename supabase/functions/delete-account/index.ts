import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const userId = userData.user.id
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // 1) Récupérer les athlètes du coach
    const { data: athletes, error: athletesError } = await adminClient
      .from('athletes')
      .select('id')
      .eq('coach_id', userId)

    if (athletesError) {
      return new Response(
        JSON.stringify({ error: athletesError.message }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const athleteIds = (athletes || []).map((a) => a.id).filter(Boolean)

    // 2) Récupérer les blessures du coach
    const { data: injuries, error: injuriesError } = await adminClient
      .from('medical_injuries')
      .select('id')
      .eq('coach_id', userId)

    if (injuriesError) {
      return new Response(
        JSON.stringify({ error: injuriesError.message }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const injuryIds = (injuries || []).map((row) => row.id).filter(Boolean)

    // 3) Supprimer les liaisons match/blessure
    if (injuryIds.length > 0) {
      const { error: matchInjuriesError } = await adminClient
        .from('match_injuries')
        .delete()
        .in('injury_id', injuryIds)

      if (matchInjuriesError) {
        return new Response(
          JSON.stringify({ error: matchInjuriesError.message }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // 4) Supprimer les IDs externes des athlètes
    if (athleteIds.length > 0) {
      const { error: externalIdsError } = await adminClient
        .from('athlete_external_ids')
        .delete()
        .in('athlete_id', athleteIds)

      if (externalIdsError) {
        return new Response(
          JSON.stringify({ error: externalIdsError.message }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // 5) Supprimer les blessures du coach
    const { error: medicalError } = await adminClient
      .from('medical_injuries')
      .delete()
      .eq('coach_id', userId)

    if (medicalError) {
      return new Response(
        JSON.stringify({ error: medicalError.message }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 6) Supprimer l'historique des matchs du coach
    const { error: historyError } = await adminClient
      .from('match_history')
      .delete()
      .eq('coach_id', userId)

    if (historyError) {
      return new Response(
        JSON.stringify({ error: historyError.message }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 7) Supprimer les athlètes du coach
    const { error: athletesDeleteError } = await adminClient
      .from('athletes')
      .delete()
      .eq('coach_id', userId)

    if (athletesDeleteError) {
      return new Response(
        JSON.stringify({ error: athletesDeleteError.message }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 8) Supprimer le profil si tu utilises une table profiles
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (
      profileDeleteError &&
      !String(profileDeleteError.message || '').toLowerCase().includes('relation')
    ) {
      return new Response(
        JSON.stringify({ error: profileDeleteError.message }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 9) Supprimer l'utilisateur Auth
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      return new Response(
        JSON.stringify({ error: deleteUserError.message }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
