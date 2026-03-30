import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      '#0a0c0f',
  card:    'rgba(255,255,255,0.04)',
  cardHi:  'rgba(255,255,255,0.07)',
  border:  'rgba(255,255,255,0.07)',
  borderHi:'rgba(255,255,255,0.14)',
  text:    '#f0f4f8',
  sub:     '#6b8090',
  dim:     '#2d3d4a',
  accent:  '#3ecf8e',
  accentDim:'rgba(62,207,142,0.15)',
  red:     '#f87171',
  yellow:  '#fbbf24',
  blue:    '#60a5fa',
  font:    "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
}

// ─── HOOPER score color ───────────────────────────────────────────────────────
function hooperColor(score) {
  if (score === null || score === undefined) return T.sub
  if (score <= 14) return T.accent
  if (score <= 20) return T.yellow
  return T.red
}

function hooperLabel(score) {
  if (score === null || score === undefined) return '—'
  if (score <= 14) return 'Bonne forme'
  if (score <= 20) return 'Vigilance'
  return 'Fatigue élevée'
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function MiniChart({ data, color = T.accent, height = 32 }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.slice(-10).map((d, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 2,
          height: `${Math.max(4, (d.value / max) * height)}px`,
          background: i === data.slice(-10).length - 1 ? color : `${color}40`,
          transition: 'height 0.3s',
        }} />
      ))}
    </div>
  )
}

