// supabase/functions/send-notifications/index.ts
// Gère 3 routes :
// POST /cron                  → rappels HOOPER quotidiens
// POST /manual                → envoi manuel coach
// POST /attendance-reminders  → rappels présences automatiques

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.6'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@atlyo.fr'
const CRON_SECRET   = Deno.env.get('CRON_SECRET')!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: object): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    )
    return true
  } catch (err: any) {
    // 410 = subscription expired/unsubscribed → on peut la supprimer
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    } else {
      console.error('sendPush error', err?.statusCode, err?.message)
    }
    return false
  }
}

async function sendToAthletes(ids: string[], title: string, body: string, url = '/') {
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', ids)

  if (error) {
    console.error('push_subscriptions fetch error:', error.message)
    return { sent: 0 }
  }

  if (!subs?.length) return { sent: 0 }

  const payload = {
    title,
    body,
    url,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url },
  }

  let sent = 0
  for (const sub of subs) {
    if (!sub.endpoint || !sub.p256dh || !sub.auth) continue
    const ok = await sendPush(sub as { endpoint: string; p256dh: string; auth: string }, payload)
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
      return json({ error: 'Unauthorized' }, 401)

    const { data: athletes } = await supabase.from('profiles').select('id').eq('role', 'athlete')
    if (!athletes?.length) return json({ sent: 0 })

    const result = await sendToAthletes(
      athletes.map((a: any) => a.id),
      '📊 Bien-être du jour',
      "Comment tu te sens aujourd'hui ? Remplis ton HOOPER !",
      '/prep/hooper',
    )
    return json(result)
  }

  // ── ATTENDANCE-REMINDERS — rappels automatiques présences ─────────────
  if (path === 'attendance-reminders') {
    if (req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`)
      return json({ error: 'Unauthorized' }, 401)

    const { dayOfWeek, currentHour } = await req.json()

    const { data: schedules } = await supabase
      .from('training_schedule')
      .select('coach_id, send_hour')
      .eq('day_of_week', dayOfWeek)
      .eq('active', true)

    if (!schedules?.length) return json({ sent: 0 })

    let totalSent = 0
    for (const sched of schedules) {
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
        "📋 Entraînement aujourd'hui",
        "Rappel — entraînement ce soir. Signale ta présence !",
        '/ma-presence',
      )
      totalSent += result.sent
    }

    return json({ sent: totalSent })
  }

  // ── MANUAL — envoi manuel depuis le coach ──────────────────────────────
  if (path === 'manual') {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer '))
      return json({ error: 'Unauthorized' }, 401)

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user)
      return json({ error: 'Invalid token' }, 401)

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: 'Invalid JSON body' }, 400)

    const { athleteIds, title, message, url } = body
    if (!athleteIds?.length)
      return json({ error: 'No athleteIds' }, 400)

    const result = await sendToAthletes(
      athleteIds,
      title || 'Atlyo',
      message || '',
      url || '/',
    )
    return json(result)
  }

  return json({ error: 'Not found' }, 404)
})
