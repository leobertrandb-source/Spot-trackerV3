import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
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

      if (error) {
        throw error
      }

      setProfile(data || null)
      return data || null
    } catch (error) {
      console.error('Erreur fetchProfile:', error)
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      setLoading(true)

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error) {
          throw error
        }

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser?.id) {
          await fetchProfile(currentUser.id)
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
        if (!isMounted) return
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
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      setUser(null)
      setProfile(null)

      return { error: null }
    } catch (error) {
      console.error('Erreur signOut:', error)
      return { error }
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      fetchProfile,
      setProfile,
      signOut,
    }),
    [user, profile, loading, fetchProfile, signOut]
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