// ─── Quick action card ────────────────────────────────────────────────────────
function ActionCard({ emoji, label, sub, to, color, onClick }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()
  return (
    <div
      onClick={() => to ? navigate(to) : onClick?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.cardHi : T.card,
        border: `1px solid ${hovered ? T.borderHi : T.border}`,
        borderRadius: 16, padding: '16px', cursor: 'pointer',
        transition: 'all 0.18s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || T.text, marginBottom: 2, fontFamily: T.font }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.sub }}>{sub}</div>}
    </div>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, unit, color, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || T.text, lineHeight: 1, fontFamily: T.font }}>
        {value ?? '—'}
        {value != null && unit && <span style={{ fontSize: 13, fontWeight: 400, color: T.sub, marginLeft: 3 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10, color: T.sub, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function AthleteDashboardPage() {
  const { user, profile, gym } = useAuth()
  const navigate = useNavigate()

  const [hooper, setHooper]       = useState(null) // dernier log
  const [hoopers, setHoopers]     = useState([])   // 10 derniers
  const [compo, setCompo]         = useState(null) // dernière compo
  const [attendance, setAttendance] = useState([]) // présences semaine
  const [injuries, setInjuries]   = useState([])   // blessures actives
  const [nextMatch, setNextMatch] = useState(null)
  const [nextAppt, setNextAppt]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [todayDone, setTodayDone] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const gymName = gym?.name || 'Atlyo'

  const load = useCallback(async () => {
    setLoading(true)
    const uid = user.id

    // Trouver le coach
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
      supabase.from('hooper_logs').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(10),
      supabase.from('body_composition_logs').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(1),
      supabase.from('training_attendance').select('*').eq('athlete_id', uid)
        .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      supabase.from('medical_injuries').select('*').eq('athlete_id', uid).eq('status', 'active'),
      coachId ? supabase.from('match_history').select('*').eq('coach_id', coachId)
        .gte('match_date', today).order('match_date', { ascending: true }).limit(1) : { data: [] },
      supabase.from('medical_appointments').select('*').eq('athlete_id', uid)
        .gte('date_appointment', new Date().toISOString()).order('date_appointment', { ascending: true }).limit(1),
    ])

    const logs = hooperLogs || []
    const latest = logs[0] || null
    setHooper(latest)
    setHoopers(logs.reverse())
    setCompo(compoLogs?.[0] || null)
    setAttendance(attendanceLogs || [])
    setInjuries(injuriesData || [])
    setNextMatch(matches?.[0] || null)
    setNextAppt(appts?.[0] || null)
    setTodayDone(latest?.date === today)
    setLoading(false)
  }, [user.id, today])

  useEffect(() => { load() }, [load])

  // Données graphique HOOPER
  const hooperChartData = hoopers.map(h => ({
    value: (h.fatigue || 0) + (h.sommeil || 0) + (h.stress || 0) + (h.douleur || 0),
    date: h.date,
  }))

  const lastHooperScore = hooper
    ? (hooper.fatigue || 0) + (hooper.sommeil || 0) + (hooper.stress || 0) + (hooper.douleur || 0)
    : null

  const presencesWeek = attendance.filter(a => a.status === 'present' || a.status === 'present_blesse').length

  const firstName = (profile?.full_name || '').split(' ').pop() || 'Joueur'

  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.sub, fontFamily: T.body, letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' }}>
        Chargement...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.body, padding: 'clamp(16px, 3vw, 32px)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28, animation: 'fadeUp 0.4s ease both' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: T.sub, marginBottom: 10 }}>
            {gymName}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: T.font, fontSize: 'clamp(26px,5vw,40px)', fontWeight: 800, color: T.text, margin: 0, lineHeight: 1.1 }}>
                Bonjour, {firstName} 👋
              </h1>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
            </div>
            {/* Badge statut HOOPER */}
            {lastHooperScore !== null && (
              <div style={{
                padding: '8px 16px', borderRadius: 999,
                background: `${hooperColor(lastHooperScore)}18`,
                border: `1px solid ${hooperColor(lastHooperScore)}40`,
                color: hooperColor(lastHooperScore),
                fontSize: 13, fontWeight: 700,
              }}>
                {hooperLabel(lastHooperScore)} · HOOPER {lastHooperScore}/40
              </div>
            )}
          </div>
        </div>

        {/* ── Alerte HOOPER pas rempli ── */}
        {!todayDone && (
          <div
            onClick={() => navigate('/prep/hooper')}
            style={{
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              animation: 'fadeUp 0.4s ease 0.1s both',
            }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.yellow }}>HOOPER du jour non rempli</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Cliquez pour renseigner votre questionnaire de bien-être</div>
            </div>
            <div style={{ marginLeft: 'auto', color: T.yellow, fontSize: 18 }}>›</div>
          </div>
        )}

        {/* ── HOOPER + Compo ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* HOOPER card */}
          <div onClick={() => navigate('/prep/hooper')} style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 18,
            padding: '20px 22px', cursor: 'pointer', transition: 'all 0.18s',
            animation: 'fadeUp 0.4s ease 0.15s both',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.cardHi; e.currentTarget.style.borderColor = T.borderHi }}
            onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.border }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bien-être — HOOPER</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: hooperColor(lastHooperScore), fontFamily: T.font, lineHeight: 1 }}>
                  {lastHooperScore ?? '—'}
                  {lastHooperScore !== null && <span style={{ fontSize: 16, color: T.sub, fontWeight: 400 }}>/40</span>}
                </div>
              </div>
              <div style={{ fontSize: 11, color: T.sub }}>{hooper?.date ? new Date(hooper.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}</div>
            </div>
            {hooperChartData.length > 0 && <MiniChart data={hooperChartData} color={hooperColor(lastHooperScore)} height={36} />}
            {hooper && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { key: 'fatigue', label: 'Fatigue', emoji: '🔋' },
                  { key: 'sommeil', label: 'Sommeil', emoji: '😴' },
                  { key: 'stress', label: 'Stress', emoji: '🧠' },
                  { key: 'douleur', label: 'Douleur', emoji: '⚡' },
                ].map(f => (
                  <div key={f.key} style={{ fontSize: 11, color: T.sub }}>
                    {f.emoji} {hooper[f.key] ?? '—'}/10
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compo corporelle */}
          <div onClick={() => navigate('/prep/compo')} style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 18,
            padding: '20px 22px', cursor: 'pointer', transition: 'all 0.18s',
            animation: 'fadeUp 0.4s ease 0.2s both',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.cardHi; e.currentTarget.style.borderColor = T.borderHi }}
            onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.border }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Composition corporelle</div>
            {compo ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <StatPill label="Poids" value={compo.weight_kg} unit="kg" color={T.blue} />
                <StatPill label="Masse grasse" value={compo.body_fat_pct} unit="%" color={T.yellow} />
                <StatPill label="Masse maigre" value={compo.muscle_mass_kg} unit="kg" color={T.accent} />
              </div>
            ) : (
              <div style={{ fontSize: 13, color: T.sub, textAlign: 'center', padding: '20px 0' }}>
                Aucune mesure enregistrée
              </div>
            )}
            {compo && (
              <div style={{ fontSize: 11, color: T.dim, marginTop: 12 }}>
                Dernière mesure : {new Date(compo.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
            )}
          </div>
        </div>

        {/* ── Présences + Blessures + Prochain match ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* Présences semaine */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: '18px 20px', animation: 'fadeUp 0.4s ease 0.25s both' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Présences (7j)</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: presencesWeek >= 3 ? T.accent : T.yellow, fontFamily: T.font, lineHeight: 1, marginBottom: 4 }}>
              {presencesWeek}
              <span style={{ fontSize: 14, color: T.sub, fontWeight: 400 }}>/{attendance.length || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
              {attendance.slice(0, 7).map((a, i) => (
                <div key={i} style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: a.status === 'present' || a.status === 'present_blesse'
                    ? T.accent : a.status === 'absent_blesse' ? T.red : T.dim,
                }} />
              ))}
            </div>
            <div style={{ fontSize: 10, color: T.sub, marginTop: 6 }}>
              {attendance.length === 0 ? 'Aucune séance cette semaine' : 'Cette semaine'}
            </div>
          </div>

          {/* Statut médical */}
          <div style={{ background: injuries.length > 0 ? 'rgba(248,113,113,0.06)' : T.card, border: `1px solid ${injuries.length > 0 ? 'rgba(248,113,113,0.25)' : T.border}`, borderRadius: 18, padding: '18px 20px', animation: 'fadeUp 0.4s ease 0.3s both' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Statut médical</div>
            {injuries.length === 0 ? (
              <>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.accent, fontFamily: T.font, lineHeight: 1 }}>✓ Apte</div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 8 }}>Aucune blessure active</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.red, fontFamily: T.font, lineHeight: 1 }}>
                  {injuries.length} blessure{injuries.length > 1 ? 's' : ''}
                </div>
                {injuries[0] && (
                  <div style={{ fontSize: 11, color: T.red, marginTop: 8 }}>
                    {injuries[0].body_zone} · J+{Math.floor((Date.now() - new Date(injuries[0].date_injury).getTime()) / 86400000)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Prochain match */}
          <div onClick={() => navigate('/calendrier')} style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 18,
            padding: '18px 20px', cursor: 'pointer', transition: 'all 0.18s',
            animation: 'fadeUp 0.4s ease 0.35s both',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.cardHi; e.currentTarget.style.borderColor = T.borderHi }}
            onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.border }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Prochain match</div>
            {nextMatch ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4, lineHeight: 1.3 }}>
                  {nextMatch.label || `vs ${nextMatch.opponent}`}
                </div>
                <div style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>
                  {new Date(nextMatch.match_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                {nextMatch.location && <div style={{ fontSize: 10, color: T.sub, marginTop: 4 }}>📍 {nextMatch.location.split(',')[0]}</div>}
              </>
            ) : (
              <div style={{ fontSize: 13, color: T.sub }}>Aucun match planifié</div>
            )}
          </div>
        </div>

        {/* ── RDV médical ── */}
        {nextAppt && (
          <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 14, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeUp 0.4s ease 0.38s both' }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.blue }}>Prochain RDV médical</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 1 }}>
                {nextAppt.type} · {new Date(nextAppt.date_appointment).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {new Date(nextAppt.date_appointment).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {nextAppt.location && ` · ${nextAppt.location}`}
              </div>
            </div>
          </div>
        )}

        {/* ── Actions rapides ── */}
        <div style={{ marginBottom: 8, animation: 'fadeUp 0.4s ease 0.4s both' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Accès rapide</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <ActionCard emoji="🎯" label="HOOPER" sub={todayDone ? '✓ Rempli' : 'À remplir'} to="/prep/hooper" color={todayDone ? T.accent : T.yellow} />
            <ActionCard emoji="⚡" label="Charge interne" sub="RPE · Session" to="/prep/charge" />
            <ActionCard emoji="🏋️" label="TOPSET" sub="Séance du jour" to="/prep/topset" />
            <ActionCard emoji="📊" label="Compo" sub="Poids · MG · MM" to="/prep/compo" />
            <ActionCard emoji="📅" label="Calendrier" sub="Matchs · Planning" to="/calendrier" />
            <ActionCard emoji="✋" label="Ma présence" sub="Indiquer mon statut" to="/ma-presence" />
          </div>
        </div>

      </div>
    </div>
  )
}
