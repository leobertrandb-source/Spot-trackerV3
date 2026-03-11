import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Input } from '../components/UI'
import { T } from '../lib/data'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDaysSince(dateValue) {
  if (!dateValue) return null
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return null
  return Math.floor((Date.now() - date.getTime()) / 86400000)
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

function getClientStatus(sessions) {
  if (!sessions?.length) return { label: 'Nouveau', color: T.textDim, icon: '🆕' }
  const sorted = [...sessions].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const daysSince = getDaysSince(sorted[0]?.date)

  if (daysSince === null || daysSince > 10) return { label: 'Inactif', color: T.danger, icon: '⚠️' }

  const recent = sorted.slice(0, 3)
  const volumes = recent.map(s =>
    (s.sets || []).reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0), 0)
  )
  const rpeValues = recent
    .flatMap(s => (s.sets || []).map(set => Number(set.rpe || 0)))
    .filter(Boolean)
  const avgRpe = rpeValues.length ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : 0

  if (avgRpe >= 9 && volumes[0] <= (volumes[1] || 0)) return { label: 'Fatigue', color: T.orange, icon: '🔴' }
  if (recent.length >= 2 && volumes[0] > (volumes[1] || 0) * 1.05) return { label: 'Progression', color: T.accent, icon: '📈' }
  if (recent.length >= 3) {
    const max = Math.max(...volumes), min = Math.min(...volumes)
    if (max - min < max * 0.05) return { label: 'Stagnation', color: T.blue, icon: '📊' }
  }
  return { label: 'Stable', color: T.accentLight, icon: '✅' }
}

function getSessionsThisWeek(sessions) {
  const weekStart = getWeekStart()
  return (sessions || []).filter(s => String(s.date || '') >= weekStart).length
}

