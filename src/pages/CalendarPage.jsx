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

// Types d'événements avec couleurs
const EVENT_TYPES = {
  match:       { color: '#c0392b', bg: '#fdecea', label: '🏉 Match' },
  training:    { color: '#2d6a4f', bg: '#e8f5ee', label: '🏃 Entraînement' },
  appointment: { color: '#1a3a5c', bg: '#eef3ff', label: '📅 RDV médical' },
  season:      { color: '#b45309', bg: '#fffbeb', label: '📌 Événement' },
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAYS_OF_WEEK = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 0: 'Dim' }

function toISO(date) { 
  const d = parseLocalDate(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// Parse une date ISO string sans décalage timezone
function parseLocalDate(str) {
  if (!str) return new Date()
  // Si c'est déjà une date ISO (YYYY-MM-DD), forcer heure locale
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(str)
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a, b) {
  return toISO(parseLocalDate(a)) === toISO(parseLocalDate(b))
}

function getDayIndicators(dayEvents) {
  const counts = { match: 0, training: 0, appointment: 0, season: 0 }
  for (const e of dayEvents) {
    if (counts[e.type] !== undefined) counts[e.type] += 1
  }
  return Object.entries(counts).filter(([, n]) => n > 0)
}

function EventChip({ event, onClick }) {
  const t = EVENT_TYPES[event.type] || EVENT_TYPES.season
  return (
    <button onClick={() => onClick?.(event)} style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      fontWeight: 600,
      padding: '6px 8px',
      borderRadius: 10,
      border: 'none',
      background: t.bg,
      color: t.color,
      cursor: 'pointer',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      marginBottom: 4,
      lineHeight: 1.35,
      textAlign: 'left',
      fontFamily: 'inherit',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', flex: 1 }}>
        {event.title}
      </span>
    </button>
  )
}

export default function CalendarPage() {
  const { user, profile, gym, isCoach } = useAuth()
  const navigate = useNavigate()

  const [view, setView]         = useState('week') // 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [trainingDays, setTrainingDays] = useState([]) // jours d'entraînement configurés

  const load = useCallback(async () => {
    setLoading(true)

    // Plage de dates selon la vue
    const start = view === 'week'
      ? startOfWeek(currentDate)
      : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const end = view === 'week'
      ? addDays(start, 6)
      : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    const startISO = toISO(start)
    const endISO = toISO(end)

    let allEvents = []

    if (isCoach) {
      // ── COACH : matchs + entraînements + RDV médicaux ──────────────────────
      const [{ data: matches }, { data: appts }, { data: sched }] = await Promise.all([
        supabase.from('match_history').select('*')
          .eq('coach_id', user.id)
          .gte('match_date', startISO)
          .lte('match_date', endISO),
        supabase.from('medical_appointments').select('*, athlete:athlete_id(full_name, email)')
          .eq('coach_id', user.id)
          .gte('date_appointment', start.toISOString())
          .lte('date_appointment', new Date(end.getTime() + 86400000).toISOString()),
        supabase.from('training_schedule').select('*').eq('coach_id', user.id).eq('active', true),
      ])

      // Matchs
      for (const m of (matches || [])) {
        allEvents.push({
          id: m.id, type: 'match', date: toISO(parseLocalDate(m.match_date)),
          title: m.label || `vs ${m.opponent}`,
          subtitle: m.opponent, location: m.location,
          raw: m,
        })
      }

      // Jours d'entraînement configurés — générer pour la plage
      const schedDays = (sched || []).map(s => s.day_of_week)
      setTrainingDays(schedDays)
      let d = new Date(start)
      while (d <= end) {
        const dow = d.getDay()
        if (schedDays.includes(dow)) {
          allEvents.push({
            id: `training-${toISO(d)}`, type: 'training',
            date: toISO(d), title: 'Entraînement',
            subtitle: DAYS_OF_WEEK[dow],
          })
        }
        d = addDays(d, 1)
      }

      // RDV médicaux
      for (const a of (appts || [])) {
        const apptDate = toISO(parseLocalDate(a.date_appointment))
        allEvents.push({
          id: a.id, type: 'appointment', date: apptDate,
          title: `RDV ${a.type} — ${a.athlete?.full_name || a.athlete?.email || ''}`,
          subtitle: a.location || '',
          time: new Date(a.date_appointment).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          raw: a,
        })
      }

    } else {
      // ── ATHLÈTE : matchs du coach + ses RDV + entraînements ─────────────────
      // Trouver le coach
      const { data: link } = await supabase.from('coach_clients').select('coach_id').eq('client_id', user.id).maybeSingle()
      const coachId = link?.coach_id

      if (coachId) {
        const [{ data: matches }, { data: appts }, { data: sched }] = await Promise.all([
          supabase.from('match_history').select('*')
            .eq('coach_id', coachId)
            .gte('match_date', startISO)
            .lte('match_date', endISO),
          supabase.from('medical_appointments').select('*')
            .eq('athlete_id', user.id)
            .gte('date_appointment', start.toISOString())
            .lte('date_appointment', new Date(end.getTime() + 86400000).toISOString()),
          supabase.from('training_schedule').select('*').eq('coach_id', coachId).eq('active', true),
        ])

        for (const m of (matches || [])) {
          allEvents.push({
            id: m.id, type: 'match', date: toISO(parseLocalDate(m.match_date)),
            title: m.label || `vs ${m.opponent}`,
            subtitle: m.opponent, location: m.location,
          })
        }

        const schedDays = (sched || []).map(s => s.day_of_week)
        setTrainingDays(schedDays)
        let d = new Date(start)
        while (d <= end) {
          if (schedDays.includes(d.getDay())) {
            allEvents.push({
              id: `training-${toISO(d)}`, type: 'training',
              date: toISO(d), title: 'Entraînement',
            })
          }
          d = addDays(d, 1)
        }

        for (const a of (appts || [])) {
          allEvents.push({
            id: a.id, type: 'appointment', date: toISO(parseLocalDate(a.date_appointment)),
            title: `RDV ${a.type}`,
            subtitle: a.location || '',
            time: new Date(a.date_appointment).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          })
        }
      }
    }

    setEvents(allEvents)
    setLoading(false)
  }, [user.id, isCoach, currentDate, view])

  useEffect(() => { load() }, [load])

  function getEventsForDay(dateStr) {
    return events.filter(e => e.date === dateStr)
      .sort((a, b) => {
        const order = { match: 0, training: 1, appointment: 2, season: 3 }
        return (order[a.type] ?? 9) - (order[b.type] ?? 9)
      })
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  function prev() {
    if (view === 'week') setCurrentDate(d => addDays(d, -7))
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function next() {
    if (view === 'week') setCurrentDate(d => addDays(d, 7))
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
  function goToday() { setCurrentDate(new Date()) }

  // ── Semaine courante ────────────────────────────────────────────────────────
  const weekStart = startOfWeek(currentDate)
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // ── Mois courant ────────────────────────────────────────────────────────────
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  // Offset pour commencer lundi
  const startOffset = (firstDay.getDay() + 6) % 7
  const monthDays = []
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startOffset - 1; i >= 0; i--) {
    monthDays.push({ date: new Date(year, month - 1, prevMonthLastDay - i), outside: true })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    monthDays.push({ date: new Date(year, month, d), outside: false })
  }
  while (monthDays.length % 7 !== 0) {
    const nextDay = monthDays.length - (startOffset + lastDay.getDate()) + 1
    monthDays.push({ date: new Date(year, month + 1, nextDay), outside: true })
  }

  const today = toISO(new Date())
  const gymName = gym?.name || 'Atlyo'

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", padding: 'clamp(16px,2vw,28px)' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: P.sub, marginBottom: 6 }}>
              {gymName}
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px,3vw,30px)', fontWeight: 400, color: P.text, margin: 0 }}>
              Calendrier
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Toggle vue */}
            <div style={{ display: 'flex', background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {[{ key: 'week', label: 'Semaine' }, { key: 'month', label: 'Mois' }].map(v => (
                <button key={v.key} onClick={() => setView(v.key)} style={{
                  padding: '7px 16px', border: 'none', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: view === v.key ? P.accent : 'transparent',
                  color: view === v.key ? '#fff' : P.sub,
                }}>{v.label}</button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={prev} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${P.border}`, background: P.card, cursor: 'pointer', fontSize: 16, color: P.text }}>‹</button>
              <button onClick={goToday} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.card, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: P.text, fontFamily: 'inherit' }}>Aujourd'hui</button>
              <button onClick={next} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${P.border}`, background: P.card, cursor: 'pointer', fontSize: 16, color: P.text }}>›</button>
            </div>

            {/* Titre période */}
            <div style={{ fontSize: 15, fontWeight: 700, color: P.text, minWidth: 160, textAlign: 'center' }}>
              {view === 'week'
                ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS_FR[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
                : `${MONTHS_FR[month]} ${year}`
              }
            </div>
          </div>
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(EVENT_TYPES).map(([key, t]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: P.sub }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: t.color }} />
              {t.label}
            </div>
          ))}
        </div>

        {/* ── VUE SEMAINE ── */}
        {view === 'week' && (
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {/* Header jours */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${P.border}` }}>
              {weekDays.map((d, i) => {
                const iso = toISO(d)
                const isToday = iso === today
                const hasEvents = getEventsForDay(iso).length > 0
                return (
                  <div key={i} style={{
                    padding: '12px 8px', textAlign: 'center',
                    borderRight: i < 6 ? `1px solid ${P.border}` : 'none',
                    background: isToday ? '#e8f5ee' : 'transparent',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {DAYS_FR[i]}
                    </div>
                    <div style={{
                      fontSize: 20, fontWeight: 700, fontFamily: "'DM Serif Display', serif",
                      color: isToday ? P.green : P.text, lineHeight: 1.3,
                    }}>{d.getDate()}</div>
                    {hasEvents && <div style={{ width: 5, height: 5, borderRadius: '50%', background: P.green, margin: '2px auto 0' }} />}
                  </div>
                )
              })}
            </div>

            {/* Contenu jours */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 200 }}>
              {weekDays.map((d, i) => {
                const iso = toISO(d)
                const dayEvents = getEventsForDay(iso)
                const isToday = iso === today
                return (
                  <div key={i} style={{
                    padding: '10px 6px', minHeight: 120,
                    borderRight: i < 6 ? `1px solid ${P.border}` : 'none',
                    background: isToday ? 'rgba(45,106,79,0.03)' : 'transparent',
                  }}>
                    {loading ? null : dayEvents.length === 0 ? (
                      <div style={{ fontSize: 10, color: P.dim, textAlign: 'center', marginTop: 8 }}>—</div>
                    ) : dayEvents.map(e => (
                      <EventChip key={e.id} event={e} onClick={setSelectedEvent} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── VUE MOIS ── */}
        {view === 'month' && (
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {/* Header jours */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${P.border}` }}>
              {DAYS_FR.map(d => (
                <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grille mois */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {monthDays.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} style={{ minHeight: 90, borderRight: (i + 1) % 7 !== 0 ? `1px solid ${P.border}` : 'none', borderBottom: `1px solid ${P.border}`, background: '#faf8f4' }} />
                const iso = toISO(d)
                const dayEvents = getEventsForDay(iso)
                const isToday = iso === today
                const isCurrentMonth = d.getMonth() === month
                return (
                  <div key={iso} style={{
                    minHeight: 90, padding: '6px',
                    borderRight: (i + 1) % 7 !== 0 ? `1px solid ${P.border}` : 'none',
                    borderBottom: `1px solid ${P.border}`,
                    background: isToday ? 'rgba(45,106,79,0.04)' : 'transparent',
                    opacity: isCurrentMonth ? 1 : 0.4,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400,
                      color: isToday ? P.green : P.text,
                      width: 24, height: 24, borderRadius: '50%',
                      background: isToday ? '#e8f5ee' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 4,
                    }}>{d.getDate()}</div>
                    {dayEvents.slice(0, 3).map(e => (
                      <EventChip key={e.id} event={e} onClick={setSelectedEvent} />
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: 10, color: P.sub, fontWeight: 600 }}>+{dayEvents.length - 3} autres</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── PANEL ÉVÉNEMENT SÉLECTIONNÉ ── */}
        {selectedEvent && (
          <div onClick={() => setSelectedEvent(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: P.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
              {(() => {
                const t = EVENT_TYPES[selectedEvent.type] || EVENT_TYPES.season
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ padding: '4px 12px', borderRadius: 999, background: t.bg, color: t.color, fontSize: 12, fontWeight: 700 }}>
                        {t.label}
                      </div>
                      <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: P.sub }}>×</button>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: P.text, marginBottom: 8 }}>{selectedEvent.title}</div>
                    <div style={{ fontSize: 13, color: P.sub, marginBottom: 4 }}>
                      📅 {parseLocalDate(selectedEvent.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {selectedEvent.time && <div style={{ fontSize: 13, color: P.sub, marginBottom: 4 }}>🕐 {selectedEvent.time}</div>}
                    {selectedEvent.subtitle && <div style={{ fontSize: 13, color: P.sub, marginBottom: 4 }}>⚔️ {selectedEvent.subtitle}</div>}
                    {selectedEvent.location && <div style={{ fontSize: 13, color: P.sub, marginBottom: 4 }}>📍 {selectedEvent.location}</div>}
                    {selectedEvent.type === 'match' && isCoach && (
                      <button
                        onClick={() => { navigate('/medical'); setSelectedEvent(null) }}
                        style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${P.border}`, background: P.bg, color: P.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Voir les blessures de ce match →
                      </button>
                    )}
                    {selectedEvent.type === 'appointment' && isCoach && selectedEvent.raw?.athlete_id && (
                      <button
                        onClick={() => { navigate(`/medical/${selectedEvent.raw.athlete_id}`); setSelectedEvent(null) }}
                        style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${P.border}`, background: P.bg, color: P.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Fiche médicale du joueur →
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
