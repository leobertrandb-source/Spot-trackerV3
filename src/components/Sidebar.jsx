import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

// ─── AI Images pour les nav items ─────────────────────────────────────────────
// Images statiques générées via OpenAI, stockées en base64 ou URL
// On utilise des gradients premium en fallback avec des formes SVG custom

const NAV_VISUALS = {
  '/coach':           { gradient: 'linear-gradient(135deg, #1a1f35 0%, #0d1117 100%)', accent: '#4d9fff', shape: 'M10,30 Q25,5 40,30 Q55,55 70,30 Q85,5 100,30' },
  '/coach/clients':   { gradient: 'linear-gradient(135deg, #1f1a35 0%, #110d17 100%)', accent: '#9d7dea', shape: 'M10,40 Q30,10 50,40 Q70,70 90,40' },
  '/programmes':      { gradient: 'linear-gradient(135deg, #0d1f1a 0%, #071510 100%)', accent: '#3ecf8e', shape: 'M20,20 L80,20 L80,80 L20,80 Z' },
  '/exercices':       { gradient: 'linear-gradient(135deg, #1f1510 0%, #170d07 100%)', accent: '#ff7043', shape: 'M50,10 L90,50 L50,90 L10,50 Z' },
  '/mon-espace':      { gradient: 'linear-gradient(135deg, #0d1a1f 0%, #071117 100%)', accent: '#26d4e8', shape: 'M50,15 A35,35 0 1 1 50,14.9' },
  '/entrainement/aujourdhui': { gradient: 'linear-gradient(135deg, #1f0d0d 0%, #170707 100%)', accent: '#ff4566', shape: 'M50,10 L60,40 L90,40 L67,58 L76,90 L50,72 L24,90 L33,58 L10,40 L40,40 Z' },
  '/entrainement/libre':      { gradient: 'linear-gradient(135deg, #101f0d 0%, #081707 100%)', accent: '#3ecf8e', shape: 'M50,20 L80,50 L50,80 L20,50 Z' },
  '/progression':     { gradient: 'linear-gradient(135deg, #1a1510 0%, #120d07 100%)', accent: '#fbbf24', shape: 'M10,70 Q30,20 50,50 Q70,80 90,20' },
  '/nutrition/macros':{ gradient: 'linear-gradient(135deg, #0f1f15 0%, #071510 100%)', accent: '#3ecf8e', shape: 'M50,50 m-35,0 a35,35 0 1,0 70,0 a35,35 0 1,0-70,0' },
  '/nutrition/recettes':{ gradient: 'linear-gradient(135deg, #1f180d 0%, #17100a 100%)', accent: '#f59e0b', shape: 'M30,20 Q50,10 70,20 Q80,50 70,80 Q50,90 30,80 Q20,50 30,20' },
  '/nutrition/plan':  { gradient: 'linear-gradient(135deg, #0d1720 0%, #07101a 100%)', accent: '#38bdf8', shape: 'M15,15 L85,15 L85,85 L15,85 Z M25,25 L75,25 L75,75 L25,75 Z' },
}

function NavVisual({ path }) {
  const v = NAV_VISUALS[path] || NAV_VISUALS['/coach']
  return (
    <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden', flexShrink: 0, position: 'relative', background: v.gradient, border: `1px solid ${v.accent}25` }}>
      <svg width="32" height="32" viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <path d={v.shape} fill="none" stroke={v.accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 30%, ${v.accent}20, transparent 70%)` }} />
    </div>
  )
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ to, label, active, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false)
  const v = NAV_VISUALS[to] || NAV_VISUALS['/coach']

  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 12, textDecoration: 'none',
        background: active
          ? `linear-gradient(135deg, ${v.accent}18, ${v.accent}08)`
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${active ? v.accent + '35' : hovered ? 'rgba(255,255,255,0.07)' : 'transparent'}`,
        transition: 'all 0.18s ease',
        animation: `navSlideIn 0.4s ease both`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      <NavVisual path={to} />
      <span style={{
        fontSize: 13, fontWeight: active ? 700 : 500,
        color: active ? v.accent : hovered ? '#c8d4e0' : '#7a8fa6',
        transition: 'color 0.15s ease', flex: 1,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </span>
      {active && (
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: v.accent, flexShrink: 0 }} />
      )}
    </Link>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, letterSpacing: 1.4,
      textTransform: 'uppercase', color: '#3d4f61',
      padding: '4px 10px 2px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {children}
    </div>
  )
}

