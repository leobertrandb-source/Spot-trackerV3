import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import NotificationManager from '../components/NotificationManager'
import ImportPlayersCSV from '../components/ImportPlayersCSV'
import ImportGpsCSV from '../components/ImportGpsCSV'
import GpsDashboard from '../components/GpsDashboard'
import TrainingAttendancePanel from '../components/TrainingAttendancePanel'
import ImportICSModal from '../components/ImportICSModal'
import { LIGHT as T } from '../lib/data'

function statusFromScore(score) {
  if (score === null) return { label: 'Non rempli', color: T.textDim, dot: T.textSub, bg: 'rgba(192,186,176,0.12)' }
  if (score <= 7)  return { label: 'Très bon',         color: T.accent,  dot: T.accent,  bg: T.accentGlow }
  if (score <= 13) return { label: 'Correct',          color: T.accent,  dot: T.accent,  bg: T.accentGlowSm }
  if (score <= 20) return { label: 'Vigilance',        color: T.warn,    dot: T.warn,    bg: T.warnGlow }
  return               { label: 'Fatigue importante', color: T.danger,  dot: T.danger,  bg: T.dangerGlow }
}

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 42, height: 42, borderRadius: '50%', background: T.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0, fontFamily: T.fontDisplay }}>
      {initials}
    </div>
  )
}

