// supabase/functions/fetch-ical/index.ts
// Fetche un fichier ICS depuis une URL externe (contourne les CORS)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { url } = await req.json()
    if (!url) return new Response(JSON.stringify({ error: 'URL manquante' }), { status: 400, headers: CORS })

    // Vérifier que c'est bien une URL de type calendrier
    const allowed = ['.ics', 'ical', 'calendar', 'ffr.fr', 'fff.fr', 'ffhb.fr', 'ffbb.fr', 'ffr.fr']
    const isAllowed = allowed.some(a => url.includes(a))
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'URL non autorisée — doit être une URL de calendrier .ics' }), { status: 403, headers: CORS })
    }

    const res = await fetch(url, {
      headers: { 'Accept': 'text/calendar, */*' },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Erreur ${res.status}` }), { status: 502, headers: CORS })
    }

    const content = await res.text()
    return new Response(JSON.stringify({ content }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
