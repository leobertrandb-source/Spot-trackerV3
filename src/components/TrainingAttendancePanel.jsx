import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const P = {
  bg:     '#f5f3ef',
  card:   '#ffffff',
  border: '#e8e4dc',
  text:   '#1a1a1a',
  sub:    '#6b6b6b',
  dim:    '#9e9e9e',
  accent: '#1a3a2a',
  green:  '#2d6a4f',
  yellow: '#b5830a',
  red:    '#c0392b',
}

const STATUSES = [
  { key: 'present',        label: 'Présent',         color: P.green,  bg: '#e8f5ee', icon: '✓' },
  { key: 'present_blesse', label: 'Présent blessé',  color: P.yellow, bg: '#fdf6e3', icon: '🩹' },
  { key: 'absent_blesse',  label: 'Absent blessé',   color: P.red,    bg: '#fdecea', icon: '🔴' },
  { key: 'absent',         label: 'Absent',          color: P.sub,    bg: '#f0ede8', icon: '✗' },
]

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
  const [attendance, setAttendance] = useState({})
  const [injuries, setInjuries]     = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]         = useState({})
  const [loading, setLoading]       = useState(true)

  const load = useCallback(async () => {
    if (!clients.length) { setLoading(false); return }
    setLoading(true)
    const ids = clients.map(c => c.id)

    const [{ data: att }, { data: inj }] = await Promise.all([
      supabase.from('training_attendance').select('*').in('athlete_id', ids).eq('date', selectedDate),
      supabase.from('medical_injuries').select('athlete_id, body_zone').in('athlete_id', ids).eq('status', 'active'),
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
    setLoading(false)
  }, [clients, selectedDate])

  useEffect(() => { load() }, [load])

  async function setStatus(athleteId, status) {
    setSaving(p => ({ ...p, [athleteId]: true }))
    setAttendance(p => ({ ...p, [athleteId]: status }))
    await supabase.from('training_attendance').upsert({
      athlete_id: athleteId,
      coach_id: user.id,
      date: selectedDate,
      status,
    }, { onConflict: 'athlete_id,date' })
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

  const present       = clients.filter(c => attendance[c.id] === 'present').length
  const presentBlesse = clients.filter(c => attendance[c.id] === 'present_blesse').length
  const absentBlesse  = clients.filter(c => attendance[c.id] === 'absent_blesse').length
  const absent        = clients.filter(c => attendance[c.id] === 'absent').length

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header avec date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: P.green, fontWeight: 700 }}>✓ {present}</span>
          <span style={{ fontSize: 13, color: P.yellow, fontWeight: 700 }}>🩹 {presentBlesse}</span>
          <span style={{ fontSize: 13, color: P.red, fontWeight: 700 }}>🔴 {absentBlesse}</span>
          <span style={{ fontSize: 13, color: P.sub, fontWeight: 700 }}>✗ {absent}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
      </div>

      {/* Actions rapides */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: P.sub, fontWeight: 600 }}>Tout :</span>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => markAll(s.key)} style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${s.color}40`, background: s.bg, color: s.color,
          }}>
            {s.icon} {s.label}
          </button>
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
              padding: '12px 16px',
              borderBottom: isLast ? 'none' : `1px solid ${P.border}`,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              background: P.card,
            }}>
              <Avatar name={client.full_name || client.email} />
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>
                  {client.full_name || client.email}
                </div>
                {injList.length > 0 && (
                  <div style={{ fontSize: 11, color: P.red, marginTop: 1 }}>🩹 {injList.join(', ')}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {STATUSES.map(s => (
                  <button key={s.key} onClick={() => setStatus(client.id, s.key)} disabled={saving[client.id]}
                    style={{
                      padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      border: `1px solid ${status === s.key ? s.color : P.border}`,
                      background: status === s.key ? s.bg : 'transparent',
                      color: status === s.key ? s.color : P.sub,
                    }}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
