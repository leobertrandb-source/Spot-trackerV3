// Utilise charge_logs (table existante) — colonne prehension_kg
// upsert par user_id + date

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

function HandInput({ label, value, onChange }) {
  function adjust(delta) {
    onChange(prev => {
      const n = Math.max(0, Math.round(((parseFloat(prev) || 0) + delta) * 10) / 10)
      return String(n)
    })
  }

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a', marginBottom: 16, textAlign: 'center' }}>
        {label}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 64, fontWeight: 900, color: '#1a1a1a', lineHeight: 1 }}>
          {value || '—'}
        </span>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#6b6b6b', marginLeft: 6 }}>kg</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={() => adjust(-1)} style={{
          flex: 1, height: 54, borderRadius: 14, border: '2px solid #e8e4dc',
          background: '#f5f3ef', fontSize: 26, fontWeight: 700, cursor: 'pointer',
        }}>−1</button>
        <button onClick={() => adjust(1)} style={{
          flex: 1, height: 54, borderRadius: 14, border: '2px solid #e8e4dc',
          background: '#f5f3ef', fontSize: 26, fontWeight: 700, cursor: 'pointer',
        }}>+1</button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[-5, -0.5, +0.5, +5].map(d => (
          <button key={d} onClick={() => adjust(d)} style={{
            flex: 1, height: 38, borderRadius: 10, border: '1.5px solid #e8e4dc',
            background: 'transparent', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            color: d < 0 ? '#c0392b' : '#2d6a4f',
          }}>{d > 0 ? `+${d}` : d}</button>
        ))}
      </div>
      <input
        type="number" step="0.5" min="0" max="200" value={value}
        onChange={e => onChange(() => e.target.value)}
        placeholder="Saisie directe"
        style={{
          width: '100%', marginTop: 10, padding: '10px 14px', borderRadius: 12,
          border: '1.5px solid #e8e4dc', fontSize: 15, fontWeight: 700,
          outline: 'none', fontFamily: 'inherit', color: '#1a1a1a',
          background: '#f9f8f6', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export default function ClubKioskPrehensionPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [rightKg, setRightKg] = useState('')
  const [leftKg, setLeftKg] = useState('')
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
    const t = setTimeout(() => navigate('/coach-kiosk/prehension'), 1500)
    return () => clearTimeout(t)
  }, [submitted, navigate])

  async function handleSubmit() {
    const r = parseFloat(rightKg)
    const l = parseFloat(leftKg)
    if (!r && !l) { setError('Entre au moins la force d\'une main.'); return }
    setSubmitting(true); setError('')

    // On stocke la moyenne ou la meilleure main dans prehension_kg
    const avg = r && l ? (r + l) / 2 : r || l

    const { error } = await supabase.from('charge_logs').upsert({
      user_id: playerId,
      date: today,
      prehension_kg: avg,
    }, { onConflict: 'user_id,date' })

    setSubmitting(false)
    if (error) { setError(`Erreur : ${error.message}`); return }
    setSubmitted(true)
  }

  if (submitted) {
    const r = parseFloat(rightKg)
    const l = parseFloat(leftKg)
    const avg = r && l ? Math.round((r + l) / 2 * 10) / 10 : r || l
    return (
      <KioskSuccessScreen
        title={`Merci ${player?.full_name || ''}`}
        message={`Préhension ${avg} kg (moy.) enregistrée`}
        footer="Retour à la liste..."
      />
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
      padding: '28px 20px 40px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8c857b', marginBottom: 6 }}>
            Préhension · Force de serrage
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
            {player?.full_name || 'Athlète'}
          </div>
          <div style={{ fontSize: 13, color: '#8c857b', marginTop: 6 }}>
            Dynamomètre — Serre au maximum pendant 3 secondes
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 14, background: '#fff1f0', border: '1px solid #f3b7b2', color: '#b42318', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {/* Deux mains */}
        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 22, padding: '28px 24px', marginBottom: 24, boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <HandInput label="✋ Main droite" value={rightKg} onChange={setRightKg} />
            <div style={{ width: 1, background: '#e8e4dc', flexShrink: 0 }} />
            <HandInput label="🤚 Main gauche" value={leftKg} onChange={setLeftKg} />
          </div>

          {rightKg && leftKg && (
            <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: '#fdf6e3', border: '1px solid #f0d080', fontSize: 14, fontWeight: 700, color: '#b5830a', textAlign: 'center' }}>
              Moyenne : {Math.round((parseFloat(rightKg) + parseFloat(leftKg)) / 2 * 10) / 10} kg
              {' · '}
              Asymétrie : {Math.abs(parseFloat(rightKg) - parseFloat(leftKg)).toFixed(1)} kg
            </div>
          )}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/coach-kiosk/prehension')} style={{
            width: 160, height: 72, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer',
          }}>Retour</button>
          <button onClick={handleSubmit} disabled={submitting} style={{
            flex: 1, height: 72, borderRadius: 999, border: 'none',
            background: 'linear-gradient(90deg, #7a5500 0%, #b5830a 100%)',
            color: '#fff', fontWeight: 900, fontSize: 22, cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 16px 32px rgba(181,131,10,0.35)', opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
