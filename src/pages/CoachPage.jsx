import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap } from '../components/UI'
import { NAV_IMAGES } from '../lib/navImages'
import { T } from '../lib/data'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ name, clientCount, weekSessions }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), 40); return () => clearTimeout(t) }, [])
  const img = NAV_IMAGES['hero-coach']
  const firstName = (name || 'Coach').split(' ')[0]

  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden', position: 'relative',
      opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(16px)',
      transition: 'opacity 0.55s ease, transform 0.55s ease',
    }}>
      {img && <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(7,9,14,0.97) 0%, rgba(7,9,14,0.82) 55%, rgba(7,9,14,0.35) 100%)' }} />

      <div style={{ position: 'relative', padding: 'clamp(24px,4vw,40px) clamp(24px,4vw,40px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        {/* Left — identité */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>
            {todayLabel()}
          </div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(36px,6vw,64px)', fontWeight: 900, color: '#fff', lineHeight: 0.95, letterSpacing: '-2px' }}>
            {firstName}
          </div>
        </div>

        {/* Right — métriques clés */}
        <div style={{ display: 'flex', gap: 'clamp(20px,4vw,48px)', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-1.5px' }}>{clientCount}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>clients</div>
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: T.accent, lineHeight: 1, letterSpacing: '-1.5px' }}>{weekSessions}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>séances / sem.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Client row ───────────────────────────────────────────────────────────────

function ClientRow({ client, index }) {
  return (
    <Link to={`/coach/client/${client.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 0', borderBottom: `1px solid ${T.border}`,
        textDecoration: 'none',
        animation: 'fadeUp 0.35s ease both',
        animationDelay: `${index * 40 + 150}ms`,
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`,
        display: 'grid', placeItems: 'center',
        fontSize: 11, fontWeight: 800, color: T.textMid, fontFamily: "'Syne',sans-serif",
        letterSpacing: 0.5,
      }}>
        {initials(client.full_name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
          {client.full_name || 'Client'}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {client.email}
        </div>
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, opacity: 0.4 }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </Link>
  )
}

// ─── Invite ───────────────────────────────────────────────────────────────────

function InviteCard({ userId }) {
  const [email, setEmail]     = useState('')
  const [link, setLink]       = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [open, setOpen]       = useState(false)

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
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '13px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.accent}12`, border: `1px solid ${T.accent}25`, display: 'grid', placeItems: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0M12 12v9M9 18l3 3 3-3"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'DM Sans',sans-serif" }}>Inviter un client</span>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', display: 'grid', gap: 10, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="client@email.com"
              onKeyDown={e => e.key === 'Enter' && generate()}
              style={{ flex: 1, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text, fontSize: 13, padding: '0 12px', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
            <button onClick={generate} disabled={loading || !email.trim()}
              style={{ height: 40, padding: '0 14px', borderRadius: 10, border: 'none', background: email.trim() ? T.accent : `${T.accent}20`, color: email.trim() ? '#05100a' : `${T.accent}60`, fontWeight: 800, fontSize: 12, cursor: email.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
              {loading ? '...' : 'Générer'}
            </button>
          </div>
          {link && (
            <div>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: `${T.accent}08`, border: `1px solid ${T.accent}18`, fontSize: 11, color: T.textMid, wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 6 }}>{link}</div>
              <button onClick={copy} style={{ width: '100%', height: 36, borderRadius: 8, border: `1px solid ${copied ? T.accent + '40' : T.border}`, background: copied ? `${T.accent}10` : 'transparent', color: copied ? T.accent : T.textMid, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                {copied ? '✓ Copié' : 'Copier le lien'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Quick actions ─────────────────────────────────────────────────────────────

const ACTIONS = [
  { to: '/programmes',    label: 'Programmes',  key: '/programmes' },
  { to: '/planning',      label: 'Planning',    key: '/coach/clients' },
  { to: '/coach/clients', label: 'Clients',     key: '/coach/clients' },
  { to: '/exercices',     label: 'Exercices',   key: '/exercices' },
]

function ActionTile({ to, label, imgKey, delay }) {
  const [hov, setHov] = useState(false)
  const img = NAV_IMAGES[imgKey] || NAV_IMAGES[to]

  return (
    <Link to={to} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 12,
        minHeight: 72, display: 'flex', alignItems: 'flex-end',
        textDecoration: 'none',
        border: `1px solid ${hov ? 'rgba(255,255,255,0.12)' : T.border}`,
        transition: 'border-color 0.15s',
        animation: 'fadeUp 0.35s ease both', animationDelay: `${delay}ms`,
      }}>
      {img && <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: hov ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.4s ease' }} />}
      <div style={{ position: 'absolute', inset: 0, background: hov ? 'rgba(7,9,14,0.72)' : 'rgba(7,9,14,0.82)', transition: 'background 0.2s' }} />
      <div style={{ position: 'relative', padding: '10px 12px', width: '100%' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: "'DM Sans',sans-serif", letterSpacing: 0.2 }}>{label}</div>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const { user, profile } = useAuth()
  const coachId = profile?.id || user?.id || null
  const [clients, setClients]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [weekSessions, setWeekSessions] = useState(0)
  const [progCount, setProgCount]   = useState(0)

  const name = profile?.full_name || user?.email || 'Coach'

  const load = useCallback(async () => {
    if (!coachId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data: links } = await supabase.from('coach_clients').select('client_id').eq('coach_id', coachId)
      const ids = (links || []).map(r => r.client_id).filter(Boolean)

      const { data: progs } = await supabase.from('programs').select('id').eq('coach_id', coachId)
      setProgCount((progs || []).length)

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
  }, [coachId])

  useEffect(() => { load() }, [load])

  return (
    <PageWrap>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        .cg-main { display:grid; grid-template-columns:1fr; gap:16px; }
        @media(min-width:800px){ .cg-main { grid-template-columns:280px 1fr; } }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 0 60px', display: 'grid', gap: 14, fontFamily: "'DM Sans',sans-serif" }}>

        <Hero name={name} clientCount={clients.length} weekSessions={weekSessions} />

        {/* Barre stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', animation: 'fadeUp 0.4s ease both', animationDelay: '80ms' }}>
          {[
            { value: clients.length, label: 'Clients' },
            { value: weekSessions,   label: 'Séances sem.' },
            { value: progCount,      label: 'Programmes' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '16px 20px', borderRight: i < 2 ? `1px solid ${T.border}` : 'none', background: 'rgba(255,255,255,0.015)' }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 900, color: T.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 5, fontWeight: 500, letterSpacing: 0.3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="cg-main">
          {/* Colonne gauche */}
          <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            {/* Actions rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ACTIONS.map((a, i) => (
                <ActionTile key={a.to} to={a.to} label={a.label} imgKey={a.key} delay={120 + i * 40} />
              ))}
            </div>

            <InviteCard userId={user?.id} />
          </div>

          {/* Colonne droite — roster */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px', background: 'rgba(255,255,255,0.012)', animation: 'fadeUp 0.4s ease both', animationDelay: '200ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: '-0.3px' }}>Roster</div>
              <Link to="/coach/clients" style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textDecoration: 'none', letterSpacing: 0.3 }}>
                Voir tout →
              </Link>
            </div>

            {loading ? (
              <div style={{ padding: '24px 0', color: T.textDim, fontSize: 13 }}>Chargement…</div>
            ) : clients.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
                  Aucun client encore.<br/>
                  <span style={{ color: T.accent, cursor: 'pointer' }}>Invite ton premier client</span> pour commencer.
                </div>
              </div>
            ) : (
              <div>
                {clients.slice(0, 8).map((c, i) => <ClientRow key={c.id} client={c} index={i} />)}
                {clients.length > 8 && (
                  <Link to="/coach/clients" style={{ display: 'block', paddingTop: 12, fontSize: 12, color: T.textDim, textDecoration: 'none', fontWeight: 600 }}>
                    +{clients.length - 8} autres
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
