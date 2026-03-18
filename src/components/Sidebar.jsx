import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

// ─── Images depuis Supabase Storage ──────────────────────────────────────────
import { NAV_IMAGES } from '../lib/navImages'

const NAV_ACCENTS = {
  '/coach':                    '#4d9fff',
  '/coach/clients':            '#9d7dea',
  '/programmes':               '#3ecf8e',
  '/exercices':                '#ff7043',
  '/mon-espace':               '#26d4e8',
  '/entrainement/aujourdhui':  '#ff4566',
  '/entrainement/libre':       '#3ecf8e',
  '/progression':              '#fbbf24',
  '/nutrition/macros':         '#3ecf8e',
  '/nutrition/recettes':       '#f59e0b',
  '/programme/bodybuilding':   '#9d7dea',
  '/programme/perte-de-poids': '#ff7043',
  '/programme/athletique':     '#4d9fff',
  '/prep/hooper':              '#fbbf24',
  '/prep/charge':              '#4d9fff',
  '/prep/compo':               '#9d7dea',
  '/prep/topset':              '#3ecf8e',
  '/prep/charge-externe':      '#fbbf24',
  '/prep/dashboard':            '#9d7dea',
}

function NavVisual({ path }) {
  const img = NAV_IMAGES[path]
  const accent = NAV_ACCENTS[path] || '#3ecf8e'

  return (
    <div style={{
      width: 32, height: 32, borderRadius: 9, overflow: 'hidden',
      flexShrink: 0, position: 'relative',
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent}25`,
    }}>
      {img ? (
        <>
          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 30%, ${accent}25, transparent 70%)` }} />
      )}
    </div>
  )
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ to, label, active, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false)
  const accent = NAV_ACCENTS[to] || '#3ecf8e'

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
          ? `linear-gradient(135deg, ${accent}18, ${accent}08)`
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${active ? accent + '35' : hovered ? 'rgba(255,255,255,0.07)' : 'transparent'}`,
        transition: 'all 0.18s ease',
        animation: `navSlideIn 0.4s ease both`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      <NavVisual path={to} />
      <span style={{
        fontSize: 13, fontWeight: active ? 700 : 500,
        color: active ? accent : hovered ? '#c8d4e0' : '#7a8fa6',
        transition: 'color 0.15s ease', flex: 1,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </span>
      {active && (
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, flexShrink: 0 }} />
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
  const { profile, user, signOut, showMethodeSpot, showPrepPhysique } = useAuth()
  const isCoach = profile?.role === 'coach'

  const coachLinks = [
    { to: '/coach',          label: 'Dashboard' },
    { to: '/coach/clients',  label: 'Clients' },
    { to: '/programmes',     label: 'Programmes' },
    { to: '/exercices',      label: 'Exercices' },
  ]

  const progRoute = {
    mass_gain: '/programme/bodybuilding',
    fat_loss:  '/programme/perte-de-poids',
    athletic:  '/programme/athletique',
  }[profile?.goal_type] || '/objectif'

  const athleteMainLinks = [
    { to: '/mon-espace',                 label: 'Mon espace' },
    { to: '/entrainement/aujourdhui',    label: 'Séance du jour' },
    { to: '/entrainement/libre',         label: 'Séance libre' },
    { to: '/progression',                label: 'Progression' },
    { to: '/exercices',                  label: 'Exercices' },
    ...(showMethodeSpot ? [{ to: progRoute, label: 'Méthode & objectif' }] : []),
    ...(showPrepPhysique ? [
      { to: '/prep/hooper',  label: 'HOOPER' },
      { to: '/prep/charge',  label: 'Charge interne' },
      { to: '/prep/compo',   label: 'Composition corporelle' },
      { to: '/prep/topset',  label: 'TOPSET' },
      ...(profile?.role === 'coach' ? [
        { to: '/prep/charge-externe', label: 'Charge externe' },
      ] : []),
    ] : []),
  ]

  const athleteNutritionLinks = [
    { to: '/nutrition/macros',   label: 'Nutrition' },
    { to: '/nutrition/recettes', label: 'Recettes' },
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
