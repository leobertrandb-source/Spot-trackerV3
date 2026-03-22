// supabase/functions/send-notifications/index.ts
// Déployer : supabase functions deploy send-notifications
// Env vars requis : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@prosportconcept.fr',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

// ── Helper envoi ──────────────────────────────────────────────────────────────
async function sendToUser(userId: string, payload: object) {
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subs?.length) return 0

  let sent = 0
  const toDelete: string[] = []

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
      sent++
    } catch (err: any) {
      // Subscription expirée ou invalide → marquer pour suppression
      if (err.statusCode === 410 || err.statusCode === 404) {
        toDelete.push(sub.id)
      } else {
        console.error(`Push error for user ${userId}:`, err.statusCode, err.message)
      }
    }
  }

  // Nettoyer les subscriptions expirées en batch
  if (toDelete.length > 0) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', toDelete)
  }

  return sent
}

// ── Vérification auth : accepte service role, cron secret, OU token utilisateur coach ──
async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) return false

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const cronSecret = Deno.env.get('CRON_SECRET') || ''

  // Service role ou cron secret → OK direct
  if (token === serviceRoleKey || (cronSecret && token === cronSecret)) return true

  // Token utilisateur → vérifier que c'est bien un coach
  try {
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error } = await supabaseUser.auth.getUser()
    if (error || !user) return false

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return profile?.role === 'coach'
  } catch {
    return false
  }
}

// ── Check HOOPER du jour ──────────────────────────────────────────────────────
async function checkHooperReminders() {
  const today = new Date().toISOString().split('T')[0]

  const { data: settings } = await supabaseAdmin
    .from('notification_settings')
    .select('athlete_id, rappel_hooper_heure')
    .eq('rappel_hooper', true)

  if (!settings?.length) return { reminders: 0 }

  const athleteIds = settings.map(s => s.athlete_id)
  const { data: filled } = await supabaseAdmin
    .from('hooper_logs')
    .select('user_id')
    .eq('date', today)
    .in('user_id', athleteIds)

  const filledIds = new Set((filled || []).map(f => f.user_id))
  const toRemind = settings.filter(s => !filledIds.has(s.athlete_id))

  let reminders = 0
  for (const s of toRemind) {
    const sent = await sendToUser(s.athlete_id, {
      title: '💪 HOOPER du jour',
      body: 'Prends 30 secondes pour renseigner ton état du jour.',
      tag: 'hooper-reminder',
      data: { url: '/prep/hooper' },
      requireInteraction: false,
    })
    reminders += sent
  }

  return { reminders }
}

// ── Check alertes fatigue + missing pour le coach ─────────────────────────────
async function checkCoachAlerts() {
  const today = new Date().toISOString().split('T')[0]

  const { data: settings } = await supabaseAdmin
    .from('notification_settings')
    .select('*, coach:coach_id(id, full_name), athlete:athlete_id(id, full_name)')

  if (!settings?.length) return { alerts: 0 }

  const athleteIds = [...new Set(settings.map(s => s.athlete_id))]
  const { data: hoopers } = await supabaseAdmin
    .from('hooper_logs')
    .select('user_id, date, fatigue, sommeil, stress, courbatures')
    .in('user_id', athleteIds)
    .order('date', { ascending: false })

  const lastHooper: Record<string, any> = {}
  for (const h of (hoopers || [])) {
    if (!lastHooper[h.user_id]) lastHooper[h.user_id] = h
  }

  const coachAlerts: Record<string, string[]> = {}

  for (const s of settings) {
    const coachId = s.coach_id
    const athleteId = s.athlete_id
    const athleteName = s.athlete?.full_name || 'Un athlète'
    const h = lastHooper[athleteId]

    if (!coachAlerts[coachId]) coachAlerts[coachId] = []

    if (s.alerte_fatigue && h) {
      const score = h.fatigue + h.sommeil + h.stress + h.courbatures
      if (score >= s.alerte_fatigue_seuil && h.date === today) {
        coachAlerts[coachId].push(`🚨 ${athleteName} — Score HOOPER ${score}/40`)
      }
    }

    if (s.alerte_missing) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - s.alerte_missing_jours)
      const lastDate = h ? new Date(h.date + 'T00:00:00') : null
      if (!lastDate || lastDate < cutoff) {
        const days = lastDate
          ? Math.floor((Date.now() - lastDate.getTime()) / 86400000)
          : '?'
        coachAlerts[coachId].push(`⚠️ ${athleteName} — HOOPER non rempli depuis ${days}j`)
      }
    }
  }

  let alerts = 0
  for (const [coachId, messages] of Object.entries(coachAlerts)) {
    if (!messages.length) continue
    const sent = await sendToUser(coachId, {
      title: `${messages.length} alerte${messages.length > 1 ? 's' : ''} athlète${messages.length > 1 ? 's' : ''}`,
      body: messages.slice(0, 3).join('\n') + (messages.length > 3 ? `\n+${messages.length - 3} autres` : ''),
      tag: 'coach-alerts',
      data: { url: '/prep/dashboard' },
      requireInteraction: true,
    })
    alerts += sent
  }

  return { alerts }
}

// ── Envoi manuel depuis le coach ──────────────────────────────────────────────
async function sendManual(body: any) {
  const { athleteIds, title, message, url } = body
  if (!athleteIds?.length || !title) return { error: 'Paramètres manquants' }

  let total = 0
  for (const id of athleteIds) {
    const sent = await sendToUser(id, {
      title,
      body: message || '',
      tag: 'coach-manual',
      data: { url: url || '/' },
      requireInteraction: true,
    })
    total += sent
  }
  return { sent: total }
}

// ── Serveur HTTP ──────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  const { pathname } = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const authorized = await isAuthorized(req)
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let result: any = {}
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

  if (pathname.endsWith('/cron')) {
    const [r, a] = await Promise.all([checkHooperReminders(), checkCoachAlerts()])
    result = { ...r, ...a }
  } else if (pathname.endsWith('/manual')) {
    result = await sendManual(body)
  } else if (pathname.endsWith('/fatigue')) {
    result = await checkCoachAlerts()
  } else {
    result = { error: 'Route inconnue' }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
