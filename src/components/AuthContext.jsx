import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, PageWrap, Input, Btn } from '../components/UI'
import { T } from '../lib/data'

export default function AuthPage() {
  const { user, profile, loading } = useAuth()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('athlete')

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const redirectTo = useMemo(() => {
    if (!user) return null
    if (profile?.role === 'coach') return '/coach'
    if (profile?.goal_type) return '/mon-espace'
    return '/objectif'
  }, [user, profile?.role, profile?.goal_type])

  useEffect(() => {
    setErrorMessage('')
    setSuccessMessage('')
  }, [mode])

  async function ensureProfile(currentUser, nextRole, nextFullName) {
    if (!currentUser?.id) return

    const payload = {
      id: currentUser.id,
      email: currentUser.email || email.trim().toLowerCase(),
      role: nextRole || 'athlete',
      full_name: nextFullName?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').upsert(payload)

    if (error) {
      throw error
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (submitting) return

    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()
    const cleanName = fullName.trim()

    setErrorMessage('')
    setSuccessMessage('')

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Email et mot de passe obligatoires.')
      return
    }

    if (mode === 'signup') {
      if (!cleanName) {
        setErrorMessage('Le nom complet est obligatoire.')
        return
      }

      if (cleanPassword.length < 6) {
        setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.')
        return
      }
    }

    setSubmitting(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        })

        if (error) {
          throw error
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              full_name: cleanName,
              role,
            },
          },
        })

        if (error) {
          throw error
        }

        if (data?.user) {
          await ensureProfile(data.user, role, cleanName)
        }

        setSuccessMessage(
          "Compte créé. Si la confirmation email est activée dans Supabase, valide ton adresse avant de te connecter."
        )
        setMode('login')
        setPassword('')
      }
    } catch (error) {
      console.error('Erreur auth :', error)
      setErrorMessage(error?.message || 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: T.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.textDim,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontSize: 12,
        }}
      >
        Chargement...
      </div>
    )
  }

  if (user && redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <PageWrap
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        paddingTop: 32,
        paddingBottom: 32,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1080,
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 460px) minmax(320px, 1fr)',
          gap: 20,
          alignItems: 'stretch',
        }}
      >
        <Card
          glow
          style={{
            padding: 26,
            background:
              'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 32%), linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
            minHeight: 560,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
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
                marginBottom: 18,
              }}
            >
              Le Spot
            </div>

            <div
              style={{
                color: T.text,
                fontFamily: T.fontDisplay,
                fontWeight: 900,
                fontSize: 34,
                lineHeight: 1,
              }}
            >
              SUIVI
              <br />
              COACHING
            </div>

            <div
              style={{
                color: T.textMid,
                fontSize: 14,
                lineHeight: 1.7,
                marginTop: 16,
                maxWidth: 420,
              }}
            >
              Connecte-toi à ton espace coach ou athlète pour gérer tes clients,
              tes séances, ta nutrition et ta progression.
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${T.border}`,
                color: T.textMid,
                fontSize: 13,
              }}
            >
              Coach : dashboard, clients, programmes.
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${T.border}`,
                color: T.textMid,
                fontSize: 13,
              }}
            >
              Athlète : séance du jour, nutrition, progression.
            </div>
          </div>
        </Card>

        <Card
          style={{
            padding: 26,
            minHeight: 560,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 18,
            }}
          >
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 14,
                border: mode === 'login' ? 'none' : `1px solid ${T.border}`,
                background:
                  mode === 'login'
                    ? 'linear-gradient(135deg, #43E97B, #36D86E)'
                    : 'rgba(255,255,255,0.03)',
                color: mode === 'login' ? '#07110B' : T.text,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Connexion
            </button>

            <button
              type="button"
              onClick={() => setMode('signup')}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 14,
                border: mode === 'signup' ? 'none' : `1px solid ${T.border}`,
                background:
                  mode === 'signup'
                    ? 'linear-gradient(135deg, #43E97B, #36D86E)'
                    : 'rgba(255,255,255,0.03)',
                color: mode === 'signup' ? '#07110B' : T.text,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Inscription
            </button>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                color: T.text,
                fontFamily: T.fontDisplay,
                fontWeight: 900,
                fontSize: 24,
                lineHeight: 1,
              }}
            >
              {mode === 'login' ? 'BON RETOUR' : 'CRÉER UN COMPTE'}
            </div>

            <div
              style={{
                color: T.textMid,
                fontSize: 14,
                lineHeight: 1.65,
                marginTop: 10,
              }}
            >
              {mode === 'login'
                ? 'Entre tes identifiants pour accéder à ton espace.'
                : 'Crée ton compte en quelques secondes.'}
            </div>
          </div>

          {errorMessage ? (
            <div
              style={{
                marginBottom: 14,
                padding: 14,
                borderRadius: 14,
                border: '1px solid rgba(255,120,120,0.22)',
                background: 'rgba(255,90,90,0.06)',
                color: '#FFB3B3',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div
              style={{
                marginBottom: 14,
                padding: 14,
                borderRadius: 14,
                border: `1px solid ${T.accent}22`,
                background: 'rgba(57,224,122,0.07)',
                color: T.accentLight,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {successMessage}
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'grid',
              gap: 14,
              flex: 1,
              alignContent: 'start',
            }}
          >
            {mode === 'signup' ? (
              <Input
                label="Nom complet"
                value={fullName}
                onChange={setFullName}
                placeholder="Ex : Mehdi Dupont"
              />
            ) : null}

            <Input
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="email@exemple.com"
              type="email"
            />

            <Input
              label="Mot de passe"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
            />

            {mode === 'signup' ? (
              <label style={{ display: 'grid', gap: 8 }}>
                <span
                  style={{
                    color: T.textSub || T.textDim,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Type de compte
                </span>

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    height: 48,
                    borderRadius: 14,
                    border: `1px solid ${T.border}`,
                    background: T.surface,
                    color: T.text,
                    padding: '0 14px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                >
                  <option value="athlete">Athlète</option>
                  <option value="coach">Coach</option>
                </select>
              </label>
            ) : null}

            <div style={{ marginTop: 8 }}>
              <Btn
                type="submit"
                disabled={submitting}
                style={{ width: '100%' }}
              >
                {submitting
                  ? mode === 'login'
                    ? 'Connexion...'
                    : 'Création...'
                  : mode === 'login'
                    ? 'Se connecter'
                    : 'Créer mon compte'}
              </Btn>
            </div>
          </form>
        </Card>
      </div>
    </PageWrap>
  )
}
