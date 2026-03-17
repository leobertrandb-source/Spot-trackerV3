import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card, Input, Btn, PageWrap } from '../components/UI'
import { T } from '../lib/data'

export default function InviteAcceptPage() {
const { token } = useParams()
const navigate = useNavigate()

const [loadingInvite, setLoadingInvite] = useState(true)
const [invite, setInvite] = useState(null)
const [inviteError, setInviteError] = useState('')

const [fullName, setFullName] = useState('')
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')
const [submitting, setSubmitting] = useState(false)

useEffect(() => {
loadInvite()
}, [token])

async function loadInvite() {
if (!token) {
setInviteError('Invitation invalide.')
setLoadingInvite(false)
return
}

setLoadingInvite(true)
setInviteError('')

const { data, error } = await supabase
.from('coach_invites')
.select('*, coach:coach_id(gym_id)')
.eq('invite_token', token)
.eq('status', 'pending')
.maybeSingle()

if (error) {
console.error('Erreur chargement invitation:', error)
setInviteError("Impossible de charger l'invitation.")
setLoadingInvite(false)
return
}

if (!data) {
setInviteError("Cette invitation est invalide, expirée ou déjà utilisée.")
setLoadingInvite(false)
return
}

setInvite(data)
setEmail(data.email || '')
setLoadingInvite(false)
}

async function handleAcceptInvite() {
if (!invite) return

if (!fullName.trim()) {
alert('Entre ton nom complet.')
return
}

if (!email.trim()) {
alert('Entre ton email.')
return
}

if (!password || password.length < 6) {
alert('Le mot de passe doit contenir au moins 6 caractères.')
return
}

if (password !== confirmPassword) {
alert('Les mots de passe ne correspondent pas.')
return
}

setSubmitting(true)

const normalizedEmail = email.trim().toLowerCase()

const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
email: normalizedEmail,
password,
options: {
data: {
full_name: fullName.trim(),
},
},
})

if (signUpError) {
console.error('Erreur signUp:', signUpError)
alert(signUpError.message || "Impossible de créer le compte.")
setSubmitting(false)
return
}

const createdUser = signUpData?.user

if (!createdUser?.id) {
alert("Le compte n'a pas pu être finalisé.")
setSubmitting(false)
return
}

const gymId = invite?.coach?.gym_id || null

const { error: profileError } = await supabase.from('profiles').upsert({
id: createdUser.id,
full_name: fullName.trim(),
email: normalizedEmail,
role: 'athlete',
gym_id: gymId,
})

if (profileError) {
console.error('Erreur création profile:', profileError)
alert(profileError.message || 'Compte créé, mais profil incomplet.')
setSubmitting(false)
return
}

const { error: coachClientError } = await supabase.from('coach_clients').insert({
coach_id: invite.coach_id,
client_id: createdUser.id,
})

if (coachClientError) {
console.error('Erreur création relation coach/client:', coachClientError)
alert(coachClientError.message || "Impossible de relier le client au coach.")
setSubmitting(false)
return
}

const { error: inviteUpdateError } = await supabase
.from('coach_invites')
.update({
status: 'accepted',
accepted_at: new Date().toISOString(),
})
.eq('id', invite.id)

if (inviteUpdateError) {
console.error('Erreur update invitation:', inviteUpdateError)
}

alert('Compte créé avec succès.')
setSubmitting(false)
navigate('/', { replace: true })
}

if (loadingInvite) {
return (
<div
style={{
minHeight: '100vh',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
color: T.textDim,
fontFamily: T.fontDisplay,
fontSize: 12,
letterSpacing: 2,
}}
>
Chargement...
</div>
)
}

if (inviteError) {
return (
<PageWrap>
      <style>{`
        @media (max-width: 640px) {
          .resp-hide-mobile { display: none !important; }
          .resp-stack { flex-direction: column !important; }
          .resp-full { width: 100% !important; min-width: 0 !important; }
        }
      `}</style>
<Card style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '40px 28px' }}>
<div
style={{
fontFamily: T.fontDisplay,
fontWeight: 900,
fontSize: 22,
color: T.text,
marginBottom: 10,
}}
>
INVITATION INDISPONIBLE
</div>

<div
style={{
color: T.textMid,
fontSize: 14,
lineHeight: 1.6,
}}
>
{inviteError}
</div>
</Card>
</PageWrap>
)
}

return (
<PageWrap>
<div style={{ maxWidth: 640, margin: '0 auto', display: 'grid', gap: 18 }}>
<Card
style={{
padding: '24px 22px',
background:
'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.12), transparent 30%), linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
}}
>
<div
style={{
display: 'inline-flex',
padding: '8px 12px',
borderRadius: 999,
border: `1px solid ${T.accent + '28'}`,
background: 'rgba(45,255,155,0.10)',
color: T.accentLight,
fontWeight: 800,
fontSize: 12,
letterSpacing: 1,
textTransform: 'uppercase',
marginBottom: 14,
}}
>
Invitation coach
</div>

<div
style={{
fontFamily: T.fontDisplay,
fontWeight: 900,
fontSize: 28,
color: T.text,
lineHeight: 1,
marginBottom: 10,
}}
>
REJOINS TON COACH
</div>

<div
style={{
color: T.textMid,
fontSize: 14,
lineHeight: 1.65,
}}
>
Crée ton compte athlète pour accéder à tes séances, ta nutrition et ton suivi.
</div>
</Card>

<Card style={{ padding: '22px 20px' }}>
<div style={{ display: 'grid', gap: 14 }}>
<Input
label="Nom complet"
value={fullName}
onChange={setFullName}
placeholder="Ex : Lucas Martin"
/>

<Input
label="Email"
value={email}
onChange={setEmail}
placeholder="ton@email.com"
/>

<Input
label="Mot de passe"
value={password}
onChange={setPassword}
type="password"
placeholder="Minimum 6 caractères"
/>

<Input
label="Confirmer le mot de passe"
value={confirmPassword}
onChange={setConfirmPassword}
type="password"
placeholder="Retape ton mot de passe"
/>

<Btn onClick={handleAcceptInvite} disabled={submitting}>
{submitting ? 'Création du compte...' : 'Créer mon compte'}
</Btn>
</div>
</Card>
</div>
</PageWrap>
)
}
