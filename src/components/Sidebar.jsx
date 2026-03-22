import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'


// ─── Tokens ProSportConcept ───────────────────────────────────────────────────
const PS = {
  bg:     T.bg,
  card:   T.bgAlt,
  border: T.border,
  text:   T.text,
  sub:    T.textMid,
  dim:    T.textDim,
  accent: '#1a3a2a',
  active: '#1a3a2a',
}

// ─── Images depuis Supabase Storage ──────────────────────────────────────────
import { NAV_IMAGES } from '../lib/navImages'

const NAV_ACCENTS = {
  '/coach':                    '#4d9fff',
  '/coach/clients':            '#9d7dea',
  '/programmes':               '#3ecf8e',
  '/exercices':                '#ff7043',
  '/mon-espace':               '#26d4e8',
  '/entrainement/aujourdhui':  '#ff4566',
  '/entrainement/libre':       '#3ecf8e',
  '/progression':              '#fbbf24',
  '/nutrition/macros':         '#3ecf8e',
  '/nutrition/recettes':       '#f59e0b',
  '/programme/bodybuilding':   '#9d7dea',
  '/programme/perte-de-poids': '#ff7043',
  '/programme/athletique':     '#4d9fff',
  '/prep/hooper':              '#fbbf24',
  '/prep/charge':              '#4d9fff',
  '/prep/compo':               '#9d7dea',
  '/prep/topset':              '#3ecf8e',
  '/prep/charge-externe':      '#fbbf24',
  '/prep/dashboard':            '#9d7dea',
}

