import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

function NavItem({ to, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'block',
        padding: '12px 14px',
        borderRadius: 14,
        textDecoration: 'none',
        background: active ? 'rgba(45,255,155,0.10)' : 'transparent',
        border: active ? `1px solid ${T.accent + '33'}` : `1px solid transparent`,
        color: active ? (T.accentLight || T.accent || '#43E97B') : T.text,
        fontWeight: 800,
        fontSize: 14,
      }}
    >
      {label}
    </Link>
  )
}

function Sidebar({ isMobile = false, mobileOpen = false, onClose }) {
  const location = useLocation()
  const { profile, user, signOut } = useAuth()

  const isCoach = profile?.role === 'coach'

  const coachLinks = [
    { to: '/coach', label: 'Dashboard coach' },
    { to: '/coach/clients', label: 'Clients' },
    { to: '/programmes', label: 'Programmes' },
  ]

  const athleteLinks = [
    { to: '/mon-espace', label: 'Mon espace' },
    { to: '/entrainement/aujourdhui', label: 'Séance du jour' },
    { to: '/entrainement/libre', label: 'Séance libre' },
    { to: '/progression', label: 'Progression' },
    { to: '/nutrition/macros', label: 'Nutrition' },
    { to: '/nutrition/recettes', label: 'Recettes' },
    { to: '/nutrition/plan', label: 'Plan repas' },
  ]

  const links = isCoach ? coachLinks : athleteLinks

  async function handleLogout() {
    try {
      const result = await signOut?.()
      if (result?.error) {
        console.error(result.error)
        window.alert('Impossible de se déconnecter.')
      }
      if (onClose) onClose()
    } catch (error) {
      console.error(error)
      window.alert('Impossible de se déconnecter.')
    }
  }

  const content = (
    <aside
      style={{
        width: 280,
        height: '100vh',
        background: 'linear-gradient(180deg, #0f1514, #0a0d0c)',
        borderRight: `1px solid ${T.border}`,
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          border: `1px solid ${T.border}`,
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div
          style={{
            color: T.text,
            fontFamily: T.fontDisplay,
            fontWeight: 900,
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          LE SPOT
        </div>

        <div
          style={{
            marginTop: 8,
            color: T.textDim,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            fontWeight: 800,
          }}
        >
          {isCoach ? 'Mode coach' : 'Mode athlète'}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {links.map((item) => {
          const active =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + '/')

          return (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              active={active}
              onClick={isMobile ? onClose : undefined}
            />
          )
        })}
      </div>

      <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div
            style={{
              color: T.text,
              fontWeight: 800,
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            {profile?.full_name || user?.email || 'Utilisateur'}
          </div>

          <div
            style={{
              color: T.textDim,
              fontSize: 12,
              marginTop: 6,
            }}
          >
            {isCoach ? 'Coach' : 'Athlète'}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            height: 46,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.03)',
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

  if (!isMobile) {
    return content
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
          left: mobileOpen ? 0 : -300,
          zIndex: 70,
          transition: 'left .25s ease',
        }}
      >
        {content}
      </div>
    </>
  )
}

export default Sidebar
