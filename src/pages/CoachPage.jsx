import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap } from '../components/UI'
import { NAV_IMAGES } from '../lib/navImages'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:      '#07090e',
  glass:   'rgba(12,16,24,0.72)',
  border:  'rgba(255,255,255,0.07)',
  borderHi:'rgba(255,255,255,0.13)',
  text:    '#edf2f7',
  sub:     '#7a8fa6',
  dim:     '#3d4f61',
  accent:  '#3ecf8e',
  blue:    '#4d9fff',
  purple:  '#9d7dea',
  orange:  '#ff7043',
  red:     '#ff4566',
}

const GLASS_CARD = {
  background: C.glass,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${C.border}`,
  borderRadius: 20,
}

function greet() {
  const h = new Date().getHours()
  if (h < 6)  return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icon = ({ d, color = C.sub, size = 18, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)

const ICONS = {
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  flash:    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  grid:     "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  mail:     "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  chevron:  "M9 18l6-6-6-6",
  plus:     "M12 5v14M5 12h14",
  copy:     "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
  dumbbell: "M6.5 6.5h11M6.5 17.5h11M3 9.5h2v5H3zM19 9.5h2v5h-2zM6.5 3v3M6.5 18v3M17.5 3v3M17.5 18v3",
  chart:    "M18 20V10M12 20V4M6 20v-6",
}

// ─── Stat Block ───────────────────────────────────────────────────────────────

function StatBlock({ label, value, sub, color, iconPath, delay = 0 }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t) }, [delay])

  return (
    <div style={{
      ...GLASS_CARD, padding: '22px 20px',
      position: 'relative', overflow: 'hidden',
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(14px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: `${color}08`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />

      <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}18`, border: `1px solid ${color}28`, display: 'grid', placeItems: 'center', marginBottom: 14 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={iconPath}/>
        </svg>
      </div>

      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 900, color: C.text, lineHeight: 1, letterSpacing: '-1px' }}>{value}</div>
      <div style={{ fontSize: 12, color: C.sub, marginTop: 6, fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 3, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{sub}</div>}
    </div>
  )
}

// ─── Client row ───────────────────────────────────────────────────────────────

function ClientRow({ client, index }) {
  const [hov, setHov] = useState(false)
  return (
    <Link to={`/coach/client/${client.id}`}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 14, textDecoration: 'none',
        background: hov ? 'rgba(157,125,234,0.07)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hov ? 'rgba(157,125,234,0.25)' : C.border}`,
        transition: 'all 0.16s ease',
        animation: 'fadeUp 0.4s ease both',
        animationDelay: `${index * 45 + 200}ms`,
      }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'rgba(157,125,234,0.15)', border: '1px solid rgba(157,125,234,0.25)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: C.purple, fontFamily: "'Syne',sans-serif" }}>
        {initials(client.full_name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>{client.full_name || 'Client'}</div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, padding: '3px 9px', background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 20, flexShrink: 0 }}>Actif</div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hov ? C.purple : C.dim} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transition: 'stroke 0.15s' }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </Link>
  )
}

// ─── Invite card ──────────────────────────────────────────────────────────────

