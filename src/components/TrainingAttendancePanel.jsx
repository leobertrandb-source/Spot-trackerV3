import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const P = {
  bg:     '#f5f3ef',
  card:   '#ffffff',
  border: '#e8e4dc',
  text:   '#1a1a1a',
  sub:    '#6b6b6b',
  dim:    '#a0a0a0',
  accent: '#1a3a2a',
  green:  '#2d6a4f',
  yellow: '#b5830a',
  red:    '#c0392b',
}

const SESSION_TYPES = [
  'Entraînement terrain',
  'Musculation',
  'Match',
  'Séance vidéo',
  'Récupération',
  'Autre',
]

// 3 états simplifiés affichés → mappe vers les 4 statuts DB
const STATUS_OPTS = [
  { key: 'present',       label: 'Présent',  color: P.green,  bg: '#e8f5ee', border: '#b7dfc8' },
  { key: 'present_blesse', label: 'Blessé',  color: P.yellow, bg: '#fdf6e3', border: '#f0d080' },
  { key: 'absent',        label: 'Absent',   color: P.red,    bg: '#fdecea', border: '#f5c6c6' },
]

function Avatar({ name }) {
  const ini = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 38, height: 38, borderRadius: '50%', background: P.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
      {ini}
    </div>
  )
}

function StatusPill({ opt, active, onClick, saving }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
        cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
        border: `1.5px solid ${active ? opt.border : P.border}`,
        background: active ? opt.bg : 'transparent',
        color: active ? opt.color : P.dim,
        transition: 'all 0.15s',
        opacity: saving ? 0.6 : 1,
      }}
    >
      {opt.label}
    </button>
  )
}

