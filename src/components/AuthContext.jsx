import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [gym, setGym]         = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); setGym(null); return null }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, gym:gym_id(*)')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      const { gym: gymData, ...profileData } = data || {}
      setProfile(profileData || null)
      setGym(gymData || null)
      return profileData || null
    } catch (error) {
      console.error('fetchProfile error:', error)
      setProfile(null); setGym(null); return null
    }
  }, [])

  useEffect(() => {
    let active = true
    async function init() {
      try {
        const result = await supabase.auth.getSession()
        const session = result?.data?.session ?? null
        if (!active) return
        const nextUser = session?.user ?? null
        setUser(nextUser)
        if (nextUser?.id) await fetchProfile(nextUser.id)
        else setProfile(null)
        setLoading(false)
      } catch (error) {
        console.error('init auth error:', error)
        if (!active) return
        setUser(null); setProfile(null); setLoading(false)
      }
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const nextUser = session?.user ?? null
      setUser(nextUser)
      if (nextUser?.id) fetchProfile(nextUser.id).then(() => setLoading(false))
      else { setProfile(null); setLoading(false) }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) { setUser(null); setProfile(null); setGym(null); setLoading(false) }
    return { error }
  }, [])

  const value = useMemo(() => {
    const gymSlug = gym?.slug || ''
    const isCoachingPerso = gymSlug === 'coaching-perso'
    const isPrepPhysique  = gymSlug === 'prep-physique'
    // Fallback coaching perso si aucun gym assigné
    const showCoachingPerso = isCoachingPerso || (!isCoachingPerso && !isPrepPhysique)
    const showPrepPhysique  = isPrepPhysique
    const showMethodeSpot   = gym?.show_methode_spot === true || showCoachingPerso

    return {
      user, profile, gym, gymSlug,
      isCoach:          profile?.role === 'coach',
      isCoachingPerso,
      isPrepPhysique,
      showCoachingPerso,
      showPrepPhysique,
      showMethodeSpot,
      loading, fetchProfile, setProfile, signOut,
    }
  }, [user, profile, gym, loading, fetchProfile, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
