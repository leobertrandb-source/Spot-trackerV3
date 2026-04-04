import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'
import {
  LayoutDashboard, Users, Dumbbell, CalendarDays, Stethoscope,
  ClipboardList, Activity, Zap, BarChart2, TrendingUp,
  Apple, BookOpen, ChevronRight, LogOut, User, Shield,
  Heart, Timer, Flame, Target, Calendar, Scale, CheckSquare
} from 'lucide-react'

// ─── Icônes par route ──────────────────────────────────────────────────────────
const NAV_ICONS = {
  '/coach':                  LayoutDashboard,
  '/coach/clients':          Users,
  '/programmes':             ClipboardList,
  '/exercices':              Dumbbell,
  '/calendrier':             CalendarDays,
  '/medical':                Stethoscope,
  '/mon-tableau-de-bord':    LayoutDashboard,
  '/mon-espace':             User,
  '/entrainement/aujourdhui': Zap,
  '/entrainement/libre':     Dumbbell,
  '/progression':            TrendingUp,
  '/nutrition/macros':       Apple,
  '/nutrition/recettes':     BookOpen,
  '/prep/hooper':            Heart,
  '/prep/charge':            Activity,
  '/prep/charge-externe':    Timer,
  '/prep/topset':            BarChart2,
  '/prep/compo':             Scale,
  '/prep/dashboard':         LayoutDashboard,
  '/prep/analyse':           Target,
  '/planning':               Calendar,
  '/ma-presence':            CheckSquare,
}

