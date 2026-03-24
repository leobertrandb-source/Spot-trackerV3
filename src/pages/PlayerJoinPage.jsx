import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  bg:      '#080808',
  card:    'rgba(12,16,24,0.85)',
  border:  'rgba(255,255,255,0.08)',
  borderHi:'rgba(255,255,255,0.14)',
  text:    '#edf2f7',
  sub:     '#7a8fa6',
  dim:     '#3d4f61',
  accent:  '#3ecf8e',
  red:     '#f87171',
  yellow:  '#fbbf24',
}

const POSTES = [
  // Rugby
  'Pilier gauche', 'Talonneur', 'Pilier droit',
  'Deuxième ligne', 'Troisième ligne aile', 'Troisième ligne centre',
  'Demi de mêlée', "Demi d'ouverture",
  'Centre', 'Ailier', 'Arrière',
  // Football
  'Gardien', 'Défenseur central', 'Latéral', 'Milieu défensif',
  'Milieu central', 'Milieu offensif', 'Attaquant', 'Avant-centre',
  // Collectifs génériques
  'Pivot', 'Ailier gauche', 'Ailier droit',
  // Autre
  'Autre',
]

const BODY_ZONES = [
  { key: 'tete',     label: 'Tête' },
  { key: 'epaule',   label: 'Épaule' },
  { key: 'poignet',  label: 'Poignet / Main' },
  { key: 'dos',      label: 'Dos' },
  { key: 'genou',    label: 'Genou' },
  { key: 'cheville', label: 'Cheville / Pied' },
  { key: 'lma',      label: 'LMA' },
  { key: 'autre',    label: 'Autre' },
]

