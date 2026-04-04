import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { LIGHT as T } from '../lib/data'

const STATUSES = [
  {
    key: 'present',
    label: 'Présent',
    sublabel: "Je serai à l'entraînement",
    icon: '✓',
    color: '#2d6a4f',
    bg: '#e8f5ee',
    border: '#2d6a4f30',
  },
  {
    key: 'present_blesse',
    label: 'Présent — blessé',
    sublabel: 'Je viens mais avec une blessure',
    icon: '🩹',
    color: '#b5830a',
    bg: '#fdf6e3',
    border: '#b5830a30',
  },
  {
    key: 'absent_blesse',
    label: 'Absent — blessé',
    sublabel: 'Je ne peux pas venir, blessure',
    icon: '🔴',
    color: '#c0392b',
    bg: '#fdecea',
    border: '#c0392b30',
  },
  {
    key: 'absent',
    label: 'Absent',
    sublabel: 'Je ne serai pas là',
    icon: '✗',
    color: T.sub,
    bg: T.bgAlt,
    border: T.border,
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
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>
          atl<span style={{ color: T.accent }}>yo</span>
        </div>
      </div>

      {/* Card principale */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 24,
        padding: '28px 24px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.sub, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            Présence entraînement
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4, textTransform: 'capitalize' }}>
            {dateLabel}
          </div>
          {profile?.full_name && (
            <div style={{ fontSize: 14, color: T.sub }}>{profile.full_name}</div>
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
            fontSize: 13, fontWeight: 600, color: T.accent, textAlign: 'center',
          }}>
            ✓ Réponse enregistrée
          </div>
        )}

        {/* Boutons statut */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.sub, fontSize: 13 }}>Chargement...</div>
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
                    border: `1.5px solid ${isSelected ? s.border : T.border}`,
                    background: isSelected ? s.bg : 'transparent',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: isSelected ? s.bg : T.bgAlt,
                    border: `1px solid ${isSelected ? s.border : T.border}`,
                    display: 'grid', placeItems: 'center',
                    fontSize: 16, flexShrink: 0,
                    transition: 'all 0.15s',
                  }}>
                    {s.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isSelected ? s.color : T.text, marginBottom: 2 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 12, color: T.sub }}>{s.sublabel}</div>
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
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.sub, fontSize: 13, fontWeight: 600,
          }}
        >
          Retour à l'app
        </button>
      </div>
    </div>
  )
}
