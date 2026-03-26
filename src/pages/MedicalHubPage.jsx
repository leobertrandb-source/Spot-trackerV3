import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import ImportICSModal from '../components/ImportICSModal'

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

const BODY_ZONES = {
  tete: 'Tête', epaule: 'Épaule', poignet: 'Poignet / Main',
  dos: 'Dos', genou: 'Genou', cheville: 'Cheville / Pied',
  lma: 'LMA', autre: 'Autre',
}

const APPT_TYPES = {
  medecin: 'Médecin', chirurgien: 'Chirurgien', irm: 'IRM',
  scanner: 'Scanner', radio: 'Radio', kine: 'Kiné', autre: 'Autre',
}

const ZONE_COLORS = {
  tete:     { color: '#7c3aed', bg: '#f3f0ff' },
  epaule:   { color: '#1d4ed8', bg: '#eff6ff' },
  poignet:  { color: '#0891b2', bg: '#ecfeff' },
  dos:      { color: '#b45309', bg: '#fffbeb' },
  genou:    { color: '#c0392b', bg: '#fdecea' },
  cheville: { color: '#be185d', bg: '#fdf2f8' },
  lma:      { color: '#065f46', bg: '#ecfdf5' },
  autre:    { color: P.sub,     bg: P.bg },
}

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 38, height: 38, borderRadius: '50%', background: P.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function RosterAvatar({ name, avatarUrl, size = 86 }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid #f5f3ef',
          background: '#f5f3ef',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: P.accent,
        color: '#fff',
        fontWeight: 900,
        fontSize: Math.max(22, Math.round(size * 0.3)),
      }}
    >
      {initials || '?'}
    </div>
  )
}

function normalizePoste(poste) {
  return (poste || '').trim() || 'Poste non renseigné'
}

function MedicalRosterTile({ athlete, onClick }) {
  const isFit = athlete.activeInjuries.length === 0
  const hasSurveillance = athlete.surveillance.length > 0
  const statusLabel = isFit ? 'Apte' : 'Inapte'
  const statusColor = isFit ? P.green : P.red
  const statusBg = isFit ? '#e8f5ee' : '#fdecea'
  const subStatus = isFit
    ? hasSurveillance
      ? 'Sous surveillance'
      : 'Disponible'
    : athlete.activeInjuries[0]
      ? BODY_ZONES[athlete.activeInjuries[0].body_zone] || 'Blessure en cours'
      : 'Blessure en cours'

  return (
    <button
      onClick={onClick}
      style={{
        border: `2px solid ${statusColor}`,
        background: '#ffffff',
        borderRadius: 24,
        padding: 18,
        cursor: 'pointer',
        minHeight: 214,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        boxShadow: isFit ? '0 12px 28px rgba(45,106,79,0.12)' : '0 12px 28px rgba(192,57,43,0.12)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <RosterAvatar
        name={athlete.full_name || athlete.email}
        avatarUrl={athlete.avatar_url}
      />

      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: P.text, lineHeight: 1.2 }}>
          {athlete.full_name || athlete.email}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: P.sub, fontWeight: 600 }}>
          {normalizePoste(athlete.poste)}
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            background: statusBg,
            color: statusColor,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: statusColor,
              display: 'inline-block',
            }}
          />
          {statusLabel}
        </div>
        <div style={{ marginTop: 10, minHeight: 18, fontSize: 12, color: isFit && hasSurveillance ? P.yellow : P.sub, fontWeight: 600 }}>
          {subStatus}
        </div>
      </div>
    </button>
  )
}

function Tab({ label, active, onClick, count, color }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
      border: `1px solid ${active ? P.accent : P.border}`,
      background: active ? P.accent : P.card,
      color: active ? '#fff' : P.text,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
          background: active ? 'rgba(255,255,255,0.2)' : (color ? color + '20' : P.bg),
          color: active ? '#fff' : (color || P.sub),
        }}>{count}</span>
      )}
    </button>
  )
}