const inp = {
  width: '100%', padding: '12px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${C.border}`,
  borderRadius: 12, color: C.text, fontSize: 14,
  outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label} {required && <span style={{ color: C.accent }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export default function PlayerJoinPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [invite, setInvite]         = useState(null)
  const [coachName, setCoachName]   = useState('')
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState('')

  const [step, setStep]             = useState(1) // 1: infos perso, 2: poste + blessure, 3: mot de passe
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState('')

  // Form
  const [form, setForm] = useState({
    last_name: '',
    first_name: '',
    email: '',
    phone: '',
    poste: '',
    has_injury: false,
    injury_zone: '',
    injury_desc: '',
    password: '',
    confirm_password: '',
  })

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const load = useCallback(async () => {
    if (!token) { setInviteError('Lien invalide.'); setLoadingInvite(false); return }

    const { data, error } = await supabase
      .from('coach_invites')
      .select('*, coach:coach_id(full_name, email, gym:gym_id(name))')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (error || !data) {
      setInviteError('Ce lien est invalide, expiré ou déjà utilisé.')
      setLoadingInvite(false)
      return
    }

    setInvite(data)
    setCoachName(data.coach?.full_name || data.coach?.email || 'votre coach')
    setLoadingInvite(false)
  }, [token])

  useEffect(() => { load() }, [load])

  function validateStep1() {
    if (!form.last_name.trim()) return 'Le nom est obligatoire'
    if (!form.first_name.trim()) return 'Le prénom est obligatoire'
    if (!form.email.trim() || !form.email.includes('@')) return 'Email invalide'
    return null
  }

  function validateStep2() {
    if (!form.poste) return 'Le poste est obligatoire'
    if (form.has_injury && !form.injury_zone) return 'Indique la zone de ta blessure'
    return null
  }

  function validateStep3() {
    if (!form.password || form.password.length < 6) return 'Mot de passe minimum 6 caractères'
    if (form.password !== form.confirm_password) return 'Les mots de passe ne correspondent pas'
    return null
  }

  function nextStep() {
    setError('')
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null
    if (err) { setError(err); return }
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    setError('')
    const err = validateStep3()
    if (err) { setError(err); return }

    setSubmitting(true)
    const email = form.email.trim().toLowerCase()

    // Créer le compte
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: { full_name: `${form.last_name.toUpperCase()} ${form.first_name}` }
      }
    })

    if (signUpError) {
      setError(signUpError.message || 'Erreur lors de la création du compte')
      setSubmitting(false)
      return
    }

    const userId = signUpData?.user?.id
    if (!userId) { setError('Erreur inattendue'); setSubmitting(false); return }

    const gymId = invite?.coach?.gym_id || null

    // Créer le profil
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: `${form.last_name.toUpperCase()} ${form.first_name}`,
      email,
      role: 'athlete',
      gym_id: gymId,
      phone: form.phone || null,
      poste: form.poste,
    })

    // Relier au coach
    await supabase.from('coach_clients').insert({
      coach_id: invite.coach_id,
      client_id: userId,
    })

    // Si blessure en cours — créer la fiche médicale
    if (form.has_injury && form.injury_zone) {
      await supabase.from('medical_injuries').insert({
        athlete_id: userId,
        coach_id: invite.coach_id,
        body_zone: form.injury_zone,
        description: form.injury_desc || null,
        date_injury: new Date().toISOString().split('T')[0],
        status: 'active',
      })
    }

    // Marquer l'invitation utilisée
    await supabase.from('coach_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    setSubmitting(false)
    setDone(true)
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loadingInvite) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.sub, fontFamily: 'inherit', fontSize: 13, letterSpacing: 2 }}>
        Chargement...
      </div>
    )
  }

  // ── Erreur invitation ────────────────────────────────────────────────────
  if (inviteError) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '32px 28px', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>Lien invalide</div>
          <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6 }}>{inviteError}</div>
        </div>
      </div>
    )
  }

  // ── Succès ───────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '40px 32px', maxWidth: 420, textAlign: 'center', backdropFilter: 'blur(24px)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(62,207,142,0.15)', border: `2px solid ${C.accent}`, display: 'grid', placeItems: 'center', fontSize: 28, margin: '0 auto 20px' }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>Bienvenue dans l'équipe !</div>
          <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, marginBottom: 24 }}>
            Ton compte a été créé. Vérifie ton email pour confirmer ton inscription, puis connecte-toi sur l'app.
          </div>
          <button onClick={() => navigate('/')} style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: C.accent, color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Accéder à l'app →
          </button>
        </div>
      </div>
    )
  }

  const progress = (step / 3) * 100

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }}>

      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>
          atl<span style={{ color: C.accent }}>yo</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            Inscription joueur
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            Rejoins {coachName}
          </div>
          <div style={{ fontSize: 13, color: C.sub }}>Étape {step} sur 3</div>
        </div>

        {/* Barre progression */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: C.accent, borderRadius: 2, transition: 'width 0.4s' }} />
        </div>

        {/* Card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '28px 24px', backdropFilter: 'blur(24px)' }}>

          {/* Erreur */}
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 13, color: C.red }}>
              {error}
            </div>
          )}

          {/* ── ÉTAPE 1 : Infos personnelles ── */}
          {step === 1 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20 }}>Tes informations</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nom" required>
                  <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value.toUpperCase())}
                    placeholder="DUPONT" style={inp} />
                </Field>
                <Field label="Prénom" required>
                  <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)}
                    placeholder="Thomas" style={inp} />
                </Field>
              </div>
              <Field label="Email" required>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="thomas@email.com" style={inp} />
              </Field>
              <Field label="Numéro de téléphone">
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="06 12 34 56 78" style={inp} />
              </Field>
            </>
          )}

          {/* ── ÉTAPE 2 : Poste + Blessure ── */}
          {step === 2 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20 }}>Ton profil sportif</div>
              <Field label="Poste principal" required>
                <select value={form.poste} onChange={e => set('poste', e.target.value)} style={{ ...inp, appearance: 'none' }}>
                  <option value="">Sélectionne ton poste</option>
                  {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div
                    onClick={() => set('has_injury', !form.has_injury)}
                    style={{
                      width: 20, height: 20, borderRadius: 6,
                      border: `1.5px solid ${form.has_injury ? C.accent : C.border}`,
                      background: form.has_injury ? C.accent : 'transparent',
                      display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>
                    {form.has_injury && <span style={{ color: '#080808', fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, color: C.text }}>J'ai une blessure en cours / récente</span>
                </label>
              </div>

              {form.has_injury && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
                  <Field label="Zone corporelle" required>
                    <select value={form.injury_zone} onChange={e => set('injury_zone', e.target.value)} style={{ ...inp, appearance: 'none' }}>
                      <option value="">Sélectionne la zone</option>
                      {BODY_ZONES.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Description (optionnel)">
                    <textarea value={form.injury_desc} onChange={e => set('injury_desc', e.target.value)}
                      rows={2} placeholder="Ex: entorse genou gauche depuis 2 semaines..."
                      style={{ ...inp, resize: 'none' }} />
                  </Field>
                </div>
              )}
            </>
          )}

          {/* ── ÉTAPE 3 : Mot de passe ── */}
          {step === 3 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Crée ton mot de passe</div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Tu utiliseras cet email et ce mot de passe pour te connecter à Atlyo.</div>
              <div style={{ padding: '10px 14px', background: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 10, marginBottom: 16, fontSize: 13, color: C.sub }}>
                📧 {form.email}
              </div>
              <Field label="Mot de passe" required>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Minimum 6 caractères" style={inp} />
              </Field>
              <Field label="Confirmer le mot de passe" required>
                <input type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)}
                  placeholder="Retape ton mot de passe" style={inp} />
              </Field>
            </>
          )}

          {/* Boutons navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {step > 1 && (
              <button onClick={() => { setError(''); setStep(s => s - 1) }} style={{
                flex: 1, padding: '13px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'inherit', border: `1px solid ${C.border}`,
                background: 'transparent', color: C.sub, fontSize: 14, fontWeight: 600,
              }}>← Retour</button>
            )}
            {step < 3 ? (
              <button onClick={nextStep} style={{
                flex: 2, padding: '13px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'inherit', border: 'none',
                background: C.accent, color: '#080808', fontSize: 14, fontWeight: 700,
              }}>Continuer →</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} style={{
                flex: 2, padding: '13px', borderRadius: 12,
                cursor: submitting ? 'default' : 'pointer',
                fontFamily: 'inherit', border: 'none',
                background: C.accent, color: '#080808', fontSize: 14, fontWeight: 700,
                opacity: submitting ? 0.7 : 1,
              }}>{submitting ? 'Création du compte...' : 'Créer mon compte ✓'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
