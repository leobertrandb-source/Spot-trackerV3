import { NavLink } from 'react-router-dom'
import { Logo } from './UI'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

const NAV_ITEMS = [
  { to: '/aujourd-hui', icon: '⚡', label: "Aujourd'hui"     },
  { to: '/saisie',      icon: '✦', label: 'Séance libre'    },
  { to: '/historique',  icon: '◈', label: 'Historique'      },
  { to: '/progression', icon: '◎', label: 'Progression'     },
]

const COACH_ITEMS = [
  { to: '/coach',    icon: '◉', label: 'Vue Coach'     },
  { to: '/programmes', icon: '◆', label: 'Programmes'  },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: T.surface,
      borderRight: `1px solid ${T.border}`,
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflow: 'hidden',
    }}>

      {/* Top glow */}
      <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 160, height: 160, background: T.accentGlow, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ padding: '28px 22px 24px', borderBottom: `1px solid ${T.border}` }}>
        <Logo size="sm" />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>

        <div style={{ fontFamily: T.fontDisplay, fontSize: 9, fontWeight: 700, letterSpacing: 2.5, color: T.textDim, textTransform: 'uppercase', padding: '8px 10px 10px', marginBottom: 2 }}>
          Athlète
        </div>

        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 11,
            padding: '10px 12px', borderRadius: T.radiusSm,
            textDecoration: 'none',
            color: isActive ? T.accent : T.textMid,
            background: isActive ? T.accentGlow : 'transparent',
            border: `1px solid ${isActive ? T.accent + '33' : 'transparent'}`,
            fontFamily: T.fontDisplay,
            fontWeight: isActive ? 700 : 500,
            fontSize: 13,
            letterSpacing: 0.5,
            transition: 'all .2s',
          })}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {profile?.role === 'coach' && (
          <>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 9, fontWeight: 700, letterSpacing: 2.5, color: T.textDim, textTransform: 'uppercase', padding: '16px 10px 10px', marginTop: 8, borderTop: `1px solid ${T.border}` }}>
              Coach
            </div>
            {COACH_ITEMS.map(item => (
              <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 12px', borderRadius: T.radiusSm,
                textDecoration: 'none',
                color: isActive ? T.accent : T.textMid,
                background: isActive ? T.accentGlow : 'transparent',
                border: `1px solid ${isActive ? T.accent + '33' : 'transparent'}`,
                fontFamily: T.fontDisplay,
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                transition: 'all .2s',
              })}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div style={{ padding: '16px 14px', borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.accent}33, ${T.accentDim}22)`,
            border: `1px solid ${T.accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 14, color: T.accent,
            flexShrink: 0,
          }}>
            {profile?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: T.text, lineHeight: 1 }}>
              {profile?.full_name || 'Athlète'}
            </div>
            <div style={{ fontSize: 10, color: T.textDim, marginTop: 3 }}>
              {profile?.role === 'coach' ? '🎯 Coach' : '💪 Athlète'}
            </div>
          </div>
        </div>
        <button onClick={signOut} style={{
          width: '100%', background: 'transparent', border: `1px solid ${T.border}`,
          borderRadius: T.radiusSm, padding: '8px 0',
          fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 11,
          letterSpacing: 1.5, color: T.textDim, textTransform: 'uppercase',
          cursor: 'pointer', transition: 'all .2s',
        }}
          onMouseEnter={e => { e.target.style.borderColor = T.danger; e.target.style.color = T.danger }}
          onMouseLeave={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textDim }}
        >
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
