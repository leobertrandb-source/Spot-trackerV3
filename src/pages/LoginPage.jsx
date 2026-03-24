import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  black:   '#080808',
  black2:  '#111111',
  black3:  '#181818',
  border:  'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.13)',
  green:   '#3ecf8e',
  greenDark: '#1a3a2a',
  text:    '#f0f0f0',
  mid:     '#888888',
  dim:     '#444444',
}

const LOGO = (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <path d="M6 26L16 6L26 26" stroke={C.greenDark} strokeWidth="4" strokeLinejoin="round"/>
    <line x1="9.5" y1="20" x2="22.5" y2="20" stroke={C.greenDark} strokeWidth="3" strokeLinecap="round"/>
    <circle cx="16" cy="6" r="3" fill={C.green}/>
  </svg>
)

const PILLS = [
  'Surcharge progressive auto',
  '50 recettes intégrées',
  'Notifications push',
  'Dashboard temps réel',
  'Mode borne équipe',
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')  // 'login' | 'register'
  const [role, setRole] = useState('coach') // 'coach' | 'club'
  const [showPwd, setShowPwd] = useState(false)

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPwd, setLoginPwd] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Register fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPwd, setRegPwd] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/coach')
    })
  }, [navigate])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    if (!loginEmail || !loginPwd) {
      setLoginError('Merci de remplir tous les champs.')
      return
    }
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPwd,
    })
    if (error) {
      setLoginError(
        error.message.includes('Invalid login')
          ? 'Email ou mot de passe incorrect.'
          : error.message
      )
    } else {
      navigate('/coach')
    }
    setLoginLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setRegError('')
    if (!firstName || !lastName || !regEmail || !regPwd) {
      setRegError('Merci de remplir tous les champs.')
      return
    }
    if (regPwd.length < 8) {
      setRegError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (!termsAccepted) {
      setRegError('Veuillez accepter les conditions générales.')
      return
    }
    setRegLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: regEmail.trim(),
      password: regPwd,
      options: {
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          role,
        },
      },
    })
    if (error) {
      setRegError(
        error.message.includes('already registered')
          ? 'Cet email est déjà utilisé.'
          : error.message
      )
    } else if (data.user) {
      // Récupérer le gym_id selon le rôle choisi
      const gymSlug = role === 'club' ? 'prep-physique' : 'coaching-perso'
      const { data: gymData } = await supabase
        .from('gyms')
        .select('id')
        .eq('slug', gymSlug)
        .maybeSingle()

      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        email: regEmail.trim(),
        role: 'coach', // toujours coach à l'inscription
        gym_id: gymData?.id || null,
      })
      setRegSuccess(true)
    }
    setRegLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: C.black2,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  const onFocus = e => {
    e.target.style.borderColor = 'rgba(62,207,142,0.4)'
    e.target.style.boxShadow = '0 0 0 3px rgba(62,207,142,0.07)'
  }
  const onBlur = e => {
    e.target.style.borderColor = C.border
    e.target.style.boxShadow = 'none'
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      background: C.black,
      color: C.text,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: ${C.dim}; }
        @media (max-width: 768px) {
          .left-panel { display: none !important; }
          .right-panel { grid-column: 1 / -1 !important; }
        }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div className="left-panel" style={{
        position: 'relative',
        background: C.black2,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        overflow: 'hidden',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute', bottom: -120, left: -80,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(62,207,142,0.09) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontWeight: 700, fontSize: 20, letterSpacing: '-0.4px',
          color: C.text, textDecoration: 'none', position: 'relative', zIndex: 1,
        }}>
          {LOGO}
          <span>atl<span style={{ color: C.green }}>yo</span></span>
        </a>

        {/* Body */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(32px, 3.5vw, 50px)',
            fontWeight: 400, lineHeight: 1.1, letterSpacing: '-1.5px',
            marginBottom: 20,
          }}>
            Pilotez la performance.<br />
            <em style={{ fontStyle: 'italic', color: C.green }}>Chaque jour.</em>
          </h2>
          <p style={{ fontSize: 15, color: C.mid, lineHeight: 1.7, maxWidth: 360, marginBottom: 36 }}>
            Programmes, nutrition, surcharge progressive — tout est automatisé pour que vous restiez concentré sur ce qui compte vraiment.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {PILLS.map(p => (
              <div key={p} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${C.border2}`,
                fontSize: 13, fontWeight: 500, color: C.mid,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, flexShrink: 0, display: 'inline-block' }} />
                {p}
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: C.dim, position: 'relative', zIndex: 1 }}>
          © 2026 Atlyo · Données hébergées en Europe · RGPD
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="right-panel" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px', background: C.black, position: 'relative',
      }}>
        {/* Subtle glow */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(62,207,142,0.04) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 32, fontWeight: 400, letterSpacing: '-0.8px',
              marginBottom: 8,
            }}>
              {tab === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
            </h1>
            <p style={{ fontSize: 14, color: C.mid }}>
              {tab === 'login'
                ? <>Pas encore de compte ?{' '}<span onClick={() => setTab('register')} style={{ color: C.green, fontWeight: 600, cursor: 'pointer' }}>Créer un compte</span></>
                : <>Déjà inscrit ?{' '}<span onClick={() => setTab('login')} style={{ color: C.green, fontWeight: 600, cursor: 'pointer' }}>Se connecter</span></>
              }
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', background: C.black2,
            border: `1px solid ${C.border2}`, borderRadius: 12, padding: 4, marginBottom: 28,
          }}>
            {[
              { key: 'login', label: 'Connexion' },
              { key: 'register', label: 'Inscription' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setLoginError(''); setRegError('') }}
                style={{
                  flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                  background: tab === t.key ? C.black3 : 'transparent',
                  border: tab === t.key ? `1px solid ${C.border2}` : '1px solid transparent',
                  color: tab === t.key ? C.text : C.dim,
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.mid, marginBottom: 7 }}>
                  Adresse e-mail
                </label>
                <input
                  type="email" value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  autoComplete="email"
                  style={inputStyle}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Mot de passe</label>
                  <span style={{ fontSize: 12, color: C.dim, cursor: 'pointer', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = C.green}
                    onMouseLeave={e => e.target.style.color = C.dim}>
                    Mot de passe oublié ?
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'} value={loginPwd}
                    onChange={e => setLoginPwd(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={onFocus} onBlur={onBlur}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.dim, display: 'flex', alignItems: 'center' }}>
                    {showPwd
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {loginError && (
                <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                  {loginError}
                </div>
              )}

              <button type="submit" disabled={loginLoading} style={{
                width: '100%', padding: 14, borderRadius: 10,
                background: C.green, color: '#000',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                border: 'none', cursor: loginLoading ? 'default' : 'pointer',
                opacity: loginLoading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s, transform 0.15s',
              }}>
                {loginLoading ? 'Connexion...' : (
                  <>Se connecter <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></>
                )}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && !regSuccess && (
            <form onSubmit={handleRegister} style={{ display: 'grid', gap: 16 }}>
              {/* Prénom / Nom */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.mid, marginBottom: 7 }}>Prénom</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Léo" autoComplete="given-name"
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.mid, marginBottom: 7 }}>Nom</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Bertrand" autoComplete="family-name"
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.mid, marginBottom: 7 }}>Adresse e-mail</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  placeholder="vous@exemple.fr" autoComplete="email"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.mid, marginBottom: 7 }}>Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={regPwd}
                    onChange={e => setRegPwd(e.target.value)}
                    placeholder="8 caractères minimum" autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.dim, display: 'flex', alignItems: 'center' }}>
                    {showPwd
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Rôle */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.mid, marginBottom: 10 }}>Je suis…</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'coach', label: '🏋️ Coach personnel' },
                    { key: 'club', label: '🏟️ Club / Prépa' },
                  ].map(r => (
                    <button key={r.key} type="button" onClick={() => setRole(r.key)} style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${role === r.key ? 'rgba(62,207,142,0.5)' : C.border}`,
                      background: role === r.key ? 'rgba(62,207,142,0.07)' : C.black2,
                      color: role === r.key ? C.green : C.mid,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CGV */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: 2, accentColor: C.green, width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
                  J'accepte les{' '}
                  <a href="/cgv" style={{ color: C.green, textDecoration: 'none' }}>CGV</a>
                  {' '}et la{' '}
                  <a href="/politique-confidentialite" style={{ color: C.green, textDecoration: 'none' }}>politique de confidentialité</a>
                  {' '}d'Atlyo.
                </span>
              </label>

              {regError && (
                <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                  {regError}
                </div>
              )}

              <button type="submit" disabled={regLoading} style={{
                width: '100%', padding: 14, borderRadius: 10,
                background: C.green, color: '#000',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                border: 'none', cursor: regLoading ? 'default' : 'pointer',
                opacity: regLoading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s',
              }}>
                {regLoading ? 'Création...' : (
                  <>Créer mon compte <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></>
                )}
              </button>
            </form>
          )}

          {/* ── SUCCESS STATE ── */}
          {tab === 'register' && regSuccess && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>✉️</div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 400, marginBottom: 12 }}>
                Vérifie ton email
              </h3>
              <p style={{ fontSize: 15, color: C.mid, lineHeight: 1.7, marginBottom: 24 }}>
                Un lien de confirmation a été envoyé à <strong style={{ color: C.text }}>{regEmail}</strong>. Clique dessus pour activer ton compte.
              </p>
              <button onClick={() => { setTab('login'); setRegSuccess(false) }} style={{
                padding: '12px 28px', borderRadius: 10, border: `1px solid ${C.border2}`,
                background: 'transparent', color: C.text, fontFamily: 'inherit',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                Retour à la connexion
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
