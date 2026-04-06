import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { T } from '../lib/data'

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function toISO(date) { return date.toISOString().split('T')[0] }
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const ATHLETE_COLORS = ['#3ecf8e','#60a5fa','#a78bfa','#fb923c','#f43f5e','#fbbf24','#26d4e8','#e879f9']

// ─── Cellule jour ─────────────────────────────────────────────────────────────
function DayCell({ assignment, session, isPast, isToday, clientColor, onClick }) {
  if (!assignment) {
    return (
      <div style={{
        height: '100%', minHeight: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: isToday ? 0.3 : 0.15,
      }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: T.border }} />
      </div>
    )
  }

  const done    = !!session
  const missed  = isPast && !isToday && !session
  const planned = !isPast || isToday

  const color = done ? '#60a5fa' : missed ? '#f43f5e' : clientColor
  const bg    = done ? 'rgba(96,165,250,0.1)' : missed ? 'rgba(244,63,94,0.08)' : `${clientColor}12`
  const label = assignment.program_days?.name || assignment.programs?.name || 'Séance'

  return (
    <div onClick={onClick}
      style={{
        height: '100%', minHeight: 52, padding: '6px 8px',
        background: bg, borderRadius: 8,
        border: `1px solid ${color}25`,
        cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
        transition: 'border-color 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${color}60`}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${color}25`}>
      <div style={{
        fontSize: 11, fontWeight: 700, color,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 9, fontWeight: 600, color, opacity: 0.65, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {done ? 'Réalisé' : missed ? 'Manqué' : 'Planifié'}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CoachPlanningPage() {
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [clients, setClients]     = useState([])
  const [assignments, setAssignments] = useState([])
  const [sessions, setSessions]   = useState([])
  const [loading, setLoading]     = useState(true)

  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )
  const todayStr = toISO(new Date())

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    const weekEnd = addDays(weekStart, 6)
    const startStr = toISO(weekStart)
    const endStr   = toISO(weekEnd)

    const { data: links } = await supabase
      .from('coach_clients').select('client_id').eq('coach_id', user.id)
    const ids = (links || []).map(l => l.client_id)

    if (!ids.length) { setClients([]); setAssignments([]); setSessions([]); setLoading(false); return }

    const [{ data: profs }, { data: asgns }, { data: sess }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').in('id', ids).order('full_name'),
      supabase.from('assignments')
        .select('id, athlete_id, assigned_date, program_id, program_day_id, programs(name), program_days(name)')
        .eq('coach_id', user.id)
        .gte('assigned_date', startStr)
        .lte('assigned_date', endStr),
      supabase.from('sessions')
        .select('id, user_id, date')
        .in('user_id', ids)
        .gte('date', startStr)
        .lte('date', endStr),
    ])

    setClients((profs || []).map((c, i) => ({ ...c, color: ATHLETE_COLORS[i % ATHLETE_COLORS.length] })))
    setAssignments(asgns || [])
    setSessions(sess || [])
    setLoading(false)
  }, [user?.id, weekStart])

  useEffect(() => { load() }, [load])

  // Index rapide : assignments[clientId][dateStr] et sessions[clientId][dateStr]
  const assignIdx = useMemo(() => {
    const idx = {}
    for (const a of assignments) {
      if (!idx[a.athlete_id]) idx[a.athlete_id] = {}
      idx[a.athlete_id][a.assigned_date] = a
    }
    return idx
  }, [assignments])

  const sessIdx = useMemo(() => {
    const idx = {}
    for (const s of sessions) {
      if (!idx[s.user_id]) idx[s.user_id] = {}
      idx[s.user_id][s.date] = s
    }
    return idx
  }, [sessions])

  // Stats semaine
  const stats = useMemo(() => {
    const total   = assignments.length
    const done    = assignments.filter(a => sessIdx[a.client_id]?.[a.assigned_date]).length
    const past    = assignments.filter(a => a.assigned_date < todayStr).length
    const missed  = past - assignments.filter(a => a.assigned_date < todayStr && sessIdx[a.client_id]?.[a.assigned_date]).length
    return { total, done, missed, planned: total - done - missed }
  }, [assignments, sessIdx, todayStr])

  const COL_W = 'minmax(90px, 1fr)'
  const NAME_W = 160

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: 'clamp(20px,3vw,32px) clamp(12px,3vw,24px) 60px', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .plan-scroll { overflow-x: auto; }
        .plan-grid { display: grid; grid-template-columns: ${NAME_W}px repeat(7, ${COL_W}); min-width: 720px; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(20px,3vw,26px)', fontWeight: 800, color: T.text, letterSpacing: '-0.3px' }}>Planning</div>
            <div style={{ fontSize: 13, color: T.textDim, marginTop: 3 }}>Vue équipe — semaine du {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>
          </div>

          {/* Nav semaine */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 12, padding: '5px 8px' }}>
            <button onClick={() => setWeekStart(d => addDays(d, -7))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMid, padding: '4px 6px', borderRadius: 7, fontSize: 16, lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text, minWidth: 130, textAlign: 'center' }}>
              {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {weekDates[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
            <button onClick={() => setWeekStart(d => addDays(d, 7))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMid, padding: '4px 6px', borderRadius: 7, fontSize: 16, lineHeight: 1 }}>›</button>
            <button onClick={() => setWeekStart(getMondayOf(new Date()))}
              style={{ padding: '4px 10px', borderRadius: 7, background: `${T.accent}15`, border: `1px solid ${T.accent}25`, color: T.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Auj.
            </button>
          </div>
        </div>

        {/* Stats rapides */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', animation: 'fadeUp 0.3s ease both' }}>
          {[
            { label: 'Séances planifiées', value: stats.total, color: T.textMid },
            { label: 'Réalisées', value: stats.done, color: '#60a5fa' },
            { label: 'Manquées', value: stats.missed, color: '#f43f5e' },
            { label: 'À venir', value: stats.planned, color: T.accent },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 14px', border: `1px solid ${T.border}`, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "'DM Sans',sans-serif" }}>{s.value}</span>
              <span style={{ fontSize: 11, color: T.textDim, marginLeft: 6 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: T.textDim, fontSize: 13 }}>Chargement…</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: T.textDim, fontSize: 13 }}>
            Aucun client — <Link to="/coach/clients" style={{ color: T.accent, textDecoration: 'none', fontWeight: 700 }}>ajouter des clients</Link>
          </div>
        ) : (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', animation: 'fadeUp 0.35s ease both', animationDelay: '60ms' }}>
            <div className="plan-scroll">

              {/* En-tête colonnes */}
              <div className="plan-grid" style={{ borderBottom: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.025)' }}>
                <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Athlète</div>
                {weekDates.map((date, i) => {
                  const dateStr  = toISO(date)
                  const isToday  = dateStr === todayStr
                  return (
                    <div key={dateStr} style={{ padding: '10px 8px', textAlign: 'center', background: isToday ? `${T.accent}08` : 'transparent', borderLeft: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? T.accent : T.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>{DAYS_SHORT[i]}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isToday ? T.accent : T.text, marginTop: 1 }}>{date.getDate()}</div>
                    </div>
                  )
                })}
              </div>

              {/* Lignes athlètes */}
              {clients.map((client, ci) => (
                <div key={client.id} className="plan-grid"
                  style={{ borderBottom: ci < clients.length - 1 ? `1px solid ${T.border}` : 'none', background: ci % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)' }}>

                  {/* Nom athlète */}
                  <Link to={`/coach/client/${client.id}`}
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `${client.color}18`, border: `1px solid ${client.color}30`, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: client.color }}>
                      {initials(client.full_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.full_name?.split(' ')[0] || 'Client'}
                      </div>
                      <div style={{ fontSize: 10, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.full_name?.split(' ').slice(1).join(' ') || client.email}
                      </div>
                    </div>
                  </Link>

                  {/* Cellules jours */}
                  {weekDates.map(date => {
                    const dateStr    = toISO(date)
                    const isToday    = dateStr === todayStr
                    const isPast     = dateStr < todayStr
                    const assignment = assignIdx[client.id]?.[dateStr]
                    const session    = sessIdx[client.id]?.[dateStr]

                    return (
                      <div key={dateStr} style={{ padding: '6px', borderLeft: `1px solid ${T.border}`, background: isToday ? `${T.accent}04` : 'transparent' }}>
                        <DayCell
                          assignment={assignment}
                          session={session}
                          isPast={isPast}
                          isToday={isToday}
                          clientColor={client.color}
                          onClick={() => {}}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Légende */}
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 16, flexWrap: 'wrap', background: 'rgba(255,255,255,0.015)' }}>
              {[
                { color: T.accent, label: 'Planifié' },
                { color: '#60a5fa', label: 'Réalisé' },
                { color: '#f43f5e', label: 'Manqué' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: l.color }} />
                  <span style={{ fontSize: 11, color: T.textDim }}>{l.label}</span>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', fontSize: 11, color: T.textDim }}>
                Basé sur les programmes assignés
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
