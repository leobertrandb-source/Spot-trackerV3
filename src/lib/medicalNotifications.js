import { supabase } from './supabase'

export async function createMedicalNotifications({
  athleteId,
  athleteName,
  type,
  title,
  body,
  link,
  metadata = {},
}) {
  try {
    const recipientIds = new Set()

    // 1. Récupérer les coachs liés
    const { data: coachLinks, error: coachError } = await supabase
      .from('coach_clients')
      .select('coach_id')
      .eq('client_id', athleteId)

    if (coachError) throw coachError

    for (const row of coachLinks || []) {
      if (row.coach_id) recipientIds.add(row.coach_id)
    }

    const coachIds = [...recipientIds]

    // 2. Récupérer le staff lié aux coachs
    if (coachIds.length > 0) {
      const { data: staffLinks, error: staffError } = await supabase
        .from('staff_links')
        .select('staff_user_id')
        .in('owner_coach_id', coachIds)

      if (staffError) throw staffError

      for (const row of staffLinks || []) {
        if (row.staff_user_id) recipientIds.add(row.staff_user_id)
      }
    }

    // 3. Construire les notifications
    const notifications = [...recipientIds].map((userId) => ({
      user_id: userId,
      athlete_id: athleteId,
      type,
      title,
      body,
      link,
      metadata,
    }))

    if (!notifications.length) return

    // 4. Insert DB
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (insertError) throw insertError

    // 5. Tentative push (optionnel)
    try {
      await supabase.functions.invoke('send-notifications/manual', {
        body: {
          userIds: [...recipientIds],
          title,
          body,
        },
      })
    } catch (e) {
      console.warn('Push notification failed (non bloquant)', e)
    }

  } catch (err) {
    console.error('Erreur createMedicalNotifications:', err)
  }
}

