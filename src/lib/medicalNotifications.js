import { supabase } from './supabase'

export async function createMedicalNotifications({
  athleteId,
  actorUserId = null,
  type,
  title,
  body,
  link,
  metadata = {},
}) {
  try {
    const recipientIds = new Set()

    // 1. Coachs liés à l’athlète
    const { data: coachLinks, error: coachError } = await supabase
      .from('coach_clients')
      .select('coach_id')
      .eq('client_id', athleteId)

    if (coachError) throw coachError

    for (const row of coachLinks || []) {
      if (row.coach_id) recipientIds.add(row.coach_id)
    }

    const coachIds = [...recipientIds]

    // 2. Staff lié aux coachs (optionnel)
    if (coachIds.length > 0) {
      const { data: staffLinks, error: staffError } = await supabase
        .from('staff_links')
        .select('staff_user_id')
        .in('owner_coach_id', coachIds)

      // Important : ne bloque pas si la table n'existe pas ou si elle est vide
      if (!staffError) {
        for (const row of staffLinks || []) {
          if (row.staff_user_id) recipientIds.add(row.staff_user_id)
        }
      } else {
        console.warn('staff_links skipped:', staffError.message || staffError)
      }
    }

    // 3. Ne pas notifier l’auteur lui-même
    if (actorUserId) {
      recipientIds.delete(actorUserId)
    }

    const finalRecipients = [...recipientIds]

    if (!finalRecipients.length) {
      console.warn('Aucun destinataire trouvé pour la notification médicale', {
        athleteId,
        actorUserId,
        type,
      })
      return
    }

    const notifications = finalRecipients.map((userId) => ({
      user_id: userId,
      athlete_id: athleteId,
      type,
      title,
      body,
      link,
      metadata,
    }))

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (insertError) throw insertError

    // Push optionnel
    try {
      await supabase.functions.invoke('send-notifications/manual', {
        body: {
          userIds: finalRecipients,
          title,
          body,
        },
      })
    } catch (e) {
      console.warn('Push notification failed (non bloquant):', e)
    }
  } catch (err) {
    console.error('Erreur createMedicalNotifications:', err)
  }
}
