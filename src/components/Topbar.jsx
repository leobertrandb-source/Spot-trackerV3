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

export default function Topbar({ isMobile = false, onMenuClick }) {
const navigate = useNavigate()
const location = useLocation()
const { user, profile, gym, showPrepPhysique } = useAuth()
const gymName = gym?.name || 'Atlyo'
const [loggingOut, setLoggingOut] = useState(false)

const isCoach = profile?.role === 'coach'

const displayName = useMemo(() => {
return profile?.full_name || user?.email || 'Utilisateur'
}, [profile?.full_name, user?.email])

const pageTitle = useMemo(() => {
return getPageTitle(location.pathname, isCoach)
}, [location.pathname, isCoach])

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

if (showPrepPhysique) {
  return (
    <header style={{
      height: 64,
      borderBottom: `1px solid ${T.border}`,
      background: T.bgAlt,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxSizing: 'border-box',
      position: 'sticky',
      top: 0,
      zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isMobile && (
          <button type="button" onClick={onMenuClick}
            style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, fontSize: 18, cursor: 'pointer' }}>
            ☰
          </button>
        )}
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 17, color: T.text, lineHeight: 1 }}>
            {pageTitle}
          </div>
          <div style={{ fontSize: 10, color: T.textDim, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>
            {gymName}{isCoach ? ' · Préparateur physique' : ' · Athlète'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MedicalNotificationsBell dark={false} />
        {!isMobile && (
          <div style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${T.border}`, background: T.bgAlt, color: T.textMid, fontSize: 12, fontWeight: 600 }}>
            {displayName}
          </div>
        )}
        <button type="button" onClick={handleLogout} disabled={loggingOut}
          style={{ height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgAlt, color: T.text, padding: '0 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12, opacity: loggingOut ? 0.7 : 1 }}>
          {loggingOut ? '...' : 'Déconnexion'}
        </button>
      </div>
    </header>
  )
}

return (
<header
style={{
height: 76,
borderBottom: `1px solid ${T.border}`,
background: 'rgba(10,14,13,0.92)',
backdropFilter: 'blur(10px)',
display: 'flex',
alignItems: 'center',
justifyContent: 'space-between',
padding: '0 18px',
boxSizing: 'border-box',
position: 'sticky',
top: 0,
zIndex: 20,
}}
>
<div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
{isMobile ? (
<button
type="button"
onClick={onMenuClick}
aria-label="Ouvrir le menu"
style={{
width: 42,
height: 42,
borderRadius: 12,
border: `1px solid ${T.border}`,
background: 'rgba(255,255,255,0.03)',
color: T.text,
fontSize: 20,
cursor: 'pointer',
flexShrink: 0,
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
fontSize: 18,
letterSpacing: 1,
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
letterSpacing: 1.2,
whiteSpace: 'nowrap',
overflow: 'hidden',
textOverflow: 'ellipsis',
}}
>
{isCoach ? 'Pilotage coach' : 'Suivi athlète'}
</div>
</div>
</div>

<div
style={{
display: 'flex',
alignItems: 'center',
gap: 10,
minWidth: 0,
}}
>
<MedicalNotificationsBell dark />
{!isMobile ? (
<div
style={{
padding: '9px 12px',
borderRadius: 999,
border: `1px solid ${T.border}`,
background: 'rgba(255,255,255,0.03)',
color: T.textMid,
fontSize: 12,
fontWeight: 800,
maxWidth: 260,
whiteSpace: 'nowrap',
overflow: 'hidden',
textOverflow: 'ellipsis',
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
height: 42,
borderRadius: 12,
border: `1px solid ${T.border}`,
background: 'rgba(255,255,255,0.03)',
color: T.text,
padding: '0 14px',
cursor: loggingOut ? 'default' : 'pointer',
fontWeight: 800,
fontSize: 13,
opacity: loggingOut ? 0.7 : 1,
}}
>
{loggingOut ? 'Déconnexion...' : 'Déconnexion'}
</button>
</div>
</header>
)
}
