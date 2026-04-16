// SQL à créer dans Supabase si inexistant :
// create table public.kiosk_topset (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references public.profiles(id) on delete cascade,
//   date date not null,
//   exercise text not null,
//   weight_kg numeric(6,2),
//   reps integer,
//   created_at timestamptz default now()
// );

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

const EXERCISES = [
  { key: 'squat',        label: 'Squat',              emoji: '🏋️' },
  { key: 'front_squat',  label: 'Front Squat',        emoji: '🦵' },
  { key: 'bench',        label: 'Développé couché',   emoji: '🔄' },
  { key: 'deadlift',     label: 'Soulevé de terre',   emoji: '⬆️' },
  { key: 'hip_thrust',   label: 'Hip Thrust',         emoji: '🍑' },
  { key: 'rowing',       label: 'Rowing barre',       emoji: '🚣' },
  { key: 'ohp',          label: 'Dév. militaire',     emoji: '💪' },
  { key: 'pullup',       label: 'Tractions',          emoji: '🤸' },
  { key: 'rdl',          label: 'RDL',                emoji: '📐' },
  { key: 'leg_press',    label: 'Leg Press',          emoji: '🦿' },
]

function NumericInput({ label, value, onChange, unit, placeholder }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#6b6b6b', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onChange(Math.max(0, (parseFloat(value) || 0) - (unit === 'kg' ? 2.5 : 1)))} style={{
          width: 52, height: 52, borderRadius: 14, border: '2px solid #e8e4dc', background: '#f5f3ef',
          fontSize: 24, fontWeight: 700, cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>−</button>
        <input
          type="number" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '14px 10px', borderRadius: 14, border: '2px solid #e8e4dc',
            fontSize: 26, fontWeight: 900, textAlign: 'center', outline: 'none',
            fontFamily: 'inherit', color: '#1a1a1a', background: '#f9f8f6', boxSizing: 'border-box',
          }}
        />
        <button onClick={() => onChange((parseFloat(value) || 0) + (unit === 'kg' ? 2.5 : 1))} style={{
          width: 52, height: 52, borderRadius: 14, border: '2px solid #e8e4dc', background: '#f5f3ef',
          fontSize: 24, fontWeight: 700, cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>+</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#6b6b6b', minWidth: 28 }}>{unit}</span>
      </div>
    </div>
  )
}

export default function ClubKioskTopsetPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [exercise, setExercise] = useState(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
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
    const t = setTimeout(() => navigate('/coach-kiosk/topset'), 1500)
    return () => clearTimeout(t)
  }, [submitted, navigate])

  async function handleSubmit() {
    if (!exercise) { setError('Sélectionne un exercice.'); return }
    if (!weight && !reps) { setError('Entre au moins le poids ou le nombre de reps.'); return }
    setSubmitting(true); setError('')

    const { error } = await supabase.from('kiosk_topset').insert({
      user_id: playerId,
      date: today,
      exercise: exercise.label,
      weight_kg: weight ? parseFloat(weight) : null,
      reps: reps ? parseInt(reps) : null,
    })

    setSubmitting(false)
    if (error) { setError(`Erreur : ${error.message}`); return }
    setSubmitted(true)
  }

  if (submitted) return (
    <KioskSuccessScreen
      title={`Merci ${player?.full_name || ''}`}
      message={`Topset ${exercise?.label || ''} enregistré`}
      footer="Retour à la liste..."
    />
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
      padding: '28px 20px 40px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8c857b', marginBottom: 6 }}>
            Topset · Exercices de base
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

        {/* Sélection exercice */}
        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 22, padding: '24px 26px', marginBottom: 18, boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }}>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#1a1a1a', marginBottom: 16 }}>Exercice</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {EXERCISES.map(ex => (
              <button key={ex.key} onClick={() => setExercise(ex)} style={{
                padding: '14px 12px', borderRadius: 14,
                border: `2px solid ${exercise?.key === ex.key ? '#1a6db5' : '#e8e4dc'}`,
                background: exercise?.key === ex.key ? '#f0f7ff' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.12s',
              }}>
                <span style={{ fontSize: 20 }}>{ex.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: exercise?.key === ex.key ? '#1a6db5' : '#1a1a1a', textAlign: 'left' }}>{ex.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Poids + reps */}
        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 22, padding: '24px 26px', marginBottom: 24, boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }}>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#1a1a1a', marginBottom: 20 }}>
            Performance{exercise ? ` — ${exercise.emoji} ${exercise.label}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <NumericInput label="Poids" value={weight} onChange={setWeight} unit="kg" placeholder="0" />
            <NumericInput label="Répétitions" value={reps} onChange={setReps} unit="reps" placeholder="0" />
          </div>
          {weight && reps && (
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 12, background: '#f0f7ff', border: '1px solid #b8d4f0', fontSize: 13, fontWeight: 700, color: '#1a6db5' }}>
              1RM estimé (Epley) ≈ {Math.round(parseFloat(weight) * (1 + parseInt(reps) / 30))} kg
            </div>
          )}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/coach-kiosk/topset')} style={{
            width: 160, height: 72, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer',
          }}>Retour</button>
          <button onClick={handleSubmit} disabled={submitting} style={{
            flex: 1, height: 72, borderRadius: 999, border: 'none',
            background: 'linear-gradient(90deg, #0f3a6b 0%, #1a4a8a 100%)',
            color: '#fff', fontWeight: 900, fontSize: 22, cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 16px 32px rgba(26,74,138,0.35)', opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
