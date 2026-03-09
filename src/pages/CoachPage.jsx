import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Input } from '../components/UI'
import { T } from '../lib/data'

export default function CoachPage() {
const { user, profile } = useAuth()

const [clients, setClients] = useState([])
const [loading, setLoading] = useState(true)

const [inviteEmail, setInviteEmail] = useState('')
const [inviteLink, setInviteLink] = useState('')
const [inviteLoading, setInviteLoading] = useState(false)

useEffect(() => {
loadClients()
}, [user?.id])

async function loadClients() {
if (!user?.id) {
setClients([])
setLoading(false)
return
}

setLoading(true)

try {
const { data: links, error: linksError } = await supabase
.from('coach_clients')
.select('client_id')
.eq('coach_id', user.id)

if (linksError) {
console.error('Erreur coach_clients:', linksError)
setClients([])
setLoading(false)
return
}

const ids = (links || []).map((row) => row.client_id).filter(Boolean)

if (!ids.length) {
setClients([])
setLoading(false)
return
}

const { data: profilesData, error: profilesError } = await supabase
.from('profiles')
.select('id, full_name, email, role')
.in('id', ids)

if (profilesError) {
console.error('Erreur profiles:', profilesError)
setClients([])
setLoading(false)
return
}

setClients(profilesData || [])
} catch (error) {
console.error('Erreur chargement clients:', error)
setClients([])
} finally {
setLoading(false)
}
}

async function createInvite() {
if (!user?.id || !inviteEmail.trim()) return

setInviteLoading(true)
setInviteLink('')

try {
const token =
globalThis.crypto?.randomUUID?.().replace(/-/g, '') ||
`${Date.now()}${Math.random().toString(36).slice(2, 10)}`

const { error } = await supabase.from('coach_invites').insert({
coach_id: user.id,
email: inviteEmail.trim().toLowerCase(),
invite_token: token,
status: 'pending',
})

if (error) {
console.error('Erreur invitation:', error)
alert(error.message || "Impossible de créer l'invitation.")
setInviteLoading(false)
return
}

setInviteLink(`${window.location.origin}/invite/${token}`)
} catch (error) {
console.error('Erreur createInvite:', error)
alert("Impossible de créer l'invitation.")
} finally {
setInviteLoading(false)
}
}

async function copyInviteLink() {
if (!inviteLink) return

try {
await navigator.clipboard.writeText(inviteLink)
alert('Lien copié')
} catch (error) {
console.error(error)
alert('Impossible de copier le lien')
}
}

return (
<PageWrap>
<div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 18 }}>
<Card
style={{
padding: '22px 20px',
background:
'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%), linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
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
Espace coach
</div>

<div
style={{
color: T.text,
fontFamily: T.fontDisplay,
fontWeight: 900,
fontSize: 32,
lineHeight: 1,
}}
>
COACH DASHBOARD
</div>

<div
style={{
color: T.textMid,
fontSize: 14,
lineHeight: 1.65,
marginTop: 10,
}}
>
Bonjour {profile?.full_name || user?.email || 'Coach'}.
</div>
</Card>

<div
style={{
display: 'grid',
gridTemplateColumns: 'minmax(0, 1fr)',
gap: 18,
}}
>
<Card style={{ padding: '20px' }}>
<div
style={{
color: T.text,
fontFamily: T.fontDisplay,
fontWeight: 800,
fontSize: 18,
marginBottom: 14,
}}
>
Inviter un client
</div>

<div style={{ display: 'grid', gap: 12 }}>
<Input
label="Email du client"
value={inviteEmail}
onChange={setInviteEmail}
placeholder="client@email.com"
/>

<Btn onClick={createInvite} disabled={inviteLoading || !inviteEmail.trim()}>
{inviteLoading ? 'Création...' : "Générer un lien d'invitation"}
</Btn>

{inviteLink ? (
<div style={{ display: 'grid', gap: 10 }}>
<div
style={{
padding: 12,
borderRadius: 14,
border: `1px solid ${T.border}`,
background: T.surface,
color: T.textMid,
fontSize: 12,
wordBreak: 'break-all',
}}
>
{inviteLink}
</div>

<Btn onClick={copyInviteLink}>Copier le lien</Btn>
</div>
) : null}
</div>
</Card>

<Card style={{ padding: '20px' }}>
<div
style={{
color: T.text,
fontFamily: T.fontDisplay,
fontWeight: 800,
fontSize: 18,
marginBottom: 14,
}}
>
Mes clients
</div>

{loading ? (
<div style={{ color: T.textDim, fontSize: 14 }}>Chargement des clients...</div>
) : clients.length === 0 ? (
<div style={{ color: T.textMid, fontSize: 14 }}>
Aucun client pour le moment.
</div>
) : (
<div style={{ display: 'grid', gap: 10 }}>
{clients.map((client) => (
<div
key={client.id}
style={{
padding: '12px 14px',
borderRadius: 14,
background: 'rgba(255,255,255,0.03)',
border: '1px solid rgba(255,255,255,0.06)',
}}
>
<div
style={{
color: T.text,
fontWeight: 800,
fontSize: 14,
}}
>
{client.full_name || 'Client'}
</div>

<div
style={{
color: T.textDim,
fontSize: 12,
marginTop: 4,
}}
>
{client.email}
</div>
</div>
))}
</div>
)}
</Card>
</div>
</div>
</PageWrap>
)
}
