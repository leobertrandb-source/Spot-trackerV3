import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

// ─── Même palette que CoachPage_ProSport ──────────────────────────────────────
const P = {
  bg:     '#f5f3ef',
  card:   '#ffffff',
  border: '#e8e4dc',
  text:   '#1a1a1a',
  sub:    '#6b6b6b',
  dim:    '#c0bab0',
  accent: '#1a3a2a',
  green:  '#2d6a4f',
  yellow: '#b5830a',
  red:    '#c0392b',
  blue:   '#1a3a5c',
  orange: '#b85c00',
}

const HOOPER_FIELDS = [
  { key: 'fatigue', label: 'Fatigue',  color: '#c0392b', bg: '#fdecea' },
  { key: 'sommeil', label: 'Sommeil',  color: '#1a3a5c', bg: '#eef3ff' },
  { key: 'stress',  label: 'Stress',   color: '#b5830a', bg: '#fdf6e3' },
  { key: 'douleur', label: 'Douleur',  color: '#6b3a7d', bg: '#f5eeff' },
]

function hooperStatus(score) {
  if (score === null || score === undefined) return { label: 'Non rempli', color: P.sub,    dot: '#d1cfc9', bg: '#f0ede8' }
  if (score <= 14) return { label: 'Bonne forme',       color: P.green,  dot: '#2d6a4f', bg: '#e8f5ee' }
  if (score <= 20) return { label: 'Vigilance',         color: P.yellow, dot: '#e9a21b', bg: '#fdf6e3' }
  return              { label: 'Fatigue élevée',        color: P.red,    dot: '#c0392b', bg: '#fdecea' }
}

// ─── Micro sparkline ──────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 28 }) {
  if (!data?.length) return null
  const vals = data.slice(-12)
  const max = Math.max(...vals.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
      {vals.map((d, i) => {
        const isLast = i === vals.length - 1
        return (
          <div key={i} style={{
            flex: 1, borderRadius: 2,
            height: `${Math.max(4, (d.value / max) * height)}px`,
            background: isLast ? color : `${color}35`,
            transition: 'height 0.4s cubic-bezier(0.4,0,0.2,1)',
          }} />
        )
      })}
    </div>
  )
}

// ─── Card de navigation rapide ────────────────────────────────────────────────
function NavCard({ emoji, label, sub, badge, badgeColor, badgeBg, to, delay = 0 }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={() => navigate(to)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#faf8f4' : P.card,
        border: `1px solid ${hovered ? '#d4cfc7' : P.border}`,
        borderRadius: 16, padding: '16px 18px', cursor: 'pointer',
        transition: 'all 0.18s ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(26,58,42,0.08)' : 'none',
        animation: `fadeUp 0.4s ease ${delay}ms both`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{ fontSize: 22, width: 38, height: 38, borderRadius: 10, background: P.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: P.text, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: P.sub, marginTop: 1 }}>{sub}</div>}
      </div>
      {badge != null && (
        <div style={{ padding: '3px 10px', borderRadius: 999, background: badgeBg || '#e8f5ee', color: badgeColor || P.green, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {badge}
        </div>
      )}
      <div style={{ color: P.dim, fontSize: 14, flexShrink: 0 }}>›</div>
    </div>
  )
}

