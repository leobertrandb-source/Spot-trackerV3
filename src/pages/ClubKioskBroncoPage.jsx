// create table public.bronco_logs (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references public.profiles(id) on delete cascade,
//   date date not null,
//   time_seconds numeric(6,2),
//   unique(user_id, date)
// );
// Bronco test : 5 allers-retours de 20m (5 x 2 x 20m = 200m total)
// Barèmes rugby : < 4:15 excellent, < 4:30 bon, < 5:00 moyen, > 5:00 insuffisant

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

function pad(n) { return String(Math.floor(n)).padStart(2, '0') }

function secondsToDisplay(s) {
  if (!s) return null
  const min = Math.floor(s / 60)
  const sec = (s % 60).toFixed(2).padStart(5, '0')
  return `${min}:${sec}`
}

function getBenchmark(s) {
  if (!s) return null
  if (s < 255) return { label: 'Excellent', color: '#2d6a4f', bg: '#e8f5ee' }
  if (s < 270) return { label: 'Bon', color: '#1a6db5', bg: '#f0f7ff' }
  if (s < 300) return { label: 'Moyen', color: '#b5830a', bg: '#fdf6e3' }
  return { label: 'Insuffisant', color: '#c0392b', bg: '#fdecea' }
}

export default function ClubKioskBroncoPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
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
    const t = setTimeout(() => navigate('/coach-kiosk/bronco'), 1500)
    return () => clearTimeout(t)
  }, [submitted, navigate])

  const totalSeconds = (minutes || seconds)
    ? (parseFloat(minutes || 0) * 60) + parseFloat(seconds || 0)
    : null

  async function handleSubmit() {
    if (!totalSeconds) { setError('Entre un temps.'); return }
    setSubmitting(true); setError('')

    const { error } = await supabase.from('bronco_logs').upsert({
      user_id: playerId,
      date: today,
      time_seconds: totalSeconds,
    }, { onConflict: 'user_id,date' })

    setSubmitting(false)
    if (error) { setError(`Erreur : ${error.message}`); return }
    setSubmitted(true)
  }

  if (submitted) return (
    <KioskSuccessScreen
      title={`Merci ${player?.full_name || ''}`}
      message={`Bronco ${secondsToDisplay(totalSeconds)} enregistré`}
      footer="Retour à la liste..."
    />
  )

  const bench = getBenchmark(totalSeconds)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
      padding: '28px 20px 40px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8c857b', marginBottom: 6 }}>
            Bronco Test · 5 × 20m
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
            {player?.full_name || 'Athlète'}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: '11px 16px', borderRadius: 12, background: '#fff1f0', border: '1px solid #f3b7b2', color: '#b42318', fontWeight: 700, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 20, padding: '24px 22px', marginBottom: 14, boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b6b6b', marginBottom: 18 }}>
            Temps total (minutes : secondes)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Min</div>
              <input
                type="number" min="0" max="10" value={minutes}
                onChange={e => setMinutes(e.target.value)}
                placeholder="4"
                style={{
                  width: '100%', height: 72, borderRadius: 14, border: '2px solid #e8e4dc',
                  background: '#f9f8f6', fontSize: 36, fontWeight: 900, textAlign: 'center',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#1a1a1a',
                }}
              />
            </div>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#1a1a1a', paddingTop: 22 }}>:</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Sec</div>
              <input
                type="number" min="0" max="59" step="0.1" value={seconds}
                onChange={e => setSeconds(e.target.value)}
                placeholder="20"
                style={{
                  width: '100%', height: 72, borderRadius: 14, border: '2px solid #e8e4dc',
                  background: '#f9f8f6', fontSize: 36, fontWeight: 900, textAlign: 'center',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#1a1a1a',
                }}
              />
            </div>
          </div>

          {bench && (
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 12, background: bench.bg, border: `1px solid ${bench.color}40`, fontSize: 14, fontWeight: 700, color: bench.color }}>
              {secondsToDisplay(totalSeconds)} — {bench.label}
            </div>
          )}

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[
              { label: '< 4:15', note: 'Excellent', color: '#2d6a4f' },
              { label: '< 4:30', note: 'Bon',       color: '#1a6db5' },
              { label: '< 5:00', note: 'Moyen',     color: '#b5830a' },
              { label: '≥ 5:00', note: 'Insuf.',    color: '#c0392b' },
            ].map(b => (
              <div key={b.label} style={{ padding: '7px 6px', borderRadius: 10, background: '#f9f8f6', border: '1px solid #e8e4dc', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: b.color }}>{b.label}</div>
                <div style={{ fontSize: 10, color: '#9e9e9e', marginTop: 2 }}>{b.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/coach-kiosk/bronco')} style={{
            width: 140, height: 68, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
          }}>Retour</button>
          <button onClick={handleSubmit} disabled={submitting || !totalSeconds} style={{
            flex: 1, height: 68, borderRadius: 999, border: 'none',
            background: totalSeconds ? 'linear-gradient(90deg, #4a2a0a 0%, #6d3a1a 100%)' : '#444',
            color: '#fff', fontWeight: 900, fontSize: 20,
            cursor: submitting || !totalSeconds ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