// ─── Avatar initiales ─────────────────────────────────────────────────────────

function Avatar({ name, role }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color = role === 'coach' ? '#4d9fff' : '#3ecf8e'
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
      background: `linear-gradient(135deg, ${color}25, ${color}10)`,
      border: `1px solid ${color}35`,
      display: 'grid', placeItems: 'center',
      fontSize: 13, fontWeight: 800, color,
      fontFamily: "'Syne', sans-serif",
    }}>
      {initials}
    </div>
  )
}

// ─── Sidebar principale ───────────────────────────────────────────────────────

function Sidebar({ isMobile = false, mobileOpen = false, onClose }) {
  const location = useLocation()
  const { profile, user, signOut } = useAuth()
  const isCoach = profile?.role === 'coach'

  const coachLinks = [
    { to: '/coach',          label: 'Dashboard' },
    { to: '/coach/clients',  label: 'Clients' },
    { to: '/programmes',     label: 'Programmes' },
    { to: '/exercices',      label: 'Exercices' },
  ]

  const athleteMainLinks = [
    { to: '/mon-espace',                 label: 'Mon espace' },
    { to: '/entrainement/aujourdhui',    label: 'Séance du jour' },
    { to: '/entrainement/libre',         label: 'Séance libre' },
    { to: '/progression',                label: 'Progression' },
  ]

  const athleteNutritionLinks = [
    { to: '/nutrition/macros',   label: 'Nutrition' },
    { to: '/nutrition/recettes', label: 'Recettes' },
    { to: '/nutrition/plan',     label: 'Plan repas' },
  ]

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/')

  async function handleLogout() {
    try {
      await signOut?.()
      if (onClose) onClose()
    } catch (e) {
      console.error(e)
    }
  }

  const content = (
    <aside style={{
      width: 260, height: isMobile ? '100dvh' : '100vh',
      background: 'rgba(7, 9, 13, 0.97)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      padding: '20px 12px',
      boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 4,
      overflowY: 'auto',
      boxShadow: isMobile ? '8px 0 40px rgba(0,0,0,0.6)' : 'none',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes navSlideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        .nav-logout:hover { background: rgba(255,69,102,0.08) !important; border-color: rgba(255,69,102,0.2) !important; color: #ff8099 !important; }
      `}</style>

      {/* Logo */}
      <div style={{
        padding: '12px 10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #3ecf8e22, #3ecf8e08)',
            border: '1px solid #3ecf8e30',
            display: 'grid', placeItems: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15 9H22L16.5 13.5L18.5 21L12 17L5.5 21L7.5 13.5L2 9H9L12 2Z" fill="#3ecf8e" opacity="0.9"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 16, color: '#edf2f7', letterSpacing: '-0.3px', lineHeight: 1 }}>
              LE SPOT
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#3d4f61', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              {isCoach ? 'Coach' : 'Athlète'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {isCoach ? (
        <div style={{ display: 'grid', gap: 2 }}>
          <SectionLabel>Navigation</SectionLabel>
          {coachLinks.map((item, i) => (
            <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 2 }}>
            <SectionLabel>Entraînement</SectionLabel>
            {athleteMainLinks.map((item, i) => (
              <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
            ))}
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '8px 4px' }} />
          <div style={{ display: 'grid', gap: 2 }}>
            <SectionLabel>Nutrition</SectionLabel>
            {athleteNutritionLinks.map((item, i) => (
              <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i + 4} />
            ))}
          </div>
        </>
      )}

      {/* Profile + Logout */}
      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gap: 6 }}>
        <div style={{
          padding: '10px 12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Avatar name={profile?.full_name} role={profile?.role} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#edf2f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
              {profile?.full_name || user?.email || 'Utilisateur'}
            </div>
            <div style={{ fontSize: 10, color: '#3d4f61', fontWeight: 600, marginTop: 1 }}>
              {isCoach ? 'Coach' : 'Athlète'}
            </div>
          </div>
        </div>

        <button type="button" onClick={handleLogout} className="nav-logout" style={{
          height: 38, borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
          color: '#3d4f61', fontWeight: 700, cursor: 'pointer',
          fontSize: 12, transition: 'all 0.15s ease',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Déconnexion
        </button>
      </div>
    </aside>
  )

  if (!isMobile) return content

  return (
    <>
      {mobileOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      )}
      <div style={{ position: 'fixed', top: 0, left: mobileOpen ? 0 : -280, zIndex: 70, transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {content}
      </div>
    </>
  )
}

export default Sidebar
