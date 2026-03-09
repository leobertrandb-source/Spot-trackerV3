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
console.error('Erreur chargement profile:', error)
setProfile(null)
return null
}

setProfile(data || null)
return data || null
} catch (error) {
console.error('Erreur inattendue profile:', error)
setProfile(null)
return null
}
}

useEffect(() => {
let isMounted = true

async function initAuth() {
try {
const {
data: { session },
error,
} = await supabase.auth.getSession()

if (!isMounted) return

if (error) {
console.error('Erreur getSession:', error)
setUser(null)
setProfile(null)
setLoading(false)
return
}

const sessionUser = session?.user || null
setUser(sessionUser)

if (sessionUser?.id) {
await fetchProfile(sessionUser.id)
} else {
setProfile(null)
}
} catch (error) {
console.error('Erreur init auth:', error)
if (!isMounted) return
setUser(null)
setProfile(null)
} finally {
if (isMounted) {
setLoading(false)
}
}
}

initAuth()

const {
data: { subscription },
} = supabase.auth.onAuthStateChange(async (_event, session) => {
if (!isMounted) return

const sessionUser = session?.user || null
setUser(sessionUser)

try {
if (sessionUser?.id) {
await fetchProfile(sessionUser.id)
} else {
setProfile(null)
}
} catch (error) {
console.error('Erreur onAuthStateChange:', error)
setProfile(null)
} finally {
if (isMounted) {
setLoading(false)
}
}
})

return () => {
isMounted = false
subscription.unsubscribe()
}
}, [])

async function signOut() {
const { error } = await supabase.auth.signOut()

if (error) {
console.error('Erreur logout:', error)
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
