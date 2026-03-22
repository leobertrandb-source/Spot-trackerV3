import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

const HOOPER_FIELDS = [
  {
    key: 'fatigue',
    label: 'Fatigue',
    color: '#ff7043',
    levels: ['', 'Pas fatigué', 'Peu fatigué', 'Légèrement fatigué', 'Modérément fatigué', 'Assez fatigué', 'Fatigué', 'Bien fatigué', 'Très fatigué', 'Épuisé', 'Totalement épuisé'],
  },
  {
    key: 'sommeil',
    label: 'Sommeil',
    color: '#9d7dea',
    levels: ['', 'Excellent', 'Très bien dormi', 'Bien dormi', 'Plutôt bien', 'Correct', 'Passable', 'Mauvais', 'Très mauvais', 'Terrible', 'Pas dormi'],
  },
  {
    key: 'stress',
    label: 'Stress',
    color: '#4d9fff',
    levels: ['', 'Aucun stress', 'Très peu stressé', 'Peu stressé', 'Légèrement stressé', 'Modérément stressé', 'Assez stressé', 'Stressé', 'Très stressé', 'Extrêmement stressé', 'Stress maximal'],
  },
  {
    key: 'courbatures',
    label: 'Courbatures',
    color: '#ff4566',
    levels: ['', 'Aucune', 'Très légères', 'Légères', 'Modérées', 'Assez présentes', 'Présentes', 'Importantes', 'Très importantes', 'Sévères', 'Insupportables'],
  },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function SliderField({ field, value, onChange }) {
  const { label, color, levels } = field

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e8e4dc',
        borderRadius: 22,
        padding: '24px 26px',
        boxShadow: '0 10px 24px rgba(0,0,0,0.10)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 24,
              color: '#1a1a1a',
              lineHeight: 1.1,
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontSize: 15,
              color,
              marginTop: 6,
              fontWeight: 700,
              minHeight: 22,
            }}
          >
            {levels[value] || ''}
          </div>
        </div>

        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color,
            lineHeight: 1,
            minWidth: 36,
            textAlign: 'right',
          }}
        >
          {value}
        </div>
      </div>

      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: color,
          cursor: 'pointer',
        }}
      />

      <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 4,
              background: i < value ? color : '#e9e9e9',
              transition: 'background 0.15s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ClubKioskHooperPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [values, setValues] = useState({
    fatigue: 5,
    sommeil: 5,
    stress: 5,
    courbatures: 5,
  })

  const today = useMemo(() => todayIso(), [])

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', playerId)
        .single()

      if (error) {
        console.error('load profile error:', error)
        setError("Impossible de charger l'athlète.")
        return
      }

      setPlayer(data || null)
    }

    load()
  }, [playerId])

  useEffect(() => {
    if (!submitted) return

    const timer = setTimeout(() => {
      navigate('/coach-kiosk')
    }, 1500)

    return () => clearTimeout(timer)
  }, [submitted, navigate])

  const handleSubmit = async () => {
    if (submitting) return

    setSubmitting(true)
    setError('')

    const payload = {
      user_id: playerId,
      date: today,
      fatigue: values.fatigue,
      sommeil: values.sommeil,
      stress: values.stress,
      courbatures: values.courbatures,
    }

    const { error } = await supabase
      .from('hooper_logs')
      .insert(payload)

    setSubmitting(false)

    if (error) {
      console.error('submit hooper error:', error)

      if (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate')) {
        setError("Ce joueur a déjà rempli son HOOPER aujourd'hui.")
        return
      }

      setError("Impossible d'enregistrer le HOOPER.")
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <KioskSuccessScreen
        title={`Merci ${player?.full_name || ''}`}
        message="Ton HOOPER est enregistré"
        footer="Retour à la mosaïque..."
      />
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
        padding: '28px 20px 40px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: '#8c857b',
              marginBottom: 6,
            }}
          >
            Questionnaire HOOPER
          </div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.1,
            }}
          >
            {player?.full_name || 'Athlète'}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 16px',
              borderRadius: 14,
              background: '#fff1f0',
              border: '1px solid #f3b7b2',
              color: '#b42318',
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: 18 }}>
          {HOOPER_FIELDS.map((field) => (
            <SliderField
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) =>
                setValues((prev) => ({
                  ...prev,
                  [field.key]: v,
                }))
              }
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={() => navigate('/coach-kiosk')}
            type="button"
            style={{
              width: 180,
              height: 72,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            Retour
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            type="button"
            style={{
              flex: 1,
              height: 72,
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(90deg, #0f5b3d 0%, #164a34 100%)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: 22,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 16px 32px rgba(15,91,61,0.35)',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