export default function AthleteDashboardPage() {
  const { user, profile, gym } = useAuth()
  const navigate = useNavigate()

  const [hooper, setHooper]         = useState(null)
  const [hoopers, setHoopers]       = useState([])
  const [compo, setCompo]           = useState(null)
  const [compoHistory, setCompoHistory] = useState([])
  const [attendance, setAttendance] = useState([])
  const [injuries, setInjuries]     = useState([])
  const [nextMatch, setNextMatch]   = useState(null)
  const [nextAppt, setNextAppt]     = useState(null)
  const [loading, setLoading]       = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const gymName = gym?.name || 'Atlyo'
  const firstName = (profile?.full_name || '').split(' ').slice(-1)[0] || 'Joueur'
  const todayDone = hooper?.date === today

  const load = useCallback(async () => {
    setLoading(true)
    const uid = user.id

    const { data: link } = await supabase.from('coach_clients').select('coach_id').eq('client_id', uid).maybeSingle()
    const coachId = link?.coach_id

    const [
      { data: hooperLogs },
      { data: compoLogs },
      { data: attendanceLogs },
      { data: injuriesData },
      { data: matches },
      { data: appts },
    ] = await Promise.all([
      supabase.from('hooper_logs').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(14),
      supabase.from('body_composition_logs').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(8),
      supabase.from('training_attendance').select('*').eq('athlete_id', uid)
        .gte('date', new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      supabase.from('medical_injuries').select('*').eq('athlete_id', uid).eq('status', 'active'),
      coachId ? supabase.from('match_history').select('*').eq('coach_id', coachId)
        .gte('match_date', today).order('match_date', { ascending: true }).limit(1) : { data: [] },
      supabase.from('medical_appointments').select('*').eq('athlete_id', uid)
        .gte('date_appointment', new Date().toISOString()).order('date_appointment', { ascending: true }).limit(1),
    ])

    const logs = (hooperLogs || []).reverse()
    setHooper(hooperLogs?.[0] || null)
    setHoopers(logs)
    setCompo(compoLogs?.[0] || null)
    setCompoHistory((compoLogs || []).reverse())
    setAttendance(attendanceLogs || [])
    setInjuries(injuriesData || [])
    setNextMatch(matches?.[0] || null)
    setNextAppt(appts?.[0] || null)
    setLoading(false)
  }, [user.id, today])

  useEffect(() => { load() }, [load])

  const lastScore = hooper
    ? (hooper.fatigue || 0) + (hooper.sommeil || 0) + (hooper.stress || 0) + (hooper.douleur || 0)
    : null

  const status = hooperStatus(lastScore)

  const hooperChartData = hoopers.map(h => ({
    value: (h.fatigue || 0) + (h.sommeil || 0) + (h.stress || 0) + (h.douleur || 0),
  }))

  const weightHistory = compoHistory.filter(c => c.weight_kg).map(c => ({ value: parseFloat(c.weight_kg) }))
  const presences7j = attendance.slice(0, 7)
  const presencesOk = presences7j.filter(a => a.status === 'present' || a.status === 'present_blesse').length

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", color: P.sub, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,28px)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, animation: 'fadeUp 0.35s ease both' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>
              {gymName} · Athlète
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(26px,4vw,36px)', fontWeight: 400, color: P.text, margin: 0, lineHeight: 1.2 }}>
              Bonjour, {firstName}
            </h1>
            <div style={{ fontSize: 13, color: P.sub, marginTop: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
          </div>

          {/* Badge statut HOOPER */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 999,
            background: status.bg, border: `1px solid ${status.dot}30`,
            animation: 'fadeUp 0.35s ease 0.1s both',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: status.dot, ...(lastScore === null ? { animation: 'pulse 2s infinite' } : {}) }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: status.color }}>
              {status.label}
              {lastScore !== null && <span style={{ fontWeight: 400, color: P.sub, marginLeft: 6 }}>HOOPER {lastScore}/40</span>}
            </div>
          </div>
        </div>

        {/* ── Alerte HOOPER non rempli ── */}
        {!todayDone && (
          <div onClick={() => navigate('/prep/hooper')} style={{
            background: '#fffbeb', border: '1px solid #f0d080',
            borderRadius: 14, padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            transition: 'all 0.15s', animation: 'fadeUp 0.35s ease 0.15s both',
            boxShadow: '0 4px 16px rgba(181,131,10,0.08)',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff9e0'}
            onMouseLeave={e => e.currentTarget.style.background = '#fffbeb'}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 18 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: P.yellow }}>HOOPER du jour non rempli</div>
              <div style={{ fontSize: 12, color: P.sub, marginTop: 2 }}>Renseignez votre questionnaire de bien-être pour aujourd'hui</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: P.yellow, padding: '6px 14px', borderRadius: 999, background: '#fef3c7', flexShrink: 0 }}>Remplir →</div>
          </div>
        )}

        {/* ── Grille principale ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* HOOPER card */}
          <div onClick={() => navigate('/prep/hooper')} style={{
            background: P.card, border: `1px solid ${P.border}`, borderRadius: 18,
            padding: '22px 24px', cursor: 'pointer', transition: 'all 0.18s',
            boxShadow: '0 2px 12px rgba(26,58,42,0.04)',
            animation: 'fadeUp 0.35s ease 0.2s both',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#faf8f4'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,58,42,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = P.card; e.currentTarget.style.boxShadow = '0 2px 12px rgba(26,58,42,0.04)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Bien-être · HOOPER</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 44, fontWeight: 400, color: status.color, lineHeight: 1 }}>
                  {lastScore ?? '—'}
                  {lastScore !== null && <span style={{ fontSize: 18, color: P.sub, fontWeight: 400, fontFamily: "'DM Sans', sans-serif" }}>/40</span>}
                </div>
              </div>
              {hooper?.date && (
                <div style={{ fontSize: 11, color: P.sub, padding: '4px 10px', background: P.bg, borderRadius: 999, border: `1px solid ${P.border}` }}>
                  {new Date(hooper.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>
              )}
            </div>

            {/* Détail 4 critères */}
            {hooper && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {HOOPER_FIELDS.map(f => (
                  <div key={f.key} style={{ background: f.bg, borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: f.color, fontWeight: 600 }}>{f.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: f.color, fontFamily: "'DM Serif Display', serif" }}>{hooper[f.key] ?? '—'}</div>
                  </div>
                ))}
              </div>
            )}

            <Sparkline data={hooperChartData} color={status.dot} height={28} />
          </div>

          {/* Composition corporelle */}
          <div onClick={() => navigate('/prep/compo')} style={{
            background: P.card, border: `1px solid ${P.border}`, borderRadius: 18,
            padding: '22px 24px', cursor: 'pointer', transition: 'all 0.18s',
            boxShadow: '0 2px 12px rgba(26,58,42,0.04)',
            animation: 'fadeUp 0.35s ease 0.25s both',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#faf8f4'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,58,42,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = P.card; e.currentTarget.style.boxShadow = '0 2px 12px rgba(26,58,42,0.04)' }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16 }}>Composition corporelle</div>
            {compo ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Poids',     value: compo.weight_kg,     unit: 'kg',  color: P.blue },
                    { label: 'Masse grasse', value: compo.body_fat_pct, unit: '%', color: P.yellow },
                    { label: 'Masse maigre', value: compo.muscle_mass_kg, unit: 'kg', color: P.green },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} style={{ background: P.bg, borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color, lineHeight: 1 }}>
                        {value ?? '—'}
                        {value != null && <span style={{ fontSize: 11, color: P.sub, fontWeight: 400, fontFamily: "'DM Sans', sans-serif" }}> {unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <Sparkline data={weightHistory} color={P.blue} height={24} />
                <div style={{ fontSize: 11, color: P.dim, marginTop: 10 }}>
                  Dernière mesure · {new Date(compo.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
                <div style={{ fontSize: 28, opacity: 0.3 }}>📊</div>
                <div style={{ fontSize: 13, color: P.sub, textAlign: 'center' }}>Aucune mesure enregistrée</div>
                <div style={{ fontSize: 11, color: P.dim }}>Ajouter votre première mesure →</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Présences + Statut médical + Prochain match ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* Présences */}
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: '20px 22px', animation: 'fadeUp 0.35s ease 0.3s both', boxShadow: '0 2px 12px rgba(26,58,42,0.04)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>Présences (7j)</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 38, fontWeight: 400, color: presencesOk >= 3 ? P.green : P.yellow, lineHeight: 1, marginBottom: 4 }}>
              {presencesOk}
              <span style={{ fontSize: 16, color: P.sub, fontWeight: 400, fontFamily: "'DM Sans', sans-serif" }}>/{presences7j.length || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const a = presences7j[i]
                const c = !a ? P.border : (a.status === 'present' || a.status === 'present_blesse') ? P.green : a.status === 'absent_blesse' ? P.red : '#d1cfc9'
                return <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: c, transition: 'all 0.3s' }} />
              })}
            </div>
            <div style={{ fontSize: 10, color: P.sub, marginTop: 8 }}>Cette semaine</div>
          </div>

          {/* Statut médical */}
          <div style={{
            background: injuries.length > 0 ? '#fdecea' : '#e8f5ee',
            border: `1px solid ${injuries.length > 0 ? '#f5c6c2' : '#b7dfc9'}`,
            borderRadius: 18, padding: '20px 22px',
            animation: 'fadeUp 0.35s ease 0.35s both',
            boxShadow: '0 2px 12px rgba(26,58,42,0.04)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: injuries.length > 0 ? P.red : P.green, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
              Statut médical
            </div>
            {injuries.length === 0 ? (
              <>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: P.green }}>Apte ✓</div>
                <div style={{ fontSize: 11, color: P.green, opacity: 0.7, marginTop: 6 }}>Aucune blessure active</div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: P.red }}>
                  {injuries.length} blessure{injuries.length > 1 ? 's' : ''}
                </div>
                {injuries.slice(0, 2).map(inj => (
                  <div key={inj.id} style={{ fontSize: 11, color: P.red, marginTop: 6, opacity: 0.85 }}>
                    · {inj.body_zone} · J+{Math.floor((Date.now() - new Date(inj.date_injury).getTime()) / 86400000)}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Prochain match */}
          <div onClick={() => navigate('/calendrier')} style={{
            background: P.card, border: `1px solid ${P.border}`, borderRadius: 18,
            padding: '20px 22px', cursor: 'pointer', transition: 'all 0.18s',
            animation: 'fadeUp 0.35s ease 0.4s both', boxShadow: '0 2px 12px rgba(26,58,42,0.04)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#faf8f4'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,58,42,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = P.card; e.currentTarget.style.boxShadow = '0 2px 12px rgba(26,58,42,0.04)' }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>Prochain match</div>
            {nextMatch ? (
              <>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, fontWeight: 400, color: P.text, lineHeight: 1.3, marginBottom: 8 }}>
                  {nextMatch.label || `vs ${nextMatch.opponent}`}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#e8f5ee', borderRadius: 999 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: P.green }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: P.green }}>
                    {new Date(nextMatch.match_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {nextMatch.location && (
                  <div style={{ fontSize: 10, color: P.sub, marginTop: 8 }}>📍 {nextMatch.location.split(',')[0]}</div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: P.sub, paddingTop: 8 }}>Aucun match planifié</div>
            )}
          </div>
        </div>

        {/* ── RDV médical ── */}
        {nextAppt && (
          <div style={{ background: '#eef3ff', border: '1px solid #b8cef5', borderRadius: 14, padding: '14px 20px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, animation: 'fadeUp 0.35s ease 0.42s both' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dce8ff', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 18 }}>📅</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.blue }}>Prochain RDV médical</div>
              <div style={{ fontSize: 12, color: P.sub, marginTop: 2 }}>
                {nextAppt.type} · {new Date(nextAppt.date_appointment).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' à '}{new Date(nextAppt.date_appointment).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {nextAppt.location && ` · ${nextAppt.location}`}
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation rapide ── */}
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, animation: 'fadeUp 0.35s ease 0.45s both' }}>
            Navigation
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <NavCard emoji="🎯" label="HOOPER"
              sub={todayDone ? 'Rempli aujourd\'hui ✓' : 'À remplir maintenant'}
              badge={todayDone ? '✓' : '!'}
              badgeColor={todayDone ? P.green : P.yellow}
              badgeBg={todayDone ? '#e8f5ee' : '#fdf6e3'}
              to="/prep/hooper" delay={480} />
            <NavCard emoji="⚡" label="Charge interne" sub="RPE · Effort perçu · Unités arbitraires" to="/prep/charge" delay={510} />
            <NavCard emoji="📡" label="Charge externe" sub="GPS · Distance · Accélérations" to="/prep/charge-externe" delay={540} />
            <NavCard emoji="🏋️" label="TOPSET" sub="Performances · 1RM estimé" to="/prep/topset" delay={570} />
            <NavCard emoji="📊" label="Composition corporelle" sub="Poids · Masse grasse · Masse musculaire" to="/prep/compo" delay={600} />
            <NavCard emoji="📅" label="Calendrier" sub="Matchs · Entraînements · RDV" to="/calendrier" delay={630} />
            <NavCard emoji="✋" label="Ma présence" sub="Indiquer mon statut pour l'entraînement" to="/ma-presence" delay={660} />
          </div>
        </div>

      </div>
    </div>
  )
}
