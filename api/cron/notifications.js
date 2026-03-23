// api/cron/notifications.js
// Vercel cron — tourne toutes les heures
// Vérifie les coaches qui ont un entraînement aujourd'hui à cette heure
// et envoie le rappel de présences

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=dim, 1=lun...
    const currentHour = now.toTimeString().slice(0, 5) // "08:00"

    // 1. Notifs HOOPER habituelles
    const hooperRes = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/send-notifications/cron`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const hooperData = await hooperRes.json()

    // 2. Rappels présences entraînement
    // Trouver les coaches qui ont un entraînement aujourd'hui à cette heure
    const schedRes = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/send-notifications/attendance-reminders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dayOfWeek, currentHour }),
      }
    )
    const schedData = await schedRes.json()

    return res.status(200).json({
      ok: true,
      hooper: hooperData,
      attendance: schedData,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
