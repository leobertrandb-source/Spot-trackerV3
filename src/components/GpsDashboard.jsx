// src/components/GpsDashboard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Design tokens (palette claire CoachPage_ProSport) ────────────────────────
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
  teal:   '#1a5c52',
}

const SPEED_COLORS = {
  lent:    '#3ecf8e',
  modere:  '#fbbf24',
  rapide:  '#ff7043',
  sprint:  '#ff4566',
}
const SPEED_LABELS = {
  lent:    'Lent',
  modere:  'Modéré',
  rapide:  'Rapide',
  sprint:  'Sprint',
}

// ─── Mini sparkline SVG ───────────────────────────────────────────────────────
function Sparkline({ data, color = P.green, h = 50 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 0.01)
  const min = Math.min(...data)
  const range = max - min || 0.01
  const W = 100, pad = 6
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width: '100%', display: 'block' }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.split(' ').map((pt, i) => {
        const [x, y] = pt.split(',').map(Number)
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      })}
    </svg>
  )
}

// ─── Graphe ligne simple ──────────────────────────────────────────────────────
function LineChart({ data, color = P.green, unit = '', h = 100 }) {
  if (!data || data.length < 2) return (
    <div style={{ height: h, display: 'grid', placeItems: 'center', color: P.dim, fontSize: 12 }}>
      Pas assez de données
    </div>
  )
  const vals = data.map(d => d.value)
  const max = Math.max(...vals), min = Math.min(...vals)
  const range = max - min || 0.01
  const W = 100, pad = { t: 10, r: 8, b: 20, l: 36 }
  const iW = W - pad.l - pad.r, iH = h - pad.t - pad.b
  const x = i => pad.l + (i / (data.length - 1)) * iW
  const y = v => pad.t + iH - ((v - min) / range) * iH
  const pts = data.map((d, i) => [x(i), y(d.value)])
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length-1][0].toFixed(1)} ${(pad.t+iH).toFixed(1)} L ${pts[0][0].toFixed(1)} ${(pad.t+iH).toFixed(1)} Z`
  const ticks = [0, 0.5, 1].map(r => min + range * r)
  const xLabels = data.length <= 5
    ? data.map((d, i) => ({ i, label: d.label }))
    : [0, Math.floor(data.length/2), data.length-1].map(i => ({ i, label: data[i].label }))
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width: '100%', height: h, display: 'block' }}>
      <defs>
        <linearGradient id={`g-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y(v).toFixed(1)} x2={W-pad.r} y2={y(v).toFixed(1)} stroke={P.border} strokeWidth="0.8" />
          <text x={pad.l-3} y={(y(v)+3).toFixed(1)} textAnchor="end" fontSize="6" fill={P.dim} fontFamily="DM Sans,sans-serif">
            {Math.round(v*10)/10}
          </text>
        </g>
      ))}
      <path d={areaD} fill={`url(#g-${color.replace('#','')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="2.5" fill={P.card} stroke={color} strokeWidth="1.5" />)}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={x(i).toFixed(1)} y={h-4} textAnchor="middle" fontSize="6" fill={P.sub} fontFamily="DM Sans,sans-serif">
          {label}
        </text>
      ))}
    </svg>
  )
}

// ─── Barre bandes de vitesse ──────────────────────────────────────────────────
function SpeedBandBar({ bands }) {
  if (!bands) return null
  const keys = ['lent', 'modere', 'rapide', 'sprint']
  const total = keys.reduce((s, k) => s + (parseFloat(bands[k]) || 0), 0)
  if (!total) return null
  return (
    <div>
      <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
        {keys.map(k => {
          const pct = ((parseFloat(bands[k]) || 0) / total) * 100
          return pct > 0 ? (
            <div key={k} style={{ width: `${pct}%`, background: SPEED_COLORS[k] }} title={`${SPEED_LABELS[k]}: ${bands[k]}km`} />
          ) : null
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {keys.filter(k => parseFloat(bands[k]) > 0).map(k => (
          <span key={k} style={{ fontSize: 11, color: SPEED_COLORS[k], fontWeight: 600 }}>
            {SPEED_LABELS[k]} {Math.round(parseFloat(bands[k])*100)/100}km
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, unit, color = P.accent }) {
  return (
    <div style={{ padding: '10px 14px', background: P.bg, borderRadius: 10, border: `1px solid ${P.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>
        {value ?? '—'}{value != null ? <span style={{ fontSize: 11, color: P.sub, marginLeft: 3, fontWeight: 400, fontFamily: 'inherit' }}>{unit}</span> : ''}
      </div>
    </div>
  )
}

