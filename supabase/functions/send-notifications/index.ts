// supabase/functions/send-notifications/index.ts
// Déployer : supabase functions deploy send-notifications
// Env vars requis : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(
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
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subs?.length) return 0

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
      sent++
    } catch (err: any) {
      // Subscription expirée → supprimer
      if (err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
  return sent
}

// ── Check HOOPER du jour ──────────────────────────────────────────────────────
async function checkHooperReminders() {
  const today = new Date().toISOString().split('T')[0]

  // Récupérer tous les paramètres actifs avec rappel HOOPER
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('athlete_id, rappel_hooper_heure')
    .eq('rappel_hooper', true)

  if (!settings?.length) return { reminders: 0 }

  // Athlètes qui ont déjà rempli aujourd'hui
  const athleteIds = settings.map(s => s.athlete_id)
  const { data: filled } = await supabase
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

// ── Check alertes fatigue + missing pour le coach ────────────────────────────
async function checkCoachAlerts() {
  const today = new Date().toISOString().split('T')[0]

  // Tous les paramètres coaches
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*, coach:coach_id(id, full_name), athlete:athlete_id(id, full_name)')

  if (!settings?.length) return { alerts: 0 }

  // Derniers HOOPER par athlète
  const athleteIds = [...new Set(settings.map(s => s.athlete_id))]
  const { data: hoopers } = await supabase
    .from('hooper_logs')
    .select('user_id, date, fatigue, sommeil, stress, courbatures')
    .in('user_id', athleteIds)
    .order('date', { ascending: false })

  // Grouper par athlète (dernière entrée)
  const lastHooper: Record<string, any> = {}
  for (const h of (hoopers || [])) {
    if (!lastHooper[h.user_id]) lastHooper[h.user_id] = h
  }

  // Grouper les alertes par coach pour éviter spam
  const coachAlerts: Record<string, string[]> = {}

  for (const s of settings) {
    const coachId = s.coach_id
    const athleteId = s.athlete_id
    const athleteName = s.athlete?.full_name || 'Un athlète'
    const h = lastHooper[athleteId]

    if (!coachAlerts[coachId]) coachAlerts[coachId] = []

    // Alerte fatigue
    if (s.alerte_fatigue && h) {
      const score = h.fatigue + h.sommeil + h.stress + h.courbatures
      if (score >= s.alerte_fatigue_seuil && h.date === today) {
        coachAlerts[coachId].push(`🚨 ${athleteName} — Score HOOPER ${score}/40`)
      }
    }

    // Alerte HOOPER non rempli
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
serve(async (req) => {
  const { pathname } = new URL(req.url)

  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  // Auth (service role ou cron secret)
  const authHeader = req.headers.get('Authorization') || ''
  const cronSecret = Deno.env.get('CRON_SECRET') || ''
  const isAuthorized =
    authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` ||
    authHeader === `Bearer ${cronSecret}`

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let result: any = {}
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

  if (pathname.endsWith('/cron')) {
    // Appelé par Vercel Cron — envoie rappels + alertes
    const [r, a] = await Promise.all([checkHooperReminders(), checkCoachAlerts()])
    result = { ...r, ...a }
  } else if (pathname.endsWith('/manual')) {
    result = await sendManual(body)
  } else if (pathname.endsWith('/fatigue')) {
    // Appelé immédiatement quand un HOOPER élevé est soumis
    result = await checkCoachAlerts()
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
})
