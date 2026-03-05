import { useLocation } from 'react-router-dom'
import { Logo } from './UI'
import { useAuth } from './AuthContext'
import { useDirty } from './DirtyContext'
import { T } from '../lib/data'

const NAV_ITEMS = [
  { to: '/aujourd-hui', icon: '◈', label: "Aujourd'hui", desc: 'Programme du jour' },
  { to: '/nutrition',   icon: '◉', label: 'Nutrition',   desc: 'Macros & hydratation' },

  // ✅ AJOUT RECETTES
  { to: '/recettes',    icon: '☰', label: 'Recettes',    desc: 'Bibliothèque & slider kcal' },

  { to: '/saisie',      icon: '✦', label: 'Séance libre', desc: 'Saisie manuelle' },
  { to: '/historique',  icon: '▦', label: 'Historique',  desc: 'Mes séances' },
  { to: '/progression', icon: '◎', label: 'Progression', desc: 'Courbes de perfs' },
]

const COACH_ITEMS = [
  { to: '/coach',      icon: '◆', label: 'Vue Coach',  desc: 'Suivi athlètes' },
  { to: '/programmes', icon: '▣', label: 'Programmes', desc: 'Builder de séances' },
]

function SectionLabel({ children }) {
  return (
    <div style={{ padding: '10px 10px 6px' }}>
      <span style={{
        fontFamily: T.fontBody,
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: 0.15,
        color: T.textSub,
      }}>
        {children}
      </span>
    </div>
  )
}

function NavBtn({ item, isActive, onClick, showDot }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        width: '100%',
        padding: '10px 10px',
        borderRadius: T.radius,
        background: isActive ? T.accentGlowSm : 'transparent',
        border: `1px solid ${isActive ? T.accent + '26' : 'transparent'}`,
        color: isActive ? T.text : T.textMid,
        fontFamily: T.fontBody,
        fontWeight: isActive ? 700 : 600,
        fontSize: 14,
        letterSpacing: 0.1,
        cursor: 'pointer',
        transition: 'all .15s',
        textAlign: 'left',
        position: 'relative',
      }}
      onMouseEnter={!isActive ? (e) => {
        e.currentTarget.style.background = T.card
        e.currentTarget.style.color = T.text
        e.currentTarget.style.borderColor = T.border
      } : undefined}
      onMouseLeave={!isActive ? (e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = T.textMid
        e.currentTarget.style.borderColor = 'transparent'
      } : undefined}
    >
      {isActive ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: 18,
            background: `linear-gradient(180deg, ${T.accentLight}, ${T.accentDim})`,
            borderRadius: '0 2px 2px 0',
            boxShadow: `0 0 10px ${T.accentGlowMd}`,
          }}
        />
      ) : null}

      <span
        style={{
          width: 26,
          height: 26,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          background: isActive ? (T.accent + '14') : 'transparent',
          border: `1px solid ${isActive ? (T.accent + '28') : 'transparent'}`,
          fontSize: 13,
          lineHeight: 1,
          opacity: isActive ? 1 : 0.7,
          transition: 'opacity .15s, background .15s, border-color .15s',
          flexShrink: 0,
        }}
      >
        {item.icon}
      </span>

      <span style={{ flex: 1 }}>{item.label}</span>

      {showDot ? (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: T.warn,
            flexShrink: 0,
            boxShadow: `0 0 8px ${T.warn}`,
            animation: 'pulseWarn 1.5s ease-in-out infinite',
          }}
        />
      ) : null}
    </button>
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
    <aside
      style={{
        width: 244,
        flexShrink: 0,
        background: T.surface,
        borderRight: `1px solid ${T.border}`,
        backdropFilter: 'blur(14px)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${T.border}` }}>
        <Logo size="sm" />
      </div>

      <nav
        style={{
          flex: 1,
          padding: '10px 8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        <SectionLabel>Athlète</SectionLabel>

        {NAV_ITEMS.map((item) => (
          <NavBtn
            key={item.to}
            item={item}
            isActive={location.pathname === item.to}
            onClick={() => tryNavigate(item.to)}
            showDot={isDirty && location.pathname === item.to}
          />
        ))}

        {isCoach ? (
          <>
            <div style={{ marginTop: 6 }} />
            <SectionLabel>Coach</SectionLabel>
            {COACH_ITEMS.map((item) => (
              <NavBtn
                key={item.to}
                item={item}
                isActive={location.pathname === item.to}
                onClick={() => tryNavigate(item.to)}
              />
            ))}
          </>
        ) : null}
      </nav>

      <div style={{ padding: 12, borderTop: `1px solid ${T.border}` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 10px',
            borderRadius: T.radius,
            border: `1px solid ${T.border}`,
            background: T.card,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: T.accentGlowSm,
              border: `1px solid ${T.accent + '28'}`,
              fontFamily: T.fontBody,
              fontWeight: 800,
              color: T.text,
            }}
          >
            {initial}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: T.fontBody,
              fontWeight: 800,
              fontSize: 13,
              color: T.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {name}
            </div>
            <div style={{
              marginTop: 2,
              fontFamily: T.fontBody,
              fontWeight: 650,
              fontSize: 12,
              color: isCoach ? T.accentLight : T.textSub,
            }}>
              {isCoach ? '🎯 Coach' : '💪 Athlète'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={signOut}
          style={{
            width: '100%',
            padding: '10px 10px',
            borderRadius: T.radius,
            border: `1px solid ${T.border}`,
            background: 'transparent',
            color: T.textMid,
            fontFamily: T.fontBody,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.card
            e.currentTarget.style.color = T.text
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = T.textMid
          }}
        >
          → Déconnexion
        </button>
      </div>

      <style>{`
        @keyframes pulseWarn {
          0%,100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: .5; }
        }
      `}</style>
    </aside>
  )
}
