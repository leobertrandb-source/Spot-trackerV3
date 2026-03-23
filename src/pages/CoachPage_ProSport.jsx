import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import NotificationManager from '../components/NotificationManager'
import ImportPlayersCSV from '../components/ImportPlayersCSV'
import ImportGpsCSV from '../components/ImportGpsCSV'
import GpsDashboard from '../components/GpsDashboard'
import TrainingAttendancePanel from '../components/TrainingAttendancePanel'

const P = {
  bg: '#f5f3ef',
  card: '#ffffff',
  border: '#e8e4dc',
  text: '#1a1a1a',
  sub: '#6b6b6b',
  accent: '#1a3a2a',
  green: '#2d6a4f',
  yellow: '#b5830a',
  red: '#c0392b',
  blue: '#1a3a5c',
}

function statusFromScore(score) {
  if (score === null) return { label: 'Non rempli', color: P.sub, dot: '#d1cfc9', bg: '#f0ede8' }
  if (score <= 7)  return { label: 'Très bon',         color: P.green,  dot: '#2d6a4f', bg: '#e8f5ee' }
  if (score <= 13) return { label: 'Correct',          color: P.green,  dot: '#52b788', bg: '#edf7f1' }
  if (score <= 20) return { label: 'Vigilance',        color: P.yellow, dot: '#e9a21b', bg: '#fdf6e3' }
  return               { label: 'Fatigue importante', color: P.red,    dot: '#c0392b', bg: '#fdecea' }
}

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 42, height: 42, borderRadius: '50%', background: P.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0, fontFamily: "'DM Serif Display', serif" }}>
      {initials}
    </div>
  )
}

