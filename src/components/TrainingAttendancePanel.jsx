import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const P = {
  bg:     '#f5f3ef',
  card:   '#ffffff',
  border: '#e8e4dc',
  text:   '#1a1a1a',
  sub:    '#6b6b6b',
  accent: '#1a3a2a',
  green:  '#2d6a4f',
  yellow: '#b5830a',
  red:    '#c0392b',
}

const STATUSES = [
  { key: 'present',        label: 'Présent',        color: P.green,  bg: '#e8f5ee', icon: '✓' },
  { key: 'present_blesse', label: 'Présent blessé', color: P.yellow, bg: '#fdf6e3', icon: '🩹' },
  { key: 'absent_blesse',  label: 'Absent blessé',  color: P.red,    bg: '#fdecea', icon: '🔴' },
  { key: 'absent',         label: 'Absent',         color: P.sub,    bg: '#f0ede8', icon: '✗' },
]

const DAYS = [
  { key: 1, label: 'Lun' }, { key: 2, label: 'Mar' }, { key: 3, label: 'Mer' },
  { key: 4, label: 'Jeu' }, { key: 5, label: 'Ven' }, { key: 6, label: 'Sam' }, { key: 0, label: 'Dim' },
]

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || ''

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', background: P.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function TrainingAttendancePanel({ clients = [] }) {
  const { user } = useAuth()

  const [attendance, setAttendance]         = useState({})
  const [injuries, setInjuries]             = useState({})
  const [selectedDate, setSelectedDate]     = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]                 = useState({})
  const [loading, setLoading]               = useState(true)
  const [schedule, setSchedule]             = useState([])
  const [sendHour, setSendHour]             = useState('08:00')
  const [showSchedule, setShowSchedule]     = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [sending, setSending]               = useState(false)
  const [sendMsg, setSendMsg]               = useState('')

  const load = useCallback(async () => {
    if (!clients.length) { setLoading(false); return }
    setLoading(true)
    const ids = clients.map(c => c.id)

    const [{ data: att }, { data: inj }, { data: sched }] = await Promise.all([
      supabase.from('training_attendance').select('*').in('athlete_id', ids).eq('date', selectedDate),
      supabase.from('medical_injuries').select('athlete_id, body_zone').in('athlete_id', ids).eq('status', 'active'),
      supabase.from('training_schedule').select('*').eq('coach_id', user.id).eq('active', true),
    ])

    const attMap = {}
    for (const a of (att || [])) attMap[a.athlete_id] = a.status
    setAttendance(attMap)

    const injMap = {}
    for (const i of (inj || [])) {
      if (!injMap[i.athlete_id]) injMap[i.athlete_id] = []
      injMap[i.athlete_id].push(i.body_zone)
    }
    setInjuries(injMap)

    setSchedule((sched || []).map(s => s.day_of_week))
    if (sched?.length) setSendHour(sched[0].send_hour || '08:00')

    setLoading(false)
  }, [clients, selectedDate, user.id])

  useEffect(() => { load() }, [load])

  async function setStatus(athleteId, status) {
    setSaving(p => ({ ...p, [athleteId]: true }))
    setAttendance(p => ({ ...p, [athleteId]: status }))
    await supabase.from('training_attendance').upsert(
      { athlete_id: athleteId, coach_id: user.id, date: selectedDate, status },
      { onConflict: 'athlete_id,date' }
    )
    setSaving(p => ({ ...p, [athleteId]: false }))
  }

  async function markAll(status) {
    const newAtt = {}
    for (const c of clients) newAtt[c.id] = status
    setAttendance(newAtt)
    await supabase.from('training_attendance').upsert(
      clients.map(c => ({ athlete_id: c.id, coach_id: user.id, date: selectedDate, status })),
      { onConflict: 'athlete_id,date' }
    )
  }

  async function saveSchedule() {
    setSavingSchedule(true)
    await supabase.from('training_schedule').delete().eq('coach_id', user.id)
    if (schedule.length > 0) {
      await supabase.from('training_schedule').insert(
        schedule.map(day => ({ coach_id: user.id, day_of_week: day, send_hour: sendHour, active: true }))
      )
    }
    setSavingSchedule(false)
    setShowSchedule(false)
    setSendMsg('✓ Planning enregistré')
    setTimeout(() => setSendMsg(''), 3000)
  }

  async function sendReminder() {
    if (!clients.length) return
    setSending(true)
    setSendMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setSendMsg('❌ Session expirée'); setSending(false); return }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notifications/manual`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteIds: clients.map(c => c.id),
          title: '📋 Entraînement aujourd\'hui',
          message: 'Rappel — entraînement ce soir. Signale ta présence !',
          url: '/',
        }),
      })
      const data = await res.json()
      setSendMsg(res.ok ? `✓ Rappel envoyé à ${data.sent || 0} athlète(s)` : `❌ Erreur ${data.error || ''}`)
    } catch { setSendMsg('❌ Erreur réseau') }
    setSending(false)
    setTimeout(() => setSendMsg(''), 4000)
  }

  const present       = clients.filter(c => attendance[c.id] === 'present').length
  const presentBlesse = clients.filter(c => attendance[c.id] === 'present_blesse').length
  const absentBlesse  = clients.filter(c => attendance[c.id] === 'absent_blesse').length
  const absent        = clients.filter(c => attendance[c.id] === 'absent').length
  const isTodayTraining = schedule.includes(new Date().getDay())

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ fontSize: 13, color: P.green,  fontWeight: 700 }}>✓ {present}</span>
          <span style={{ fontSize: 13, color: P.yellow, fontWeight: 700 }}>🩹 {presentBlesse}</span>
          <span style={{ fontSize: 13, color: P.red,    fontWeight: 700 }}>🔴 {absentBlesse}</span>
          <span style={{ fontSize: 13, color: P.sub,    fontWeight: 700 }}>✗ {absent}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={sendReminder} disabled={sending} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit',
            border: `1px solid ${P.accent}`,
            background: isTodayTraining ? P.accent : 'transparent',
            color: isTodayTraining ? '#fff' : P.accent,
            opacity: sending ? 0.7 : 1,
          }}>
            {sending ? 'Envoi...' : '📣 Rappel présences'}
          </button>
          <button onClick={() => setShowSchedule(s => !s)} style={{
            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${P.border}`, background: showSchedule ? P.bg : 'transparent', color: P.sub,
          }}>⚙️ Planning</button>
        </div>
      </div>

      {/* Feedback */}
      {sendMsg && (
        <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, padding: '8px 12px', borderRadius: 8,
          color: sendMsg.startsWith('✓') ? P.green : P.red,
          background: sendMsg.startsWith('✓') ? '#e8f5ee' : '#fdecea' }}>
          {sendMsg}
        </div>
      )}

      {/* Config planning */}
      {showSchedule && (
        <div style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 10 }}>Rappel automatique — jours d'entraînement</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {DAYS.map(d => (
              <button key={d.key} onClick={() => setSchedule(p => p.includes(d.key) ? p.filter(x => x !== d.key) : [...p, d.key])} style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${schedule.includes(d.key) ? P.accent : P.border}`,
                background: schedule.includes(d.key) ? P.accent : P.card,
                color: schedule.includes(d.key) ? '#fff' : P.sub,
              }}>{d.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: P.sub }}>Heure d'envoi</label>
            <input type="time" value={sendHour} onChange={e => setSendHour(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.card, color: P.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div style={{ fontSize: 12, color: P.sub, marginBottom: 12 }}>
            Les athlètes reçoivent un push automatique les jours sélectionnés à l'heure choisie.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveSchedule} disabled={savingSchedule} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: P.accent, color: '#fff',
            }}>{savingSchedule ? 'Enregistrement...' : '✓ Enregistrer'}</button>
            <button onClick={() => setShowSchedule(false)} style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${P.border}`, background: 'transparent', color: P.sub,
            }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Marquer tout */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: P.sub, fontWeight: 600 }}>Tout :</span>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => markAll(s.key)} style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${s.color}40`, background: s.bg, color: s.color,
          }}>{s.icon} {s.label}</button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: P.sub, fontSize: 13 }}>Chargement...</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: P.sub, fontSize: 13 }}>Aucun athlète</div>
        ) : clients.map((client, i) => {
          const status = attendance[client.id]
          const injList = injuries[client.id] || []
          const isLast = i === clients.length - 1
          return (
            <div key={client.id} style={{
              padding: '12px 16px', borderBottom: isLast ? 'none' : `1px solid ${P.border}`,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: P.card,
            }}>
              <Avatar name={client.full_name || client.email} />
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{client.full_name || client.email}</div>
                {injList.length > 0 && <div style={{ fontSize: 11, color: P.red, marginTop: 1 }}>🩹 {injList.join(', ')}</div>}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {STATUSES.map(s => (
                  <button key={s.key} onClick={() => setStatus(client.id, s.key)} disabled={saving[client.id]} style={{
                    padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    border: `1px solid ${status === s.key ? s.color : P.border}`,
                    background: status === s.key ? s.bg : 'transparent',
                    color: status === s.key ? s.color : P.sub,
                  }}>{s.icon} {s.label}</button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
