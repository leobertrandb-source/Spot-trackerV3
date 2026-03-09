import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
const [user, setUser] = useState(null)
const [profile, setProfile] = useState(null)
const [loading, setLoading] = useState(true)

async function fetchProfile(userId) {
if (!userId) {
setProfile(null)
return null
}

try {
const { data, error } = await supabase
.from('profiles')
.select('*')
.eq('id', userId)
.maybeSingle()

if (error) {
console.error('Erreur fetchProfile:', error)
setProfile(null)
return null
}

setProfile(data || null)
return data || null
} catch (error) {
console.error('Erreur inattendue fetchProfile:', error)
setProfile(null)
return null
}
}

useEffect(() => {
let mounted = true

async function bootstrap() {
try {
const {
data: { session },
error,
} = await supabase.auth.getSession()

if (!mounted) return

if (error) {
console.error('Erreur getSession:', error)
setUser(null)
setProfile(null)
setLoading(false)
return
}

const currentUser = session?.user ?? null
setUser(currentUser)

if (currentUser?.id) {
await fetchProfile(currentUser.id)
} else {
setProfile(null)
}
} catch (error) {
console.error('Erreur bootstrap auth:', error)
if (!mounted) return
setUser(null)
setProfile(null)
} finally {
if (mounted) {
setLoading(false)
}
}
}

bootstrap()

const {
data: { subscription },
} = supabase.auth.onAuthStateChange(async (_event, session) => {
if (!mounted) return

try {
const currentUser = session?.user ?? null
setUser(currentUser)

if (currentUser?.id) {
await fetchProfile(currentUser.id)
} else {
setProfile(null)
}
} catch (error) {
console.error('Erreur onAuthStateChange:', error)
setProfile(null)
} finally {
if (mounted) {
setLoading(false)
}
}
})

return () => {
mounted = false
subscription.unsubscribe()
}
}, [])

async function signOut() {
const { error } = await supabase.auth.signOut()

if (error) {
console.error('Erreur signOut:', error)
return { error }
}

setUser(null)
setProfile(null)
return { error: null }
}

const value = useMemo(
() => ({
user,
profile,
loading,
fetchProfile,
setProfile,
signOut,
}),
[user, profile, loading]
)

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
const context = useContext(AuthContext)

if (!context) {
throw new Error('useAuth must be used within an AuthProvider')
}

return context
}

