import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
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

      if (error) throw error

      setProfile(data || null)
      return data || null
    } catch (error) {
      console.error('fetchProfile error:', error)
      setProfile(null)
      return null
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
        setLoading(false)

        if (nextUser?.id) {
          fetchProfile(nextUser.id)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('init auth error:', error)
        if (!active) return
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return

      const nextUser = session?.user ?? null
      setUser(nextUser)
      setLoading(false)

      if (nextUser?.id) {
        fetchProfile(nextUser.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (!error) {
      setUser(null)
      setProfile(null)
      setLoading(false)
    }

    return { error }
  }, [])

  const value = useMemo(() => {
    return {
      user,
      profile,
      loading,
      fetchProfile,
      setProfile,
      signOut,
    }
  }, [user, profile, loading, fetchProfile, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
