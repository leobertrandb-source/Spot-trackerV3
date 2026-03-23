// supabase/functions/send-notifications/index.ts
// Gère 3 routes :
// POST /cron                  → rappels HOOPER quotidiens
// POST /manual                → envoi manuel coach
// POST /attendance-reminders  → rappels présences automatiques

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@atlyo.fr'
const CRON_SECRET   = Deno.env.get('CRON_SECRET')!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

async function sendPush(subscription: any, payload: object) {
  const { default: webpush } = await import('https://esm.sh/web-push@3.6.6')
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return true
  } catch { return false }
}

async function sendToAthletes(ids: string[], title: string, body: string, url = '/') {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', ids)

  if (!subs?.length) return { sent: 0 }

  let sent = 0
  for (const sub of subs) {
    const ok = await sendPush(sub.subscription, {
      title, body, url,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
    })
    if (ok) sent++
  }
  return { sent }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const path = new URL(req.url).pathname.split('/').pop()

  // ── CRON — rappels HOOPER ──────────────────────────────────────────────
  if (path === 'cron') {
    if (req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { data: athletes } = await supabase.from('profiles').select('id').eq('role', 'athlete')
    if (!athletes?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: CORS })

    const result = await sendToAthletes(
      athletes.map((a: any) => a.id),
      '📊 Bien-être du jour',
      'Comment tu te sens aujourd\'hui ? Remplis ton HOOPER !',
    )
    return new Response(JSON.stringify(result), { headers: CORS })
  }

  // ── ATTENDANCE-REMINDERS — rappels automatiques présences ─────────────
  if (path === 'attendance-reminders') {
    if (req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { dayOfWeek, currentHour } = await req.json()

    const { data: schedules } = await supabase
      .from('training_schedule')
      .select('coach_id, send_hour')
      .eq('day_of_week', dayOfWeek)
      .eq('active', true)

    if (!schedules?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: CORS })

    let totalSent = 0
    for (const sched of schedules) {
      // Tolérance 30 min pour que le cron horaire attrape l'heure configurée
      const [sH, sM] = sched.send_hour.split(':').map(Number)
      const [cH, cM] = currentHour.split(':').map(Number)
      if (Math.abs((sH * 60 + sM) - (cH * 60 + cM)) > 30) continue

      const { data: links } = await supabase
        .from('coach_clients')
        .select('client_id')
        .eq('coach_id', sched.coach_id)

      if (!links?.length) continue

      const result = await sendToAthletes(
        links.map((l: any) => l.client_id),
        '📋 Entraînement aujourd\'hui',
        'Rappel — entraînement ce soir. Signale ta présence !',
      )
      totalSent += result.sent
    }

    return new Response(JSON.stringify({ sent: totalSent }), { headers: CORS })
  }

  // ── MANUAL — envoi manuel depuis le coach ──────────────────────────────
  if (path === 'manual') {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer '))
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (error || !user)
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })

    const { athleteIds, title, message, url } = await req.json()
    if (!athleteIds?.length)
      return new Response(JSON.stringify({ error: 'No athleteIds' }), { status: 400 })

    const result = await sendToAthletes(athleteIds, title || 'Atlyo', message || '', url || '/')
    return new Response(JSON.stringify(result), { headers: CORS })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: CORS })
})
