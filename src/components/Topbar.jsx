import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

function SidebarLink({ to, label, icon, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        textDecoration: 'none',
        background: active ? 'rgba(45,255,155,0.10)' : 'transparent',
        border: active
          ? `1px solid ${T.accent + '30'}`
          : '1px solid transparent',
        color: active ? T.accentLight : T.textMid,
        fontWeight: 800,
        fontSize: 14,
        transition: 'all .2s ease',
      }}
    >
      <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

export default function Sidebar({ isMobile = false, mobileOpen = false, onClose }) {
  const location = useLocation()
  const { profile } = useAuth()

  const isCoach = profile?.role === 'coach'

  const coachLinks = [
    { to: '/coach', label: 'Dashboard coach', icon: '🧠' },
    { to: '/coach/clients', label: 'Clients', icon: '👥' },
    { to: '/programmes', label: 'Programmes', icon: '📋' },
  ]

  const athleteLinks = [
    { to: '/mon-espace', label: 'Mon espace', icon: '🏠' },
    { to: '/entrainement/aujourdhui', label: "Séance du jour", icon: '🔥' },
    { to: '/entrainement/libre', label: 'Séance libre', icon: '➕' },
    { to: '/entrainement/historique', label: 'Historique', icon: '🕘' },
    { to: '/nutrition/macros', label: 'Nutrition', icon: '🥗' },
    { to: '/nutrition/recettes', label: 'Recettes', icon: '🍽️' },
    { to: '/nutrition/plan', label: 'Plan repas', icon: '📆' },
    { to: '/progression', label: 'Progression', icon: '📈' },
  ]

  const links = isCoach ? coachLinks : athleteLinks

  const sidebarContent = (
    <aside
      style={{
        width: isMobile ? 290 : 280,
        height: '100%',
        background:
          'linear-gradient(180deg, rgba(12,16,15,0.98), rgba(8,11,10,0.98))',
        borderRight: `1px solid ${T.border}`,
        padding: '18px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        boxSizing: 'border-box',
      }}
    >
      <div>
        <div
          style={{
            color: T.text,
            fontFamily: T.fontDisplay,
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: 1,
            lineHeight: 1,
          }}
        >
          LE SPOT
        </div>

        <div
          style={{
            color: T.textDim,
            fontSize: 12,
            marginTop: 6,
            textTransform: 'uppercase',
            letterSpacing: 1.4,
          }}
        >
          {isCoach ? 'Mode coach' : 'Mode athlète'}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {links.map((item) => {
          const active =
            location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to + '/'))

          return (
            <SidebarLink
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              active={active}
              onClick={isMobile ? onClose : undefined}
            />
          )
        })}
      </div>

      <div
        style={{
          marginTop: 'auto',
          padding: '12px 12px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            color: T.textSub,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          Espace actif
        </div>

        <div
          style={{
            color: T.text,
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {isCoach ? 'Coach' : 'Athlète'}
        </div>
      </div>
    </aside>
  )

  if (!isMobile) {
    return sidebarContent
  }

  return (
    <>
      {mobileOpen ? (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 60,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: mobileOpen ? 0 : -310,
          height: '100vh',
          zIndex: 70,
          transition: 'left .25s ease',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        }}
      >
        {sidebarContent}
      </div>
    </>
  )
}
