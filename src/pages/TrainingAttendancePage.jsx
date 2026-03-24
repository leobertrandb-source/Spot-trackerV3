import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

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
  blue:   '#1a3a5c',
}

const STATUSES = [
  { key: 'present',         label: 'Présent',          color: P.green,  bg: '#e8f5ee', icon: '✓' },
  { key: 'present_blesse',  label: 'Présent blessé',   color: P.yellow, bg: '#fdf6e3', icon: '🩹' },
  { key: 'absent_blesse',   label: 'Absent blessé',    color: P.red,    bg: '#fdecea', icon: '🔴' },
  { key: 'absent',          label: 'Absent',           color: P.sub,    bg: '#f0ede8', icon: '✗' },
]

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: P.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function TrainingAttendancePage() {
  const { user, gym } = useAuth()
  const gymName = gym?.name || 'Atlyo'
  const navigate = useNavigate()

  const [athletes, setAthletes]       = useState([])
  const [attendance, setAttendance]   = useState({}) // { athleteId: status }
  const [injuries, setInjuries]       = useState({}) // { athleteId: [injuries] }
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState({})
  const [history, setHistory]         = useState([]) // dates récentes avec stats

  const load = useCallback(async () => {
    setLoading(true)

    // Récupérer les athlètes
    const { data: links } = await supabase
      .from('coach_clients')
      .select('client_id')
      .eq('coach_id', user.id)

    if (!links?.length) { setLoading(false); return }
    const ids = links.map(l => l.client_id)

    const [
      { data: profiles },
      { data: att },
      { data: inj },
      { data: hist },
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').in('id', ids),
      supabase.from('training_attendance').select('*').in('athlete_id', ids).eq('date', selectedDate),
      supabase.from('medical_injuries').select('athlete_id, body_zone, status').in('athlete_id', ids).eq('status', 'active'),
      supabase.from('training_attendance').select('date, status').in('athlete_id', ids)
        .gte('date', new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
    ])

    setAthletes(profiles || [])

    // Map attendance par athlete
    const attMap = {}
    for (const a of (att || [])) attMap[a.athlete_id] = a.status
    setAttendance(attMap)

    // Map injuries par athlete
    const injMap = {}
    for (const i of (inj || [])) {
      if (!injMap[i.athlete_id]) injMap[i.athlete_id] = []
      injMap[i.athlete_id].push(i)
    }
    setInjuries(injMap)

    // Historique — grouper par date
    const histMap = {}
    for (const h of (hist || [])) {
      if (!histMap[h.date]) histMap[h.date] = { total: 0, present: 0, blesse: 0, absent: 0 }
      histMap[h.date].total++
      if (h.status === 'present') histMap[h.date].present++
      else if (h.status === 'present_blesse' || h.status === 'absent_blesse') histMap[h.date].blesse++
      else histMap[h.date].absent++
    }
    const histArr = Object.entries(histMap).map(([date, stats]) => ({ date, ...stats })).slice(0, 7)
    setHistory(histArr)

    setLoading(false)
  }, [user.id, selectedDate])

  useEffect(() => { load() }, [load])

  async function setStatus(athleteId, status) {
    setSaving(p => ({ ...p, [athleteId]: true }))

    // Optimistic update
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
    const updates = athletes.map(a => ({
      athlete_id: a.id,
      coach_id: user.id,
      date: selectedDate,
      status,
    }))
    // Optimistic
    const newAtt = {}
    for (const a of athletes) newAtt[a.id] = status
    setAttendance(newAtt)
    await supabase.from('training_attendance').upsert(updates, { onConflict: 'athlete_id,date' })
  }

  // Stats du jour
  const present        = athletes.filter(a => attendance[a.id] === 'present').length
  const presentBlesse  = athletes.filter(a => attendance[a.id] === 'present_blesse').length
  const absentBlesse   = athletes.filter(a => attendance[a.id] === 'absent_blesse').length
  const absent         = athletes.filter(a => attendance[a.id] === 'absent').length
  const nonRenseigne   = athletes.filter(a => !attendance[a.id]).length

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", padding: 'clamp(20px,3vw,36px)' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>
              {gymName} · Préparation physique
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px,3vw,30px)', fontWeight: 400, color: P.text, margin: 0 }}>
              Présences entraînement
            </h1>
          </div>

          {/* Sélecteur de date */}
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: 10, border: `1px solid ${P.border}`,
              background: P.card, color: P.text, fontSize: 14, fontFamily: 'inherit',
              outline: 'none', cursor: 'pointer',
            }}
          />
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Présents',        value: present,       color: P.green,  bg: '#e8f5ee' },
            { label: 'Présents blessés', value: presentBlesse, color: P.yellow, bg: '#fdf6e3' },
            { label: 'Absents blessés', value: absentBlesse,  color: P.red,    bg: '#fdecea' },
            { label: 'Absents',         value: absent,        color: P.sub,    bg: '#f0ede8' },
            { label: 'Non renseigné',   value: nonRenseigne,  color: P.dim,    bg: P.bg },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Actions rapides */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: P.sub, alignSelf: 'center', marginRight: 4 }}>Tout marquer :</div>
          {STATUSES.map(s => (
            <button key={s.key} onClick={() => markAll(s.key)} style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${s.color}30`,
              background: s.bg, color: s.color,
              transition: 'opacity 0.15s',
            }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Liste athlètes */}
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: P.sub }}>Chargement...</div>
          ) : athletes.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: P.sub }}>Aucun athlète</div>
          ) : athletes.map((athlete, i) => {
            const status = attendance[athlete.id]
            const statusConf = STATUSES.find(s => s.key === status)
            const athleteInjuries = injuries[athlete.id] || []
            const isLast = i === athletes.length - 1

            return (
              <div key={athlete.id} style={{
                padding: '14px 20px',
                borderBottom: isLast ? 'none' : `1px solid ${P.border}`,
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              }}>
                {/* Identité */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 160 }}>
                  <Avatar name={athlete.full_name || athlete.email} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>
                      {athlete.full_name || athlete.email}
                    </div>
                    {athleteInjuries.length > 0 && (
                      <div style={{ fontSize: 11, color: P.red, marginTop: 2 }}>
                        🩹 {athleteInjuries.map(i => i.body_zone).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Boutons statut */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STATUSES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => setStatus(athlete.id, s.key)}
                      disabled={saving[athlete.id]}
                      style={{
                        padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        border: `1px solid ${status === s.key ? s.color : P.border}`,
                        background: status === s.key ? s.bg : 'transparent',
                        color: status === s.key ? s.color : P.sub,
                        fontWeight: status === s.key ? 700 : 500,
                      }}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Historique 7 derniers entraînements */}
        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Historique récent
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {history.map(h => {
                const total = h.present + h.blesse + h.absent
                const pct = total > 0 ? Math.round((h.present / total) * 100) : 0
                return (
                  <div key={h.date} style={{
                    background: P.card, border: `1px solid ${P.border}`, borderRadius: 12,
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{ minWidth: 90, fontSize: 13, fontWeight: 600, color: P.text }}>
                      {new Date(h.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ flex: 1, height: 8, background: P.border, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: P.green, borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, flexShrink: 0 }}>
                      <span style={{ color: P.green, fontWeight: 600 }}>✓ {h.present}</span>
                      <span style={{ color: P.yellow, fontWeight: 600 }}>🩹 {h.blesse}</span>
                      <span style={{ color: P.sub }}>✗ {h.absent}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
