import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'
import KioskPinModal from '../components/kiosk/KioskPinModal'

const CARD = {
  background: '#fff',
  border: '1px solid #e8e4dc',
  borderRadius: 24,
  padding: 24,
  boxShadow: '0 16px 40px rgba(16, 24, 40, 0.06)',
}

function ScoreRow({ label, value, onChange, hint }) {
  return (
    <div style={{ ...CARD, padding: 22 }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>{label}</div>
      <div style={{ fontSize: 14, color: '#6b6b6b', marginTop: 6 }}>{hint}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8, marginTop: 18 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
          const active = value === n
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              style={{
                height: 58,
                borderRadius: 16,
                border: `2px solid ${active ? '#1a3a2a' : '#e8e4dc'}`,
                background: active ? '#1a3a2a' : '#fff',
                color: active ? '#fff' : '#1a1a1a',
                fontWeight: 900,
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ClubKioskHooperPage() {
  const { clubId, playerId } = useParams()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [club, setClub] = useState(null)
  const [player, setPlayer] = useState(null)
  const [pinOpen, setPinOpen] = useState(false)

  const [fatigue, setFatigue] = useState(0)
  const [sommeil, setSommeil] = useState(0)
  const [stress, setStress] = useState(0)
  const [courbatures, setCourbatures] = useState(0)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    if (authLoading || !user) return

    const load = async () => {
      const [{ data: playerData, error: playerError }, { data: clubData }, { data: existing }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').eq('id', playerId).single(),
        supabase.from('clubs').select('id, name, kiosk_pin').eq('id', clubId).single(),
        supabase.from('hooper_logs').select('id').eq('user_id', playerId).eq('date', today).maybeSingle(),
      ])

      if (playerError) console.error(playerError)
      setPlayer(playerData || null)
      setClub(clubData || null)
      setAlreadyDone(!!existing)
      setLoading(false)
    }

    load()
  }, [authLoading, user, playerId, clubId, today])

  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(() => navigate(`/club-kiosk/${clubId}`), 1800)
    return () => clearTimeout(timer)
  }, [submitted, navigate, clubId])

  const isValid = [fatigue, sommeil, stress, courbatures].every(v => v >= 1 && v <= 10)

  const handleSubmit = async () => {
    if (!isValid || alreadyDone) return
    const payload = { user_id: playerId, date: today, fatigue, sommeil, stress, courbatures }
    const { error } = await supabase.from('hooper_logs').upsert(payload, { onConflict: 'user_id,date' })
    if (error) {
      console.error(error)
      return
    }
    setSubmitted(true)
  }

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'grid', placeItems: 'center', color: '#6b6b6b', fontFamily: 'Inter, sans-serif' }}>
        Chargement du questionnaire...
      </div>
    )
  }

  if (!user || profile?.role !== 'coach') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'grid', placeItems: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1a1a1a' }}>Accès réservé au staff</div>
          <div style={{ fontSize: 15, color: '#6b6b6b', marginTop: 8 }}>Connecte-toi avec un compte coach pour utiliser le mode borne.</div>
        </div>
      </div>
    )
  }

  if (submitted) return <KioskSuccessScreen playerName={player?.full_name || ''} />

  if (alreadyDone) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'grid', placeItems: 'center', padding: 20, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ ...CARD, maxWidth: 620, width: '100%', textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🟢</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#1a1a1a' }}>{player?.full_name}</div>
          <div style={{ fontSize: 18, color: '#6b6b6b', marginTop: 12 }}>
            A déjà rempli son HOOPER aujourd’hui.
          </div>
          <button
            onClick={() => navigate(`/club-kiosk/${clubId}`)}
            style={{
              marginTop: 24, height: 58, padding: '0 22px', borderRadius: 999,
              border: 'none', background: '#1a3a2a', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer',
            }}
          >
            Retour à l’accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ef', padding: 20, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ ...CARD, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {player?.avatar_url ? (
            <img src={player.avatar_url} alt={player.full_name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#1a3a2a', color: '#fff', fontSize: 28, fontWeight: 900 }}>
              {(player?.full_name || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.1 }}>{player?.full_name}</div>
            <div style={{ fontSize: 15, color: '#6b6b6b', marginTop: 6 }}>{club?.name} · Questionnaire HOOPER du jour</div>
          </div>
          <button
            onClick={() => setPinOpen(true)}
            style={{ height: 48, padding: '0 16px', borderRadius: 999, border: '1px solid #d9d4ca', background: '#fff', color: '#1a1a1a', fontWeight: 800, cursor: 'pointer' }}
          >
            Quitter
          </button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <ScoreRow label="Fatigue" hint="Comment te sens-tu aujourd’hui ?" value={fatigue} onChange={setFatigue} />
          <ScoreRow label="Sommeil" hint="Quelle est la qualité de ton sommeil ?" value={sommeil} onChange={setSommeil} />
          <ScoreRow label="Stress" hint="Quel est ton niveau de stress actuel ?" value={stress} onChange={setStress} />
          <ScoreRow label="Courbatures" hint="Quel est ton niveau de courbatures ?" value={courbatures} onChange={setCourbatures} />
        </div>

        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            style={{
              height: 68, minWidth: 280, padding: '0 28px', borderRadius: 999, border: 'none',
              background: isValid ? '#1a3a2a' : '#c8c8c8', color: '#fff', fontWeight: 900, fontSize: 20,
              cursor: isValid ? 'pointer' : 'not-allowed',
            }}
          >
            Valider
          </button>
        </div>
      </div>

      <KioskPinModal
        open={pinOpen}
        expectedPin={club?.kiosk_pin || ''}
        onClose={() => setPinOpen(false)}
        onSuccess={() => navigate('/coach')}
      />
    </div>
  )
}
