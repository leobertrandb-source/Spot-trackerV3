import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { T } from '../lib/data'

function AuthField({
label,
value,
onChange,
placeholder,
type = 'text',
autoComplete,
}) {
return (
<label style={{ display: 'grid', gap: 8 }}>
<span
style={{
color: '#98A4BA',
fontWeight: 800,
fontSize: 13,
}}
>
{label} <span style={{ color: '#43E97B' }}>*</span>
</span>

<input
value={value}
onChange={(e) => onChange(e.target.value)}
placeholder={placeholder}
type={type}
autoComplete={autoComplete}
style={{
height: 54,
borderRadius: 16,
border: '1px solid rgba(255,255,255,0.08)',
background: 'rgba(5,8,12,0.62)',
color: '#fff',
padding: '0 18px',
fontSize: 15,
outline: 'none',
boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.01)',
}}
/>
</label>
)
}

const submitBtnStyle = {
marginTop: 8,
height: 56,
border: 'none',
borderRadius: 16,
cursor: 'pointer',
background: 'linear-gradient(135deg, #43E97B, #36D86E)',
color: '#07110B',
fontWeight: 900,
fontSize: 16,
boxShadow: '0 0 30px rgba(67,233,123,0.18)',
}

export default function AuthPage() {
const navigate = useNavigate()

const [mode, setMode] = useState('login')
const [loading, setLoading] = useState(false)

const [fullName, setFullName] = useState('')
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [role, setRole] = useState('athlete')

const [errorMsg, setErrorMsg] = useState('')
const [successMsg, setSuccessMsg] = useState('')

const isSignup = mode === 'signup'

useEffect(() => {
async function checkSession() {
const {
data: { session },
} = await supabase.auth.getSession()

if (session?.user) {
await redirectUser(session.user.id)
}
}

checkSession()
}, [])

async function redirectUser(userId) {
const { data: profile } = await supabase
.from('profiles')
.select('role, goal_type')
.eq('id', userId)
.maybeSingle()

if (profile?.role === 'coach') {
navigate('/coach', { replace: true })
return
}

if (profile?.goal_type) {
navigate('/mon-espace', { replace: true })
return
}

navigate('/objectif', { replace: true })
}

async function handleSubmit(e) {
e.preventDefault()
setErrorMsg('')
setSuccessMsg('')
setLoading(true)

try {
if (isSignup) {
if (!fullName.trim()) {
throw new Error('Entre ton nom ou ton prénom.')
}

if (!email.trim()) {
throw new Error('Entre ton email.')
}

if (!password || password.length < 6) {
throw new Error('Le mot de passe doit contenir au moins 6 caractères.')
}

const normalizedEmail = email.trim().toLowerCase()

const { data, error } = await supabase.auth.signUp({
email: normalizedEmail,
password,
options: {
data: {
full_name: fullName.trim(),
role,
},
},
})

if (error) throw error

const createdUser = data?.user

if (!createdUser?.id) {
throw new Error("Le compte n'a pas pu être créé.")
}

setSuccessMsg(
role === 'coach'
? 'Compte coach créé avec succès.'
: 'Compte athlète créé avec succès.'
)

if (data?.session?.user?.id) {
await redirectUser(data.session.user.id)
}

return
}

const { data, error } = await supabase.auth.signInWithPassword({
email: email.trim().toLowerCase(),
password,
})

if (error) throw error

if (data?.user?.id) {
await redirectUser(data.user.id)
}
} catch (error) {
console.error(error)
setErrorMsg(error.message || 'Une erreur est survenue.')
} finally {
setLoading(false)
}
}

return (
<div
style={{
minHeight: '100vh',
background:
'radial-gradient(circle at 20% 18%, rgba(45,255,155,0.10), transparent 30%), radial-gradient(circle at 100% 0%, rgba(255,255,255,0.04), transparent 26%), linear-gradient(180deg, #070909 0%, #060809 100%)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
padding: '32px 18px',
}}
>
<div style={{ width: '100%', maxWidth: 560 }}>
<div
style={{
display: 'flex',
justifyContent: 'center',
marginBottom: 24,
}}
>
<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
<div
style={{
width: 60,
height: 60,
borderRadius: 16,
background: 'linear-gradient(135deg, #43E97B, #31d46a)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
boxShadow: '0 0 30px rgba(67,233,123,0.22)',
color: '#07110B',
fontSize: 24,
fontWeight: 900,
}}
>
⛓
</div>

<div>
<div
style={{
color: '#fff',
fontWeight: 900,
fontSize: 22,
lineHeight: 1,
}}
>
Le Spot
</div>
<div
style={{
color: '#A9B3C7',
fontWeight: 700,
fontSize: 14,
marginTop: 4,
}}
>
Training
</div>
</div>
</div>
</div>

<div
style={{
borderRadius: 28,
border: '1px solid rgba(255,255,255,0.08)',
background:
'linear-gradient(135deg, rgba(18,24,32,0.96), rgba(10,14,19,0.98))',
boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
padding: '28px 22px 22px',
}}
>
<div
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr',
gap: 10,
background: 'rgba(8,11,16,0.78)',
borderRadius: 18,
padding: 6,
marginBottom: 22,
}}
>
<button
type="button"
onClick={() => {
setMode('login')
setErrorMsg('')
setSuccessMsg('')
}}
style={{
height: 46,
border: 'none',
borderRadius: 14,
cursor: 'pointer',
background: mode === 'login' ? '#43E97B' : 'transparent',
color: mode === 'login' ? '#07110B' : '#7F8AA3',
fontWeight: 900,
fontSize: 13,
letterSpacing: 1.2,
textTransform: 'uppercase',
}}
>
Connexion
</button>

