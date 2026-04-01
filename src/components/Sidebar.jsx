import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'
import { NAV_IMAGES } from '../lib/navImages'

const PS = {
  bg: T.bg,
  card: T.bgAlt,
  border: T.border,
  text: T.text,
  sub: T.textMid,
  dim: T.textDim,
  accent: T.accent,
}

const NAV_ACCENTS = {
  '/coach': '#60a5fa',
  '/coach/clients': '#a78bfa',
  '/programmes': '#3ecf8e',
  '/exercices': '#fb923c',
  '/mon-tableau-de-bord': '#3ecf8e',
  '/mon-espace': '#22d3ee',
  '/entrainement/aujourdhui': '#f43f5e',
  '/entrainement/libre': '#3ecf8e',
  '/progression': '#f59e0b',
  '/nutrition/macros': '#3ecf8e',
  '/nutrition/recettes': '#f59e0b',
  '/programme/bodybuilding': '#a78bfa',
  '/programme/perte-de-poids': '#fb923c',
  '/programme/athletique': '#60a5fa',
  '/prep/hooper': '#f59e0b',
  '/prep/charge': '#60a5fa',
  '/prep/compo': '#a78bfa',
  '/prep/topset': '#3ecf8e',
  '/prep/charge-externe': '#f59e0b',
  '/prep/dashboard': '#a78bfa',
  '/medical': '#f43f5e',
  '/calendrier': '#22d3ee',
}

function NavVisual({ path }) {
  const img = NAV_IMAGES[path]
  const accent = NAV_ACCENTS[path] || T.accent

  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 11,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent}30`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {img ? (
        <>
          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 30%, ${accent}28, transparent 72%)` }} />
      )}
    </div>
  )
}