function InviteCard({ userId }) {
  const [email, setEmail]   = useState('')
  const [link, setLink]     = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  async function generate() {
    if (!email.trim()) return
    setLoading(true); setLink('')
    const token = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('coach_invites').insert({ coach_id: userId, email: email.trim().toLowerCase(), invite_token: token, status: 'pending' })
    if (!error) setLink(`${window.location.origin}/invite/${token}`)
    setLoading(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ ...GLASS_CARD, padding: '22px', display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: C.text }}>Inviter un client</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>Génère un lien d'accès sécurisé</div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="client@email.com"
          onKeyDown={e => e.key === 'Enter' && generate()}
          style={{ flex: 1, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, padding: '0 14px', outline: 'none', fontFamily: "'DM Sans',sans-serif" }}
        />
        <button type="button" onClick={generate} disabled={loading || !email.trim()} style={{
          height: 42, padding: '0 16px', borderRadius: 11, border: 'none',
          background: email.trim() ? C.accent : 'rgba(62,207,142,0.15)',
          color: email.trim() ? '#05100a' : 'rgba(62,207,142,0.4)',
          fontWeight: 800, fontSize: 13, cursor: email.trim() ? 'pointer' : 'default',
          fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s ease', whiteSpace: 'nowrap',
        }}>
          {loading ? '...' : 'Générer'}
        </button>
      </div>

      {link && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(62,207,142,0.05)', border: '1px solid rgba(62,207,142,0.15)', fontSize: 11, color: C.sub, wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 8 }}>
            {link}
          </div>
          <button type="button" onClick={copy} style={{
            width: '100%', height: 38, borderRadius: 10,
            border: `1px solid ${copied ? 'rgba(62,207,142,0.4)' : 'rgba(62,207,142,0.2)'}`,
            background: copied ? 'rgba(62,207,142,0.12)' : 'rgba(62,207,142,0.06)',
            color: C.accent, fontWeight: 700, fontSize: 12, cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s',
          }}>
            {copied ? '✓ Copié !' : 'Copier le lien'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ name, clientCount }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), 30); return () => clearTimeout(t) }, [])
  const img = NAV_IMAGES['hero-coach']

  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden', position: 'relative',
      minHeight: 200,
      opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(18px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease',
    }}>
      {/* Image de fond */}
      {img && (
        <img src={img} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 30%',
        }} />
      )}
      {/* Overlay gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: img
          ? 'linear-gradient(90deg, rgba(7,9,14,0.92) 0%, rgba(7,9,14,0.75) 50%, rgba(7,9,14,0.4) 100%)'
          : 'linear-gradient(135deg, rgba(12,16,24,0.98), rgba(7,9,14,0.98))',
      }} />

      {/* Contenu */}
      <div style={{ position: 'relative', padding: '32px 30px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: C.blue, marginBottom: 12, fontFamily: "'DM Sans',sans-serif" }}>
          {greet()}
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          {name?.split(' ')[0] || 'Coach'}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 10, fontFamily: "'DM Sans',sans-serif", maxWidth: 420, lineHeight: 1.6 }}>
          {clientCount === 0
            ? 'Invite ton premier client pour démarrer le suivi.'
            : `Tu suis activement ${clientCount} client${clientCount > 1 ? 's' : ''}.`}
        </div>
      </div>
    </div>
  )
}

// ─── Quick action ─────────────────────────────────────────────────────────────

