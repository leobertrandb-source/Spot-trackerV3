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
        borderRadius: 16,
        textDecoration: 'none',
        background: active ? 'rgba(45,255,155,0.10)' : 'transparent',
        border: active ? `1px solid ${T.accent + '30'}` : '1px solid transparent',
        color: active ? T.accentLight : T.textMid,
        fontWeight: 800,
        fontSize: 14,
        transition: 'all .2s ease',
      }}
    >
      <span style={{ width: 20, textAlign: 'center', fontSize: 16 }}>
        {icon}
      </span>
      {label}
    </Link>
  )
}

function SidebarSectionTitle({ children }) {
  return (
    <div
      style={{
        color: T.textDim,
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        margin: '10px 8px 4px',
      }}
    >
      {children}
    </div>
  )
}

function Sidebar({ isMobile = false, mobileOpen = false, onClose }) {
  const location = useLocation()
  const { profile, user, signOut } = useAuth()

  const isCoach = profile?.role === 'coach'

  const coachLinks = [
    { to: '/coach', label: 'Dashboard coach', icon: '🧠' },
    { to: '/coach/clients', label: 'Clients', icon: '👥' },
    { to: '/programmes', label: 'Programmes', icon: '📋' },
  ]

  const athleteLinks = [
    { to: '/mon-espace', label: 'Dashboard', icon: '🏠' },
    { to: '/progression', label: 'Progression', icon: '📈' },
    { to: '/entrainement/libre', label: 'Séance libre', icon: '➕' },
    { to: '/nutrition/macros', label: 'Nutrition', icon: '🥗' },
    { to: '/nutrition/recettes', label: 'Recettes', icon: '🍽️' },
    { to: '/nutrition/plan', label: 'Plan repas', icon: '📆' },
  ]

  async function handleLogout() {
    await signOut()
    if (onClose) onClose()
  }

  const links = isCoach ? coachLinks : athleteLinks

  const content = (
    <aside
      style={{
        width: 280,
        height: '100vh',
        overflowY: 'auto',
        background: 'linear-gradient(180deg,#0e1413,#090d0c)',
        borderRight: `1px solid ${T.border}`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            color: T.text,
            fontWeight: 900,
            fontSize: 22,
            fontFamily: T.fontDisplay,
          }}
        >
          LE SPOT
        </div>

        <div
          style={{
            fontSize: 11,
            marginTop: 6,
            color: T.textDim,
            textTransform: 'uppercase',
            letterSpacing: 1.4,
          }}
        >
          {isCoach ? 'Mode coach' : 'Mode athlète'}
        </div>
      </div>

      <SidebarSectionTitle>Navigation</SidebarSectionTitle>

      <div style={{ display: 'grid', gap: 6 }}>
        {links.map((item) => {
          const active =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + '/')

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

      {/* Footer */}
      <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${T.border}`,
          }}
        >
          <div style={{ color: T.text, fontWeight: 800 }}>
            {profile?.full_name || user?.email}
          </div>
          <div style={{ color: T.textDim, fontSize: 12 }}>
            {isCoach ? 'Coach' : 'Athlète'}
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            height: 46,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.04)',
            color: T.text,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Déconnexion
        </button>
      </div>
    </aside>
  )

  if (!isMobile) return content

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 60,
          }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          left: mobileOpen ? 0 : -300,
          top: 0,
          zIndex: 70,
          transition: 'left .25s',
        }}
      >
        {content}
      </div>
    </>
  )
}

export default Sidebar