export default function TrainingAttendancePanel({ clients = [] }) {
  const { user } = useAuth()

  const [attendance, setAttendance] = useState({})
  const [injuries, setInjuries]     = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionType, setSessionType]   = useState(SESSION_TYPES[0])
  const [saving, setSaving]             = useState({})
  const [loading, setLoading]           = useState(true)
  const [sendMsg, setSendMsg]           = useState('')
  const [sending, setSending]           = useState(false)

  const load = useCallback(async () => {
    if (!clients.length) { setLoading(false); return }
    setLoading(true)
    const ids = clients.map(c => c.id)
    const [{ data: att }, { data: inj }] = await Promise.all([
      supabase.from('training_attendance').select('*').in('athlete_id', ids).eq('date', selectedDate),
      supabase.from('medical_injuries').select('athlete_id').in('athlete_id', ids).eq('status', 'active'),
    ])
    const attMap = {}
    for (const a of (att || [])) attMap[a.athlete_id] = a.status
    setAttendance(attMap)
    const injSet = new Set((inj || []).map(i => i.athlete_id))
    setInjuries(injSet)
    setLoading(false)
  }, [clients, selectedDate])

  useEffect(() => { load() }, [load])

  // Temps réel
  useEffect(() => {
    if (!clients.length) return
    const isToday = selectedDate === new Date().toISOString().split('T')[0]
    if (!isToday) return
    const ids = clients.map(c => c.id)
    const ch = supabase.channel(`att-${selectedDate}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_attendance', filter: `date=eq.${selectedDate}` }, payload => {
        const row = payload.new || payload.old
        if (!row || !ids.includes(row.athlete_id)) return
        if (payload.eventType === 'DELETE') setAttendance(p => { const n = { ...p }; delete n[row.athlete_id]; return n })
        else setAttendance(p => ({ ...p, [row.athlete_id]: row.status }))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [clients, selectedDate])

  async function setStatus(athleteId, status) {
    // Si on reclique sur le statut actuel → on efface (toggle off)
    const next = attendance[athleteId] === status ? null : status
    setSaving(p => ({ ...p, [athleteId]: true }))
    setAttendance(p => next ? { ...p, [athleteId]: next } : (({ [athleteId]: _, ...rest }) => rest)(p))
    if (next) {
      await supabase.from('training_attendance').upsert(
        { athlete_id: athleteId, coach_id: user.id, date: selectedDate, status: next, session_type: sessionType },
        { onConflict: 'athlete_id,date' }
      )
    } else {
      await supabase.from('training_attendance').delete().eq('athlete_id', athleteId).eq('date', selectedDate)
    }
    setSaving(p => ({ ...p, [athleteId]: false }))
  }

  async function markAll(status) {
    const newAtt = {}
    for (const c of clients) newAtt[c.id] = status
    setAttendance(newAtt)
    await supabase.from('training_attendance').upsert(
      clients.map(c => ({ athlete_id: c.id, coach_id: user.id, date: selectedDate, status, session_type: sessionType })),
      { onConflict: 'athlete_id,date' }
    )
  }

  async function sendReminder() {
    if (!clients.length) return
    setSending(true); setSendMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setSendMsg('❌ Session expirée'); setSending(false); return }
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notifications/manual`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteIds: clients.map(c => c.id),
          title: `📋 ${sessionType} aujourd'hui`,
          message: 'Clique pour indiquer ta présence !',
          url: '/ma-presence',
        }),
      })
      const data = await res.json()
      setSendMsg(res.ok ? `✓ Rappel envoyé à ${data.sent || 0} athlète(s)` : `❌ ${data.error || 'Erreur'}`)
    } catch { setSendMsg('❌ Erreur réseau') }
    setSending(false)
    setTimeout(() => setSendMsg(''), 4000)
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]
  const nPresent = Object.values(attendance).filter(s => s === 'present').length
  const nBlesse  = Object.values(attendance).filter(s => s === 'present_blesse').length
  const nAbsent  = Object.values(attendance).filter(s => s === 'absent' || s === 'absent_blesse').length
  const nPending = clients.length - Object.keys(attendance).length

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── Header séance ── */}
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.dim, marginBottom: 6 }}>Séance</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: P.text, textTransform: 'capitalize', lineHeight: 1.2 }}>{dateLabel}</div>
            {isToday && (
              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: P.green, background: '#e8f5ee', padding: '3px 8px', borderRadius: 999 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.green }} />
                Temps réel
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Type de séance */}
            <select value={sessionType} onChange={e => setSessionType(e.target.value)}
              style={{ height: 36, borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.text, fontSize: 13, fontWeight: 600, padding: '0 10px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
              {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Date */}
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ height: 36, borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, color: P.text, fontSize: 13, padding: '0 10px', outline: 'none', fontFamily: 'inherit' }} />

            {/* Rappel */}
            <button onClick={sendReminder} disabled={sending}
              style={{ height: 36, padding: '0 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${P.accent}`, background: P.accent, color: '#fff', opacity: sending ? 0.7 : 1 }}>
              {sending ? '...' : '📣 Rappel'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { n: nPresent, label: 'Présents',  color: P.green,  bg: '#e8f5ee' },
            { n: nBlesse,  label: 'Blessés',   color: P.yellow, bg: '#fdf6e3' },
            { n: nAbsent,  label: 'Absents',   color: P.red,    bg: '#fdecea' },
            { n: nPending, label: 'En attente', color: P.dim,   bg: '#f0ede8' },
          ].map(({ n, label, color, bg }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: bg }}>
              <span style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>{n}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {sendMsg && (
        <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, padding: '8px 12px', borderRadius: 8, color: sendMsg.startsWith('✓') ? P.green : P.red, background: sendMsg.startsWith('✓') ? '#e8f5ee' : '#fdecea' }}>
          {sendMsg}
        </div>
      )}

      {/* Marquer tout */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: P.dim, fontWeight: 600, marginRight: 2 }}>Tout marquer :</span>
        {STATUS_OPTS.map(s => (
          <button key={s.key} onClick={() => markAll(s.key)}
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${s.border}`, background: s.bg, color: s.color }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Liste athlètes ── */}
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: P.dim, fontSize: 13 }}>Chargement...</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: P.dim, fontSize: 13 }}>Aucun athlète</div>
        ) : clients.map((client, i) => {
          const status = attendance[client.id]
          const opt = STATUS_OPTS.find(x => x.key === status || (status === 'absent_blesse' && x.key === 'absent'))
          const hasInjury = injuries.has(client.id)
          const isLast = i === clients.length - 1

          return (
            <div key={client.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              padding: '12px 16px',
              borderBottom: isLast ? 'none' : `1px solid ${P.border}`,
              borderLeft: `4px solid ${opt ? opt.color : 'transparent'}`,
              background: opt ? opt.bg + '55' : P.card,
              transition: 'background 0.25s, border-left-color 0.25s',
            }}>
              <Avatar name={client.full_name || client.email} />

              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>
                  {client.full_name || client.email}
                </div>
                <div style={{ fontSize: 11, color: P.dim, marginTop: 2, display: 'flex', gap: 8 }}>
                  {hasInjury && <span style={{ color: P.red, fontWeight: 600 }}>🩹 Blessure active</span>}
                  {!status && <span>En attente de réponse…</span>}
                </div>
              </div>

              {/* 3 boutons statut */}
              <div style={{ display: 'flex', gap: 5, minWidth: 220 }}>
                {STATUS_OPTS.map(st => (
                  <StatusPill
                    key={st.key}
                    opt={st}
                    active={status === st.key || (status === 'absent_blesse' && st.key === 'absent')}
                    saving={saving[client.id]}
                    onClick={() => setStatus(client.id, st.key)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
