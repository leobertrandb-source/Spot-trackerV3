import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'
import MedicalNotificationsBell from './MedicalNotificationsBell'

function getPageTitle(pathname, isCoach) {
  if (isCoach) {
    if (pathname.startsWith('/coach/clients')) return 'Clients'
    if (pathname.startsWith('/programmes')) return 'Programmes'
    if (pathname.startsWith('/coach')) return 'Dashboard coach'
    return 'Espace coach'
  }

  if (pathname.startsWith('/entrainement/aujourdhui')) return 'Séance du jour'
  if (pathname.startsWith('/entrainement/libre')) return 'Séance libre'
  if (pathname.startsWith('/nutrition/macros')) return 'Nutrition'
  if (pathname.startsWith('/nutrition/recettes')) return 'Recettes'
  if (pathname.startsWith('/nutrition/plan')) return 'Plan repas'
  if (pathname.startsWith('/progression')) return 'Progression'
  if (pathname.startsWith('/mon-espace')) return 'Mon espace'
  if (pathname.startsWith('/objectif')) return 'Objectif'
  if (pathname.startsWith('/prep/hooper')) return 'HOOPER'
  if (pathname.startsWith('/prep/charge-externe')) return 'Charge externe'
  if (pathname.startsWith('/prep/charge')) return 'Charge interne'
  if (pathname.startsWith('/prep/compo')) return 'Composition corporelle'
  if (pathname.startsWith('/prep/topset')) return 'TOPSET'
  if (pathname.startsWith('/prep/analyse')) return 'Analyse athlète'

  return 'Atlyo'
}

function MenuButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ouvrir le menu"
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        border: `1px solid ${T.border}`,
        background: 'rgba(255,255,255,0.04)',
        color: T.text,
        fontSize: 18,
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: T.shadowSm,
      }}
    >
      ☰
    </button>
  )
}

export default function Topbar({ isMobile = false, onMenuClick }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, gym, showPrepPhysique } = useAuth()
  const gymName = gym?.name || 'Atlyo'
  const [loggingOut, setLoggingOut] = useState(false)

  const isCoach = profile?.role === 'coach'

  const displayName = useMemo(() => profile?.full_name || user?.email || 'Utilisateur', [profile?.full_name, user?.email])
  const pageTitle = useMemo(() => getPageTitle(location.pathname, isCoach), [location.pathname, isCoach])
  const subTitle = showPrepPhysique
    ? `${gymName}${isCoach ? ' · Préparateur physique' : ' · Athlète'}`
    : isCoach ? 'Pilotage coach' : 'Suivi athlète'

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Erreur déconnexion :', error)
      window.alert('Impossible de se déconnecter pour le moment.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header
      style={{
        height: showPrepPhysique ? 72 : 78,
        borderBottom: `1px solid ${T.border}`,
        background: showPrepPhysique ? 'rgba(13, 23, 38, 0.88)' : 'rgba(8, 17, 27, 0.9)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 14px' : '0 20px',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {isMobile ? <MenuButton onClick={onMenuClick} /> : null}

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: T.text,
              fontFamily: T.fontDisplay,
              fontWeight: 900,
              fontSize: showPrepPhysique ? 19 : 20,
              letterSpacing: showPrepPhysique ? -0.2 : 0.2,
              lineHeight: 1,
            }}
          >
            {pageTitle}
          </div>

          <div
            style={{
              color: T.textDim,
              fontSize: 11,
              marginTop: 6,
              textTransform: 'uppercase',
              letterSpacing: 1.1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subTitle}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <MedicalNotificationsBell dark={!showPrepPhysique} />

        {!isMobile ? (
          <div
            style={{
              padding: '9px 12px',
              borderRadius: 999,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.04)',
              color: T.textMid,
              fontSize: 12,
              fontWeight: 700,
              maxWidth: 260,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxShadow: T.shadowSm,
            }}
            title={displayName}
          >
            {displayName}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            height: isMobile ? 40 : 42,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.04)',
            color: T.text,
            padding: isMobile ? '0 12px' : '0 14px',
            cursor: loggingOut ? 'default' : 'pointer',
            fontWeight: 800,
            fontSize: 13,
            opacity: loggingOut ? 0.7 : 1,
            boxShadow: T.shadowSm,
          }}
        >
          {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
        </button>
      </div>
    </header>
  )
}
