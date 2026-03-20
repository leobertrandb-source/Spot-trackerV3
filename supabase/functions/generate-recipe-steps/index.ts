// supabase/functions/generate-recipe-steps/index.ts
//
// Déploiement :
//   supabase functions deploy generate-recipe-steps
//
// Variable d'environnement à configurer dans Supabase Dashboard :
//   Project Settings → Edge Functions → Secrets
//   OPENAI_API_KEY=sk-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { name, ingredients } = await req.json()

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Paramètre "name" manquant' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const ingredientsText = Array.isArray(ingredients)
      ? ingredients.slice(0, 20).join(', ')
      : String(ingredients || '')

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'Clé API OpenAI non configurée' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Tu es un chef cuisinier expert. Réponds toujours en JSON valide avec une clé "steps" contenant un tableau de chaînes.',
          },
          {
            role: 'user',
            content: `Génère les étapes détaillées de préparation pour cette recette.\n\nRecette : ${name}\nIngrédients : ${ingredientsText}\n\nRetourne un objet JSON avec une clé "steps" contenant un tableau d'étapes en français. Chaque étape doit commencer par un verbe d'action, mentionner les durées quand pertinent, et contenir 1 à 2 phrases maximum.`,
          },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      console.error('OpenAI error:', err)
      return new Response(
        JSON.stringify({ error: 'Erreur API OpenAI' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const data = await openaiRes.json()
    const raw = data.choices?.[0]?.message?.content || '{}'

    let steps: string[] = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.steps)) {
        steps = parsed.steps.map(String).filter(Boolean)
      }
    } catch {
      steps = raw
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(Boolean)
    }

    return new Response(
      JSON.stringify({ steps }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