function NavVisual({ path }) {
  const img = NAV_IMAGES[path]
  const accent = NAV_ACCENTS[path] || '#3ecf8e'

  return (
    <div style={{
      width: 32, height: 32, borderRadius: 9, overflow: 'hidden',
      flexShrink: 0, position: 'relative',
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent}25`,
    }}>
      {img ? (
        <>
          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 30%, ${accent}25, transparent 70%)` }} />
      )}
    </div>
  )
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ to, label, active, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false)
  const accent = NAV_ACCENTS[to] || '#3ecf8e'

  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 12, textDecoration: 'none',
        background: active
          ? `linear-gradient(135deg, ${accent}18, ${accent}08)`
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${active ? accent + '35' : hovered ? 'rgba(255,255,255,0.07)' : 'transparent'}`,
        transition: 'all 0.18s ease',
        animation: `navSlideIn 0.4s ease both`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      <NavVisual path={to} />
      <span style={{
        fontSize: 13, fontWeight: active ? 700 : 500,
        color: active ? accent : hovered ? '#c8d4e0' : '#7a8fa6',
        transition: 'color 0.15s ease', flex: 1,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </span>
      {active && (
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, flexShrink: 0 }} />
      )}
    </Link>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function NavItemPS({ to, label, active, onClick, index = 0 }) {
  const style = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 10,
    textDecoration: 'none',
    fontSize: 13, fontWeight: active ? 600 : 400,
    color: active ? PS.active : PS.sub,
    background: active ? `${PS.accent}10` : 'transparent',
    border: `1px solid ${active ? PS.accent+'25' : 'transparent'}`,
    transition: 'all 0.15s',
    animation: `navSlideIn 0.2s ease both`,
    animationDelay: `${index * 0.04}s`,
  }
  return (
    <Link to={to} style={style} onClick={onClick}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = PS.text } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PS.sub } }}>
      <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: PS.active, flexShrink: 0 }} />}
    </Link>
  )
}

function SectionLabelPS({ children }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: PS.dim, padding: '4px 10px 2px', fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, letterSpacing: 1.4,
      textTransform: 'uppercase', color: '#3d4f61',
      padding: '4px 10px 2px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {children}
    </div>
  )
}

// ─── Avatar initiales ─────────────────────────────────────────────────────────

function Avatar({ name, role }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color = role === 'coach' ? '#4d9fff' : '#3ecf8e'
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
      background: `linear-gradient(135deg, ${color}25, ${color}10)`,
      border: `1px solid ${color}35`,
      display: 'grid', placeItems: 'center',
      fontSize: 13, fontWeight: 800, color,
      fontFamily: "'Syne', sans-serif",
    }}>
      {initials}
    </div>
  )
}

// ─── Sidebar principale ───────────────────────────────────────────────────────

function Sidebar({ isMobile = false, mobileOpen = false, onClose }) {
  const location = useLocation()
  const { profile, user, signOut, showMethodeSpot, showPrepPhysique } = useAuth()
  const isCoach = profile?.role === 'coach'

  const coachLinks = showPrepPhysique ? [
    { to: '/coach',          label: 'Dashboard' },
    { to: '/programmes',     label: 'Programmes' },
    { to: '/exercices',      label: 'Exercices' },
  ] : [
    { to: '/coach',          label: 'Dashboard' },
    { to: '/coach/clients',  label: 'Clients' },
    { to: '/programmes',     label: 'Programmes' },
    { to: '/exercices',      label: 'Exercices' },
  ]

  const progRoute = {
    mass_gain: '/programme/bodybuilding',
    fat_loss:  '/programme/perte-de-poids',
    athletic:  '/programme/athletique',
  }[profile?.goal_type] || '/objectif'

  const athleteMainLinks = [
    { to: '/mon-espace',                 label: 'Mon espace' },
    { to: '/entrainement/aujourdhui',    label: 'Séance du jour' },
    { to: '/entrainement/libre',         label: 'Séance libre' },
    { to: '/progression',                label: 'Progression' },
    { to: '/exercices',                  label: 'Exercices' },
    ...(showMethodeSpot ? [{ to: progRoute, label: 'Méthode & objectif' }] : []),
    ...(showPrepPhysique ? [
      { to: '/prep/hooper',  label: 'HOOPER' },
      { to: '/prep/charge',  label: 'Charge interne' },
      { to: '/prep/charge-externe', label: 'Charge externe' },
      { to: '/prep/compo',   label: 'Composition corporelle' },
      { to: '/prep/topset',  label: 'TOPSET' },
    ] : []),
  ]

  const athleteNutritionLinks = [
    { to: '/nutrition/macros',   label: 'Nutrition' },
    { to: '/nutrition/recettes', label: 'Recettes' },
  ]

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/')

  async function handleLogout() {
    try {
      await signOut?.()
      if (onClose) onClose()
    } catch (e) {
      console.error(e)
    }
  }

  // ProSportConcept blanc cassé vs Le Spot sombre
  if (showPrepPhysique) {
    const psContent = (
      <aside style={{
        width: 260, height: isMobile ? '100dvh' : '100vh',
        background: PS.bg,
        borderRight: `1px solid ${PS.border}`,
        padding: '20px 12px',
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 4,
        overflowY: 'auto',
        boxShadow: isMobile ? '8px 0 24px rgba(0,0,0,0.08)' : 'none',
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
          @keyframes navSlideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
          .ps-logout:hover { background: #fee2e2 !important; color: #c0392b !important; }
        `}</style>

        {/* Logo ProSportConcept */}
        <div style={{ padding: '12px 10px 16px', borderBottom: `1px solid ${PS.border}`, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAEuAUYDASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAEIBwkCBQYEA//EAFEQAAEDAwEEBAsDBwcJCQAAAAEAAgMEBREGBwghMRJBYYETFBYYIlFWcZGT0TKUoRVCVXSxwdIjJCc3UmKCMzZDRnJ1krKzNDVERWVzlaPh/8QAGQEBAQEBAQEAAAAAAAAAAAAAAAECBAMF/8QAHREBAQEBAAMAAwAAAAAAAAAAAAERAgMSIQQxQf/aAAwDAQACEQMRAD8AtwiIsNCIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICKcH1LC+2Pb9ZNC3CWyW2jN4vUZ6MsQdiOA/3iOfuzlGeupzPrM6Kmx3odoAqhN+SrD4HP8AkiyQ8D6/T5rMuxvbvZNc1TLLdI47Ne3ECKN0g6FQT1Rk8z2dqmszy81mRFDD0gBgjr48/cpVelgiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICYzyRS3BPHiEHgtvOuvIHZxX3inewV7h4Gja4/wClcMNPaAcFUDkllnnkqJ3vknmPSle52S4nmVljfi1229a/pdK0MwdR2dmZ+i7IdM4ZPYcNLR2EFYiie10bXtOQRzCOL8m1z6RzzPDgFzhqZ6KpirqWR0VTTPEkT28w4cl+fNcZ5BFC6U8mqY4+er7L/wCwTW/l5s3t14nla64MYIa7HD+WbwcQPUTkhe+VHtyLXjLJryo0tXyObT3kHwA6foNmaOlxz2Bw95V4iCDg81X2JPkQiIoaIiKqIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgLzW1LVNNozQN31HUvDPFKcmPjze70Wj4kL0vE8hlU8389eNqa63aEt8/SbAfG64NP52MMBPWMO5etEVgvlxnu14q7pUuc+eqmdK8uOSS48VNvuT6NrY3gvi5Y6wvhQ8lrGOuZ1HrfG4hRGpwej1BdFc7jLVN8GwdBn7V9x/wA3wP7v710SmObxeLmdV9diuU9ovNHdKRzmTUs7ZoyD1tOcLZ3sr1XT600Ja9QQSBxqYR4Vv9iQcHD4glat3D0cBWt3CtePhr7hoWumAhnPjNE3H5wHptz6sBLHVq4aIUUWQRERoREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBET3c0HV6tvdFpvTFxvtwk8HS0NO6aR+eQAWrzXOpK3Vur7lqKvwJ6+d0zmjkzJyGj1AK22/br4UOm6PQ9BNiorneHreieLIhwaO89L4BUxx6+JVkTQIgQrTNrvnf9wD/AGf3rol6DoONg/ycn2c8urnlefWXh499qgrutDahrdKautuoKCR7JqKZswAOA8A8WnsOMLpvcoIGSes81XQ2taRvUGo9NW6+Un/Z62nbKw9fH1rteaq9uIa6jrbDXaIr5Wtno3Ceia7m6M8HDsAPR+KtDnPHj3qVYIiKKIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAvwuNTBQ2+orqqQR08ETpJXHqa0Ek9wGV+6r9vta/Omtn8emqKcx195PQdg8RD+cfccEd6Ip9tg1ZU612i3e/zPcWTTFsLSfsRtOAB2dfevJIMAY5KVpBdzojT9ZqjVlssVFG98tZUNZ6I6uv8AumVqtw/QBnuVdr2uiPQhaaaiyOBcSC5w7RgDvKJYya7dusJvJqhXvFGbb4p4sGDg/wHg+mDj1+l71SHXVgqtLatuNhrmdCaklLB/eb1Eevgtqx+ycH/wDFTnfx0A6nuNBryhhJZMzxWsIb9hwOWO78u+CiySRVVSo44QKyD1uyHVtRovaHar/E8hsUoZN2xuPEfgtndtrqW52+muFE4upqmJs0Tsfaa4Ag/A5WphuQ7gccOCvXuS698otAO01WTl1fZvRYXni6En0fgCGqVYsGiEIooiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiIIleyKJ80ha1kbS8uI5Acz2LW5vNa5Ou9qtxr4JelQ0r/FaRoOWhjOBcOxxBd3q429nrtmjNlNXDTS9C5XR/ikGDghpBL3j3YA/wAS12u+1xOSev1qyJXEdXuXIJhOS0j7bLbqq8XiltVDGZaqqlbFCwc3PccADtytnmyzS1NozQdq09TgE0sIEj/7biBkqoW43oL8v66m1bVx9Kjs/CHIyHT4yO8ZBV4wsWjmvL7VNKUetdC3PTtY0FtTCegc46DwODh2r045I4A+rsTWv41NXu21NnvFXaqxojqKSR0UjR/aacEL5ArE78uh22HXcGq6KPwdHeRiVoaA1sw597uJ7lXXiOB4LUZS7ksk7tuuZtCbUbbXvc3xGqlbS1LXO6Leg/0emf8AZznuWNlDi7qJGOSVG26J7JoGTxODo3jLSDkEEZB/Fclh7dM175abL6WGqmDrlbMU8+eJc3HouPdw7lmI8OYwQs4sQiIjQiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAnVlFjveI1sdCbL7pd4nhtbJH4CjwePhXcAcdnAoin2+Hroax2oyUdLKXW+zNNLBg8HOz6bh78BYTwv1nnkqJ5JpZHPe9xc4uOSSVwVnxn6gcSB6yudJFJVVMVPCwvlleGMaOZcTgD4ris1boGgPLPadDcKuHNusw8Zmzyc8cGD35IPcqq4uwDRUGhtl1qtTWgVc8YqawgYJkdx4+4YHcvfhByIxjhgDqUrNEjkpUBMorH+8BoyHXGy+62h0TX1DGeMUx6OSJGceHvGR3rWlUU8tNUS087ejLG9zHsPNhBwR+C22O4tOAD2Fa+98LQDtGbTJbnTw+Dtl5/nEOG4DX8nt9+QT3qwrCgCEKAVPMLSMz7n2un6Q2pw0NTUOjtt5Apph0sNa8/YcewZK2ENORzz2+takoZX08zJo3OY9jg5rmnGCFso3dtajXey+23SWWN9ZEwQ1QDh0g9owSR281KMiopwmFhUIiKqIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIg4lBIzngOPUqMb8Ov/AMv64h0pQTh9FaG/y3RPB87uJ+A6I7lcDanqmm0ZoK76hqZQ001MTFk4JkPBgHeRnsytX93rqi53esuVXJ05qqZ00hz+c45P7UiV8gXIclCkclpABxe0Mb0ieAHWth+6TofyO2UUclZT+Dud0Aq6nI9JvSGWNPuBwqe7tOh3a72pUFBLD06GlPjNWSOAY08j7/3LZAzDWhoUHJSFCKX6sgiIinx7hlYe3tdDu1nsorHUUQfcLYDVwehlzg0Zc0dpAwswqHNa9pa4AgjBBVg1HlrmPLXDDhwIK5Dksnby2hvIXadXUcEeKCrcaijOPzCeI7v3rGIVjOocM81Yrce183T2uqjS1fMRQ3hg8Fk8GztGQf8Ah6Q71XdfVZ66e2XWluNM7ozU0rZWHtacpRtjyfeOorkF5bZNqul1ns9tGoaVwIqKceFBIJEjfRdn/ECV6kHK86BUKSoVUREVUREQEREBERAREQEREBERAREQEREBERAQEZHHj1Iuq1ffaLTGma+/XCUR01HEZHu7uCIqZv567NVeaDRFFUO8FSAVFWGngXlvotPZgn4Kq67rW2oKzVeqrnqKvcXVFfUvncCc9HpEnojsHJdKtSJop6lC/WleyOoikkiErGvDnMJwHAHiO9KL3blmgBpnZ2/UNbCG3C+OD+0QN+wOw5LviFn0YyqQW7e01PQW+noabTVuZDTxtjY3wxwABgfmr9/PA1cP9XLd84/wqUXZ4dicFSbzwdXezdu+cf4U88LV3s3bvnH+FRdxdgplUn88DVx/1ct3zj/Cnnf6u9nLd84/wqpq7HBFSfzv9Xezlu+cf4U87/V3s5bvnH+FFjLO+xs/ZqTZ0dS0cINxsrum4gZJhd9sfENVDm5AAJJ7lZK4722p7hQT0NVpi2SQTxuje10pILSMf2VXKskjmq5ZYoRDG95c2MHIYCeA7lYY/LKZKJ8Fai1O4Zr00t0r9C18g8DVZqKMudgNkxxb7sDPvJVyAtUujNQV2ldU27UNvcBUUM7ZmdIZBwc4I9S2haMvtLqXStuv1E8SU9bC2Rjh2jjlZwdwVCZzxRRRERFEREBERAREQEREBERAREQEREBERAREQOHMnh1lVa379euobVQ6Fo5m+HrP5zVtHMRcmZ7Cel8FZy7V1PbLXVXGreI4KWF0sjvU1oJP4BayNsGrarW20K66iqDhs8pbCwOyGsbwGOzrVjNeQdknn61GFyRaHH9ikcueV3WhrBWap1da9PUDC6WtqGx8OYbzce4Aq5cW6RoDwbfCXG7F2OJ8KBnt5IKNqDyV5/NJ2e/pG7fOH0TzSNnv6Ru/zh9FBRbipV5/NH2e/pC7/OH0TzR9nv6Ru/zh9FCqMgplXm80fZ7+kLv84fRDukbPf0hd/nD6IKM5TKvMN0jZ7+kbv84fRPNH2e/pC7/OH0RVGcqDyJV5/NH2e/pC7/OH0XGXdH0AY3eDuN3EnRPRJkGM44Z4JqKNIu71xp2s0rqu46fr4yyejndGePMcwfgQulwqI6sK5e4lrx1dZ6zQ9bIXyUv84pCeqPk5o7B6PxVNcL1WyTVVRoraBatQU78NgmDZGF2GuYTgg9nX3JRtFxjrB7QUXzWmtprla6WvopBLTVELJInjk5pAIPwX0rKiIiKIiICIiAiIgIiICIiAiIgIiICIiAiLhUSxwU0s8r+hHEwvcfUBxKJar9vv67fp7Z7Fpejn6FZenYf0ThzYWn0j7jgt71RQYxgZ95WRd4vXUuvNp9yuTXudR08hp6QZyBGz0cj34z3rHaqCIvrslrrb1eKa126J01XVSNiijAzlxOAqLS7hWhBJU3DXVwph/JfzWhLxwJJy9w7Rhoz2q32OfacrzWy3S1Po/QVp0/TtGKSna2R+MGR+PSce1elKzaIwmFKKRcERFowREU0giIqtEx1dZ5BSMKD6lllUHfw0F4Oah17QwjEg8WregOsHLXH35I7lU88yMH4LaRtQ0tT6z0LddPVDugKuBzWPAyWPxwIWsO/2yssl7q7TcInRVVLK6KVh6nA4K1B8a4vHAA448cHrCZTqx3qi9W5Brryg0JLpmsqi+ttDsRM6JyYTyJ9YGQFYb9nV2LWtu6a3l0JtStd0c5wop5PFqpgPBzH8Mn3Eg9y2SwVENVCyogeHRytD2kdYIUxX6IiKKIiICIiAiIgIiICIiAiIgIiICIiJRYe3t9dDReyuqgpJ+hc7qRSwAOw5rSCXP9wAx/iCzBn0g3jkrXrvc66frHatU01PL0qC0B1LBg+i5wPpOHvwEZ/bDhzniclFHAJlaih4LPW5harCdfy6k1Bc6CijtjM0zamdrC+Q9YyergVgXPqXHHHkqNqXl3o3OPKiz/fI/quB11ozP+dFn++R/VasmlCeKzYNpvl1o32os/3yP6qPLrRvtRZ/vjPqtWSKyLrab5d6N9qLP98j+qny60b7UWf75H9VqxRErad5daN9qLP98j+qg660b7UWf75H9VqyUYKmLG0/y60b7UWf75H9U8utG+1Fn++R/VasUTE1tO8utG+1Fn++R/VPLrRvtRZ/vkf1WrFFcVtO8utG+1Fn++M+qpdvn2jT41vDqfTtzoKqK5g+Msp52vLZR+ceiTz4rAWcZ9yk9fbxKkiIREWhLcgZHPOP3rYVuja6j1hsrpqWeRn5RtDjSzs6WXFoALXn35x/hWvXqWZN0XXR0btTp4KiVsduuuKeoDjgA59F3dkqGthaIMEZbxB5Is1RERFEREBERAREQEREBERAREQEREHVawqZKPSlzqqckTxU0j2kdjVqorZHy1k88jiXOkcS49p4lbaZoY54XwyNyx46Lh2LWrt82eVmznXdXbZIpXUEr3SUc5aSHx55dpGeKsiWMefVERVBERUEREBERAREQEREBERAREQEREBERNEjkv1opHxVsD43FrhICCOecr8h2fVZD2C7ObltE13SUENPL+TaeRsldOODWMzyz6zg8OxS0bFNEVU9dpC01lU8vmmpI3vcetxAyu4XGGKOCFkMTGMjY0Na1jcNAHqHUuSzqwRERRERAREQEREBERAREQEREBERBI5LodYaS09q+1vtuorZBXU7hgCQek3tB5hd8FBCCt113RNFVNTJLQXm6Ukb3Ehjy13R7OQ4L4XbnenOrU9f/wAAVnhwPIe/HFchxTUVe8zvTvtPX/LCeZ3p32nr/lhWi4DqK6ap1XpimqJKeq1JZoJoz0XRyV0TXNPaC5WGq7eZ1p32nr/lhPM7057T1/ywrLWy6226Qma2XCkrogceEppmyNz7wV+Vzv1ktTmsu13oLe54ywVNSyLpe7pEZRmK3eZ3p32nr/lhPM7077T1/wAsKwnlno8c9V2LP+8Iv4k8s9H+1di/+Ri/iUVXvzO9O+09f8sJ5nenfaev+WFYen1fpOeoZBFqeyyPeQ1rWV0bnOJOAAA7K/e46isFtn8XuN7tlFNjpeDqKtkbsHkcEqiuPmd6d9p6/wCWE8zrTvtPcPlhWXt1xoblTeM26spqyAuwJoJmyMz1jLSV+V0vlltT2Nul2oaAv+x4zUsj6Xu6RGVm0Vt8zvTvtPX/ACwnmd6d9p6/5YVkLZfrJdZHR2q8W6uewZc2nqmSFvv6JK7HKsoq95nenfaev+WE8zvTvtPX/LCsPVas0vSVDqeq1JZoZ2HovifXRtcHeogu4d67akqKerp2VFLUQ1ELxlkkTw9jh6wRwKuisXmd6d9p6/5YTzO9O+09f8sKzNwr6C3weHr6+lpIv7c8gjb8XYC62HVulp5mxU+pLNK9xwGsr4nEnsAclFePM7077T3D5YTzOtO+09w+WFaEODmtLCHBwyHdWEys2it1j3RdF0tayS43i5VsTTkxgtYD2HgcrOuj9J6d0la22rTtrioaVvMMHFx9ZPWV3h5jrxyz1KVdEYwMYULkeS4qNYIiKgiIgIiICIiAiIgIiICIiAiIgkJlQiAVIUKQolrqdaXmPT2k7ne5n9FlJTPlz2gcPxwFq7v1ZXaj1Ddbu8OlkmlfUSH1NyT+xXR36tXizbOqfTkEpFRdph0gD/o2npH8QFiXc/2dQ6t07rGsrYmmOaldQQucPsvc3iR3OC1GXcbhOr20t+uukJ5CBVxippwTyc04IHv6X4L3m97sm1ltEutmqdM0dNURUsJZKZZwzDi4nhnnzVU9m93rNCbWrfXPBidRVpjlHLgTghbNqSqhrqSGrgcHxTRtew+sEZCK1t7QdievtC2E3zUVDSwUYkbF0mVLXnJ5cAvO7O9D3/Xt7fZtOQQzVbIjKWyShg6IIHM+9XU34h/Qo/8AXov2FYF3Ehja9L/u9/8AzNTR+2gN3DaladaWe6VtsoG01LWRSy9GraT0WuBPae5fFvwZbtjDDkEUEXDPDrV+CT6yqEb8n9dLv1GL96QWA3HDjYlTF2T/ADufn/7jl9W9/oPyu2aTXClgDq+0kzxFo9Itx6TfwC+Tcg/qQp/1ub/qOWc6mJlRTyQSAOjkaWuaeRBUsGuPdj1pNoratbKiR5bSVbvFaoZ4dB3I+/pdFX62laspNIaBumppXsMNLTOkYCftuxlo7+C197w2ipdn+1KvoaeN0dHJKZ6Ijh6BOR8OC9ptr2vP1VsV0npqKRxqxDmv9L7Xg3FrAe5o+KDHGirNcdpW1elocvmqblVmWd544bnLj8OHerq7a9pdo2K6EobJZ44ZLk6nEFFTkcGtDcCRw7u8rwe4rs/jt9hq9d3KIsqav+SoyRyj5ud38FgTeg1HU6j2x3uSWRz46SXxaFrj9kM9H8SEkHS1N12h7UtQvgFTdr5Wyku8WhLi0N9fQbwA7l2F/wBje07StB+VqvT9fHBG3pvnp8kxD1u6P2Vb/dE0TRaa2WUVz8XH5Quo8PPMQMkcg3Pq4fis1TRRVEbopmMfG9uC0jI9RGPUqKAbAt4HUWiLvT27UFZNcrDI/oPEzi58APN7SeJx6jnkr7WmvpbnQQV1HKJaedgfG9vEOBWuzen0dS6O2uV9HQxiOjqsVMLP7Idz7ullWu3Lr/PetjcFPUSFz7fUOp2g9TQBj96zgzgSoyEKhFjkSMLiiIoiIqCIiAiIgIiICIiAiIgIiICIiAiIiCkZ44GcDKheb2m6kh0noS7X6ZwaKanc5p/vY4BGVG98XVp1PtfrKaGUOpbT/NY8cR0hwefiFlnd22ybJ9n2zGgs1yvFVFcZXOmrWtoJnemTgcQ3H2Q1Vg07brhrrXlLbxKTWXas9OTGSCT0nO+GSrNs3NYQ0Hy4dknOPyfwH/2Iqve2+8abvG0y63jSdS6ottbIJml8Loui45zhrgCFd7dO1Y3VmyC2OkkLqqgaaWcE5IDMhp7wAqwbfN3mbZnpeHUVPfHXWndUiGVni3gzHkEg/aPqXodwzVraHWFw0tNKGw3BhlhGecjRx78BUZh34eOxV/69F+wrAu4mcbX5h/6e/wD5mrPW/Ef6FZMH/wAfF+wrAu4n/W9Nx/8AL3/8zUF8cqhG/If6aXfqMX71ffCoRvyD+ml36lH+0pBn/cg/qQp/1ub/AKjlndUy3bdvWitnmzeLT99jubqttRJIfAQBzcOeSMHpDqKyxat6fZtdLjT26mp72J6h4jYXUzQASes9JSj4d9vQbdQ6AbqajiBrrOQ6Q44uiPAj4kHuVMdnenJdXa2tWnoT4N1bUxxeEPIAkZWxTeIDHbF9T4OR4mPh02qi+7Jx25aYb1eOs4d4QbEtNWajsOm6Oy0MLY4KWBsTA3sC1sbcaGeh2takp6hhY43CaTtIc8kfgVs6xx9yqBvubLK993GvbFSOlhkYG3FrG5LSBgP93Ad6QWA3drnS3bYzp2qpHtc1tP4J7Wn7L2k5H7FkAHBytd2wLble9l/hKB9EbnZ5ndN1MX9F0buRLTxxy9SzBq7e+oH2Z8emrBOK6RhAlqJQGROxzxj0viFRjbfguNNX7ZDDTPa91JRshlxxAccu/Y4LO+4lQ1FNsjnnmY5rJ65xjJ/OAA4/iqgaasmqNqeuxDTiasuNxqOlUTub6LATxcfUAP2LZFs50zR6O0TbtOUI/kqOINLsfad1lTB6AqEPUfWERRERFEREBERAREQEREBERAREQEREBERAREQF4vbHoGPaRpB2m57xVWunfK2SR8EbXF4GfRIPVxXtERlgjZTu06d0DrOn1PDf6+4z04d4KOaFjQ0kEZyOPIlZ3HDqHvI4oiDzW0vSFBrrRtdpm4SOghqmgeFjaC6Mg8xlYd0Juu2nSGrLfqK3ayuzp6KUSBjoGAP6iCc8iOCsOiaPF7Y9AUW0rR/k5W189BF4ZsvhYWBzstz1H3rxWxbd+s+zLVL7/Q6hrrhI6Aw+DmhY0YJBzke5ZpQc00ciVhLbLu8WfaVq46irdR19BKYWxeChhY5uBnjk+9ZtRNFW/M203nI1ndgf1aP6r7bHujaetV3pbjHq+6SPppWyBrqaMAkHlzVl0QdDrnTkOq9H3DTdRUyU0NdF4N0sbQXM4g5APuWGtnW6/YtGazt2pqbVNyq5aGYStikp2Na4g5wSFYNEEZXCdkc8L4JmNkie0tcxwyCDzyv0RIMF683YNnWpauSsoYp7FUSu6UhpPsE9jD6I7l5m3bnuj4atktdqS6V0TTkxGJjM94OQrNIro8ns92faU0HbjRaZtUNGHjEkuMyyH1ueeJXqvUTxK5Is2jj60UlQkUREVUREQEREBERB/9k=" alt="Atlyo" style={{ width: 30, height: 30, objectFit: 'contain' }} />
          </div>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: PS.text, lineHeight: 1 }}>atl<span style={{ color: '#3ecf8e' }}>yo</span></div>
              <div style={{ fontSize: 9, fontWeight: 600, color: PS.sub, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                {isCoach ? 'Préparateur physique' : 'Athlète'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        {isCoach ? (
          <div style={{ display: 'grid', gap: 2 }}>
            <SectionLabelPS>Navigation</SectionLabelPS>
            {coachLinks.map((item, i) => (
              <NavItemPS key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 2 }}>
            <SectionLabelPS>Entraînement</SectionLabelPS>
            {athleteMainLinks.map((item, i) => (
              <NavItemPS key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
            ))}
          </div>
        )}

        {/* Profile + Logout */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${PS.border}`, display: 'grid', gap: 6 }}>
          <div style={{ padding: '10px 12px', borderRadius: 12, background: PS.card, border: `1px solid ${PS.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: PS.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: "'DM Serif Display', serif" }}>
              {(profile?.full_name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: PS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || user?.email || 'Utilisateur'}
              </div>
              <div style={{ fontSize: 10, color: PS.sub, marginTop: 1 }}>{isCoach ? 'Coach' : 'Athlète'}</div>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="ps-logout" style={{ height: 36, borderRadius: 10, border: `1px solid ${PS.border}`, background: PS.card, color: PS.sub, fontWeight: 600, cursor: 'pointer', fontSize: 12, transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" }}>
            Déconnexion
          </button>
        </div>
      </aside>
    )
    if (!isMobile) return psContent
    return (
      <>
        {mobileOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 60, backdropFilter: 'blur(2px)' }} />}
        <div style={{ position: 'fixed', top: 0, left: mobileOpen ? 0 : -280, zIndex: 70, transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)' }}>{psContent}</div>
      </>
    )
  }

  const content = (
    <aside style={{
      width: 260, height: isMobile ? '100dvh' : '100vh',
      background: 'rgba(7, 9, 13, 0.97)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      padding: '20px 12px',
      boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 4,
      overflowY: 'auto',
      boxShadow: isMobile ? '8px 0 40px rgba(0,0,0,0.6)' : 'none',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes navSlideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        .nav-logout:hover { background: rgba(255,69,102,0.08) !important; border-color: rgba(255,69,102,0.2) !important; color: #ff8099 !important; }
      `}</style>

      {/* Logo */}
      <div style={{
        padding: '12px 10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <img src="data:image/png;base64,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" alt="Atlyo" style={{ width: 30, height: 30, objectFit: 'contain', filter: 'brightness(10)' }} />
          </div>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#edf2f7', letterSpacing: '-0.3px', lineHeight: 1 }}>
              atl<span style={{ color: '#3ecf8e' }}>yo</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#3d4f61', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              {isCoach ? 'Coach' : 'Athlète'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {isCoach ? (
        <div style={{ display: 'grid', gap: 2 }}>
          <SectionLabel>Navigation</SectionLabel>
          {coachLinks.map((item, i) => (
            <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 2 }}>
            <SectionLabel>Entraînement</SectionLabel>
            {athleteMainLinks.map((item, i) => (
              <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i} />
            ))}
          </div>
          {!showPrepPhysique && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '8px 4px' }} />
              <div style={{ display: 'grid', gap: 2 }}>
                <SectionLabel>Nutrition</SectionLabel>
                {athleteNutritionLinks.map((item, i) => (
                  <NavItem key={item.to} {...item} active={isActive(item.to)} onClick={isMobile ? onClose : undefined} index={i + 4} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Profile + Logout */}
      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gap: 6 }}>
        <div style={{
          padding: '10px 12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Avatar name={profile?.full_name} role={profile?.role} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#edf2f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
              {profile?.full_name || user?.email || 'Utilisateur'}
            </div>
            <div style={{ fontSize: 10, color: '#3d4f61', fontWeight: 600, marginTop: 1 }}>
              {isCoach ? 'Coach' : 'Athlète'}
            </div>
          </div>
        </div>

        <button type="button" onClick={handleLogout} className="nav-logout" style={{
          height: 38, borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
          color: '#3d4f61', fontWeight: 700, cursor: 'pointer',
          fontSize: 12, transition: 'all 0.15s ease',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Déconnexion
        </button>
      </div>
    </aside>
  )

  if (!isMobile) return content

  return (
    <>
      {mobileOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
      )}
      <div style={{ position: 'fixed', top: 0, left: mobileOpen ? 0 : -280, zIndex: 70, transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {content}
      </div>
    </>
  )
}

export default Sidebar
