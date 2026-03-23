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
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState('infirmerie')

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

    const [{ data: profiles }, { data: inj }, { data: appts }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').in('id', ids),
      supabase.from('medical_injuries').select('*').in('athlete_id', ids).order('date_injury', { ascending: false }),
      supabase.from('medical_appointments').select('*').in('athlete_id', ids)
        .gte('date_appointment', new Date().toISOString())
        .order('date_appointment', { ascending: true }),
    ])

    setAthletes(profiles || [])
    setInjuries(inj || [])
    setAppointments(appts || [])
    setLoading(false)
  }, [user.id, profile?.role])

  useEffect(() => { load() }, [load])

  // ── Données calculées ────────────────────────────────────────────────────
  const active       = injuries.filter(i => i.status === 'active')
  const surveillance = injuries.filter(i => i.status === 'surveillance')

  const zoneCounts = Object.keys(BODY_ZONES)
    .map(zone => ({ zone, count: injuries.filter(i => i.body_zone === zone && i.status !== 'archive').length }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)

  const athletesWithData = athletes.map(a => ({
    ...a,
    activeInjuries:  injuries.filter(i => i.athlete_id === a.id && i.status === 'active'),
    surveillance:    injuries.filter(i => i.athlete_id === a.id && i.status === 'surveillance'),
    archived:        injuries.filter(i => i.athlete_id === a.id && i.status === 'archive'),
    nextAppt:        appointments.find(ap => ap.athlete_id === a.id),
  }))

  const blesseActif     = athletesWithData.filter(a => a.activeInjuries.length > 0)
  const enSurveillance  = athletesWithData.filter(a => a.surveillance.length > 0 && a.activeInjuries.length === 0)
  const aptes           = athletesWithData.filter(a => a.activeInjuries.length === 0 && a.surveillance.length === 0)

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
            { label: 'RDV à venir',    value: appointments.length,   color: appointments.length > 0 ? P.blue : P.sub,  bg: appointments.length > 0 ? '#eef3ff' : P.card },
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
          <Tab label="🏥 Infirmerie"  active={tab === 'infirmerie'} onClick={() => setTab('infirmerie')} count={blesseActif.length} color={P.red} />
          <Tab label="👥 Effectif"    active={tab === 'effectif'}   onClick={() => setTab('effectif')}   count={athletes.length} />
          <Tab label="📅 RDV"         active={tab === 'rdv'}        onClick={() => setTab('rdv')}         count={appointments.length} color={P.blue} />
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
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 80px', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${P.border}`, background: '#faf8f4' }}>
              {['Joueur', 'Statut', 'Prochain RDV', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: P.sub }}>{h}</div>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub }}>Chargement...</div>
            ) : athletes.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub }}>Aucun athlète</div>
            ) : athletesWithData.map((athlete, i) => {
              const hasActive = athlete.activeInjuries.length > 0
              const hasSurv = athlete.surveillance.length > 0
              const statusColor = hasActive ? P.red : hasSurv ? P.yellow : P.green
              const statusLabel = hasActive ? `${athlete.activeInjuries.length} blessure${athlete.activeInjuries.length > 1 ? 's' : ''}` : hasSurv ? 'Surveillance' : 'Apte'
              const statusBg = hasActive ? '#fdecea' : hasSurv ? '#fdf6e3' : '#e8f5ee'
              const isLast = i === athletesWithData.length - 1

              return (
                <div key={athlete.id} onClick={() => navigate(`/medical/${athlete.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 80px', gap: 12, padding: '14px 20px', borderBottom: isLast ? 'none' : `1px solid ${P.border}`, cursor: 'pointer', background: P.card, alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#faf8f4'}
                  onMouseLeave={e => e.currentTarget.style.background = P.card}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                    <Avatar name={athlete.full_name || athlete.email} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athlete.full_name || athlete.email}</div>
                      {athlete.activeInjuries[0] && (
                        <div style={{ fontSize: 11, color: P.red, marginTop: 2 }}>{BODY_ZONES[athlete.activeInjuries[0].body_zone]}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '4px 10px', borderRadius: 20, background: statusBg, fontSize: 11, fontWeight: 700, color: statusColor, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {statusLabel}
                  </div>
                  <div style={{ fontSize: 12, color: athlete.nextAppt ? P.blue : P.dim }}>
                    {athlete.nextAppt ? new Date(athlete.nextAppt.date_appointment).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                  </div>
                  <div style={{ color: P.sub, fontSize: 14, textAlign: 'right' }}>›</div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── TAB RDV ── */}
        {tab === 'rdv' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>Chargement...</div>
            ) : appointments.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>Aucun RDV à venir</div>
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
