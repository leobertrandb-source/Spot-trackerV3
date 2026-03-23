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

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 38, height: 38, borderRadius: '50%', background: P.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function MedicalDashboardPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [athletes, setAthletes]         = useState([])
  const [injuries, setInjuries]         = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('all')

  const load = useCallback(async () => {
    setLoading(true)

    // Trouver le coach lié à ce staff médical
    const { data: staffLink } = await supabase
      .from('club_staff')
      .select('coach_id')
      .eq('staff_id', user.id)
      .maybeSingle()

    // Si c'est un coach lui-même, il utilise son propre id
    const coachId = profile?.role === 'coach' ? user.id : staffLink?.coach_id

    if (!coachId) {
      setLoading(false)
      return
    }

    // Récupérer tous les athlètes du coach
    const { data: links } = await supabase
      .from('coach_clients')
      .select('client_id')
      .eq('coach_id', coachId)

    if (!links?.length) { setLoading(false); return }
    const ids = links.map(l => l.client_id)

    const [
      { data: profiles },
      { data: inj },
      { data: appts },
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').in('id', ids),
      supabase.from('medical_injuries').select('*').in('athlete_id', ids).in('status', ['active', 'surveillance']).order('date_injury', { ascending: false }),
      supabase.from('medical_appointments').select('*').in('athlete_id', ids).gte('date_appointment', new Date().toISOString()).order('date_appointment', { ascending: true }),
    ])

    setAthletes(profiles || [])
    setInjuries(inj || [])
    setAppointments(appts || [])
    setLoading(false)
  }, [user.id, profile?.role])

  useEffect(() => { load() }, [load])

  // Enrichir les athlètes avec leurs blessures
  const athletesWithData = athletes.map(a => ({
    ...a,
    activeInjuries:  injuries.filter(i => i.athlete_id === a.id && i.status === 'active'),
    surveillance:    injuries.filter(i => i.athlete_id === a.id && i.status === 'surveillance'),
    nextAppt:        appointments.find(ap => ap.athlete_id === a.id),
  })).sort((a, b) => b.activeInjuries.length - a.activeInjuries.length)

  const filtered = filter === 'blesse'       ? athletesWithData.filter(a => a.activeInjuries.length > 0)
    : filter === 'surveillance' ? athletesWithData.filter(a => a.surveillance.length > 0 && a.activeInjuries.length === 0)
    : filter === 'ok'           ? athletesWithData.filter(a => a.activeInjuries.length === 0 && a.surveillance.length === 0)
    : athletesWithData

  const totalBlesseActif    = athletesWithData.filter(a => a.activeInjuries.length > 0).length
  const totalSurveillance   = athletesWithData.filter(a => a.surveillance.length > 0 && a.activeInjuries.length === 0).length
  const totalOk             = athletesWithData.filter(a => a.activeInjuries.length === 0 && a.surveillance.length === 0).length
  const nextAppts           = appointments.slice(0, 5)

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", padding: 'clamp(20px,3vw,36px)' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>Staff Médical</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(26px,4vw,36px)', fontWeight: 400, color: P.text, margin: 0 }}>
            Tableau de bord médical
          </h1>
          <div style={{ fontSize: 13, color: P.sub, marginTop: 6, textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Effectif',      value: athletes.length,    color: P.text,   sub: 'total' },
            { label: 'Blessés actifs', value: totalBlesseActif,  color: totalBlesseActif > 0 ? P.red : P.sub,    sub: 'blessures actives' },
            { label: 'Surveillance',  value: totalSurveillance,  color: totalSurveillance > 0 ? P.yellow : P.sub, sub: 'à surveiller' },
            { label: 'RDV à venir',   value: appointments.length, color: appointments.length > 0 ? P.blue : P.sub, sub: '7 prochains jours' },
            { label: 'Disponibles',   value: totalOk,            color: P.green,  sub: 'aptes' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>{value}</div>
              <div style={{ fontSize: 11, color: P.sub, marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* Liste joueurs */}
          <div>
            {/* Filtres */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                { key: 'all',          label: `Tous (${athletes.length})` },
                { key: 'blesse',       label: `🔴 Blessés (${totalBlesseActif})` },
                { key: 'surveillance', label: `🟡 Surveillance (${totalSurveillance})` },
                { key: 'ok',           label: `🟢 Aptes (${totalOk})` },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${filter === f.key ? P.accent : P.border}`,
                  background: filter === f.key ? P.accent : P.card,
                  color: filter === f.key ? '#fff' : P.text,
                }}>{f.label}</button>
              ))}
              <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 20, border: `1px solid ${P.border}`, background: 'transparent', color: P.sub, fontSize: 12, cursor: 'pointer' }}>↻</button>
            </div>

            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden' }}>
              {/* Header tableau */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${P.border}`, background: '#faf8f4' }}>
                {['Joueur', 'Blessure', 'Prochain RDV', ''].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: P.sub }}>{h}</div>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: P.sub }}>Chargement...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: P.sub }}>Aucun joueur</div>
              ) : filtered.map((athlete, i) => {
                const isLast = i === filtered.length - 1
                const hasActive = athlete.activeInjuries.length > 0
                const hasSurveillance = athlete.surveillance.length > 0
                const statusColor = hasActive ? P.red : hasSurveillance ? P.yellow : P.green
                const statusLabel = hasActive ? `${athlete.activeInjuries.length} blessure${athlete.activeInjuries.length > 1 ? 's' : ''}` : hasSurveillance ? 'Surveillance' : 'Apte'
                const statusBg = hasActive ? '#fdecea' : hasSurveillance ? '#fdf6e3' : '#e8f5ee'

                return (
                  <div key={athlete.id}
                    onClick={() => navigate(`/medical/${athlete.id}`)}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px', gap: 12, padding: '14px 20px', borderBottom: isLast ? 'none' : `1px solid ${P.border}`, cursor: 'pointer', background: P.card, transition: 'background 0.15s', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf8f4'}
                    onMouseLeave={e => e.currentTarget.style.background = P.card}
                  >
                    {/* Identité */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                      <Avatar name={athlete.full_name || athlete.email} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {athlete.full_name || athlete.email}
                        </div>
                        {athlete.activeInjuries[0] && (
                          <div style={{ fontSize: 11, color: P.red, marginTop: 2 }}>
                            {BODY_ZONES[athlete.activeInjuries[0].body_zone] || athlete.activeInjuries[0].body_zone}
                            {athlete.activeInjuries[0].date_return && ` · Retour ${new Date(athlete.activeInjuries[0].date_return).toLocaleDateString('fr-FR')}`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Statut blessure */}
                    <div style={{ padding: '4px 10px', borderRadius: 20, background: statusBg, fontSize: 11, fontWeight: 700, color: statusColor, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {statusLabel}
                    </div>

                    {/* Prochain RDV */}
                    <div style={{ fontSize: 12, color: athlete.nextAppt ? P.blue : P.dim }}>
                      {athlete.nextAppt
                        ? new Date(athlete.nextAppt.date_appointment).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                        : '—'}
                    </div>

                    {/* Chevron */}
                    <div style={{ color: P.sub, fontSize: 14 }}>›</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Panel RDV à venir */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>RDV à venir</div>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden' }}>
              {nextAppts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: P.sub, fontSize: 13 }}>Aucun RDV à venir</div>
              ) : nextAppts.map((appt, i) => {
                const athlete = athletes.find(a => a.id === appt.athlete_id)
                const d = new Date(appt.date_appointment)
                const isLast = i === nextAppts.length - 1
                return (
                  <div key={appt.id}
                    onClick={() => navigate(`/medical/${appt.athlete_id}`)}
                    style={{ padding: '14px 16px', borderBottom: isLast ? 'none' : `1px solid ${P.border}`, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf8f4'}
                    onMouseLeave={e => e.currentTarget.style.background = P.card}
                  >
                    <div style={{ background: '#e8f5ee', border: `1px solid #b7dfc8`, borderRadius: 8, padding: '6px 10px', textAlign: 'center', flexShrink: 0, minWidth: 44 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: P.green, lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>{d.getDate()}</div>
                      <div style={{ fontSize: 9, color: P.green, fontWeight: 600, textTransform: 'uppercase' }}>{d.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {athlete?.full_name || athlete?.email || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: P.sub }}>
                        {APPT_TYPES[appt.type] || appt.type}
                        {appt.location ? ` · ${appt.location}` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: P.dim, marginTop: 2 }}>
                        {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
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
