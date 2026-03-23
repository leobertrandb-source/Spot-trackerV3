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

function DaysChip({ days }) {
  const color = days <= 7 ? P.red : days <= 21 ? P.yellow : P.sub
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, padding: '2px 8px', borderRadius: 999, background: color + '15' }}>
      J+{days}
    </span>
  )
}

// Mini bar chart SVG
function ZoneChart({ data }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count))
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60, marginTop: 8 }}>
      {data.map(d => {
        const pct = max > 0 ? (d.count / max) * 100 : 0
        const zc = ZONE_COLORS[d.zone] || ZONE_COLORS.autre
        return (
          <div key={d.zone} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: zc.color }}>{d.count}</div>
            <div style={{ width: '100%', height: Math.max(4, pct * 0.44), background: zc.color, borderRadius: 3, opacity: 0.85 }} />
            <div style={{ fontSize: 9, color: P.sub, textAlign: 'center', lineHeight: 1.2 }}>
              {BODY_ZONES[d.zone]?.split(' ')[0] || d.zone}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function InfirmeriePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [athletes, setAthletes]         = useState([])
  const [injuries, setInjuries]         = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('active')

  const load = useCallback(async () => {
    setLoading(true)

    // Trouver le coach
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

  // ── Stats ────────────────────────────────────────────────────────────────
  const active       = injuries.filter(i => i.status === 'active')
  const surveillance = injuries.filter(i => i.status === 'surveillance')
  const archived     = injuries.filter(i => i.status === 'archive')

  // Stats par zone (blessures actives + surveillance)
  const zoneCounts = Object.keys(BODY_ZONES).map(zone => ({
    zone,
    count: injuries.filter(i => i.body_zone === zone && i.status !== 'archive').length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count)

  // Joueurs blessés enrichis
  const injuredAthletes = athletes
    .map(a => ({
      ...a,
      activeInjuries:  injuries.filter(i => i.athlete_id === a.id && i.status === 'active'),
      surveillance:    injuries.filter(i => i.athlete_id === a.id && i.status === 'surveillance'),
      archived:        injuries.filter(i => i.athlete_id === a.id && i.status === 'archive'),
      nextAppt:        appointments.find(ap => ap.athlete_id === a.id),
    }))
    .filter(a => a.activeInjuries.length > 0 || a.surveillance.length > 0)
    .sort((a, b) => b.activeInjuries.length - a.activeInjuries.length)

  const filtered = filter === 'active'
    ? injuredAthletes.filter(a => a.activeInjuries.length > 0)
    : filter === 'surveillance'
    ? injuredAthletes.filter(a => a.surveillance.length > 0)
    : injuredAthletes

  // Prochain retour
  const returns = active
    .filter(i => i.date_return)
    .sort((a, b) => new Date(a.date_return) - new Date(b.date_return))
    .slice(0, 5)
    .map(i => ({
      ...i,
      athlete: athletes.find(a => a.id === i.athlete_id),
    }))

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", padding: 'clamp(20px,3vw,36px)' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>
            Module médical
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(26px,4vw,36px)', fontWeight: 400, color: P.text, margin: 0 }}>
            Infirmerie
          </h1>
          <div style={{ fontSize: 13, color: P.sub, marginTop: 6, textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Blessés actifs',    value: active.length,                                      color: active.length > 0 ? P.red : P.sub,    bg: active.length > 0 ? '#fdecea' : P.bg },
            { label: 'Surveillance',      value: surveillance.length,                                color: surveillance.length > 0 ? P.yellow : P.sub, bg: surveillance.length > 0 ? '#fdf6e3' : P.bg },
            { label: 'RDV à venir',       value: appointments.length,                               color: appointments.length > 0 ? P.blue : P.sub,  bg: appointments.length > 0 ? '#eef3ff' : P.bg },
            { label: 'Retours prévus',    value: returns.length,                                     color: P.green,  bg: '#e8f5ee' },
            { label: 'Antécédents',       value: archived.length,                                    color: P.sub,    bg: P.bg },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* Colonne principale */}
          <div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { key: 'active',       label: `🔴 Actifs (${active.length})` },
                { key: 'surveillance', label: `🟡 Surveillance (${surveillance.length})` },
                { key: 'all',          label: `Tous (${injuredAthletes.length})` },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${filter === f.key ? P.accent : P.border}`,
                  background: filter === f.key ? P.accent : P.card,
                  color: filter === f.key ? '#fff' : P.text,
                }}>{f.label}</button>
              ))}
              <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 20, border: `1px solid ${P.border}`, background: 'transparent', color: P.sub, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>↻</button>
            </div>

            {/* Liste joueurs blessés */}
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>Chargement...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 16, border: `1px solid ${P.border}` }}>
                {filter === 'active' ? '✓ Aucun blessé actif' : 'Aucun joueur'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filtered.map(athlete => (
                  <div key={athlete.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden' }}>

                    {/* Header joueur */}
                    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${P.border}` }}>
                      <Avatar name={athlete.full_name || athlete.email} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{athlete.full_name || athlete.email}</div>
                        <div style={{ fontSize: 12, color: P.sub, marginTop: 2, display: 'flex', gap: 10 }}>
                          {athlete.activeInjuries.length > 0 && (
                            <span style={{ color: P.red, fontWeight: 600 }}>🔴 {athlete.activeInjuries.length} blessure{athlete.activeInjuries.length > 1 ? 's' : ''}</span>
                          )}
                          {athlete.surveillance.length > 0 && (
                            <span style={{ color: P.yellow, fontWeight: 600 }}>🟡 Surveillance</span>
                          )}
                          {athlete.nextAppt && (
                            <span style={{ color: P.blue }}>📅 RDV {new Date(athlete.nextAppt.date_appointment).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => navigate(`/medical/${athlete.id}`)} style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                        border: `1px solid ${P.accent}`, background: 'transparent', color: P.accent,
                      }}>
                        Fiche médicale →
                      </button>
                    </div>

                    {/* Blessures */}
                    <div style={{ padding: '10px 18px', display: 'grid', gap: 8 }}>
                      {[...athlete.activeInjuries, ...athlete.surveillance].map(inj => {
                        const days = Math.floor((Date.now() - new Date(inj.date_injury).getTime()) / 86400000)
                        const zc = ZONE_COLORS[inj.body_zone] || ZONE_COLORS.autre
                        const isActive = inj.status === 'active'
                        return (
                          <div key={inj.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: zc.color, background: zc.bg, flexShrink: 0, marginTop: 1 }}>
                              {BODY_ZONES[inj.body_zone] || inj.body_zone}
                            </div>
                            <div style={{ flex: 1 }}>
                              {inj.description && (
                                <div style={{ fontSize: 13, color: P.text, lineHeight: 1.5, marginBottom: 4 }}>{inj.description}</div>
                              )}
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                <DaysChip days={days} />
                                <span style={{ fontSize: 11, color: P.dim }}>depuis le {new Date(inj.date_injury).toLocaleDateString('fr-FR')}</span>
                                {inj.date_return && (
                                  <span style={{ fontSize: 11, color: P.green, fontWeight: 600 }}>
                                    Retour estimé : {new Date(inj.date_return).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                                {!isActive && (
                                  <span style={{ fontSize: 11, color: P.yellow, fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: '#fdf6e3' }}>Surveillance</span>
                                )}
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

          {/* Colonne droite */}
          <div style={{ display: 'grid', gap: 16 }}>

            {/* Stats par zone */}
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Blessures par zone</div>
              {zoneCounts.length === 0 ? (
                <div style={{ fontSize: 13, color: P.sub, padding: '16px 0', textAlign: 'center' }}>Aucune blessure active</div>
              ) : (
                <>
                  <ZoneChart data={zoneCounts} />
                  <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                    {zoneCounts.map(d => {
                      const zc = ZONE_COLORS[d.zone] || ZONE_COLORS.autre
                      const pct = active.length > 0 ? Math.round((d.count / active.length) * 100) : 0
                      return (
                        <div key={d.zone} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: zc.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, fontSize: 12, color: P.text }}>{BODY_ZONES[d.zone]}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: zc.color }}>{d.count}</div>
                          <div style={{ fontSize: 11, color: P.sub }}>{pct}%</div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Retours à venir */}
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Retours prévus
              </div>
              {returns.length === 0 ? (
                <div style={{ fontSize: 13, color: P.sub, textAlign: 'center', padding: '12px 0' }}>Aucun retour planifié</div>
              ) : returns.map(inj => {
                const daysLeft = Math.ceil((new Date(inj.date_return) - Date.now()) / 86400000)
                const color = daysLeft <= 3 ? P.green : daysLeft <= 10 ? P.yellow : P.sub
                return (
                  <div key={inj.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Avatar name={inj.athlete?.full_name || inj.athlete?.email} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inj.athlete?.full_name || inj.athlete?.email}
                      </div>
                      <div style={{ fontSize: 11, color: P.sub }}>
                        {BODY_ZONES[inj.body_zone]} · {new Date(inj.date_return).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
                      {daysLeft <= 0 ? 'Aujourd\'hui' : `J-${daysLeft}`}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* RDV à venir */}
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Prochains RDV
              </div>
              {appointments.length === 0 ? (
                <div style={{ fontSize: 13, color: P.sub, textAlign: 'center', padding: '12px 0' }}>Aucun RDV à venir</div>
              ) : appointments.slice(0, 5).map(appt => {
                const athlete = athletes.find(a => a.id === appt.athlete_id)
                const d = new Date(appt.date_appointment)
                return (
                  <div key={appt.id} onClick={() => navigate(`/medical/${appt.athlete_id}`)}
                    style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ background: '#eef3ff', borderRadius: 8, padding: '6px 10px', textAlign: 'center', flexShrink: 0, minWidth: 40 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: P.blue, lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>{d.getDate()}</div>
                      <div style={{ fontSize: 9, color: P.blue, fontWeight: 600, textTransform: 'uppercase' }}>{d.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {athlete?.full_name || athlete?.email || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: P.sub }}>{APPT_TYPES[appt.type] || appt.type}{appt.location ? ` · ${appt.location}` : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
