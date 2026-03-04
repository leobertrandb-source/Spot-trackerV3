import { useLocation } from 'react-router-dom'
import { Logo } from './UI'
import { useAuth } from './AuthContext'
import { useDirty } from './DirtyContext'
import { T } from '../lib/data'

const NAV_ITEMS = [
  { to: '/aujourd-hui', icon: '◈', label: "Aujourd'hui",  desc: 'Programme du jour' },
  { to: '/nutrition',   icon: '◉', label: 'Nutrition',    desc: 'Macros & hydratation' },
  { to: '/saisie',      icon: '✦', label: 'Séance libre', desc: 'Saisie manuelle' },
  { to: '/historique',  icon: '▦', label: 'Historique',   desc: 'Mes séances' },
  { to: '/progression', icon: '◎', label: 'Progression',  desc: 'Courbes de perfs' },
]

const COACH_ITEMS = [
  { to: '/coach',      icon: '◆', label: 'Vue Coach',   desc: 'Suivi athlètes' },
  { to: '/programmes', icon: '▣', label: 'Programmes',  desc: 'Builder de séances' },
]

function NavBtn({ item, isActive, onClick, showDot }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 11,
      width: '100%', padding: '10px 10px', borderRadius: T.radius,
      background: isActive ? T.accentGlowSm : 'transparent',
      border: `1px solid ${isActive ? T.accent + '26' : 'transparent'}`,
      color: isActive ? T.text : T.textMid,
      fontFamily: T.fontBody,
      fontWeight: isActive ? 700 : 600,
      fontSize: 14, letterSpacing: 0.1,
      cursor: 'pointer', transition: 'all .15s',
      textAlign: 'left', position: 'relative',
    }}
      onMouseEnter={!isActive ? e => {
        e.currentTarget.style.background = T.card
        e.currentTarget.style.color = T.text
        e.currentTarget.style.borderColor = T.border
      } : undefined}
      onMouseLeave={!isActive ? e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = T.textMid
        e.currentTarget.style.borderColor = 'transparent'
      } : undefined}
    >
      {isActive && (
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 18,
          background: `linear-gradient(180deg, ${T.accentLight}, ${T.accentDim})`,
          borderRadius: '0 2px 2px 0',
          boxShadow: `0 0 10px ${T.accentGlowMd}`,
        }} />
      )}
      <span style={{
        width: 26, height: 26,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10,
        background: isActive ? (T.accent + '14') : 'transparent',
        border: `1px solid ${isActive ? (T.accent + '28') : 'transparent'}`,
        fontSize: 13, lineHeight: 1,
        opacity: isActive ? 1 : 0.7,
        transition: 'opacity .15s, background .15s, border-color .15s',
        flexShrink: 0,
      }}>{item.icon}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {showDot && (
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: T.warn, flexShrink: 0,
          boxShadow: `0 0 8px ${T.warn}`,
          animation: 'pulseWarn 1.5s ease-in-out infinite',
        }} />
      )}
      <style>{`@keyframes pulseWarn { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ padding: '10px 10px 6px' }}>
      <span style={{
        fontFamily: T.fontBody,
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: 0.15,
        color: T.textSub,
      }}>{children}</span>
    </div>
  )
}

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const { tryNavigate, isDirty } = useDirty()
  const location = useLocation()

  const isCoach = profile?.role === 'coach'
  const initial = (profile?.full_name || profile?.email || '?')[0].toUpperCase()
  const name = profile?.full_name || 'Athlète'

  return (
    <aside style={{
      width: 244, flexShrink: 0,
      background: T.surface,
      borderRight: `1px solid ${T.border}`,
      backdropFilter: 'blur(14px)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${T.border}` }}>
        <Logo size="sm" />
      </div>

      <nav style={{
        flex: 1, padding: '10px 8px 12px',
        display: 'flex', flexDirection: 'column', gap: 2,
        overflowY: 'auto',
      }}>
        <SectionLabel>Athlète</SectionLabel>
        {NAV_ITEMS.map(item => (
          <NavBtn key={item.to} item={item}
            isActive={location.pathname === item.to}
            onClick={() => tryNavigate(item.to)}
            showDot={isDirty && location.pathname === item.to}
          />
        ))}

        {isCoach && (
          <>
            <div style={{ marginTop: 6 }} />
            <SectionLabel>Coach</SectionLabel>
            {COACH_ITEMS.map(item => (
              <NavBtn key={item.to} item={item}
                isActive={location.pathname === item.to}
                onClick={() => tryNavigate(item.to)}
              />
            ))}
          </>
        )}
      </nav>

      <div style={{ padding: '12px 12px 16px', borderTop: `1px solid ${T.border}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', marginBottom: 10,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.accent}25, ${T.accentDim}15)`,
            border: `1.5px solid ${T.accent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.fontBody, fontWeight: 800, fontSize: 14,
            color: T.accent, flexShrink: 0,
          }}>{initial}</div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{
              fontFamily: T.fontBody, fontWeight: 700, fontSize: 13,
              color: T.text, lineHeight: 1.2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{name}</div>
            <div style={{
              fontSize: 12, color: T.textSub, marginTop: 2,
              letterSpacing: 0.1,
              fontFamily: T.fontBody, fontWeight: 600,
            }}>
              {isCoach ? '🎯 Coach' : '💪 Athlète'}
            </div>
          </div>
        </div>

        <button onClick={signOut} style={{
          width: '100%',
          background: 'transparent',
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: '10px 0',
          fontFamily: T.fontBody, fontWeight: 650,
          fontSize: 13, letterSpacing: 0.1,
          color: T.textMid,
          cursor: 'pointer', transition: 'all .15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = T.danger + '55'
            e.currentTarget.style.color = T.danger
            e.currentTarget.style.background = T.dangerGlow
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = T.border
            e.currentTarget.style.color = T.textDim
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span style={{ fontSize: 12 }}>→</span> Déconnexion
        </button>
      </div>
    </aside>
  )
}
