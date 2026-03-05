import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

const TITLES = {
  '/aujourd-hui': "Aujourd'hui",
  '/nutrition': 'Nutrition',
  '/saisie': 'Séance libre',
  '/historique': 'Historique',
  '/progression': 'Progression',
  '/coach': 'Vue Coach',
  '/programmes': 'Programmes',
}

function formatDateFR(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(d)
  } catch {
    return d.toLocaleDateString('fr-FR')
  }
}

export default function Topbar() {
  const { profile } = useAuth()
  const location = useLocation()

  const title = TITLES[location.pathname] || 'Tableau de bord'
  const name = profile?.full_name || profile?.email || 'Utilisateur'
  const role = profile?.role === 'coach' ? 'Coach' : 'Athlète'

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      paddingTop: 14,
      paddingBottom: 14,
      marginBottom: 8,
      background: 'linear-gradient(180deg, rgba(5,6,7,0.92), rgba(5,6,7,0.55) 70%, rgba(5,6,7,0))',
      backdropFilter: 'blur(14px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{
            fontFamily: T.fontDisplay,
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: -0.2,
            color: T.text,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{title}</div>
          <div style={{
            fontFamily: T.fontBody,
            fontSize: 13,
            color: T.textMid,
            textTransform: 'capitalize',
          }}>{formatDateFR()}</div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          borderRadius: T.radiusFull,
          background: T.card,
          border: `1px solid ${T.border}`,
          boxShadow: T.shadowSm,
          backdropFilter: 'blur(12px)',
          maxWidth: 360,
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${T.accent}22, ${T.accentDim}14)`,
            border: `1px solid ${T.accent}35`,
            boxShadow: `0 0 18px ${T.accentGlow}`,
          }} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: T.fontBody,
              fontWeight: 700,
              fontSize: 13,
              color: T.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.2,
            }}>{name}</div>
            <div style={{
              fontFamily: T.fontBody,
              fontSize: 12,
              color: T.textSub,
              lineHeight: 1.2,
            }}>{role}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
