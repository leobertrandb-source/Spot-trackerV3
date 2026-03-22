import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

// 🔁 COPIÉ depuis PrepHooperPage
const HOOPER_FIELDS = [
  {
    key: 'fatigue',
    label: 'Fatigue',
    color: '#ff7043',
    levels: ['', 'Pas fatigué','Peu fatigué','Légèrement fatigué','Modérément fatigué','Assez fatigué','Fatigué','Bien fatigué','Très fatigué','Épuisé','Totalement épuisé'],
  },
  {
    key: 'sommeil',
    label: 'Sommeil',
    color: '#9d7dea',
    levels: ['', 'Excellent','Très bien dormi','Bien dormi','Plutôt bien','Correct','Passable','Mauvais','Très mauvais','Terrible','Pas dormi'],
  },
  {
    key: 'stress',
    label: 'Stress',
    color: '#4d9fff',
    levels: ['', 'Aucun stress','Très peu stressé','Peu stressé','Légèrement stressé','Modérément stressé','Assez stressé','Stressé','Très stressé','Extrêmement stressé','Stress maximal'],
  },
  {
    key: 'courbatures',
    label: 'Courbatures',
    color: '#ff4566',
    levels: ['', 'Aucune','Très légères','Légères','Modérées','Assez présentes','Présentes','Importantes','Très importantes','Sévères','Insupportables'],
  },
]

// 🔁 COPIÉ depuis PrepHooperPage
function SliderField({ field, value, onChange }) {
  const { label, color, levels } = field

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e8e4dc',
      borderRadius: 18,
      padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 800 }}>{label}</div>
          {value > 0 && (
            <div style={{ fontSize: 12, color, marginTop: 2, fontWeight: 600 }}>
              {levels[value]}
            </div>
          )}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color }}>
          {value}
        </div>
      </div>

      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color }}
      />

      <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              background: i < value ? color : '#eee',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ClubKioskHooperPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const [values, setValues] = useState({
    fatigue: 5,
    sommeil: 5,
    stress: 5,
    courbatures: 5,
  })

  const today = useMemo(() => todayIso(), [])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', playerId)
        .single()

      setPlayer(data)
    }

    load()
  }, [playerId])

  useEffect(() => {
    if (!submitted) return
    setTimeout(() => navigate('/coach-kiosk'), 1500)
  }, [submitted])

  const handleSubmit = async () => {
    await supabase.from('hooper_logs').insert({
      user_id: playerId,
      date: today,
      ...values,
    })

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <KioskSuccessScreen
        title={`Merci ${player?.full_name}`}
        message="Ton HOOPER est enregistré"
      />
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2>{player?.full_name}</h2>

      <div style={{ display: 'grid', gap: 16 }}>
        {HOOPER_FIELDS.map(field => (
          <SliderField
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) =>
              setValues(prev => ({ ...prev, [field.key]: v }))
            }
          />
        ))}
      </div>

      <button
        onClick={handleSubmit}
        style={{
          marginTop: 20,
          width: '100%',
          height: 60,
          borderRadius: 999,
          background: '#1a3a2a',
          color: '#fff',
          fontWeight: 900,
          fontSize: 18,
          border: 'none',
        }}
      >
        Valider
      </button>
    </div>
  )
}
