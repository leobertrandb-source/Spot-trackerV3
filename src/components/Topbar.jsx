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
          letterSpacing: 1.25,
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
          transition: 'transform .2s ease',
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
        padding: nested ? '11px 12px 11px 18px' : '11px 12px',
        marginBottom: 6,
        borderRadius: 16,
        border: `1px solid ${isActive ? T.accent + '32' : 'rgba(255,255,255,0.04)'}`,
        background: isActive
          ? 'linear-gradient(135deg, rgba(45,255,155,0.12), rgba(255,255,255,0.02))'
          : 'transparent',
        color: isActive ? T.text : T.textMid,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all .2s ease',
        position: 'relative',
        backdropFilter: isActive ? 'blur(10px)' : 'none',
      }}
      onMouseEnter={
        !isActive
          ? (e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = T.text
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          : undefined
      }
      onMouseLeave={
        !isActive
          ? (e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = T.textMid
              e.currentTarget.style.transform = 'translateY(0px)'
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
            boxShadow: `0 0 12px ${T.accentGlowMd}`,
          }}
        />
      ) : null}

      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 11,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? 'rgba(45,255,155,0.12)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${isActive ? T.accent + '26' : 'rgba(255,255,255,0.05)'}`,
          fontSize: 13,
          flexShrink: 0,
          opacity: 1,
          boxShadow: isActive ? '0 0 18px rgba(45,255,155,0.08)' : 'none',
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
          maxHeight: open ? 340 : 0,
          overflow: 'hidden',
          transition: 'max-height .24s ease',
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
  const goalLabel =
    profile?.goal_type === 'mass_gain'
      ? 'Prise de masse'
      : profile?.goal_type === 'fat_loss'
        ? 'Perte de poids'
        : profile?.goal_type === 'athletic'
          ? 'Athlétique'
          : 'Objectif non défini'

  return (
    <aside
      style={{
        width: 272,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: `
          radial-gradient(circle at 18% 10%, rgba(45,255,155,0.10), transparent 28%),
          radial-gradient(circle at 100% 0%, rgba(255,255,255,0.04), transparent 25%),
          linear-gradient(180deg, rgba(17,20,19,0.98), rgba(10,13,12,1))
        `,
        borderRight: `1px solid rgba(255,255,255,0.08)`,
        backdropFilter: 'blur(18px)',
        overflow: 'hidden',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.02)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.75) 0.7px, transparent 0.7px)',
          backgroundSize: '14px 14px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          padding: '18px 16px 14px',
          borderBottom: `1px solid rgba(255,255,255,0.07)`,
          background: 'rgba(255,255,255,0.015)',
          zIndex: 1,
        }}
      >
        <Logo size="sm" />
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px 14px',
          zIndex: 1,
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
          position: 'relative',
          padding: 12,
          borderTop: `1px solid rgba(255,255,255,0.07)`,
          background: 'rgba(255,255,255,0.015)',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 12px',
            borderRadius: 18,
            border: `1px solid rgba(255,255,255,0.08)`,
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))',
            marginBottom: 10,
            boxShadow: '0 16px 30px rgba(0,0,0,0.20)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(45,255,155,0.16), rgba(255,255,255,0.03))',
              border: `1px solid ${T.accent + '28'}`,
              fontFamily: T.fontBody,
              fontWeight: 900,
              color: T.text,
              flexShrink: 0,
              boxShadow: '0 0 18px rgba(45,255,155,0.10)',
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
                color: T.textSub,
              }}
            >
              {goalLabel}
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
            border: `1px solid rgba(255,255,255,0.08)`,
            background: 'transparent',
            color: T.textMid,
            fontFamily: T.fontBody,
            fontWeight: 750,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all .18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
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
  padding: '11px 12px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))',
  color: '#D9E5DE',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all .18s ease',
}
