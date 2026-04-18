// Utilise charge_logs (table existante) — colonne cmj_cm
// upsert par user_id + date (met à jour si déjà une entrée)

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

export default function ClubKioskCmjPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('id', playerId).single()
      .then(({ data, error }) => {
        if (error) { setError("Impossible de charger l'athlète."); return }
        setPlayer(data)
      })
  }, [playerId])

  useEffect(() => {
    if (!submitted) return
    const t = setTimeout(() => navigate('/coach-kiosk/cmj'), 1500)
    return () => clearTimeout(t)
  }, [submitted, navigate])

  function adjust(delta) {
    setValue(prev => {
      const n = Math.max(0, Math.round(((parseFloat(prev) || 0) + delta) * 10) / 10)
      return String(n)
    })
  }

  async function handleSubmit() {
    const v = parseFloat(value)
    if (!v || v <= 0) { setError('Entre une hauteur valide (cm).'); return }
    setSubmitting(true); setError('')

    const { error } = await supabase.from('charge_logs').upsert({
      user_id: playerId,
      date: today,
      cmj_cm: v,
    }, { onConflict: 'user_id,date' })

    setSubmitting(false)
    if (error) { setError(`Erreur : ${error.message}`); return }
    setSubmitted(true)
  }

  if (submitted) return (
    <KioskSuccessScreen
      title={`Merci ${player?.full_name || ''}`}
      message={`CMJ ${value} cm enregistré`}
      footer="Retour à la liste..."
    />
  )

  const cmjColor = value
    ? parseFloat(value) >= 40 ? '#2d6a4f' : parseFloat(value) >= 30 ? '#b5830a' : '#c0392b'
    : '#1a1a1a'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
      padding: '28px 20px 40px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8c857b', marginBottom: 6 }}>
            CMJ · Détente verticale
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
            {player?.full_name || 'Athlète'}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 14, background: '#fff1f0', border: '1px solid #f3b7b2', color: '#b42318', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {/* Saisie */}
        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 22, padding: '32px 28px', marginBottom: 24, boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#1a1a1a', marginBottom: 24, textAlign: 'center' }}>
            Hauteur de détente
          </div>

          {/* Affichage valeur */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span style={{ fontSize: 80, fontWeight: 900, color: cmjColor, lineHeight: 1 }}>
              {value || '—'}
            </span>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#6b6b6b', marginLeft: 8 }}>cm</span>
          </div>

          {/* +/- grands boutons */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button onClick={() => adjust(-1)} style={{
              flex: 1, height: 64, borderRadius: 16, border: '2px solid #e8e4dc',
              background: '#f5f3ef', fontSize: 32, fontWeight: 700, cursor: 'pointer',
            }}>−1</button>
            <button onClick={() => adjust(1)} style={{
              flex: 1, height: 64, borderRadius: 16, border: '2px solid #e8e4dc',
              background: '#f5f3ef', fontSize: 32, fontWeight: 700, cursor: 'pointer',
            }}>+1</button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[-5, -0.5, +0.5, +5].map(d => (
              <button key={d} onClick={() => adjust(d)} style={{
                flex: 1, height: 44, borderRadius: 12, border: '1.5px solid #e8e4dc',
                background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                color: d < 0 ? '#c0392b' : '#2d6a4f',
              }}>{d > 0 ? `+${d}` : d}</button>
            ))}
          </div>

          {/* Saisie directe */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" step="0.5" min="0" max="150" value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Saisie directe"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e8e4dc',
                fontSize: 16, fontWeight: 700, outline: 'none', fontFamily: 'inherit',
                color: '#1a1a1a', background: '#f9f8f6',
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#6b6b6b' }}>cm</span>
          </div>
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/coach-kiosk/cmj')} style={{
            width: 160, height: 72, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer',
          }}>Retour</button>
          <button onClick={handleSubmit} disabled={submitting || !value} style={{
            flex: 1, height: 72, borderRadius: 999, border: 'none',
            background: value ? 'linear-gradient(90deg, #1a4a2e 0%, #2d6a4f 100%)' : '#555',
            color: '#fff', fontWeight: 900, fontSize: 22, cursor: submitting || !value ? 'not-allowed' : 'pointer',
            boxShadow: value ? '0 16px 32px rgba(45,106,79,0.35)' : 'none',
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
