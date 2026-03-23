// api/cron/notifications.js
// Déclenché par GitHub Actions toutes les heures
// Vérifie les notifs HOOPER + les rappels de présence

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || req.headers['authorization'];

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.CRON_SECRET || !process.env.SUPABASE_URL) {
    return res.status(500).json({
      error: 'Missing required environment variables',
    });
  }

  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=dim, 1=lun, ...
    const currentHour = now.toTimeString().slice(0, 5); // ex: "08:00"

    const commonHeaders = {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json',
    };

    const hooperRes = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/send-notifications/cron`,
      {
        method: 'POST',
        headers: commonHeaders,
      }
    );

    if (!hooperRes.ok) {
      const errorText = await hooperRes.text();
      throw new Error(`Hooper error (${hooperRes.status}): ${errorText}`);
    }

    const hooperData = await hooperRes.json();

    const schedRes = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/send-notifications/attendance-reminders`,
      {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ dayOfWeek, currentHour }),
      }
    );

    if (!schedRes.ok) {
      const errorText = await schedRes.text();
      throw new Error(`Attendance error (${schedRes.status}): ${errorText}`);
    }

    const schedData = await schedRes.json();

    return res.status(200).json({
      ok: true,
      timestamp: now.toISOString(),
      dayOfWeek,
      currentHour,
      hooper: hooperData,
      attendance: schedData,
    });
  } catch (err) {
    console.error('Cron notifications error:', err);

    return res.status(500).json({
      error: err.message || 'Internal Server Error',
    });
  }
}