export default function CoachPageProSport() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviting, setInviting] = useState(false)
  const [mainTab, setMainTab] = useState('dashboard')
  const [showImport, setShowImport] = useState(false)
  const [showGpsImport, setShowGpsImport] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Ferme le menu Plus si on clique ailleurs
  useEffect(() => {
    if (!showMoreMenu) return
    const close = () => setShowMoreMenu(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showMoreMenu])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: links } = await supabase.from('coach_clients').select('client_id').eq('coach_id', user.id)
    if (!links?.length) { setLoading(false); return }
    const ids = links.map(l => l.client_id)

    const [{ data: profiles }, { data: hoopers }, { data: charges }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').in('id', ids),
      supabase.from('hooper_logs').select('user_id, date, fatigue, sommeil, stress, courbatures, doms_zones')
        .in('user_id', ids).order('date', { ascending: false }),
      supabase.from('charge_externe_logs').select('user_id, date, charge_ua, rpe, duree_min')
        .in('user_id', ids).gte('date', new Date(Date.now()-7*86400000).toISOString().split('T')[0]),
    ])

    const lastHooper = {}
    for (const h of (hoopers || [])) {
      if (!lastHooper[h.user_id]) lastHooper[h.user_id] = h
    }
    const weekCharge = {}
    for (const c of (charges || [])) {
      weekCharge[c.user_id] = (weekCharge[c.user_id] || 0) + (c.charge_ua || c.rpe * c.duree_min)
    }

    setClients((profiles || []).map(p => ({
      ...p,
      hooper: lastHooper[p.id] || null,
      score: lastHooper[p.id] ? lastHooper[p.id].fatigue + lastHooper[p.id].sommeil + lastHooper[p.id].stress + lastHooper[p.id].courbatures : null,
      chargeWeek: weekCharge[p.id] || null,
      filledToday: lastHooper[p.id]?.date === today,
    })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)))

    setLoading(false)
  }, [user.id, today])

  useEffect(() => { load() }, [load])

  const alerts = clients.filter(c => c.score >= 21)
  const vigil = clients.filter(c => c.score >= 14 && c.score < 21)
  const ok = clients.filter(c => c.score !== null && c.score < 14)
  const missing = clients.filter(c => c.score === null)

  const filtered = filter === 'alert' ? alerts
    : filter === 'vigil' ? vigil
    : filter === 'ok' ? ok
    : filter === 'missing' ? missing
    : clients

  async function handleInviteStaff() {
    const email = window.prompt('Email du staff médical à inviter :')
    if (!email?.trim()) return
    try {
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
      await supabase.from('coach_invites').insert({ coach_id: user.id, email: email.trim(), invite_token: token, invited_role: 'staff_medical' })
      const link = `${window.location.origin}/invite/${token}`
      await navigator.clipboard.writeText(link)
      alert('✓ Lien staff médical copié dans le presse-papier')
    } catch { alert('Erreur lors de la génération') }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteMsg('')
    try {
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
      await supabase.from('coach_invites').insert({ coach_id: user.id, email: inviteEmail.trim(), invite_token: token, invited_role: 'athlete' })
      const link = `${window.location.origin}/invite/${token}`
      await navigator.clipboard.writeText(link)
      setInviteMsg('✓ Lien copié dans le presse-papier')
      setInviteEmail('')
      setTimeout(() => setInviteMsg(''), 4000)
    } catch { setInviteMsg('Erreur lors de la génération') }
    setInviting(false)
  }

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,28px)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .client-row:hover { background: #faf8f4 !important; }
        .filter-btn { transition: all 0.15s; }
        .filter-btn:hover { opacity: 0.8; }
        .more-menu-btn:hover { background: ${P.bg} !important; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>
              ProSportConcept · Préparation physique
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(26px,4vw,36px)', fontWeight: 400, color: P.text, margin: 0, lineHeight: 1.2 }}>
              {mainTab === 'dashboard' ? 'Tableau de bord' : mainTab === 'gps' ? 'GPS PlayerTek' : mainTab === 'presences' ? 'Présences' : 'Notifications'}
            </h1>
            <div style={{ fontSize: 13, color: P.sub, marginTop: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            {/* Bouton Mode borne bien visible */}
            <button
              onClick={() => navigate('/coach-kiosk')}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: `1px solid ${P.accent}`,
                background: '#fff',
                color: P.accent,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(26,58,42,0.06)',
              }}
            >
              🖥️ Mode borne
            </button>

            {/* Barre d'actions principale */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>

              {/* Onglets Dashboard / GPS / Notifications */}
              {[
                { key: 'dashboard',     label: '📊 Dashboard' },
                { key: 'gps',           label: '📡 GPS' },
                { key: 'presences',     label: '📋 Présences' },
                { key: 'notifications', label: '🔔 Notifications' },
              ].map(t => (
                <button key={t.key} onClick={() => setMainTab(t.key)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${mainTab === t.key ? P.accent : P.border}`,
                    background: mainTab === t.key ? P.accent : 'transparent',
                    color: mainTab === t.key ? '#fff' : P.sub,
                    transition: 'all 0.15s',
                  }}>
                  {t.label}
                </button>
              ))}

              {/* Inviter un athlète */}
              <button
                onClick={() => setShowInvite(s => !s)}
                style={{
                  padding: '10px 20px', borderRadius: 20,
                  border: `1px solid ${P.accent}`,
                  background: showInvite ? P.accent : 'transparent',
                  color: showInvite ? '#fff' : P.accent,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s', flexShrink: 0,
                }}>
                + Inviter un athlète
              </button>

              {/* Menu Plus */}
              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowMoreMenu(s => !s)}
                  style={{
                    padding: '10px 16px', borderRadius: 20,
                    border: `1px solid ${P.border}`,
                    background: showMoreMenu ? P.accent : '#fff',
                    color: showMoreMenu ? '#fff' : P.text,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  ··· Plus
                </button>

                {showMoreMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: '110%', zIndex: 100,
                    background: '#fff', border: `1px solid ${P.border}`,
                    borderRadius: 14, padding: '6px', minWidth: 190,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                  }}>
                    <button
                      className="more-menu-btn"
                      onClick={() => { setShowImport(true); setShowMoreMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: 'none', background: 'transparent', color: P.text,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}>
                      👤 Importer joueurs
                    </button>
                    <button
                      className="more-menu-btn"
                      onClick={() => { setShowGpsImport(true); setShowMoreMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: 'none', background: 'transparent', color: P.text,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}>
                      📡 Importer GPS
                    </button>
                    <button
                      className="more-menu-btn"
                      onClick={() => { handleInviteStaff(); setShowMoreMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: 'none', background: 'transparent', color: P.text,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}>
                      🏥 Inviter staff médical
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Panel notifications */}
        {mainTab === 'notifications' && (
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '20px 24px' }}>
            <NotificationManager clients={clients.map(c => ({ id: c.id, full_name: c.full_name, email: c.email }))} />
          </div>
        )}

        {/* Panel présences */}
        {mainTab === 'presences' && (
          <TrainingAttendancePanel coachId={user.id} clients={clients} />
        )}

        {/* Panel GPS */}
        {mainTab === 'gps' && (
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowGpsImport(true)}
                style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${P.accent}`, background: P.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Importer un CSV GPS
              </button>
            </div>
            <GpsDashboard coachId={user?.id} />
          </div>
        )}

        {/* Contenu dashboard */}
        {mainTab === 'dashboard' && (<>

          {/* Panel invitation */}
          {showInvite && (
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 10 }}>Générer un lien d'invitation</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="email@athlete.com"
                  style={{ flex: 1, minWidth: 200, background: P.bg, border: `1px solid ${P.border}`, borderRadius: 10, padding: '10px 14px', color: P.text, fontSize: 14, outline: 'none' }} />
                <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: P.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: inviting || !inviteEmail.trim() ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                  {inviting ? 'Génération...' : 'Générer & copier'}
                </button>
              </div>
              {inviteMsg && (
                <div style={{ marginTop: 8, fontSize: 12, color: P.green, fontWeight: 600 }}>{inviteMsg}</div>
              )}
              <div style={{ marginTop: 8, fontSize: 11, color: P.sub }}>Le lien est copié automatiquement. Envoyez-le par email ou SMS.</div>
            </div>
          )}

          {/* Modals import */}
          {showImport && (
            <div onClick={() => setShowImport(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
              <div onClick={e => e.stopPropagation()} style={{ width: 'min(680px, 90vw)' }}>
                <ImportPlayersCSV onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); load() }} />
              </div>
            </div>
          )}

          {showGpsImport && (
            <div onClick={() => setShowGpsImport(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
              <div onClick={e => e.stopPropagation()} style={{ width: 'min(900px, 94vw)' }}>
                <ImportGpsCSV onClose={() => setShowGpsImport(false)} onSuccess={() => { setShowGpsImport(false); load() }} />
              </div>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Athlètes',  value: clients.length,                            color: P.text,   sub: 'total' },
              { label: 'Rempli',    value: clients.filter(c => c.filledToday).length,  color: P.green,  sub: "aujourd'hui" },
              { label: 'Alertes',   value: alerts.length,  color: alerts.length > 0 ? P.red : P.sub,   sub: 'fatigue ≥ 21' },
              { label: 'Vigilance', value: vigil.length,   color: vigil.length > 0 ? P.yellow : P.sub, sub: 'score 14–20' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: P.sub, marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>{value}</div>
                <div style={{ fontSize: 11, color: P.sub, marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { key: 'all',     label: `Tous (${clients.length})` },
              { key: 'alert',   label: `🔴 Alertes (${alerts.length})` },
              { key: 'vigil',   label: `🟡 Vigilance (${vigil.length})` },
              { key: 'ok',      label: `🟢 OK (${ok.length})` },
              { key: 'missing', label: `⬜ Non rempli (${missing.length})` },
            ].map(f => (
              <button key={f.key} className="filter-btn" onClick={() => setFilter(f.key)}
                style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${filter === f.key ? P.accent : P.border}`, background: filter === f.key ? P.accent : P.card, color: filter === f.key ? '#fff' : P.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
            <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 20, border: `1px solid ${P.border}`, background: 'transparent', color: P.sub, fontSize: 12, cursor: 'pointer' }}>↻</button>
          </div>

          {/* Liste clients */}
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 80px 80px 36px', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${P.border}`, background: '#faf8f4' }}>
              {['Athlète', 'HOOPER', 'Charge sem.', 'Statut', 'Médical', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: P.sub }}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub }}>Chargement...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub }}>Aucun athlète</div>
            ) : filtered.map((client, i) => {
              const status = statusFromScore(client.score)
              const domsCount = client.hooper?.doms_zones ? Object.values(client.hooper.doms_zones).filter(z => z.level > 0).length : 0
              const isLast = i === filtered.length - 1

              return (
                <div key={client.id} className="client-row"
                  onClick={() => navigate(`/prep/analyse/${client.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 80px 80px 36px', gap: 12, padding: '14px 20px', borderBottom: isLast ? 'none' : `1px solid ${P.border}`, cursor: 'pointer', background: P.card, transition: 'background 0.15s', alignItems: 'center' }}>

                  {/* Identité */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                    <Avatar name={client.full_name || client.email} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.full_name || client.email}
                      </div>
                      <div style={{ fontSize: 11, color: P.sub, marginTop: 2, display: 'flex', gap: 8 }}>
                        {client.filledToday && <span style={{ color: P.green }}>✓ Rempli aujourd'hui</span>}
                        {!client.filledToday && client.hooper && <span>Il y a {Math.floor((Date.now() - new Date(client.hooper.date+'T00:00:00').getTime())/86400000)}j</span>}
                        {domsCount > 0 && <span style={{ color: P.red }}>🩹 {domsCount} DOMS</span>}
                      </div>
                    </div>
                  </div>

                  {/* HOOPER */}
                  <div>
                    {client.hooper ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: status.color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>
                          {client.score}
                        </div>
                        <div style={{ fontSize: 10, color: P.sub }}>/40</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 4, borderRadius: 2, background: P.border, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(client.score/40)*100}%`, background: status.dot, borderRadius: 2, transition: 'width 0.4s' }} />
                          </div>
                          <div style={{ fontSize: 9, color: P.sub, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                            <span>F{client.hooper.fatigue}</span><span>S{client.hooper.sommeil}</span>
                            <span>St{client.hooper.stress}</span><span>C{client.hooper.courbatures}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: P.sub, fontStyle: 'italic' }}>—</span>
                    )}
                  </div>

                  {/* Charge semaine */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: client.chargeWeek ? P.blue : P.sub }}>
                    {client.chargeWeek ? `${Math.round(client.chargeWeek)} UA` : '—'}
                  </div>

                  {/* Badge statut */}
                  <div style={{ padding: '4px 10px', borderRadius: 20, background: status.bg, fontSize: 10, fontWeight: 700, color: status.color, whiteSpace: 'nowrap', textAlign: 'center' }}>
                    {status.label}
                  </div>

                  {/* Bouton médical */}
                  <div onClick={e => { e.stopPropagation(); navigate(`/medical/${client.id}`) }}
                    style={{ padding: '5px 10px', borderRadius: 8, background: '#fdecea', border: '1px solid #f5c6c6', fontSize: 11, fontWeight: 700, color: P.red, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    🏥 Médical
                  </div>

                  {/* Chevron */}
                  <div style={{ color: P.sub, fontSize: 14 }}>›</div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: P.sub }}>
            Cliquez sur un athlète pour accéder à son analyse complète
          </div>
        </>)}
      </div>
    </div>
  )
}