export default function CoachPageProSport() {
  const { user, gym } = useAuth()
  const gymName = gym?.name || 'Atlyo'
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
  const [showImport, setShowImport]       = useState(false)
  const [showGpsImport, setShowGpsImport] = useState(false)
  const [showICSImport, setShowICSImport] = useState(false)
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

  async function handleGenerateQR() {
    try {
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
      await supabase.from('coach_invites').insert({
        coach_id: user.id,
        email: `qr-${token}@atlyo.app`,
        invite_token: token,
        invited_role: 'athlete',
      })
      const link = `${window.location.origin}/join/${token}`
      const win = window.open('', '_blank', 'width=420,height=560')
      win.document.write(`<!DOCTYPE html><html><head><title>QR Code Atlyo</title>
        <style>body{margin:0;background:#080808;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,sans-serif;color:#edf2f7;}
        h2{font-size:18px;margin-bottom:6px;}p{font-size:12px;color:#7a8fa6;margin-bottom:20px;text-align:center;}
        #qr{background:#fff;padding:16px;border-radius:12px;}
        .url{font-size:10px;color:#3ecf8e;word-break:break-all;text-align:center;max-width:300px;margin-top:14px;}
        button{margin-top:20px;padding:10px 24px;background:#3ecf8e;border:none;border-radius:8px;color:#080808;font-weight:700;cursor:pointer;font-size:14px;}</style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script></head>
        <body><h2>Inscription joueur — Atlyo</h2><p>Scanne ce QR code pour rejoindre l'équipe</p>
        <div id="qr"></div><div class="url">${link}</div>
        <button onclick="window.print()">🖨️ Imprimer</button>
        <script>new QRCode(document.getElementById('qr'),{text:'${link}',width:220,height:220,colorDark:'#080808',colorLight:'#ffffff'})</script>
        </body></html>`)
    } catch (e) { alert('Erreur: ' + e.message) }
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
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.fontBody, padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,28px)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
        .client-row:hover { background: ${T.bgAlt} !important; }
        .filter-btn { transition: all 0.15s; }
        .filter-btn:hover { opacity: 0.8; }
        .more-menu-btn:hover { background: ${T.bgAlt} !important; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: T.textMid, marginBottom: 8 }}>
              {gymName} · Préparation physique
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(26px,4vw,36px)', fontWeight: 400, color: T.text, margin: 0, lineHeight: 1.2 }}>
              {mainTab === 'dashboard' ? 'Tableau de bord' : mainTab === 'gps' ? 'GPS PlayerTek' : mainTab === 'presences' ? 'Présences' : 'Notifications'}
            </h1>
            <div style={{ fontSize: 13, color: T.textMid, marginTop: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            {/* Bouton Mode borne bien visible */}
            <button
              onClick={() => navigate('/coach-kiosk')}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: `1px solid ${T.accent}40`,
                background: T.accentGlowSm,
                color: T.accent,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: T.shadowGlow,
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
                    border: `1px solid ${mainTab === t.key ? T.accent : T.border}`,
                    background: mainTab === t.key ? T.accent : T.card,
                    color: mainTab === t.key ? '#080d14' : T.textMid,
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
                  border: `1px solid ${T.accent}`,
                  background: showInvite ? T.accent : T.accentGlowSm,
                  color: showInvite ? '#080d14' : T.accent,
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
                    border: `1px solid ${T.border}`,
                    background: showMoreMenu ? T.accent : T.card,
                    color: showMoreMenu ? '#080d14' : T.text,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  ··· Plus
                </button>

                {showMoreMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: '110%', zIndex: 100,
                    background: T.bgAlt, border: `1px solid ${T.border}`,
                    borderRadius: 14, padding: '6px', minWidth: 190,
                    boxShadow: T.shadowMd,
                    backdropFilter: 'blur(16px)',
                  }}>
                    <button
                      className="more-menu-btn"
                      onClick={() => { setShowImport(true); setShowMoreMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: 'none', background: 'transparent', color: T.text,
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
                        border: 'none', background: 'transparent', color: T.text,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}>
                      📡 Importer GPS
                    </button>
                    <button
                      className="more-menu-btn"
                      onClick={() => { setShowICSImport(true); setShowMoreMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: 'none', background: 'transparent', color: T.text,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}>
                      📅 Importer calendrier
                    </button>
                    <button
                      className="more-menu-btn"
                      onClick={() => { handleGenerateQR(); setShowMoreMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: 'none', background: 'transparent', color: T.text,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}>
                      📲 QR code inscription
                    </button>
                    <button
                      className="more-menu-btn"
                      onClick={() => { handleInviteStaff(); setShowMoreMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: 'none', background: 'transparent', color: T.text,
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
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '20px 24px' }}>
            <NotificationManager clients={clients.map(c => ({ id: c.id, full_name: c.full_name, email: c.email }))} />
          </div>
        )}

        {/* Panel présences */}
        {mainTab === 'presences' && (
          <TrainingAttendancePanel coachId={user.id} clients={clients} />
        )}

        {/* Panel GPS */}
        {mainTab === 'gps' && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowGpsImport(true)}
                style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${T.accent}`, background: T.accent, color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>Générer un lien d'invitation</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="email@athlete.com"
                  style={{ flex: 1, minWidth: 200, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', color: T.text, fontSize: 14, outline: 'none' }} />
                <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: T.accent, color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: inviting || !inviteEmail.trim() ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                  {inviting ? 'Génération...' : 'Générer & copier'}
                </button>
              </div>
              {inviteMsg && (
                <div style={{ marginTop: 8, fontSize: 12, color: T.accent, fontWeight: 600 }}>{inviteMsg}</div>
              )}
              <div style={{ marginTop: 8, fontSize: 11, color: T.textMid }}>Le lien est copié automatiquement. Envoyez-le par email ou SMS.</div>
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

          {showICSImport && (
            <ImportICSModal
              onClose={() => setShowICSImport(false)}
              onImported={() => setShowICSImport(false)}
            />
          )}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Athlètes',  value: clients.length,                            color: T.text,   sub: 'total' },
              { label: 'Rempli',    value: clients.filter(c => c.filledToday).length,  color: T.accent,  sub: "aujourd'hui" },
              { label: 'Alertes',   value: alerts.length,  color: alerts.length > 0 ? T.danger : T.textMid,   sub: 'fatigue ≥ 21' },
              { label: 'Vigilance', value: vigil.length,   color: vigil.length > 0 ? T.warn : T.textMid, sub: 'score 14–20' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: T.textMid, marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>{value}</div>
                <div style={{ fontSize: 11, color: T.textMid, marginTop: 4 }}>{sub}</div>
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
                style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${filter === f.key ? T.accent : T.border}`, background: filter === f.key ? T.accent : T.card, color: filter === f.key ? '#080d14' : T.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
            <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 20, border: `1px solid ${T.border}`, background: 'transparent', color: T.textMid, fontSize: 12, cursor: 'pointer' }}>↻</button>
          </div>

          {/* Liste clients */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 80px 80px 36px', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${T.border}`, background: T.bgAlt }}>
              {['Athlète', 'HOOPER', 'Charge sem.', 'Statut', 'Médical', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: T.textMid }}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: T.textMid }}>Chargement...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: T.textMid }}>Aucun athlète</div>
            ) : filtered.map((client, i) => {
              const status = statusFromScore(client.score)
              const domsCount = client.hooper?.doms_zones ? Object.values(client.hooper.doms_zones).filter(z => z.level > 0).length : 0
              const isLast = i === filtered.length - 1

              return (
                <div key={client.id} className="client-row"
                  onClick={() => navigate(`/prep/analyse/${client.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 80px 80px 36px', gap: 12, padding: '14px 20px', borderBottom: isLast ? 'none' : `1px solid ${T.border}`, cursor: 'pointer', background: T.card, transition: 'background 0.15s', alignItems: 'center' }}>

                  {/* Identité */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                    <Avatar name={client.full_name || client.email} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.full_name || client.email}
                      </div>
                      <div style={{ fontSize: 11, color: T.textMid, marginTop: 2, display: 'flex', gap: 8 }}>
                        {client.filledToday && <span style={{ color: T.accent }}>✓ Rempli aujourd'hui</span>}
                        {!client.filledToday && client.hooper && <span>Il y a {Math.floor((Date.now() - new Date(client.hooper.date+'T00:00:00').getTime())/86400000)}j</span>}
                        {domsCount > 0 && <span style={{ color: T.danger }}>🩹 {domsCount} DOMS</span>}
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
                        <div style={{ fontSize: 10, color: T.textMid }}>/40</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 4, borderRadius: 2, background: T.border, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(client.score/40)*100}%`, background: status.dot, borderRadius: 2, transition: 'width 0.4s' }} />
                          </div>
                          <div style={{ fontSize: 9, color: T.textMid, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                            <span>F{client.hooper.fatigue}</span><span>S{client.hooper.sommeil}</span>
                            <span>St{client.hooper.stress}</span><span>C{client.hooper.courbatures}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: T.textMid, fontStyle: 'italic' }}>—</span>
                    )}
                  </div>

                  {/* Charge semaine */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: client.chargeWeek ? T.blue : T.textMid }}>
                    {client.chargeWeek ? `${Math.round(client.chargeWeek)} UA` : '—'}
                  </div>

                  {/* Badge statut */}
                  <div style={{ padding: '4px 10px', borderRadius: 20, background: status.bg, fontSize: 10, fontWeight: 700, color: status.color, whiteSpace: 'nowrap', textAlign: 'center' }}>
                    {status.label}
                  </div>

                  {/* Bouton médical */}
                  <div onClick={e => { e.stopPropagation(); navigate(`/medical/${client.id}`) }}
                    style={{ padding: '5px 10px', borderRadius: 8, background: T.dangerGlow, border: `1px solid ${T.danger}30`, fontSize: 11, fontWeight: 700, color: T.danger, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    🏥 Médical
                  </div>

                  {/* Chevron */}
                  <div style={{ color: T.textMid, fontSize: 14 }}>›</div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: T.textMid }}>
            Cliquez sur un athlète pour accéder à son analyse complète
          </div>
        </>)}
      </div>
    </div>
  )
}
