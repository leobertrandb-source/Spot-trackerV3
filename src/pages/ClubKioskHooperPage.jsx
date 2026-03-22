import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

const CARD = {
  background: '#fff',
  border: '1px solid #e8e4dc',
  borderRadius: 18,
  padding: 24,
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function ScoreRow({ label, value, onChange, hint }) {
  return (
    <div style={{ ...CARD, padding: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#6b6b6b', marginTop: 4 }}>{hint}</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 8,
          marginTop: 18,
        }}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              style={{
                height: 54,
                borderRadius: 14,
                border: `2px solid ${active ? '#1a3a2a' : '#e8e4dc'}`,
                background: active ? '#1a3a2a' : '#fff',
                color: active ? '#fff' : '#1a1a1a',
                fontWeight: 800,
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
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [player, setPlayer] = useState(null)
  const [error, setError] = useState('')

  const [fatigue, setFatigue] = useState(0)
  const [sommeil, setSommeil] = useState(0)
  const [stress, setStress] = useState(0)
  const [courbatures, setCourbatures] = useState(0)

  const today = useMemo(() => todayIso(), [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      const [{ data: profileData, error: profileError }, { data: existingLog, error: logError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', playerId)
            .single(),

          supabase
            .from('hooper_logs')
            .select('id, user_id, date, fatigue, sommeil, stress, courbatures')
            .eq('user_id', playerId)
            .eq('date', today)
            .maybeSingle(),
        ])

      if (profileError) {
        console.error(profileError)
        setError('Impossible de charger le joueur.')
      }

      if (logError) {
        console.error(logError)
        setError('Impossible de vérifier le questionnaire du jour.')
      }

      setPlayer(profileData || null)

      if (existingLog) {
        setAlreadyDone(true)
        setFatigue(existingLog.fatigue || 0)
        setSommeil(existingLog.sommeil || 0)
        setStress(existingLog.stress || 0)
        setCourbatures(existingLog.courbatures || 0)
      }

      setLoading(false)
    }

    load()
  }, [playerId, today])

  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(() => {
      navigate('/coach-kiosk')
    }, 1800)

    return () => clearTimeout(timer)
  }, [submitted, navigate])

  const isValid = [fatigue, sommeil, stress, courbatures].every((v) => v >= 1 && v <= 10)
  const total = fatigue + sommeil + stress + courbatures

  const handleSubmit = async () => {
    if (!isValid || alreadyDone || submitting) return

    setSubmitting(true)
    setError('')

    const payload = {
      user_id: playerId,
      date: today,
      fatigue,
      sommeil,
      stress,
      courbatures,
    }

    const { error: insertError } = await supabase
      .from('hooper_logs')
      .insert(payload)

    setSubmitting(false)

    if (insertError) {
      console.error(insertError)

      if (
        insertError.message?.toLowerCase().includes('duplicate') ||
        insertError.code === '23505'
      ) {
        setAlreadyDone(true)
        setError("Ce joueur a déjà rempli son HOOPER aujourd'hui.")
        return
      }

      setError("Impossible d'enregistrer le questionnaire.")
      return
    }

    setSubmitted(true)
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f3ef',
          display: 'grid',
          placeItems: 'center',
          color: '#6b6b6b',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Chargement du questionnaire...
      </div>
    )
  }

  if (submitted) {
    return (
      <KioskSuccessScreen
        title={`Merci ${player?.full_name || ''}`}
        message="Ton HOOPER a bien été enregistré."
        footer="Retour à l’accueil..."
      />
    )
  }

  if (alreadyDone) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f3ef',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            ...CARD,
            width: '100%',
            maxWidth: 620,
            textAlign: 'center',
            padding: 36,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1a1a1a' }}>
            Déjà complété
          </div>
          <div style={{ fontSize: 16, color: '#6b6b6b', marginTop: 12 }}>
            {player?.full_name || 'Ce joueur'} a déjà rempli son HOOPER aujourd&apos;hui.
          </div>

          <div
            style={{
              marginTop: 22,
              background: '#f5f3ef',
              border: '1px solid #e8e4dc',
              borderRadius: 16,
              padding: 18,
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 12, color: '#6b6b6b', fontWeight: 700, marginBottom: 10 }}>
              Dernière réponse du jour
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                ['Fatigue', fatigue],
                ['Sommeil', sommeil],
                ['Stress', stress],
                ['Courbatures', courbatures],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: '#fff',
                    border: '1px solid #e8e4dc',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#6b6b6b' }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a', marginTop: 4 }}>
                    {value}/10
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid #e8e4dc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, color: '#6b6b6b', fontWeight: 700 }}>Score total</span>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#1a3a2a' }}>{total}/40</span>
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                borderRadius: 12,
                background: '#fff1f0',
                border: '1px solid #f3b7b2',
                color: '#b42318',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={() => navigate('/coach-kiosk')}
            style={{
              marginTop: 22,
              height: 56,
              minWidth: 240,
              borderRadius: 999,
              border: 'none',
              background: '#1a3a2a',
              color: '#fff',
              fontWeight: 900,
              fontSize: 17,
              cursor: 'pointer',
            }}
          >
            Retour à la mosaïque
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f3ef',
        padding: 20,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div
          style={{
            ...CARD,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {player?.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.full_name}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: '#1a3a2a',
                color: '#fff',
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {initials(player?.full_name || '?')}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#1a1a1a' }}>
              {player?.full_name}
            </div>
            <div style={{ fontSize: 15, color: '#6b6b6b', marginTop: 4 }}>
              Questionnaire HOOPER du jour
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/coach-kiosk')}
            style={{
              height: 46,
              padding: '0 16px',
              borderRadius: 999,
              border: '1px solid #e8e4dc',
              background: '#fff',
              color: '#1a1a1a',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: '#fff1f0',
              border: '1px solid #f3b7b2',
              color: '#b42318',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          <ScoreRow
            label="Fatigue"
            hint="Comment te sens-tu aujourd’hui ?"
            value={fatigue}
            onChange={setFatigue}
          />
          <ScoreRow
            label="Sommeil"
            hint="Quelle est la qualité de ton sommeil ?"
            value={sommeil}
            onChange={setSommeil}
          />
          <ScoreRow
            label="Stress"
            hint="Quel est ton niveau de stress actuel ?"
            value={stress}
            onChange={setStress}
          />
          <ScoreRow
            label="Courbatures"
            hint="Quel est ton niveau de courbatures ?"
            value={courbatures}
            onChange={setCourbatures}
          />
        </div>

        <div
          style={{
            marginTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              ...CARD,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 220,
            }}
          >
            <div style={{ fontSize: 13, color: '#6b6b6b', fontWeight: 700 }}>Score total</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#1a3a2a' }}>{total}/40</div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            style={{
              height: 64,
              minWidth: 260,
              padding: '0 28px',
              borderRadius: 999,
              border: 'none',
              background: !isValid || submitting ? '#c8c8c8' : '#1a3a2a',
              color: '#fff',
              fontWeight: 900,
              fontSize: 18,
              cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
