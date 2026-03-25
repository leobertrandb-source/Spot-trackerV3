import OpenAI from 'npm:openai'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { image } = await req.json()
    if (!image) return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You extract data from InBody body composition sheets. Return only valid JSON. Use null when a value is missing. Keep date in YYYY-MM-DD when possible.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse cette feuille InBody et retourne uniquement un JSON avec ces clés exactes:

{
  "date": string | null,
  "weight": number | null,
  "skeletal_muscle_mass": number | null,
  "body_fat_mass": number | null,
  "body_fat_percentage": number | null,
  "bmi": number | null,
  "visceral_fat_level": number | null,
  "body_water": number | null,
  "bmr": number | null
}

Ne retourne aucun texte hors JSON.`
            },
            {
              type: 'image_url',
              image_url: { url: image }
            }
          ]
        }
      ]
    })

    const content = response.choices?.[0]?.message?.content || '{}'
    const data = typeof content === 'string' ? JSON.parse(content) : content

    return new Response(JSON.stringify({ data }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || 'Scan failed' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
