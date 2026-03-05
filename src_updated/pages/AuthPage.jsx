import { useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { Input, Btn, Logo } from '../components/UI'
import { T } from '../lib/data'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const err = await signIn(email, password)
      if (err) setError('Email ou mot de passe incorrect.')
    } else {
      if (!name.trim()) { setError('Entre ton prénom.'); setLoading(false); return }
      const err = await signUp(email, password, name)
      if (err) setError(err.message)
      else setSuccess('Compte créé ! Vérifie ton email pour confirmer.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ position: 'absolute', top: '20%', left: '8%', width: 500, height: 500, background: `radial-gradient(circle, ${T.accentGlowSm} 0%, transparent 65%)`, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: 350, height: 350, background: `radial-gradient(circle, ${T.blueGlow} 0%, transparent 65%)`, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, border: `1px solid ${T.border}`, borderRadius: '50%', opacity: 0.25, pointerEvents: 'none', animation: 'spinSlow 40s linear infinite' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 550, height: 550, border: `1px solid ${T.border}`, borderRadius: '50%', opacity: 0.15, pointerEvents: 'none', animation: 'spinSlow 25s linear infinite reverse' }} />

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp .35s ease both', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 44 }}>
          <Logo size="lg" />
        </div>

        <div style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusXl,
          padding: '38px 36px',
          boxShadow: `${T.shadowLg}, 0 0 80px rgba(0,0,0,0.4)`,
        }}>
          <div style={{
            display: 'flex',
            background: T.surface,
            borderRadius: T.radius,
            padding: 4,
            marginBottom: 30, gap: 4,
          }}>
            {[['login', 'Connexion'], ['register', 'Créer un compte']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
                flex: 1, padding: '9px 0',
                background: mode === m ? `linear-gradient(135deg, ${T.accent}, ${T.accentDim})` : 'transparent',
                color: mode === m ? '#050a05' : T.textDim,
                border: 'none', borderRadius: T.radius - 2,
                fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 12,
                letterSpacing: 1.5, textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all .2s',
                boxShadow: mode === m ? `0 2px 12px ${T.accentGlow}` : 'none',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'register' && (
              <Input label="Prénom" value={name} onChange={setName} placeholder="Thomas" required autoFocus />
            )}
            <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="thomas@email.com" required />
            <Input label="Mot de passe" value={password} onChange={setPassword} type="password" placeholder="••••••••" required />

            {error && (
              <div style={{
                background: T.dangerGlow, border: `1px solid ${T.danger}35`,
                borderRadius: T.radius, padding: '11px 16px',
                fontSize: 13, color: T.danger, fontFamily: T.fontBody,
              }}>{error}</div>
            )}
            {success && (
              <div style={{
                background: T.accentGlowSm, border: `1px solid ${T.accent}35`,
                borderRadius: T.radius, padding: '11px 16px',
                fontSize: 13, color: T.accent, fontFamily: T.fontBody,
              }}>{success}</div>
            )}

            <Btn onClick={handleSubmit} disabled={loading} size="lg" style={{ width: '100%', marginTop: 6 }}>
              {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </Btn>
          </div>
        </div>

        <div style={{
          textAlign: 'center', marginTop: 26,
          fontFamily: T.fontDisplay, fontSize: 9,
          color: T.textDim, letterSpacing: 3, textTransform: 'uppercase',
        }}>
          Le Spot Training · ProSportConcept
        </div>
      </div>
    </div>
  )
}
