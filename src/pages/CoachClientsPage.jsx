import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { T } from '../lib/data'

function getTitle(pathname, isCoach) {
  if (isCoach) {
    if (pathname.startsWith('/coach/clients')) return 'Clients'
    if (pathname.startsWith('/coach/client/')) return 'Détail client'
    if (pathname.startsWith('/programmes')) return 'Programmes'
    return 'Dashboard coach'
  }

  if (pathname.startsWith('/mon-espace')) return 'Mon espace'
  if (pathname.startsWith('/entrainement/aujourdhui')) return "Séance du jour"
  if (pathname.startsWith('/entrainement/libre')) return 'Séance libre'
  if (pathname.startsWith('/entrainement/historique')) return 'Historique'
  if (pathname.startsWith('/nutrition/macros')) return 'Nutrition'
  if (pathname.startsWith('/nutrition/recettes')) return 'Recettes'
  if (pathname.startsWith('/nutrition/plan')) return 'Plan repas'
  if (pathname.startsWith('/progression')) return 'Progression'
  if (pathname.startsWith('/objectif')) return 'Objectif'
  return 'Le Spot Training'
}

export default function Topbar({ isMobile = false, onMenuClick }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isCoach = profile?.role === 'coach'
  const title = getTitle(location.pathname, isCoach)

  async function handleLogout() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header
      style={{
        height: 72,
        borderBottom: `1px solid ${T.border}`,
        background: 'rgba(8,10,10,0.82)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 14px' : '0 20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {isMobile ? (
          <button
            type="button"
            onClick={onMenuClick}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.03)',
              color: T.text,
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ☰
          </button>
        ) : null}

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: T.text,
              fontFamily: T.fontDisplay,
              fontWeight: 900,
              fontSize: isMobile ? 18 : 22,
              lineHeight: 1,
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: T.textDim,
              fontSize: 12,
              marginTop: 6,
            }}
          >
            {isCoach ? 'Espace coach' : 'Espace athlète'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {!isMobile ? (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 999,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.03)',
              color: T.textMid,
              fontSize: 12,
              fontWeight: 700,
              maxWidth: 220,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {profile?.full_name || 'Utilisateur'}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleLogout}
          style={{
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: T.textMid,
            borderRadius: 12,
            padding: '9px 12px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          Déconnexion
        </button>
      </div>
    </header>
  )

}
