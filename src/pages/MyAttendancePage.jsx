import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

const C = {
  bg:      '#080808',
  card:    'rgba(12,16,24,0.85)',
  border:  'rgba(255,255,255,0.08)',
  borderHi:'rgba(255,255,255,0.14)',
  text:    '#edf2f7',
  sub:     '#7a8fa6',
  dim:     '#3d4f61',
  accent:  '#3ecf8e',
  green:   '#3ecf8e',
  yellow:  '#fbbf24',
  red:     '#f87171',
}

const STATUSES = [
  {
    key: 'present',
    label: 'Présent',
    sublabel: 'Je serai à l\'entraînement',
    icon: '✓',
    color: C.green,
    bg: 'rgba(62,207,142,0.12)',
    border: 'rgba(62,207,142,0.3)',
  },
  {
    key: 'present_blesse',
    label: 'Présent — blessé',
    sublabel: 'Je viens mais avec une blessure',
    icon: '🩹',
    color: C.yellow,
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.3)',
  },
  {
    key: 'absent_blesse',
    label: 'Absent — blessé',
    sublabel: 'Je ne peux pas venir, blessure',
    icon: '🔴',
    color: C.red,
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.3)',
  },
  {
    key: 'absent',
    label: 'Absent',
    sublabel: 'Je ne serai pas là',
    icon: '✗',
    color: C.sub,
    bg: 'rgba(122,143,166,0.08)',
    border: 'rgba(122,143,166,0.2)',
  },
]

export default function MyAttendancePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const today = new Date().toISOString().split('T')[0]
  const [current, setCurrent]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [coachInfo, setCoachInfo] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)

    const [{ data: att }, { data: coach }] = await Promise.all([
      supabase.from('training_attendance').select('status').eq('athlete_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('coach_clients').select('coach:coach_id(full_name, email)').eq('client_id', user.id).maybeSingle(),
    ])

    if (att) setCurrent(att.status)
    if (coach?.coach) setCoachInfo(coach.coach)
    setLoading(false)
  }, [user.id, today])

  useEffect(() => { load() }, [load])

  async function select(status) {
    setSaving(true)
    setCurrent(status)

    await supabase.from('training_attendance').upsert({
      athlete_id: user.id,
      date: today,
      status,
    }, { onConflict: 'athlete_id,date' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>
          atl<span style={{ color: C.accent }}>yo</span>
        </div>
      </div>

      {/* Card principale */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: '28px 24px',
        backdropFilter: 'blur(24px)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            Présence entraînement
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4, textTransform: 'capitalize' }}>
            {dateLabel}
          </div>
          {profile?.full_name && (
            <div style={{ fontSize: 14, color: C.sub }}>{profile.full_name}</div>
          )}
          {coachInfo && (
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>
              Coach : {coachInfo.full_name || coachInfo.email}
            </div>
          )}
        </div>

        {/* Feedback saved */}
        {saved && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 12,
            background: 'rgba(62,207,142,0.12)', border: '1px solid rgba(62,207,142,0.3)',
            fontSize: 13, fontWeight: 600, color: C.accent, textAlign: 'center',
          }}>
            ✓ Réponse enregistrée
          </div>
        )}

        {/* Boutons statut */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.sub, fontSize: 13 }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {STATUSES.map(s => {
              const isSelected = current === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => select(s.key)}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '16px 18px',
                    borderRadius: 14, cursor: saving ? 'default' : 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                    border: `1.5px solid ${isSelected ? s.border : C.border}`,
                    background: isSelected ? s.bg : 'transparent',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: isSelected ? s.bg : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isSelected ? s.border : C.border}`,
                    display: 'grid', placeItems: 'center',
                    fontSize: 16, flexShrink: 0,
                    transition: 'all 0.15s',
                  }}>
                    {s.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isSelected ? s.color : C.text, marginBottom: 2 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 12, color: C.sub }}>{s.sublabel}</div>
                  </div>
                  {isSelected && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Retour app */}
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%', marginTop: 20, padding: '12px',
            borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${C.border}`, background: 'transparent',
            color: C.sub, fontSize: 13, fontWeight: 600,
          }}
        >
          Retour à l'app
        </button>
      </div>
    </div>
  )
}