function NavItem({ to, label, active, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false)
  const accent = NAV_ACCENTS[to] || T.accent

  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 10px',
        borderRadius: 14,
        textDecoration: 'none',
        background: active
          ? `linear-gradient(135deg, ${accent}24, rgba(255,255,255,0.02))`
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${active ? accent + '35' : hovered ? T.border : 'transparent'}`,
        transition: 'all 0.18s ease',
        animation: 'navSlideIn 0.4s ease both',
        animationDelay: `${index * 35}ms`,
      }}
    >
      <NavVisual path={to} />
      <span
        style={{
          fontSize: 13,
          fontWeight: active ? 700 : 600,
          color: active ? T.text : hovered ? T.textMid : T.textDim,
          transition: 'color 0.15s ease',
          flex: 1,
          fontFamily: T.fontBody,
        }}
      >
        {label}
      </span>
      {active ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0, boxShadow: `0 0 0 4px ${accent}22` }} /> : null}
    </Link>
  )
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        color: T.textSub,
        padding: '6px 10px 4px',
        fontFamily: T.fontBody,
      }}
    >
      {children}
    </div>
  )
}

function Avatar({ name, role }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const color = role === 'coach' ? '#60a5fa' : '#3ecf8e'
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        flexShrink: 0,
        background: `linear-gradient(135deg, ${color}28, rgba(255,255,255,0.02))`,
        border: `1px solid ${color}35`,
        display: 'grid',
        placeItems: 'center',
        fontSize: 13,
        fontWeight: 800,
        color,
        fontFamily: T.fontDisplay,
      }}
    >
      {initials}
    </div>
  )
}

function SidebarFrame({ children, isMobile }) {
  return (
    <aside
      style={{
        width: 272,
        height: isMobile ? '100dvh' : '100vh',
        background: 'rgba(8, 17, 27, 0.94)',
        backdropFilter: 'blur(18px)',
        borderRight: `1px solid ${T.border}`,
        padding: '18px 12px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflowY: 'auto',
        boxShadow: isMobile ? T.shadowLg : 'none',
      }}
    >
      <style>{`
        @keyframes navSlideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        .nav-logout:hover { background: rgba(244,63,94,0.08) !important; border-color: rgba(244,63,94,0.22) !important; color: #fda4af !important; }
      `}</style>
      {children}
    </aside>
  )
}

export default function Sidebar({ isMobile = false, mobileOpen = false, onClose }) {
  const location = useLocation()
  const { profile, user, signOut, showMethodeSpot, showPrepPhysique } = useAuth()
  const isCoach = profile?.role === 'coach'
  const isStaffMedical = profile?.role === 'staff_medical'

  const coachLinks = showPrepPhysique
    ? [
        { to: '/coach', label: 'Dashboard' },
        { to: '/calendrier', label: 'Calendrier' },
        { to: '/medical', label: 'Médical' },
        { to: '/programmes', label: 'Programmes' },
        { to: '/exercices', label: 'Exercices' },
      ]
    : [
        { to: '/coach', label: 'Dashboard' },
        { to: '/coach/clients', label: 'Clients' },
        { to: '/programmes', label: 'Programmes' },
        { to: '/exercices', label: 'Exercices' },
      ]

  const progRoute = {
    mass_gain: '/programme/bodybuilding',
    fat_loss: '/programme/perte-de-poids',
    athletic: '/programme/athletique',
  }[profile?.goal_type] || '/objectif'

  const athleteMainLinks = [
    ...(showPrepPhysique
      ? [
          { to: '/prep/dashboard', label: 'Dashboard' },
          { to: '/prep/hooper', label: 'HOOPER' },
          { to: '/prep/charge', label: 'Charge interne' },
          { to: '/prep/charge-externe', label: 'Charge externe' },
          { to: '/prep/topset', label: 'TOPSET' },
          { to: '/calendrier', label: 'Calendrier' },
        ]
      : [
          { to: '/mon-espace', label: 'Mon espace' },
          { to: '/entrainement/aujourdhui', label: 'Séance du jour' },
          { to: '/entrainement/libre', label: 'Séance libre' },
          { to: '/progression', label: 'Progression' },
          { to: '/exercices', label: 'Exercices' },
          ...(showMethodeSpot ? [{ to: progRoute, label: 'Méthode & objectif' }] : []),
        ]),
  ]

  const athleteNutritionLinks = [
    { to: '/nutrition/macros', label: 'Nutrition' },
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

  const roleLabel = isStaffMedical ? 'Médical' : isCoach ? (showPrepPhysique ? 'Préparateur physique' : 'Coach') : 'Athlète'

  const content = (
    <SidebarFrame isMobile={isMobile}>
      <div style={{ padding: '8px 10px 14px', borderBottom: `1px solid ${PS.border}`, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <img src="/icons/icon-192.png" alt="Atlyo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 14 }} />
          </div>
          <div>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 17, color: T.text, letterSpacing: -0.2, lineHeight: 1 }}>
              atl<span style={{ color: T.accent }}>yo</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: 1.1, marginTop: 4 }}>
              {roleLabel}
            </div>
          </div>
        </div>
      </div>

      {isStaffMedical ? (
        <div style={{ display: 'grid', gap: 3 }}>
          <SectionLabel>Médical</SectionLabel>
          {[{ to: '/medical', label: 'Médical' }, { to: '/calendrier', label: 'Calendrier' }].map((item, i) => (
            <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
          ))}
        </div>
      ) : isCoach ? (
        <div style={{ display: 'grid', gap: 3 }}>
          <SectionLabel>Navigation</SectionLabel>
          {coachLinks.map((item, i) => (
            <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 3 }}>
            <SectionLabel>Entraînement</SectionLabel>
            {athleteMainLinks.map((item, i) => (
              <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
            ))}
          </div>
          {!showPrepPhysique ? (
            <>
              <div style={{ height: 1, background: T.border, margin: '10px 6px' }} />
              <div style={{ display: 'grid', gap: 3 }}>
                <SectionLabel>Nutrition</SectionLabel>
                {athleteNutritionLinks.map((item, i) => (
                  <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i + 6} />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.border}`, display: 'grid', gap: 8 }}>
        <div
          style={{
            padding: '11px 12px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: T.shadowSm,
          }}
        >
          <Avatar name={profile?.full_name} role={profile?.role} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.fontBody }}>
              {profile?.full_name || user?.email || 'Utilisateur'}
            </div>
            <div style={{ fontSize: 10, color: T.textSub, fontWeight: 700, marginTop: 3 }}>{roleLabel}</div>
          </div>
        </div>

        <a href="/politique-confidentialite"
          style={{
            fontSize: 10, color: T.textSub, textDecoration: 'none',
            fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
            textAlign: 'center', display: 'block', opacity: 0.6,
          }}>
          Confidentialité & RGPD
        </a>

        <button
          type="button"
          onClick={handleLogout}
          className="nav-logout"
          style={{
            height: 40,
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: T.textSub,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 12,
            transition: 'all 0.15s ease',
            fontFamily: T.fontBody,
          }}
        >
          Déconnexion
        </button>
      </div>
    </SidebarFrame>
  )

  if (!isMobile) return content

  return (
    <>
      {mobileOpen ? <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,23,0.66)', zIndex: 60, backdropFilter: 'blur(4px)' }} /> : null}
      <div style={{ position: 'fixed', top: 0, left: mobileOpen ? 0 : -292, zIndex: 70, transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {content}
      </div>
    </>
  )
}
