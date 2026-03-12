import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

function SectionTitle({ children }) {
return (
<div
style={{
color: T.textDim,
fontSize: 11,
fontWeight: 900,
letterSpacing: 1.2,
textTransform: 'uppercase',
margin: '8px 8px 2px',
}}
>
{children}
</div>
)
}

function NavItem({ to, label, icon, active, onClick }) {
return (
<Link
to={to}
onClick={onClick}
style={{
display: 'flex',
alignItems: 'center',
gap: 12,
padding: '12px 14px',
borderRadius: 16,
textDecoration: 'none',
background: active ? 'rgba(45,255,155,0.10)' : 'transparent',
border: active ? `1px solid ${T.accent + '33'}` : '1px solid transparent',
color: active ? (T.accentLight || T.accent || '#43E97B') : T.textMid,
fontWeight: 800,
fontSize: 14,
transition: 'all .2s ease',
}}
>
<span
style={{
width: 20,
textAlign: 'center',
flexShrink: 0,
fontSize: 16,
}}
>
{icon}
</span>

<span>{label}</span>
</Link>
)
}

function Sidebar({ isMobile = false, mobileOpen = false, onClose }) {
const location = useLocation()
const { profile, user, signOut } = useAuth()

const isCoach = profile?.role === 'coach'

const coachLinks = [
{ to: '/coach', label: 'Dashboard coach', icon: '🧠' },
{ to: '/coach/clients', label: 'Clients', icon: '👥' },
{ to: '/programmes', label: 'Programmes', icon: '📋' },
]

const athleteMainLinks = [
{ to: '/mon-espace', label: 'Mon espace', icon: '🏠' },
{ to: '/entrainement/aujourdhui', label: 'Séance du jour', icon: '🔥' },
{ to: '/entrainement/libre', label: 'Séance libre', icon: '➕' },
{ to: '/progression', label: 'Progression', icon: '📈' },
  { to: '/exercices', label: 'Exercices', icon: '🏋️' },
]

const athleteNutritionLinks = [
{ to: '/nutrition/macros', label: 'Nutrition', icon: '🥗' },
{ to: '/nutrition/recettes', label: 'Recettes', icon: '🍽️' },
{ to: '/nutrition/plan', label: 'Plan repas', icon: '📆' },
]

const isActive = (to) =>
location.pathname === to || location.pathname.startsWith(to + '/')

async function handleLogout() {
try {
const result = await signOut?.()
if (result?.error) {
console.error(result.error)
window.alert('Impossible de se déconnecter.')
return
}
if (onClose) onClose()
} catch (error) {
console.error(error)
window.alert('Impossible de se déconnecter.')
}
}

const content = (
<aside
style={{
width: 292,
height: isMobile ? '100dvh' : '100vh',
background:
'linear-gradient(180deg, rgba(12,16,15,0.98), rgba(8,11,10,0.98))',
borderRight: `1px solid ${T.border}`,
padding: '16px 14px',
boxSizing: 'border-box',
display: 'flex',
flexDirection: 'column',
gap: 14,
overflowY: 'auto',
boxShadow: isMobile ? '0 24px 80px rgba(0,0,0,0.45)' : 'none',
}}
>
<div
style={{
padding: 16,
borderRadius: 22,
border: `1px solid ${T.border}`,
background:
'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.08), transparent 34%), rgba(255,255,255,0.02)',
}}
>
<div
style={{
color: T.text,
fontFamily: T.fontDisplay,
fontWeight: 900,
fontSize: 24,
lineHeight: 1,
letterSpacing: 1,
}}
>
LE SPOT
</div>

<div
style={{
marginTop: 8,
color: T.textDim,
fontSize: 11,
textTransform: 'uppercase',
letterSpacing: 1.2,
fontWeight: 800,
}}
>
{isCoach ? 'Mode coach' : 'Mode athlète'}
</div>
</div>

{isCoach ? (
<div style={{ display: 'grid', gap: 6 }}>
<SectionTitle>Navigation</SectionTitle>
{coachLinks.map((item) => (
<NavItem
key={item.to}
to={item.to}
label={item.label}
icon={item.icon}
active={isActive(item.to)}
onClick={isMobile ? onClose : undefined}
/>
))}
</div>
) : (
<>
<div style={{ display: 'grid', gap: 6 }}>
<SectionTitle>Aujourd’hui</SectionTitle>
{athleteMainLinks.map((item) => (
<NavItem
key={item.to}
to={item.to}
label={item.label}
icon={item.icon}
active={isActive(item.to)}
onClick={isMobile ? onClose : undefined}
/>
))}
</div>

<div style={{ display: 'grid', gap: 6 }}>
<SectionTitle>Nutrition</SectionTitle>
{athleteNutritionLinks.map((item) => (
<NavItem
key={item.to}
to={item.to}
label={item.label}
icon={item.icon}
active={isActive(item.to)}
onClick={isMobile ? onClose : undefined}
/>
))}
</div>
</>
)}

<div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
<div
style={{
padding: 14,
borderRadius: 18,
border: `1px solid ${T.border}`,
background: 'rgba(255,255,255,0.03)',
}}
>
<div
style={{
color: T.textSub || T.textDim,
fontSize: 11,
textTransform: 'uppercase',
letterSpacing: 1,
fontWeight: 800,
marginBottom: 6,
}}
>
Compte actif
</div>

<div
style={{
color: T.text,
fontWeight: 800,
fontSize: 14,
lineHeight: 1.45,
}}
>
{profile?.full_name || user?.email || 'Utilisateur'}
</div>

<div
style={{
color: T.textDim,
fontSize: 12,
marginTop: 6,
}}
>
{isCoach ? 'Coach' : 'Athlète'}
</div>
</div>

<button
type="button"
onClick={handleLogout}
style={{
height: 46,
borderRadius: 14,
border: `1px solid ${T.border}`,
background: 'rgba(255,255,255,0.03)',
color: T.text,
fontWeight: 800,
cursor: 'pointer',
fontSize: 14,
}}
>
Déconnexion
</button>
</div>
</aside>
)

if (!isMobile) {
return content
}

return (
<>
{mobileOpen ? (
<div
onClick={onClose}
style={{
position: 'fixed',
inset: 0,
background: 'rgba(0,0,0,0.58)',
zIndex: 60,
}}
/>
) : null}

<div
style={{
position: 'fixed',
top: 0,
left: mobileOpen ? 0 : -320,
zIndex: 70,
transition: 'left .25s ease',
}}
>
{content}
</div>
</>
)
}

export default Sidebar
