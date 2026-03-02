import { useLocation } from 'react-router-dom'
import { Logo } from './UI'
import { useAuth } from './AuthContext'
import { useDirty } from './DirtyContext'
import { T } from '../lib/data'

const NAV_ITEMS = [
  { to: '/aujourd-hui', icon: '◈', label: "Aujourd'hui" },
  { to: '/nutrition',   icon: '◉', label: 'Nutrition'   },
  { to: '/saisie',      icon: '✦', label: 'Séance libre' },
  { to: '/historique',  icon: '▦', label: 'Historique'  },
  { to: '/progression', icon: '◎', label: 'Progression' },
]

const COACH_ITEMS = [
  { to: '/coach',       icon: '◆', label: 'Vue Coach'   },
  { to: '/programmes',  icon: '▣', label: 'Programmes'  },
]

function NavBtn({ item, isActive, onClick, showDot }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', padding: '9px 12px', borderRadius: T.radius,
      background: isActive ? `linear-gradient(135deg, ${T.accentGlow}, transparent)` : 'transparent',
      border: `1px solid ${isActive ? T.accent + '30' : 'transparent'}`,
      color: isActive ? T.accent : T.textMid,
      fontFamily: T.fontDisplay, fontWeight: isActive ? 700 : 500,
      fontSize: 13, letterSpacing: 0.3, cursor: 'pointer',
      transition: 'all .2s', textAlign: 'left', position: 'relative',
    }}
      onMouseEnter={!isActive ? e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.text } : undefined}
      onMouseLeave={!isActive ? e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textMid } : undefined}
    >
      <span style={{ fontSize: 13, lineHeight: 1, opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
      <span>{item.label}</span>
      {showDot && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: T.warn, flexShrink: 0, boxShadow: `0 0 6px ${T.warn}` }} />}
      {isActive && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 2, height: 16, background: T.accent, borderRadius: 1 }} />}
    </button>
  )
}

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const { tryNavigate, isDirty } = useDirty()
  const location = useLocation()

  const isCoach = profile?.role === 'coach'
  const initial = (profile?.full_name || profile?.email || '?')[0].toUpperCase()

  return (
    <aside style={{
      width: 210, flexShrink: 0,
      background: T.surface,
      borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Ambient glow top */}
      <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, background: T.accentGlow, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Vertical line decoration */}
      <div style={{ position: 'absolute', right: 0, top: 0, width: 1, height: '100%', background: `linear-gradient(180deg, transparent, ${T.border} 20%, ${T.border} 80%, transparent)` }} />

      {/* Logo */}
      <div style={{ padding: '24px 18px 20px', borderBottom: `1px solid ${T.border}` }}>
        <Logo size="sm" />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 8, fontWeight: 700, letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', padding: '6px 12px 8px' }}>Athlète</div>

        {NAV_ITEMS.map(item => (
          <NavBtn key={item.to} item={item}
            isActive={location.pathname === item.to}
            onClick={() => tryNavigate(item.to)}
            showDot={isDirty && location.pathname === item.to}
          />
        ))}

        {isCoach && (
          <>
            <div style={{ height: 1, background: T.border, margin: '10px 12px', borderRadius: 1 }} />
            <div style={{ fontFamily: T.fontDisplay, fontSize: 8, fontWeight: 700, letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', padding: '4px 12px 8px' }}>Coach</div>
            {COACH_ITEMS.map(item => (
              <NavBtn key={item.to} item={item}
                isActive={location.pathname === item.to}
                onClick={() => tryNavigate(item.to)}
              />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ padding: '14px 12px 18px', borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, padding: '8px 8px', background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.accent}33, ${T.accentDim}22)`,
            border: `1px solid ${T.accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 13, color: T.accent, flexShrink: 0,
          }}>{initial}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 12, color: T.text, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'Athlète'}
            </div>
            <div style={{ fontSize: 9, color: T.textDim, marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' }}>
              {isCoach ? '🎯 Coach' : '💪 Athlète'}
            </div>
          </div>
        </div>
        <button onClick={signOut} style={{
          width: '100%', background: 'transparent',
          border: `1px solid ${T.border}`, borderRadius: T.radius,
          padding: '7px 0', fontFamily: T.fontDisplay, fontWeight: 700,
          fontSize: 10, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase',
          cursor: 'pointer', transition: 'all .2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.danger + '66'; e.currentTarget.style.color = T.danger }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim }}
        >Déconnexion</button>
      </div>
    </aside>
  )
}
