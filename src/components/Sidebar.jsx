import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Logo } from './UI'
import { useAuth } from './AuthContext'
import { useDirty } from './DirtyContext'
import { T } from '../lib/data'

const TRAINING_ITEMS = [
  { to: '/entrainement/aujourdhui', icon: '◈', label: "Séance du jour" },
  { to: '/entrainement/libre', icon: '✦', label: 'Séance libre' },
  { to: '/entrainement/historique', icon: '▦', label: 'Historique' },
]

const NUTRITION_ITEMS = [
  { to: '/nutrition/macros', icon: '◉', label: 'Suivi macros' },
  { to: '/nutrition/plan', icon: '▤', label: 'Plan journalier' },
  { to: '/nutrition/recettes', icon: '☰', label: 'Recettes' },
]

const COACH_ITEMS = [
  { to: '/coach', icon: '◆', label: 'Vue Coach' },
  { to: '/programmes', icon: '▣', label: 'Programmes' },
]

function SectionTitle({ children, isOpen, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 10px 8px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: T.textSub,
      }}
    >
      <span
        style={{
          fontFamily: T.fontBody,
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </span>

      <span
        style={{
          fontSize: 12,
          color: T.textDim,
          transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform .18s ease',
        }}
      >
        ▾
      </span>
    </button>
  )
}

function NavItem({ item, isActive, onClick, nested = false, showDot = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: nested ? '10px 12px 10px 18px' : '11px 12px',
        marginBottom: 6,
        borderRadius: 14,
        border: `1px solid ${isActive ? T.accent + '28' : 'transparent'}`,
        background: isActive ? T.accentGlowSm : 'transparent',
        color: isActive ? T.text : T.textMid,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all .18s ease',
        position: 'relative',
      }}
      onMouseEnter={
        !isActive
          ? (e) => {
              e.currentTarget.style.background = T.card
              e.currentTarget.style.borderColor = T.border
              e.currentTarget.style.color = T.text
            }
          : undefined
      }
      onMouseLeave={
        !isActive
          ? (e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.color = T.textMid
            }
          : undefined
      }
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
            borderRadius: '0 3px 3px 0',
            background: `linear-gradient(180deg, ${T.accentLight}, ${T.accent})`,
            boxShadow: `0 0 10px ${T.accentGlowMd}`,
          }}
        />
      ) : null}

      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 10,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? T.accent + '14' : 'transparent',
          border: `1px solid ${isActive ? T.accent + '24' : 'transparent'}`,
          fontSize: 13,
          flexShrink: 0,
          opacity: isActive ? 1 : 0.75,
        }}
      >
        {item.icon}
      </span>

      <span
        style={{
          flex: 1,
          fontFamily: T.fontBody,
          fontWeight: isActive ? 800 : 650,
          fontSize: 14,
          letterSpacing: 0.1,
        }}
      >
        {item.label}
      </span>

      {showDot ? (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: T.warn,
            boxShadow: `0 0 8px ${T.warn}`,
            flexShrink: 0,
          }}
        />
      ) : null}
    </button>
  )
}

function SectionBlock({ title, items, open, setOpen, pathname, tryNavigate, isDirty }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <SectionTitle isOpen={open} onClick={() => setOpen(!open)}>
        {title}
      </SectionTitle>

      <div
        style={{
          maxHeight: open ? 320 : 0,
          overflow: 'hidden',
          transition: 'max-height .22s ease',
          paddingLeft: 4,
        }}
      >
        {items.map((item) => (
          <NavItem
            key={item.to}
            item={item}
            nested
            isActive={pathname === item.to}
            onClick={() => tryNavigate(item.to)}
            showDot={isDirty && pathname === item.to}
          />
        ))}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname

  const { profile, signOut } = useAuth()
  const { tryNavigate, isDirty } = useDirty()

  const [openTraining, setOpenTraining] = useState(true)
  const [openNutrition, setOpenNutrition] = useState(true)
  const [openCoach, setOpenCoach] = useState(true)

  const isCoach = profile?.role === 'coach'
  const initial = (profile?.full_name || profile?.email || '?')[0].toUpperCase()
  const name = profile?.full_name || 'Athlète'

  return (
    <aside
      style={{
        width: 258,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`,
        borderRight: `1px solid ${T.border}`,
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '18px 16px 14px',
          borderBottom: `1px solid ${T.border}`,
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        <Logo size="sm" />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px 14px',
        }}
      >
        <SectionBlock
          title="Entraînement"
          items={TRAINING_ITEMS}
          open={openTraining}
          setOpen={setOpenTraining}
          pathname={pathname}
          tryNavigate={tryNavigate}
          isDirty={isDirty}
        />

        <SectionBlock
          title="Nutrition"
          items={NUTRITION_ITEMS}
          open={openNutrition}
          setOpen={setOpenNutrition}
          pathname={pathname}
          tryNavigate={tryNavigate}
          isDirty={isDirty}
        />

        <div style={{ marginTop: 4, marginBottom: 14 }}>
          <div
            style={{
              padding: '8px 10px 6px',
              fontFamily: T.fontBody,
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: T.textSub,
            }}
          >
            Progression
          </div>

          <NavItem
            item={{ to: '/progression', icon: '◎', label: 'Progression' }}
            isActive={pathname === '/progression'}
            onClick={() => tryNavigate('/progression')}
            showDot={isDirty && pathname === '/progression'}
          />
        </div>

        {isCoach ? (
          <SectionBlock
            title="Coach"
            items={COACH_ITEMS}
            open={openCoach}
            setOpen={setOpenCoach}
            pathname={pathname}
            tryNavigate={tryNavigate}
            isDirty={false}
          />
        ) : null}
      </div>

      <div
        style={{
          padding: 12,
          borderTop: `1px solid ${T.border}`,
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 10px',
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            background: T.card,
            marginBottom: 10,
            boxShadow: T.shadowCard,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: T.accentGlowSm,
              border: `1px solid ${T.accent + '28'}`,
              fontFamily: T.fontBody,
              fontWeight: 900,
              color: T.text,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.fontBody,
                fontWeight: 800,
                fontSize: 13,
                color: T.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </div>

            <div
              style={{
                marginTop: 2,
                fontFamily: T.fontBody,
                fontWeight: 650,
                fontSize: 12,
                color: isCoach ? T.accentLight : T.textSub,
              }}
            >
              {isCoach ? '🎯 Coach' : '💪 Athlète'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => tryNavigate('/mon-espace')}
            style={profileBtnStyle}
          >
            Mon espace
          </button>

          <button
            type="button"
            onClick={() => tryNavigate('/objectif')}
            style={profileBtnStyle}
          >
            Mon objectif / changer
          </button>
        </div>

        <button
          type="button"
          onClick={signOut}
          style={{
            width: '100%',
            padding: '11px 12px',
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            background: 'transparent',
            color: T.textMid,
            fontFamily: T.fontBody,
            fontWeight: 750,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all .18s ease',
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
    </aside>
  )
}

const profileBtnStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent',
  color: '#B8C3BC',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  textAlign: 'left',
}