<button
type="button"
onClick={() => {
setMode('signup')
setErrorMsg('')
setSuccessMsg('')
}}
style={{
height: 46,
border: 'none',
borderRadius: 14,
cursor: 'pointer',
background: mode === 'signup' ? '#43E97B' : 'transparent',
color: mode === 'signup' ? '#07110B' : '#7F8AA3',
fontWeight: 900,
fontSize: 13,
letterSpacing: 1.2,
textTransform: 'uppercase',
}}
>
Créer un compte
</button>
</div>

<div style={{ marginBottom: 18 }}>
<div
style={{
color: '#fff',
fontWeight: 900,
fontSize: 22,
lineHeight: 1.1,
}}
>
{isSignup
? role === 'coach'
? 'Compte coach'
: 'Compte athlète'
: 'Connexion'}
</div>

<div
style={{
color: '#92A0B8',
fontSize: 14,
lineHeight: 1.65,
marginTop: 8,
}}
>
{isSignup
? role === 'coach'
? 'Crée ton espace coach et commence à inviter tes clients.'
: 'Crée ton compte athlète et accède à tes séances, ta nutrition et ton suivi.'
: 'Connecte-toi à ton espace Le Spot Training.'}
</div>
</div>

{isSignup ? (
<div style={{ marginBottom: 18 }}>
<div
style={{
color: '#8E9B94',
fontSize: 12,
fontWeight: 800,
letterSpacing: 1,
textTransform: 'uppercase',
marginBottom: 10,
}}
>
Je crée un compte :
</div>

<div
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr',
gap: 10,
}}
>
<button
type="button"
onClick={() => setRole('athlete')}
style={{
height: 48,
borderRadius: 14,
cursor: 'pointer',
border:
role === 'athlete'
? `1px solid ${T.accent || '#43E97B'}`
: '1px solid rgba(255,255,255,0.08)',
background:
role === 'athlete'
? 'rgba(67,233,123,0.12)'
: 'rgba(255,255,255,0.02)',
color: role === 'athlete' ? '#EAF2ED' : '#A9B3C7',
fontWeight: 800,
fontSize: 14,
}}
>
Athlète
</button>

<button
type="button"
onClick={() => setRole('coach')}
style={{
height: 48,
borderRadius: 14,
cursor: 'pointer',
border:
role === 'coach'
? `1px solid ${T.accent || '#43E97B'}`
: '1px solid rgba(255,255,255,0.08)',
background:
role === 'coach'
? 'rgba(67,233,123,0.12)'
: 'rgba(255,255,255,0.02)',
color: role === 'coach' ? '#EAF2ED' : '#A9B3C7',
fontWeight: 800,
fontSize: 14,
}}
>
Coach
</button>
</div>
</div>
) : null}

{errorMsg ? (
<div
style={{
marginBottom: 14,
padding: '12px 14px',
borderRadius: 14,
border: '1px solid rgba(255,110,110,0.24)',
background: 'rgba(255,110,110,0.08)',
color: '#FF9D9D',
fontSize: 13,
lineHeight: 1.5,
}}
>
{errorMsg}
</div>
) : null}

{successMsg ? (
<div
style={{
marginBottom: 14,
padding: '12px 14px',
borderRadius: 14,
border: '1px solid rgba(67,233,123,0.24)',
background: 'rgba(67,233,123,0.08)',
color: '#B5FFD0',
fontSize: 13,
lineHeight: 1.5,
}}
>
{successMsg}
</div>
) : null}

<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
{isSignup ? (
<AuthField
label={role === 'coach' ? 'Nom / structure' : 'Prénom'}
value={fullName}
onChange={setFullName}
placeholder={role === 'coach' ? 'Ex : Coach Martin' : 'Thomas'}
autoComplete="name"
/>
) : null}

<AuthField
label="Email"
value={email}
onChange={setEmail}
placeholder="thomas@email.com"
type="email"
autoComplete="email"
/>

<AuthField
label="Mot de passe"
value={password}
onChange={setPassword}
placeholder="••••••••"
type="password"
autoComplete={isSignup ? 'new-password' : 'current-password'}
/>

<button type="submit" disabled={loading} style={submitBtnStyle}>
{loading
? isSignup
? 'Création...'
: 'Connexion...'
: isSignup
? role === 'coach'
? 'Créer mon compte coach'
: 'Créer mon compte'
: 'Me connecter'}
</button>
</form>
</div>

<div
style={{
textAlign: 'center',
marginTop: 18,
color: '#5D6981',
fontSize: 12,
letterSpacing: 4,
textTransform: 'uppercase',
}}
>
Le Spot Training · Prosportconcept
</div>
</div>
</div>
)
}