// ─── Détail d'une session ─────────────────────────────────────────────────────
function SessionDetail({ session, onClose }) {
  const raw = session.raw_payload || {}
  const bands = raw.speed_bands || null
  const date = session.session_date
    ? new Date(session.session_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.card, borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{session.player_name || '—'}</div>
            <div style={{ fontSize: 13, color: P.sub, marginTop: 3, textTransform: 'capitalize' }}>{date}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${P.border}`, background: P.bg, color: P.sub, fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
        </div>

        {/* Stats */}
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))', gap: 10 }}>
          <StatPill label="Distance" value={session.distance_km != null ? Math.round(session.distance_km*100)/100 : null} unit="km" color={P.green} />
          <StatPill label="Durée" value={session.duration_min != null ? Math.round(session.duration_min) : null} unit="min" color={P.blue} />
          <StatPill label="Top Speed" value={session.top_speed != null ? Math.round(session.top_speed*10)/10 : null} unit="km/h" color={P.red} />
          <StatPill label="Énergie" value={session.energy != null ? Math.round(session.energy) : null} unit="kcal" color={P.yellow} />
          <StatPill label="Impacts" value={session.impacts} color={P.teal} />
        </div>

        {/* Bandes de vitesse */}
        {bands && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Bandes de vitesse</div>
            <SpeedBandBar bands={bands} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: 8, marginTop: 12 }}>
              {['lent', 'modere', 'rapide', 'sprint'].filter(k => parseFloat(bands[k]) > 0).map(k => (
                <div key={k} style={{ padding: '8px 10px', background: `${SPEED_COLORS[k]}10`, borderRadius: 8, border: `1px solid ${SPEED_COLORS[k]}25`, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: SPEED_COLORS[k], fontWeight: 700, marginBottom: 4 }}>{SPEED_LABELS[k]}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: SPEED_COLORS[k], fontFamily: "'DM Serif Display', serif" }}>
                    {Math.round(parseFloat(bands[k])*100)/100}<span style={{ fontSize: 10 }}> km</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Infos source */}
        <div style={{ padding: '12px 24px 20px', borderTop: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 11, color: P.dim, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>📡 {session.provider || 'PlayerTek'}</span>
            {session.external_id && <span>ID : {session.external_id}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Fiche athlète GPS ────────────────────────────────────────────────────────
function AthleteGpsView({ athleteId, athleteName, sessions, onBack }) {
  const [selectedSession, setSelectedSession] = useState(null)

  const sorted = useMemo(() => [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date)), [sessions])

  const distSeries = sorted.filter(s => s.distance_km).map(s => ({
    value: parseFloat(s.distance_km),
    label: new Date(s.session_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
  }))
  const speedSeries = sorted.filter(s => s.top_speed).map(s => ({
    value: parseFloat(s.top_speed),
    label: new Date(s.session_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
  }))

  const avgDist  = sessions.filter(s => s.distance_km).reduce((s, r) => s + parseFloat(r.distance_km), 0) / (sessions.filter(s => s.distance_km).length || 1)
  const maxSpeed = Math.max(...sessions.filter(s => s.top_speed).map(s => parseFloat(s.top_speed)), 0)
  const totalKm  = sessions.filter(s => s.distance_km).reduce((s, r) => s + parseFloat(r.distance_km), 0)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Nav */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: P.sub, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', padding: 0 }}>
        ← Retour
      </button>

      {/* Header athlète */}
      <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '18px 20px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: P.text, fontFamily: "'DM Serif Display', serif", marginBottom: 4 }}>{athleteName}</div>
        <div style={{ fontSize: 13, color: P.sub }}>{sessions.length} session{sessions.length > 1 ? 's' : ''} GPS enregistrée{sessions.length > 1 ? 's' : ''}</div>
      </div>

      {/* Stats globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10 }}>
        <StatPill label="Total km" value={Math.round(totalKm*10)/10} unit="km" color={P.green} />
        <StatPill label="Dist. moy." value={Math.round(avgDist*10)/10} unit="km" color={P.blue} />
        <StatPill label="Top Speed max" value={Math.round(maxSpeed*10)/10} unit="km/h" color={P.red} />
        <StatPill label="Sessions" value={sessions.length} color={P.accent} />
      </div>

      {/* Graphes évolution */}
      {distSeries.length >= 2 && (
        <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Évolution distance (km)</div>
          <LineChart data={distSeries} color={P.green} unit=" km" h={110} />
        </div>
      )}

      {speedSeries.length >= 2 && (
        <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Évolution top speed (km/h)</div>
          <LineChart data={speedSeries} color={P.red} unit=" km/h" h={110} />
        </div>
      )}

      {/* Liste sessions */}
      <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${P.border}`, fontSize: 13, fontWeight: 700, color: P.text }}>
          Toutes les sessions
        </div>
        {[...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date)).map(s => {
          const bands = s.raw_payload?.speed_bands
          const hasBands = bands && Object.values(bands).some(v => parseFloat(v) > 0)
          return (
            <div key={s.id} onClick={() => setSelectedSession(s)}
              style={{ padding: '14px 20px', borderBottom: `1px solid ${P.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = P.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: hasBands ? 10 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>
                    {new Date(s.session_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 11, color: P.sub, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {s.distance_km != null && <span>📍 {Math.round(parseFloat(s.distance_km)*10)/10} km</span>}
                    {s.duration_min != null && <span>⏱ {Math.round(parseFloat(s.duration_min))} min</span>}
                    {s.top_speed != null && <span>⚡ {Math.round(parseFloat(s.top_speed)*10)/10} km/h</span>}
                    {s.impacts != null && <span>💥 {s.impacts} impacts</span>}
                  </div>
                </div>
                <span style={{ fontSize: 16, color: P.dim }}>›</span>
              </div>
              {hasBands && <SpeedBandBar bands={bands} />}
            </div>
          )
        })}
      </div>

      {selectedSession && <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  )
}

// ─── Composant principal — Dashboard GPS ──────────────────────────────────────
export default function GpsDashboard({ coachId }) {
  const [sessions, setSessions] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState(null) // { id, name }
  const [selectedSession, setSelectedSession] = useState(null)
  const [filterPeriod, setFilterPeriod] = useState('30') // jours

  const load = useCallback(async () => {
    if (!coachId) return
    setLoading(true)

    const since = new Date()
    since.setDate(since.getDate() - (parseInt(filterPeriod) || 9999))
    const sinceStr = filterPeriod === 'all' ? null : since.toISOString().split('T')[0]

    let query = supabase
      .from('gps_sessions')
      .select('*')
      .eq('coach_id', coachId)
      .order('session_date', { ascending: false })

    if (sinceStr) query = query.gte('session_date', sinceStr)

    const { data: sess } = await query
    setSessions(sess || [])

    // Charger les profils des athlètes
    const athleteIds = [...new Set((sess || []).map(s => s.athlete_id).filter(Boolean))]
    if (athleteIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', athleteIds)
      setProfiles(profs || [])
    }

    setLoading(false)
  }, [coachId, filterPeriod])

  useEffect(() => { load() }, [load])

  const athleteName = (id) => {
    const p = profiles.find(p => p.id === id)
    return p?.full_name || p?.email || 'Athlète inconnu'
  }

  // Grouper par athlète
  const byAthlete = useMemo(() => {
    const map = {}
    for (const s of sessions) {
      if (!s.athlete_id) continue
      if (!map[s.athlete_id]) map[s.athlete_id] = []
      map[s.athlete_id].push(s)
    }
    return map
  }, [sessions])

  // Stats globales
  const totalKm    = sessions.filter(s => s.distance_km).reduce((t, s) => t + parseFloat(s.distance_km), 0)
  const maxSpeed   = Math.max(...sessions.filter(s => s.top_speed).map(s => parseFloat(s.top_speed)), 0)
  const nbAthletes = Object.keys(byAthlete).length

  // Série distance globale (par date)
  const distByDate = useMemo(() => {
    const map = {}
    for (const s of sessions) {
      if (!s.distance_km) continue
      map[s.session_date] = (map[s.session_date] || 0) + parseFloat(s.distance_km)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({
      value: Math.round(value * 10) / 10,
      label: new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    }))
  }, [sessions])

  if (selectedAthlete) {
    return (
      <AthleteGpsView
        athleteId={selectedAthlete.id}
        athleteName={selectedAthlete.name}
        sessions={byAthlete[selectedAthlete.id] || []}
        onBack={() => setSelectedAthlete(null)}
      />
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* Header + filtre période */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>Dashboard GPS</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ k: '7', l: '7j' }, { k: '30', l: '30j' }, { k: '90', l: '3 mois' }, { k: 'all', l: 'Tout' }].map(({ k, l }) => (
            <button key={k} onClick={() => setFilterPeriod(k)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${filterPeriod === k ? P.accent : P.border}`,
              background: filterPeriod === k ? P.accent : P.card,
              color: filterPeriod === k ? '#fff' : P.sub,
            }}>{l}</button>
          ))}
          <button onClick={load} style={{ padding: '5px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${P.border}`, background: 'transparent', color: P.sub }}>↻</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: P.sub }}>Chargement...</div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: P.sub, background: P.card, borderRadius: 14, border: `1px solid ${P.border}` }}>
          Aucune session GPS importée sur cette période.<br />
          <span style={{ fontSize: 12 }}>Utilise le bouton "Import GPS" pour commencer.</span>
        </div>
      ) : (
        <>
          {/* Stats globales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10 }}>
            <StatPill label="Sessions" value={sessions.length} color={P.accent} />
            <StatPill label="Athlètes" value={nbAthletes} color={P.blue} />
            <StatPill label="Total km" value={Math.round(totalKm*10)/10} unit="km" color={P.green} />
            <StatPill label="Top Speed max" value={Math.round(maxSpeed*10)/10} unit="km/h" color={P.red} />
          </div>

          {/* Graphe distance globale */}
          {distByDate.length >= 2 && (
            <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                Distance totale par jour (km)
              </div>
              <LineChart data={distByDate} color={P.green} unit=" km" h={100} />
            </div>
          )}

          {/* Par athlète */}
          <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${P.border}`, fontSize: 13, fontWeight: 700, color: P.text }}>
              Par athlète
            </div>
            {Object.entries(byAthlete)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([athId, athSessions]) => {
                const name = athleteName(athId)
                const totalKmAth = athSessions.filter(s => s.distance_km).reduce((t, s) => t + parseFloat(s.distance_km), 0)
                const lastSession = athSessions.sort((a, b) => b.session_date.localeCompare(a.session_date))[0]
                const distSpark = athSessions
                  .filter(s => s.distance_km)
                  .sort((a, b) => a.session_date.localeCompare(b.session_date))
                  .map(s => parseFloat(s.distance_km))

                return (
                  <div key={athId}
                    onClick={() => setSelectedAthlete({ id: athId, name })}
                    style={{ padding: '14px 20px', borderBottom: `1px solid ${P.border}`, cursor: 'pointer', transition: 'background 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
                    onMouseEnter={e => e.currentTarget.style.background = P.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: P.text, marginBottom: 4 }}>{name}</div>
                      <div style={{ fontSize: 11, color: P.sub, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>{athSessions.length} session{athSessions.length > 1 ? 's' : ''}</span>
                        <span>📍 {Math.round(totalKmAth*10)/10} km total</span>
                        {lastSession && <span>Dernière : {new Date(lastSession.session_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <Sparkline data={distSpark} color={P.green} h={35} />
                    </div>
                    <span style={{ color: P.dim, fontSize: 16, flexShrink: 0 }}>›</span>
                  </div>
                )
              })}
          </div>

          {/* Dernières sessions toutes confondues */}
          <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${P.border}`, fontSize: 13, fontWeight: 700, color: P.text }}>
              Dernières sessions
            </div>
            {sessions.slice(0, 10).map(s => {
              const bands = s.raw_payload?.speed_bands
              const hasBands = bands && Object.values(bands).some(v => parseFloat(v) > 0)
              return (
                <div key={s.id} onClick={() => setSelectedSession(s)}
                  style={{ padding: '12px 20px', borderBottom: `1px solid ${P.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = P.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: hasBands ? 8 : 0 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{s.player_name || athleteName(s.athlete_id)}</div>
                      <div style={{ fontSize: 11, color: P.sub, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>{new Date(s.session_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        {s.distance_km != null && <span>📍 {Math.round(parseFloat(s.distance_km)*10)/10} km</span>}
                        {s.top_speed != null && <span>⚡ {Math.round(parseFloat(s.top_speed)*10)/10} km/h</span>}
                        {s.duration_min != null && <span>⏱ {Math.round(parseFloat(s.duration_min))} min</span>}
                      </div>
                    </div>
                    <span style={{ color: P.dim, fontSize: 16 }}>›</span>
                  </div>
                  {hasBands && <SpeedBandBar bands={bands} />}
                </div>
              )
            })}
          </div>
        </>
      )}

      {selectedSession && <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  )
}