function ZoneChart({ data }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count))
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 56 }}>
      {data.map(d => {
        const pct = max > 0 ? (d.count / max) * 100 : 0
        const zc = ZONE_COLORS[d.zone] || ZONE_COLORS.autre
        return (
          <div key={d.zone} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: zc.color }}>{d.count}</div>
            <div style={{ width: '100%', height: Math.max(4, pct * 0.38), background: zc.color, borderRadius: 3, opacity: 0.85 }} />
            <div style={{ fontSize: 9, color: P.sub, textAlign: 'center', lineHeight: 1.2 }}>
              {BODY_ZONES[d.zone]?.split(' ')[0] || d.zone}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function MedicalHubPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [athletes, setAthletes]         = useState([])
  const [injuries, setInjuries]         = useState([])
  const [appointments, setAppointments] = useState([])
  const [matches, setMatches]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState('infirmerie')

  // Match modal state
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showICSModal, setShowICSModal]     = useState(false)
  const [selectedMatch, setSelectedMatch]   = useState(null)
  const [matchForm, setMatchForm]           = useState({ label: '', match_date: new Date().toISOString().split('T')[0], opponent: '' })
  const [matchInjuries, setMatchInjuries]   = useState([])
  const [savingMatch, setSavingMatch]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    let coachId = user.id
    if (profile?.role === 'staff_medical') {
      const { data: link } = await supabase.from('club_staff').select('coach_id').eq('staff_id', user.id).maybeSingle()
      if (link?.coach_id) coachId = link.coach_id
    }

    const { data: links } = await supabase.from('coach_clients').select('client_id').eq('coach_id', coachId)
    if (!links?.length) { setLoading(false); return }
    const ids = links.map(l => l.client_id)

    const [{ data: profiles }, { data: inj }, { data: appts }, { data: mtch }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, poste, avatar_url').in('id', ids),
      supabase.from('medical_injuries').select('*').in('athlete_id', ids).order('date_injury', { ascending: false }),
      supabase.from('medical_appointments').select('*').in('athlete_id', ids)
        .order('date_appointment', { ascending: false }),
      supabase.from('match_history').select('*, match_injuries(*)').eq('coach_id', coachId).order('match_date', { ascending: false }),
    ])

    setAthletes(profiles || [])
    setInjuries(inj || [])
    setAppointments(appts || [])
    setMatches(mtch || [])
    setLoading(false)
  }, [user.id, profile?.role])

  useEffect(() => { load() }, [load])

  // ── Charger les blessures d'un match ────────────────────────────────────
  async function loadMatchInjuries(matchId) {
    const { data } = await supabase
      .from('match_injuries')
      .select('*, athlete:athlete_id(id, full_name, email)')
      .eq('match_id', matchId)
    setMatchInjuries(data || [])
  }

  // ── Créer un match ───────────────────────────────────────────────────────
  async function saveMatch() {
    setSavingMatch(true)
    const { data, error } = await supabase.from('match_history').insert({
      coach_id: user.id,
      label: matchForm.label || `Match du ${matchForm.match_date}`,
      match_date: matchForm.match_date,
      opponent: matchForm.opponent,
    }).select().single()
    setSavingMatch(false)
    if (!error && data) {
      setShowMatchModal(false)
      setMatchForm({ label: '', match_date: new Date().toISOString().split('T')[0], opponent: '' })
      load()
    }
  }

  // ── Supprimer un match ───────────────────────────────────────────────────
  async function deleteMatch(matchId) {
    if (!window.confirm('Supprimer ce match ?')) return
    await supabase.from('match_history').delete().eq('id', matchId)
    setSelectedMatch(null)
    load()
  }
  const active       = injuries.filter(i => i.status === 'active')
  const surveillance = injuries.filter(i => i.status === 'surveillance')

  const zoneCounts = Object.keys(BODY_ZONES)
    .map(zone => ({ zone, count: injuries.filter(i => i.body_zone === zone && i.status !== 'archive').length }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)

  const upcomingAppointments = appointments.filter(ap => new Date(ap.date_appointment) >= new Date())

  const athletesWithData = athletes.map(a => ({
    ...a,
    activeInjuries:  injuries.filter(i => i.athlete_id === a.id && i.status === 'active'),
    surveillance:    injuries.filter(i => i.athlete_id === a.id && i.status === 'surveillance'),
    archived:        injuries.filter(i => i.athlete_id === a.id && i.status === 'archive'),
    nextAppt:        upcomingAppointments.filter(ap => ap.athlete_id === a.id).sort((a,b) => new Date(a.date_appointment) - new Date(b.date_appointment))[0],
  }))

  const blesseActif     = athletesWithData.filter(a => a.activeInjuries.length > 0)
  const enSurveillance  = athletesWithData.filter(a => a.surveillance.length > 0 && a.activeInjuries.length === 0)
  const aptes           = athletesWithData.filter(a => a.activeInjuries.length === 0 && a.surveillance.length === 0)

  const groupedAthletes = athletesWithData.reduce((acc, athlete) => {
    const posteKey = normalizePoste(athlete.poste)
    if (!acc[posteKey]) acc[posteKey] = []
    acc[posteKey].push(athlete)
    return acc
  }, {})

  const orderedPostes = Object.keys(groupedAthletes)
    .sort((a, b) => {
      if (a === 'Poste non renseigné') return 1
      if (b === 'Poste non renseigné') return -1
      return a.localeCompare(b, 'fr')
    })

  const rosterGroups = orderedPostes.map(poste => ({
    poste,
    athletes: groupedAthletes[poste].sort((a, b) =>
      (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '', 'fr')
    ),
  }))

  const returns = active
    .filter(i => i.date_return)
    .sort((a, b) => new Date(a.date_return) - new Date(b.date_return))
    .slice(0, 5)
    .map(i => ({ ...i, athlete: athletes.find(a => a.id === i.athlete_id) }))

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", padding: 'clamp(20px,3vw,36px)' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>Module médical</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(26px,4vw,34px)', fontWeight: 400, color: P.text, margin: 0 }}>
            Médical
          </h1>
          <div style={{ fontSize: 13, color: P.sub, marginTop: 6, textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Effectif',       value: athletes.length,       color: P.text,   bg: P.card },
            { label: 'Blessés actifs', value: blesseActif.length,    color: blesseActif.length > 0 ? P.red : P.sub,    bg: blesseActif.length > 0 ? '#fdecea' : P.card },
            { label: 'Surveillance',   value: enSurveillance.length, color: enSurveillance.length > 0 ? P.yellow : P.sub, bg: enSurveillance.length > 0 ? '#fdf6e3' : P.card },
            { label: 'RDV à venir',    value: upcomingAppointments.length,   color: upcomingAppointments.length > 0 ? P.blue : P.sub,  bg: upcomingAppointments.length > 0 ? '#eef3ff' : P.card },
            { label: 'Aptes',          value: aptes.length,          color: P.green,  bg: '#e8f5ee' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${P.border}`, borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: P.sub, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <Tab label="🏥 Infirmerie"   active={tab === 'infirmerie'} onClick={() => setTab('infirmerie')} count={blesseActif.length} color={P.red} />
          <Tab label="👥 Effectif"     active={tab === 'effectif'}   onClick={() => setTab('effectif')}   count={athletes.length} />
          <Tab label="📅 RDV"          active={tab === 'rdv'}        onClick={() => setTab('rdv')}         count={appointments.length} color={P.blue} />
          <Tab label="🏉 Matchs"       active={tab === 'matchs'}     onClick={() => setTab('matchs')}      count={matches.length} />
          <Tab label="📊 Statistiques" active={tab === 'stats'}      onClick={() => setTab('stats')}       count={injuries.length} />
          <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 20, border: `1px solid ${P.border}`, background: 'transparent', color: P.sub, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>↻</button>
        </div>

        {/* ── TAB INFIRMERIE ── */}
        {tab === 'infirmerie' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
            <div>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>Chargement...</div>
              ) : blesseActif.length === 0 && enSurveillance.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>
                  ✓ Aucun blessé actif
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[...blesseActif, ...enSurveillance].map(athlete => (
                    <div key={athlete.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${P.border}` }}>
                        <Avatar name={athlete.full_name || athlete.email} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{athlete.full_name || athlete.email}</div>
                          <div style={{ fontSize: 12, color: P.sub, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {athlete.activeInjuries.length > 0 && <span style={{ color: P.red, fontWeight: 600 }}>🔴 {athlete.activeInjuries.length} blessure{athlete.activeInjuries.length > 1 ? 's' : ''}</span>}
                            {athlete.surveillance.length > 0 && athlete.activeInjuries.length === 0 && <span style={{ color: P.yellow, fontWeight: 600 }}>🟡 Surveillance</span>}
                            {athlete.nextAppt && <span style={{ color: P.blue }}>📅 RDV {new Date(athlete.nextAppt.date_appointment).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                          </div>
                        </div>
                        <button onClick={() => navigate(`/medical/${athlete.id}`)} style={{
                          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                          border: `1px solid ${P.accent}`, background: 'transparent', color: P.accent,
                        }}>Fiche →</button>
                      </div>
                      <div style={{ padding: '10px 18px', display: 'grid', gap: 8 }}>
                        {[...athlete.activeInjuries, ...athlete.surveillance].map(inj => {
                          const days = Math.floor((Date.now() - new Date(inj.date_injury).getTime()) / 86400000)
                          const zc = ZONE_COLORS[inj.body_zone] || ZONE_COLORS.autre
                          return (
                            <div key={inj.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: zc.color, background: zc.bg, flexShrink: 0, marginTop: 1 }}>
                                {BODY_ZONES[inj.body_zone] || inj.body_zone}
                              </div>
                              <div style={{ flex: 1 }}>
                                {inj.description && <div style={{ fontSize: 13, color: P.text, lineHeight: 1.5, marginBottom: 4 }}>{inj.description}</div>}
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: days <= 7 ? P.red : days <= 21 ? P.yellow : P.sub, padding: '2px 8px', borderRadius: 999, background: (days <= 7 ? P.red : days <= 21 ? P.yellow : P.sub) + '15' }}>J+{days}</span>
                                  <span style={{ fontSize: 11, color: P.dim }}>depuis le {new Date(inj.date_injury).toLocaleDateString('fr-FR')}</span>
                                  {inj.date_return && <span style={{ fontSize: 11, color: P.green, fontWeight: 600 }}>Retour : {new Date(inj.date_return).toLocaleDateString('fr-FR')}</span>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel droit */}
            <div style={{ display: 'grid', gap: 14 }}>
              {/* Stats zones */}
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Par zone</div>
                {zoneCounts.length === 0 ? (
                  <div style={{ fontSize: 13, color: P.sub, textAlign: 'center', padding: '12px 0' }}>Aucune blessure</div>
                ) : (
                  <>
                    <ZoneChart data={zoneCounts} />
                    <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                      {zoneCounts.map(d => {
                        const zc = ZONE_COLORS[d.zone] || ZONE_COLORS.autre
                        return (
                          <div key={d.zone} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: zc.color, flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 12, color: P.text }}>{BODY_ZONES[d.zone]}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: zc.color }}>{d.count}</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Retours prévus */}
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Retours prévus</div>
                {returns.length === 0 ? (
                  <div style={{ fontSize: 13, color: P.sub, textAlign: 'center', padding: '8px 0' }}>Aucun retour planifié</div>
                ) : returns.map(inj => {
                  const daysLeft = Math.ceil((new Date(inj.date_return) - Date.now()) / 86400000)
                  const color = daysLeft <= 3 ? P.green : daysLeft <= 10 ? P.yellow : P.sub
                  return (
                    <div key={inj.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Avatar name={inj.athlete?.full_name || inj.athlete?.email} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inj.athlete?.full_name || inj.athlete?.email}</div>
                        <div style={{ fontSize: 11, color: P.sub }}>{BODY_ZONES[inj.body_zone]} · {new Date(inj.date_return).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
                        {daysLeft <= 0 ? 'Aujourd\'hui' : `J-${daysLeft}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB EFFECTIF ── */}
        {tab === 'effectif' && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{
              background: P.card,
              border: `1px solid ${P.border}`,
              borderRadius: 18,
              padding: '18px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Effectif médical
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: P.text }}>
                  Vue trombinoscope rangée par poste, à partir des données renseignées à l'onboarding.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 999, background: '#e8f5ee',
                  color: P.green, fontSize: 12, fontWeight: 800,
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: P.green, display: 'inline-block' }} />
                  {aptes.length} aptes
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 999, background: '#fdecea',
                  color: P.red, fontSize: 12, fontWeight: 800,
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: P.red, display: 'inline-block' }} />
                  {blesseActif.length} inaptes
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, border: `1px solid ${P.border}`, borderRadius: 16 }}>
                Chargement...
              </div>
            ) : athletes.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, border: `1px solid ${P.border}`, borderRadius: 16 }}>
                Aucun athlète
              </div>
            ) : (
              rosterGroups.map(group => (
                <div key={group.poste} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: P.text }}>
                        {group.poste}
                      </div>
                      <div style={{ fontSize: 12, color: P.sub, marginTop: 4 }}>
                        {group.athletes.length} joueur{group.athletes.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: P.green, background: '#e8f5ee', borderRadius: 999, padding: '6px 10px' }}>
                        {group.athletes.filter(a => a.activeInjuries.length === 0).length} aptes
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: P.red, background: '#fdecea', borderRadius: 999, padding: '6px 10px' }}>
                        {group.athletes.filter(a => a.activeInjuries.length > 0).length} inaptes
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {group.athletes.map(athlete => (
                      <MedicalRosterTile
                        key={athlete.id}
                        athlete={athlete}
                        onClick={() => navigate(`/medical/${athlete.id}`)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB MATCHS ── */}
        {tab === 'matchs' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedMatch ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>

            {/* Liste matchs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.sub }}>{matches.length} match{matches.length > 1 ? 's' : ''} enregistré{matches.length > 1 ? 's' : ''}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowICSModal(true)} style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${P.accent}`, background: 'transparent', color: P.accent,
                  }}>📅 Import calendrier</button>
                  <button onClick={() => setShowMatchModal(true)} style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    border: 'none', background: P.accent, color: '#fff',
                  }}>+ Nouveau match</button>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>Chargement...</div>
              ) : matches.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>
                  Aucun match enregistré.<br/>
                  <span style={{ fontSize: 12 }}>Ajoutez un match pour y associer des blessures.</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {matches.map(match => {
                    const injCount = match.match_injuries?.length || 0
                    const d = new Date(match.match_date + 'T00:00:00')
                    const isSelected = selectedMatch?.id === match.id
                    return (
                      <div key={match.id}
                        onClick={() => { setSelectedMatch(isSelected ? null : match); loadMatchInjuries(match.id) }}
                        style={{
                          background: isSelected ? '#f0ede8' : P.card,
                          border: `1px solid ${isSelected ? P.accent : P.border}`,
                          borderRadius: 14, padding: '14px 18px',
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: 14,
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#faf8f4' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = P.card }}
                      >
                        {/* Date */}
                        <div style={{ background: isSelected ? P.accent : P.bg, border: `1px solid ${P.border}`, borderRadius: 10, padding: '8px 12px', textAlign: 'center', flexShrink: 0, minWidth: 52, transition: 'all 0.15s' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: isSelected ? '#fff' : P.text, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>{d.getDate()}</div>
                          <div style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.7)' : P.sub, fontWeight: 600, textTransform: 'uppercase' }}>{d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}</div>
                        </div>

                        {/* Infos */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {match.label || `Match du ${d.toLocaleDateString('fr-FR')}`}
                          </div>
                          {match.opponent && (
                            <div style={{ fontSize: 12, color: P.sub, marginTop: 2 }}>vs {match.opponent}</div>
                          )}
                        </div>

                        {/* Badge blessés */}
                        <div style={{
                          padding: '4px 12px', borderRadius: 999, flexShrink: 0,
                          background: injCount > 0 ? '#fdecea' : '#e8f5ee',
                          color: injCount > 0 ? P.red : P.green,
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {injCount > 0 ? `🩹 ${injCount}` : '✓ 0'}
                        </div>

                        <div style={{ color: P.sub, fontSize: 14 }}>{isSelected ? '▼' : '›'}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Détail match sélectionné */}
            {selectedMatch && (
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{selectedMatch.label}</div>
                    {selectedMatch.opponent && <div style={{ fontSize: 13, color: P.sub, marginTop: 2 }}>vs {selectedMatch.opponent}</div>}
                    <div style={{ fontSize: 12, color: P.dim, marginTop: 2 }}>
                      {new Date(selectedMatch.match_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <button onClick={() => deleteMatch(selectedMatch.id)} style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${P.red}20`, background: '#fdecea', color: P.red,
                  }}>Supprimer</button>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Blessures survenues
                </div>

                {matchInjuries.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: P.sub, fontSize: 13 }}>
                    Aucune blessure enregistrée pour ce match.<br/>
                    <span style={{ fontSize: 12 }}>Liez une blessure à ce match depuis la fiche médicale d'un joueur.</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {matchInjuries.map(mi => {
                      const zc = ZONE_COLORS[mi.body_zone] || ZONE_COLORS.autre
                      return (
                        <div key={mi.id}
                          onClick={() => navigate(`/medical/${mi.athlete?.id}`)}
                          style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: P.bg, cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#ede9e3'}
                          onMouseLeave={e => e.currentTarget.style.background = P.bg}
                        >
                          <Avatar name={mi.athlete?.full_name || mi.athlete?.email} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{mi.athlete?.full_name || mi.athlete?.email}</div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: zc.color, padding: '2px 8px', borderRadius: 999, background: zc.bg }}>
                                {BODY_ZONES[mi.body_zone] || mi.body_zone}
                              </span>
                              {mi.description && <span style={{ fontSize: 11, color: P.sub }}>{mi.description}</span>}
                            </div>
                          </div>
                          <div style={{ color: P.sub, fontSize: 13 }}>›</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal nouveau match */}
        {showICSModal && (
          <ImportICSModal
            onClose={() => setShowICSModal(false)}
            onImported={() => { setShowICSModal(false); load() }}
            teamName="Tyrosse"
          />
        )}
        {showMatchModal && (
          <div onClick={() => setShowMatchModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: P.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: P.text }}>Nouveau match</div>
                <button onClick={() => setShowMatchModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: P.sub }}>×</button>
              </div>

              {[
                { label: 'Date du match', type: 'date', key: 'match_date' },
                { label: 'Adversaire', type: 'text', key: 'opponent', placeholder: 'ex: Stade Montois' },
                { label: 'Libellé (optionnel)', type: 'text', key: 'label', placeholder: 'ex: UST vs Stade Montois' },
              ].map(({ label, type, key, placeholder }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: P.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
                  <input type={type} value={matchForm[key]} placeholder={placeholder}
                    onChange={e => setMatchForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: 10, color: P.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setShowMatchModal(false)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${P.border}`, background: 'transparent', color: P.sub }}>Annuler</button>
                <button onClick={saveMatch} disabled={savingMatch} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: P.accent, color: '#fff', opacity: savingMatch ? 0.7 : 1 }}>
                  {savingMatch ? 'Enregistrement...' : 'Créer le match'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB STATS ── */}
        {tab === 'stats' && (
          <div style={{ display: 'grid', gap: 16 }}>

            {/* Blessures par zone — barres horizontales */}
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 16 }}>Blessures par zone corporelle</div>
              {zoneCounts.length === 0 ? (
                <div style={{ fontSize: 13, color: P.sub, textAlign: 'center', padding: '20px 0' }}>Aucune donnée</div>
              ) : zoneCounts.map(d => {
                const zc = ZONE_COLORS[d.zone] || ZONE_COLORS.autre
                const total = injuries.filter(i => i.status !== 'archive').length
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
                return (
                  <div key={d.zone} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{BODY_ZONES[d.zone]}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: zc.color }}>{d.count} <span style={{ fontWeight: 400, color: P.sub }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 8, background: P.border, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: zc.color, borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Stats par joueur */}
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 16 }}>Blessures par joueur</div>
              {loading ? (
                <div style={{ fontSize: 13, color: P.sub, textAlign: 'center', padding: '20px 0' }}>Chargement...</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {athletesWithData
                    .map(a => ({
                      ...a,
                      total: injuries.filter(i => i.athlete_id === a.id).length,
                      actif: injuries.filter(i => i.athlete_id === a.id && i.status === 'active').length,
                    }))
                    .filter(a => a.total > 0)
                    .sort((a, b) => b.total - a.total)
                    .map(a => {
                      const maxTotal = Math.max(...athletesWithData.map(x => injuries.filter(i => i.athlete_id === x.id).length))
                      const pct = maxTotal > 0 ? Math.round((a.total / maxTotal) * 100) : 0
                      return (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                          onClick={() => navigate(`/medical/${a.id}`)}>
                          <Avatar name={a.full_name || a.email} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {a.full_name || a.email}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: a.actif > 0 ? P.red : P.sub, flexShrink: 0, marginLeft: 8 }}>
                                {a.total} blessure{a.total > 1 ? 's' : ''}
                                {a.actif > 0 && <span style={{ color: P.red }}> ({a.actif} active{a.actif > 1 ? 's' : ''})</span>}
                              </span>
                            </div>
                            <div style={{ height: 6, background: P.border, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: a.actif > 0 ? P.red : P.green, borderRadius: 3 }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Résumé global */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
              {[
                {
                  label: 'Total blessures',
                  value: injuries.length,
                  sub: 'depuis le début',
                  color: P.text,
                },
                {
                  label: 'Taux de blessure',
                  value: athletes.length > 0 ? `${Math.round((blesseActif.length / athletes.length) * 100)}%` : '—',
                  sub: 'de l\'effectif actuellement',
                  color: blesseActif.length > 0 ? P.red : P.green,
                },
                {
                  label: 'Durée moyenne',
                  value: (() => {
                    const archived = injuries.filter(i => i.status === 'archive' && i.date_return && i.date_injury)
                    if (!archived.length) return '—'
                    const avg = archived.reduce((sum, i) => {
                      return sum + Math.floor((new Date(i.date_return) - new Date(i.date_injury)) / 86400000)
                    }, 0) / archived.length
                    return `${Math.round(avg)}j`
                  })(),
                  sub: 'par blessure (archivées)',
                  color: P.blue,
                },
                {
                  label: 'Zone la + touchée',
                  value: zoneCounts[0] ? BODY_ZONES[zoneCounts[0].zone] : '—',
                  sub: zoneCounts[0] ? `${zoneCounts[0].count} cas` : 'aucune donnée',
                  color: zoneCounts[0] ? (ZONE_COLORS[zoneCounts[0].zone]?.color || P.sub) : P.sub,
                },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1, fontFamily: "'DM Serif Display', serif", marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 11, color: P.dim }}>{sub}</div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ── TAB RDV ── */}
        {tab === 'rdv' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>Chargement...</div>
            ) : appointments.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>Aucun rendez-vous</div>
            ) : appointments.map(appt => {
              const athlete = athletes.find(a => a.id === appt.athlete_id)
              const d = new Date(appt.date_appointment)
              const isToday = new Date().toDateString() === d.toDateString()
              return (
                <div key={appt.id} onClick={() => navigate(`/medical/${appt.athlete_id}`)}
                  style={{ background: P.card, border: `1px solid ${isToday ? P.blue : P.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#faf8f4'}
                  onMouseLeave={e => e.currentTarget.style.background = P.card}
                >
                  <div style={{ background: isToday ? '#eef3ff' : P.bg, border: `1px solid ${isToday ? '#b0c4f5' : P.border}`, borderRadius: 10, padding: '8px 12px', textAlign: 'center', flexShrink: 0, minWidth: 52 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: isToday ? P.blue : P.text, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>{d.getDate()}</div>
                    <div style={{ fontSize: 10, color: isToday ? P.blue : P.sub, fontWeight: 600, textTransform: 'uppercase' }}>{d.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{athlete?.full_name || athlete?.email || '—'}</span>
                      {isToday && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#eef3ff', color: P.blue }}>Aujourd'hui</span>}
                    </div>
                    <div style={{ fontSize: 13, color: P.sub }}>{APPT_TYPES[appt.type] || appt.type}{appt.location ? ` · ${appt.location}` : ''}</div>
                    {appt.notes && <div style={{ fontSize: 12, color: P.dim, marginTop: 4 }}>{appt.notes}</div>}
                    <div style={{ fontSize: 11, color: P.dim, marginTop: 4 }}>{d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ color: P.sub, fontSize: 16 }}>›</div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
