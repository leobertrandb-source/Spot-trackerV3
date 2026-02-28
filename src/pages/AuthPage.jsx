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
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Background orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 400, height: 400, background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 70%)`, borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 300, height: 300, background: `radial-gradient(circle, rgba(59,158,255,0.06) 0%, transparent 70%)`, borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* Animated ring */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 700, height: 700, border: `1px solid ${T.border}`, borderRadius: '50%', opacity: 0.3, pointerEvents: 'none', animation: 'spin 30s linear infinite' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, height: 500, border: `1px solid ${T.border}`, borderRadius: '50%', opacity: 0.2, pointerEvents: 'none', animation: 'spin 20s linear infinite reverse' }} />

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp .4s ease both', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div style={{
          background: `linear-gradient(145deg, ${T.card}, ${T.surface})`,
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusLg + 4,
          padding: 36,
          boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${T.border}`,
          backdropFilter: 'blur(10px)',
        }}>

          {/* Mode tabs */}
          <div style={{ display: 'flex', background: T.bg, borderRadius: T.radiusSm, padding: 4, marginBottom: 28, gap: 4 }}>
            {[['login', 'Connexion'], ['register', 'Créer un compte']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
                flex: 1, padding: '9px 0',
                background: mode === m ? `linear-gradient(135deg, ${T.accent}, ${T.accentDim})` : 'transparent',
                color: mode === m ? '#000' : T.textDim,
                border: 'none', borderRadius: T.radiusSm - 2,
                fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 12,
                letterSpacing: 1.5, textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all .2s',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <Input label="Prénom" value={name} onChange={setName} placeholder="Thomas" required autoFocus />
            )}
            <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="thomas@email.com" required />
            <Input label="Mot de passe" value={password} onChange={setPassword} type="password" placeholder="••••••••" required />

            {error && (
              <div style={{ background: '#1a0808', border: `1px solid ${T.danger}44`, borderRadius: T.radiusSm, padding: '11px 14px', fontSize: 13, color: T.danger, fontFamily: T.fontBody }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: '#081a0f', border: `1px solid ${T.accent}44`, borderRadius: T.radiusSm, padding: '11px 14px', fontSize: 13, color: T.accent, fontFamily: T.fontBody }}>
                {success}
              </div>
            )}

            <Btn onClick={handleSubmit} disabled={loading} size="lg" style={{ width: '100%', marginTop: 4 }}>
              {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </Btn>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontFamily: T.fontDisplay, fontSize: 10, color: T.textDim, letterSpacing: 2, textTransform: 'uppercase' }}>
          Le Spot Training · Coach &amp; Physio
        </div>
      </div>
    </div>
  )
}