function formatDate(value) {
  if (!value) return '—'
  try { return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }
  catch { return '—' }
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function StatBlock({ value, label, accent, sub }) {
  return (
    <div style={{
      padding: '20px 22px',
      borderRadius: 20,
      border: `1px solid ${accent ? T.accent + '30' : T.border}`,
      background: accent ? 'rgba(57,224,122,0.06)' : 'rgba(255,255,255,0.025)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${T.accent}, transparent)`,
        }} />
      )}
      <div style={{
        fontSize: 36, fontWeight: 900, lineHeight: 1,
        color: accent ? T.accent : T.text,
        letterSpacing: '-2px',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.textDim, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ClientRow({ client, index }) {
  const status = getClientStatus(client.sessions)
  const sessionsThisWeek = getSessionsThisWeek(client.sessions)
  const lastSession = [...(client.sessions || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
  const daysSince = getDaysSince(lastSession?.date)

  const initials = (client.full_name || client.email || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <Link
      to={`/coach/client/${client.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '44px 1fr auto',
          gap: 12,
          alignItems: 'center',
          padding: '12px 14px',
          borderRadius: 16,
          border: `1px solid ${T.border}`,
          background: 'rgba(255,255,255,0.025)',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          animationDelay: `${index * 60}ms`,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.045)'
          e.currentTarget.style.borderColor = T.accent + '30'
          e.currentTarget.style.transform = 'translateX(3px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
          e.currentTarget.style.borderColor = T.border
          e.currentTarget.style.transform = 'translateX(0)'
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `linear-gradient(135deg, ${status.color}22, ${status.color}44)`,
          border: `1px solid ${status.color}40`,
          display: 'grid', placeItems: 'center',
          fontSize: 14, fontWeight: 900, color: status.color,
          flexShrink: 0,
        }}>
          {initials}
        </div>

        {/* Nom + infos */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client.full_name || 'Client'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: T.textDim }}>
              {sessionsThisWeek > 0
                ? <span style={{ color: T.accent, fontWeight: 700 }}>{sessionsThisWeek} séance{sessionsThisWeek > 1 ? 's' : ''} cette sem.</span>
                : <span>Aucune séance cette sem.</span>
              }
            </span>
            {daysSince !== null && (
              <span style={{ fontSize: 11, color: daysSince > 7 ? T.danger : T.textDim }}>
                · {daysSince === 0 ? "Auj." : `J-${daysSince}`}
              </span>
            )}
          </div>
        </div>

        {/* Statut badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', borderRadius: 20,
          background: `${status.color}15`,
          border: `1px solid ${status.color}30`,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11 }}>{status.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>
            {status.label}
          </span>
        </div>
      </div>
    </Link>
  )
}

function AlertCard({ clients }) {
  const alerts = useMemo(() => {
    const list = []
    for (const client of clients) {
      const status = getClientStatus(client.sessions)
      const daysSince = getDaysSince(
        [...(client.sessions || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]?.date
      )
      if (status.label === 'Inactif' && daysSince !== null)
        list.push({ client, message: `Absent depuis ${daysSince} jours`, color: T.danger, icon: '⚠️' })
      else if (status.label === 'Fatigue')
        list.push({ client, message: 'RPE élevé cette semaine', color: T.orange, icon: '🔴' })
      else if (status.label === 'Stagnation')
        list.push({ client, message: 'Stagne depuis 3 séances', color: T.blue, icon: '📊' })
    }
    return list.slice(0, 5)
  }, [clients])

  if (!alerts.length) return (
    <div style={{ padding: '16px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
      <div style={{ fontSize: 13, color: T.textDim }}>Tous tes clients sont sur la bonne voie</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {alerts.map(({ client, message, color, icon }) => (
        <Link key={client.id} to={`/coach/client/${client.id}`} style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 14,
            background: `${color}0d`, border: `1px solid ${color}28`,
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                {client.full_name || 'Client'}
              </div>
              <div style={{ fontSize: 11, color, marginTop: 1 }}>{message}</div>
            </div>
            <span style={{ fontSize: 12, color: T.textDim }}>→</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CoachPage() {
  const { user, profile } = useAuth()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [filter, setFilter] = useState('all') // all | actif | inactif | fatigue

  const coachName = (profile?.full_name || user?.email || 'Coach').split(' ')[0]

  const loadClients = useCallback(async () => {
    if (!user?.id) { setClients([]); setLoading(false); return }
    setLoading(true)
    setErrorMessage('')

    try {
      const { data: links, error: linksError } = await supabase
        .from('coach_clients').select('client_id').eq('coach_id', user.id)
      if (linksError) throw linksError

      const ids = (links || []).map(r => r.client_id).filter(Boolean)
      if (!ids.length) { setClients([]); return }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles').select('id, full_name, email, role').in('id', ids)
      if (profilesError) throw profilesError

      // Charge les sessions des 30 derniers jours pour chaque client
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const since = thirtyDaysAgo.toISOString().split('T')[0]

      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id, user_id, date, sets(*)')
        .in('user_id', ids)
        .gte('date', since)
        .order('date', { ascending: false })

      // Associe les sessions à chaque client
      const sessionsByClient = {}
      for (const s of sessionsData || []) {
        if (!sessionsByClient[s.user_id]) sessionsByClient[s.user_id] = []
        sessionsByClient[s.user_id].push(s)
      }

      const enriched = (profilesData || []).map(p => ({
        ...p,
        sessions: sessionsByClient[p.id] || [],
      }))

      setClients(enriched)
    } catch (err) {
      console.error(err)
      setErrorMessage("Impossible de charger les clients.")
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadClients() }, [loadClients])

  const createInvite = useCallback(async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!user?.id || !email) return
    setInviteLoading(true)
    setInviteLink('')
    setErrorMessage('')
    try {
      const token = globalThis.crypto?.randomUUID?.().replace(/-/g, '') || `${Date.now()}${Math.random().toString(36).slice(2, 10)}`
      const { error } = await supabase.from('coach_invites').insert({
        coach_id: user.id, email, invite_token: token, status: 'pending',
      })
      if (error) throw error
      setInviteLink(`${window.location.origin}/invite/${token}`)
    } catch (err) {
      setErrorMessage(err.message || "Impossible de créer l'invitation.")
    } finally {
      setInviteLoading(false)
    }
  }, [inviteEmail, user?.id])

  const copyInviteLink = useCallback(async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    } catch { window.alert('Impossible de copier le lien') }
  }, [inviteLink])

  const stats = useMemo(() => {
    const actifs = clients.filter(c => {
      const d = getDaysSince([...(c.sessions || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]?.date)
      return d !== null && d <= 7
    })
    const enProgression = clients.filter(c => getClientStatus(c.sessions).label === 'Progression')
    const totalSeancesWeek = clients.reduce((sum, c) => sum + getSessionsThisWeek(c.sessions), 0)
    return { total: clients.length, actifs: actifs.length, enProgression: enProgression.length, totalSeancesWeek }
  }, [clients])

  const filteredClients = useMemo(() => {
    if (filter === 'all') return clients
    return clients.filter(c => {
      const status = getClientStatus(c.sessions).label.toLowerCase()
      if (filter === 'actif') return status !== 'inactif' && status !== 'nouveau'
      if (filter === 'inactif') return status === 'inactif'
      if (filter === 'fatigue') return status === 'fatigue'
      return true
    })
  }, [clients, filter])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <PageWrap>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .coach-row { animation: fadeUp 0.4s ease both; }
        .coach-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 18px; align-items: start; }
        .coach-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .coach-hero-title { font-size: 32px; }
        @media (min-width: 768px) {
          .coach-grid { grid-template-columns: minmax(0,1fr) 340px; }
          .coach-stats { grid-template-columns: repeat(4, 1fr); }
          .coach-hero-title { font-size: 40px; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 20 }}>

        {/* ── Hero ── */}
        <div style={{
          padding: '32px 28px',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(14,18,14,0.98), rgba(8,12,10,0.99))',
          border: `1px solid ${T.accent}20`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Glow bg */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(57,224,122,0.08), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: 80,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(77,159,255,0.05), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            display: 'inline-block',
            fontSize: 11, fontWeight: 800, letterSpacing: 2,
            textTransform: 'uppercase', color: T.accent,
            background: 'rgba(57,224,122,0.10)',
            border: `1px solid ${T.accent}28`,
            padding: '4px 12px', borderRadius: 999, marginBottom: 16,
          }}>
            Espace Coach
          </div>

          <div className="coach-hero-title" style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 900, lineHeight: 1,
            color: T.text, letterSpacing: '-2px',
          }}>
            {greeting},<br />
            <span style={{ color: T.accent }}>{coachName}</span>
          </div>

          <div style={{ color: T.textDim, fontSize: 14, marginTop: 10 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="coach-stats">
          <StatBlock value={stats.total} label="Clients total" />
          <StatBlock value={stats.actifs} label="Actifs cette semaine" accent />
          <StatBlock value={stats.enProgression} label="En progression" />
          <StatBlock value={stats.totalSeancesWeek} label="Séances cette semaine" />
        </div>

        {errorMessage && (
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,90,90,0.06)', border: '1px solid rgba(255,120,120,0.22)', color: '#FFB3B3', fontWeight: 700, fontSize: 14 }}>
            {errorMessage}
          </div>
        )}

        {/* ── Contenu principal ── */}
        <div className="coach-grid">

          {/* Liste clients */}
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: T.text }}>
                Mes clients
                <span style={{ fontSize: 13, fontWeight: 600, color: T.textDim, marginLeft: 8 }}>
                  ({filteredClients.length})
                </span>
              </div>

              {/* Filtres */}
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'actif', 'inactif', 'fatigue'].map(f => (
                  <button key={f} type="button" onClick={() => setFilter(f)} style={{
                    height: 32, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
                    border: `1px solid ${filter === f ? T.accent + '40' : T.border}`,
                    background: filter === f ? 'rgba(57,224,122,0.10)' : 'rgba(255,255,255,0.03)',
                    color: filter === f ? T.accentLight : T.textMid,
                    fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: T.textDim, fontSize: 14 }}>
                Chargement...
              </div>
            ) : filteredClients.length === 0 ? (
              <div style={{
                padding: 30, textAlign: 'center', borderRadius: 18,
                border: `1px dashed ${T.border}`,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                <div style={{ color: T.textMid, fontWeight: 600, fontSize: 14 }}>
                  {filter === 'all' ? 'Aucun client pour le moment' : `Aucun client "${filter}"`}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {/* En-tête colonnes */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr auto',
                  gap: 12, padding: '0 14px',
                  fontSize: 10, fontWeight: 800, color: T.textDim,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                }}>
                  <div />
                  <div>Client</div>
                  <div style={{ textAlign: 'right' }}>Statut</div>
                </div>

                {filteredClients.map((client, i) => (
                  <div key={client.id} className="coach-row" style={{ animationDelay: `${i * 50}ms` }}>
                    <ClientRow client={client} index={i} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar droite */}
          <div style={{ display: 'grid', gap: 14 }}>

            {/* Alertes */}
            <div style={{
              padding: 20, borderRadius: 20,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.025)',
            }}>
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800, fontSize: 16, color: T.text, marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                🔔 Alertes
              </div>
              <AlertCard clients={clients} />
            </div>

            {/* Inviter un client */}
            <div style={{
              padding: 20, borderRadius: 20,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.025)',
            }}>
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800, fontSize: 16, color: T.text, marginBottom: 14,
              }}>
                ✉️ Inviter un client
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <input
                  type="email"
                  placeholder="client@email.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  style={{
                    height: 44, borderRadius: 12, padding: '0 14px',
                    border: `1px solid ${T.border}`,
                    background: 'rgba(255,255,255,0.04)',
                    color: T.text, fontSize: 14, outline: 'none',
                    width: '100%', boxSizing: 'border-box',
                  }}
                />

                <button
                  type="button"
                  onClick={createInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  style={{
                    height: 44, borderRadius: 12, border: 'none',
                    background: inviteLoading || !inviteEmail.trim()
                      ? 'rgba(57,224,122,0.25)' : T.accent,
                    color: '#050607', fontWeight: 800, fontSize: 14,
                    cursor: inviteLoading || !inviteEmail.trim() ? 'default' : 'pointer',
                  }}
                >
                  {inviteLoading ? 'Génération...' : 'Générer le lien'}
                </button>

                {inviteLink && (
                  <div>
                    <div style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${T.accent}28`,
                      background: 'rgba(57,224,122,0.05)',
                      fontSize: 11, color: T.textMid,
                      wordBreak: 'break-all', marginBottom: 8,
                    }}>
                      {inviteLink}
                    </div>
                    <button
                      type="button"
                      onClick={copyInviteLink}
                      style={{
                        width: '100%', height: 40, borderRadius: 10,
                        border: `1px solid ${T.accent}40`,
                        background: inviteCopied ? 'rgba(57,224,122,0.15)' : 'rgba(57,224,122,0.08)',
                        color: T.accentLight, fontWeight: 700, fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {inviteCopied ? '✓ Copié !' : 'Copier le lien'}
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageWrap>
  )
}
