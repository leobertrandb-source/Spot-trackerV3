// api/cron/notifications.js
// Route Vercel appelée par le cron job chaque matin à 8h

export default async function handler(req, res) {
  // Vérifier que c'est bien Vercel qui appelle
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/send-notifications/cron`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const data = await response.json()
    return res.status(200).json({ ok: true, ...data })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