function QuickAction({ to, label, sub, color, iconPath, delay = 0 }) {
  const [hov, setHov] = useState(false)
  const img = NAV_IMAGES[to]

  return (
    <Link to={to} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 14, textDecoration: 'none', overflow: 'hidden',
        position: 'relative', display: 'block', minHeight: 90,
        border: `1px solid ${hov ? `${color}40` : C.border}`,
        transition: 'all 0.16s ease',
        animation: 'fadeUp 0.4s ease both', animationDelay: `${delay}ms`,
      }}>
      {/* Image fond */}
      {img && (
        <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', transform: hov ? 'scale(1.05)' : 'scale(1)' }} />
      )}
      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: img ? `linear-gradient(135deg, rgba(7,9,14,0.88), rgba(7,9,14,0.65))` : `rgba(255,255,255,0.025)`, transition: 'background 0.2s ease' }} />
      {/* Contenu */}
      <div style={{ position: 'relative', padding: '14px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'DM Sans',sans-serif" }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{sub}</div>
        <div style={{ position: 'absolute', top: 12, right: 12, width: 6, height: 6, borderRadius: '50%', background: color, opacity: hov ? 1 : 0.5, transition: 'opacity 0.2s' }} />
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const { user, profile } = useAuth()
  const [clients, setClients]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [weekSessions, setWeekSessions] = useState(0)

  const name = profile?.full_name || user?.email || 'Coach'

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const { data: links } = await supabase.from('coach_clients').select('client_id').eq('coach_id', user.id)
      const ids = (links || []).map(r => r.client_id).filter(Boolean)
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids).order('full_name')
        setClients(profs || [])
        const mon = new Date(); mon.setDate(mon.getDate() - (mon.getDay() || 7) + 1); mon.setHours(0,0,0,0)
        const { data: sess } = await supabase.from('sessions').select('id').in('user_id', ids).gte('date', mon.toISOString().split('T')[0])
        setWeekSessions((sess || []).length)
      } else {
        setClients([])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  return (
    <PageWrap>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .cg-stats { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        .cg-main  { display:grid; grid-template-columns:1fr; gap:16px; }
        .cg-quick { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
        @media(min-width:860px){
          .cg-stats { grid-template-columns:repeat(4,1fr); }
          .cg-main  { grid-template-columns:minmax(0,1fr) minmax(0,1.45fr); }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 0 48px', display: 'grid', gap: 16 }}>

        <Hero name={name} clientCount={clients.length} />

        <div className="cg-stats">
          <StatBlock label="Clients actifs" value={clients.length} color={C.blue} iconPath={ICONS.users} delay={80} sub="En suivi" />
          <StatBlock label="Séances cette semaine" value={weekSessions} color={C.accent} iconPath={ICONS.flash} delay={130} sub="Total clients" />
          <StatBlock label="Programmes" value="—" color={C.purple} iconPath={ICONS.grid} delay={180} sub="Créés" />
          <StatBlock label="Invitations" value="—" color={C.orange} iconPath={ICONS.mail} delay={230} sub="En attente" />
        </div>

        <div className="cg-main">
          {/* Colonne gauche */}
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <InviteCard userId={user?.id} />
            <div className="cg-quick">
              <QuickAction to="/programmes"    label="Programmes"   sub="Créer une séance"   color={C.accent}  iconPath={ICONS.grid}     delay={350} />
              <QuickAction to="/exercices"     label="Exercices"    sub="Bibliothèque"        color={C.orange}  iconPath={ICONS.dumbbell} delay={400} />
              <QuickAction to="/coach/clients" label="Clients"      sub="Voir les fiches"     color={C.purple}  iconPath={ICONS.users}    delay={450} />
              <QuickAction to="/progression"   label="Progression"  sub="Stats globales"      color={C.blue}    iconPath={ICONS.chart}    delay={500} />
            </div>
          </div>

          {/* Colonne droite — clients */}
          <div style={{ ...GLASS_CARD, padding: '22px', display: 'grid', gap: 14, alignContent: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: C.text }}>Mes clients</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{clients.length} en suivi actif</div>
              </div>
              <Link to="/coach/clients" style={{ fontSize: 11, fontWeight: 700, color: C.blue, textDecoration: 'none', padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(77,159,255,0.2)', background: 'rgba(77,159,255,0.06)', fontFamily: "'DM Sans',sans-serif" }}>
                Voir tout →
              </Link>
            </div>

            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: C.dim, fontSize: 13 }}>Chargement...</div>
            ) : clients.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 14 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="1.2" style={{ display: 'block', margin: '0 auto 10px' }}>
                  <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M16 11h6m-3-3v6"/>
                </svg>
                <div style={{ fontSize: 13, color: C.dim }}>Aucun client encore.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {clients.slice(0, 7).map((c, i) => <ClientRow key={c.id} client={c} index={i} />)}
                {clients.length > 7 && (
                  <Link to="/coach/clients" style={{ textAlign: 'center', fontSize: 12, color: C.blue, textDecoration: 'none', padding: 10, fontWeight: 700 }}>
                    +{clients.length - 7} autres →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrap>
  )
}