// ─── Couleurs accent par route ─────────────────────────────────────────────────
const NAV_ACCENTS = {
  '/coach':                  '#60a5fa',
  '/coach/clients':          '#a78bfa',
  '/programmes':             '#3ecf8e',
  '/exercices':              '#fb923c',
  '/calendrier':             '#22d3ee',
  '/medical':                '#f43f5e',
  '/mon-tableau-de-bord':    '#3ecf8e',
  '/mon-espace':             '#22d3ee',
  '/entrainement/aujourdhui':'#f43f5e',
  '/entrainement/libre':     '#3ecf8e',
  '/progression':            '#f59e0b',
  '/nutrition/macros':       '#3ecf8e',
  '/nutrition/recettes':     '#f59e0b',
  '/prep/hooper':            '#f59e0b',
  '/prep/charge':            '#60a5fa',
  '/prep/charge-externe':    '#f59e0b',
  '/prep/topset':            '#3ecf8e',
  '/prep/compo':             '#f59e0b',
  '/prep/dashboard':         '#a78bfa',
  '/ma-presence':            '#3ecf8e',
  '/planning':               '#22d3ee',
}

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ to, label, active, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false)
  const accent = NAV_ACCENTS[to] || T.accent
  const Icon = NAV_ICONS[to] || Target

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
        padding: '8px 10px',
        borderRadius: 12,
        textDecoration: 'none',
        background: active
          ? `linear-gradient(135deg, ${accent}22, ${accent}08)`
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${active ? accent + '30' : 'transparent'}`,
        transition: 'all 0.15s ease',
        animation: 'navSlideIn 0.35s ease both',
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Icon container */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        background: active ? `${accent}20` : hovered ? `${accent}12` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? accent + '35' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.15s ease',
      }}>
        <Icon size={15} color={active ? accent : hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'} strokeWidth={active ? 2.5 : 2} />
      </div>

      <span style={{
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        color: active ? T.text : hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)',
        transition: 'color 0.15s ease',
        flex: 1,
        fontFamily: T.fontBody,
        letterSpacing: active ? 0 : 0.1,
      }}>
        {label}
      </span>

      {active && (
        <div style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: accent,
          flexShrink: 0,
          boxShadow: `0 0 6px ${accent}`,
        }} />
      )}
    </Link>
  )
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9.5,
      fontWeight: 800,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.2)',
      padding: '10px 10px 4px',
      fontFamily: T.fontBody,
    }}>
      {children}
    </div>
  )
}

// ─── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 6px' }} />
}

// ─── Sidebar frame ─────────────────────────────────────────────────────────────
function SidebarFrame({ children, isMobile }) {
  return (
    <aside style={{
      width: 256,
      height: isMobile ? '100dvh' : '100vh',
      background: '#080d14',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      padding: '16px 10px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      overflowY: 'auto',
      boxShadow: isMobile ? '4px 0 32px rgba(0,0,0,0.5)' : 'none',
    }}>
      <style>{`
        @keyframes navSlideIn { from { opacity: 0; transform: translateX(-6px) } to { opacity: 1; transform: translateX(0) } }
      `}</style>
      {children}
    </aside>
  )
}

// ─── User card ─────────────────────────────────────────────────────────────────
function UserCard({ name, roleLabel, email }) {
  const initials = (name || email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        flexShrink: 0,
        background: `linear-gradient(135deg, ${T.accent}30, ${T.accent}10)`,
        border: `1px solid ${T.accent}30`,
        display: 'grid',
        placeItems: 'center',
        fontSize: 12,
        fontWeight: 800,
        color: T.accent,
        fontFamily: T.fontBody,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.fontBody }}>
          {name || email || 'Utilisateur'}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginTop: 1 }}>{roleLabel}</div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Sidebar({ isMobile = false, mobileOpen = false, onClose }) {
  const location = useLocation()
  const { profile, user, signOut, showMethodeSpot, showPrepPhysique } = useAuth()
  const isCoach = profile?.role === 'coach'
  const isStaffMedical = profile?.role === 'staff_medical'

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/')

  async function handleLogout() {
    try { await signOut?.() } catch {}
    if (onClose) onClose()
  }

  const roleLabel = isStaffMedical ? 'Staff médical' : isCoach ? (showPrepPhysique ? 'Préparateur physique' : 'Coach') : 'Athlète'

  // ── Navigation sets ────────────────────────────────────────────────────────
  const coachPrepLinks = [
    { to: '/coach',      label: 'Dashboard' },
    { to: '/medical',    label: 'Médical & Effectif' },
    { to: '/calendrier', label: 'Calendrier' },
  ]

  const coachPersoLinks = [
    { to: '/coach',         label: 'Dashboard' },
    { to: '/coach/clients', label: 'Clients' },
    { to: '/planning',      label: 'Planning' },
    { to: '/programmes',    label: 'Programmes' },
    { to: '/exercices',     label: 'Exercices' },
  ]

  const coachLinks = showPrepPhysique ? coachPrepLinks : coachPersoLinks

  const progRoute = {
    mass_gain: '/programme/bodybuilding',
    fat_loss:  '/programme/perte-de-poids',
    athletic:  '/programme/athletique',
  }[profile?.goal_type] || '/objectif'

  const athletePrepLinks = [
    { to: '/mon-tableau-de-bord',  label: 'Dashboard' },
    { to: '/prep/hooper',          label: 'Hooper' },
    { to: '/prep/charge',          label: 'Charge interne' },
    { to: '/prep/charge-externe',  label: 'Charge externe' },
    { to: '/prep/topset',          label: 'Topset' },
    { to: '/prep/compo',           label: 'Composition' },
    { to: '/calendrier',           label: 'Calendrier' },
    { to: '/ma-presence',          label: 'Ma présence' },
  ]

  const athleteTrainLinks = [
    { to: '/mon-espace',              label: 'Mon espace' },
    { to: '/entrainement/aujourdhui', label: 'Séance du jour' },
    { to: '/entrainement/libre',      label: 'Séance libre' },
    { to: '/progression',             label: 'Progression' },
    { to: '/exercices',               label: 'Exercices' },
    ...(showMethodeSpot ? [{ to: progRoute, label: 'Méthode & objectif' }] : []),
  ]

  const athleteNutritionLinks = [
    { to: '/nutrition/macros',   label: 'Nutrition' },
    { to: '/nutrition/recettes', label: 'Recettes' },
  ]

  // ── Logo ───────────────────────────────────────────────────────────────────
  const logo = (
    <div style={{ padding: '6px 10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src="/icons/icon-192.png" alt="Atlyo" style={{ width: 32, height: 32, borderRadius: 10, objectFit: 'contain' }} />
      <div>
        <div style={{ fontFamily: T.fontBody, fontWeight: 900, fontSize: 16, color: T.text, letterSpacing: -0.3 }}>
          atl<span style={{ color: T.accent }}>yo</span>
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 1 }}>
          {roleLabel}
        </div>
      </div>
    </div>
  )

  // ── Nav content ────────────────────────────────────────────────────────────
  let nav
  if (isStaffMedical) {
    nav = (
      <div style={{ display: 'grid', gap: 2 }}>
        <SectionLabel>Médical</SectionLabel>
        {[{ to: '/medical', label: 'Médical' }, { to: '/calendrier', label: 'Calendrier' }].map((item, i) => (
          <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
        ))}
      </div>
    )
  } else if (isCoach) {
    nav = (
      <div style={{ display: 'grid', gap: 2 }}>
        <SectionLabel>{showPrepPhysique ? 'Prépa physique' : 'Coaching'}</SectionLabel>
        {coachLinks.map((item, i) => (
          <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
        ))}
      </div>
    )
  } else if (showPrepPhysique) {
    nav = (
      <div style={{ display: 'grid', gap: 2 }}>
        <SectionLabel>Prépa physique</SectionLabel>
        {athletePrepLinks.map((item, i) => (
          <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
        ))}
      </div>
    )
  } else {
    nav = (
      <>
        <div style={{ display: 'grid', gap: 2 }}>
          <SectionLabel>Entraînement</SectionLabel>
          {athleteTrainLinks.map((item, i) => (
            <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
          ))}
        </div>
        <Divider />
        <div style={{ display: 'grid', gap: 2 }}>
          <SectionLabel>Nutrition</SectionLabel>
          {athleteNutritionLinks.map((item, i) => (
            <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i + 6} />
          ))}
        </div>
      </>
    )
  }

  const content = (
    <SidebarFrame isMobile={isMobile}>
      {logo}
      <Divider />

      <div style={{ flex: 1, display: 'grid', alignContent: 'start', gap: 2 }}>
        {nav}
      </div>

      {/* Footer */}
      <div style={{ paddingTop: 10, display: 'grid', gap: 6 }}>
        <Divider />
        <UserCard name={profile?.full_name} email={user?.email} roleLabel={roleLabel} />
        <a
          href="/politique-confidentialite"
          style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.18)', textDecoration: 'none', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center', display: 'block' }}
        >
          Confidentialité & RGPD
        </a>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            height: 38,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: T.fontBody,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.2)'; e.currentTarget.style.color = '#fda4af' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
        >
          <LogOut size={13} />
          Déconnexion
        </button>
      </div>
    </SidebarFrame>
  )

  if (!isMobile) return content

  return (
    <>
      {mobileOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,23,0.7)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      )}
      <div style={{ position: 'fixed', top: 0, left: mobileOpen ? 0 : -270, zIndex: 70, transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {content}
      </div>
    </>
  )
}
