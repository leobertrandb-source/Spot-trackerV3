// SQL à créer dans Supabase si inexistant :
// create table public.rpe_logs (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references public.profiles(id) on delete cascade,
//   date date not null,
//   rpe integer not null check (rpe between 1 and 10),
//   duration_min integer,
//   session_type text,
//   created_at timestamptz default now(),
//   unique(user_id, date)
// );

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

const RPE_LEVELS = [
  { v: 1,  label: 'Repos actif',       color: '#3ecf8e' },
  { v: 2,  label: 'Très facile',        color: '#3ecf8e' },
  { v: 3,  label: 'Facile',             color: '#5dc98e' },
  { v: 4,  label: 'Modéré',             color: '#a8cc44' },
  { v: 5,  label: 'Modéré+',            color: '#d4c244' },
  { v: 6,  label: 'Difficile',          color: '#f5a623' },
  { v: 7,  label: 'Difficile+',         color: '#ff7043' },
  { v: 8,  label: 'Très difficile',     color: '#ff5722' },
  { v: 9,  label: 'Très difficile+',    color: '#f44336' },
  { v: 10, label: 'Effort maximal',     color: '#c0392b' },
]

const SESSION_TYPES = ['Terrain', 'Musculation', 'Match', 'Récupération', 'Prépa physique', 'Autre']

export default function ClubKioskRpePage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [rpe, setRpe] = useState(null)
  const [duration, setDuration] = useState('')
  const [sessionType, setSessionType] = useState('')
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
    const t = setTimeout(() => navigate('/coach-kiosk/rpe'), 1500)
    return () => clearTimeout(t)
  }, [submitted, navigate])

  async function handleSubmit() {
    if (!rpe) { setError('Sélectionne un niveau RPE.'); return }
    setSubmitting(true); setError('')

    const { error } = await supabase.from('rpe_logs').upsert({
      user_id: playerId,
      date: today,
      rpe,
      duration_min: duration ? parseInt(duration) : null,
      session_type: sessionType || null,
    }, { onConflict: 'user_id,date' })

    setSubmitting(false)
    if (error) {
      setError(`Erreur : ${error.message}`)
      return
    }
    setSubmitted(true)
  }

  if (submitted) return (
    <KioskSuccessScreen
      title={`Merci ${player?.full_name || ''}`}
      message="RPE enregistré"
      footer="Retour à la liste..."
    />
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
      padding: '28px 20px 40px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8c857b', marginBottom: 6 }}>
            RPE Séance
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

        {/* Section RPE */}
        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 22, padding: '24px 26px', marginBottom: 18, boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }}>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#1a1a1a', marginBottom: 6 }}>Effort ressenti (RPE)</div>
          <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 20 }}>
            {rpe ? `${rpe}/10 — ${RPE_LEVELS[rpe - 1].label}` : 'Comment était ton effort global ?'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {RPE_LEVELS.map(({ v, label, color }) => (
              <button key={v} onClick={() => setRpe(v)} style={{
                padding: '14px 8px', borderRadius: 14, border: `2px solid ${rpe === v ? color : '#e8e4dc'}`,
                background: rpe === v ? color + '20' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'all 0.12s',
              }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: rpe === v ? color : '#1a1a1a', lineHeight: 1 }}>{v}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: rpe === v ? color : '#9e9e9e', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Durée + type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 22, padding: '20px 22px', boxShadow: '0 10px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a', marginBottom: 14 }}>Durée (minutes)</div>
            <input
              type="number" min="1" max="300" value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="Ex : 75"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14, fontSize: 22, fontWeight: 900,
                border: '2px solid #e8e4dc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                color: '#1a1a1a', background: '#f9f8f6',
              }}
            />
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 22, padding: '20px 22px', boxShadow: '0 10px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a', marginBottom: 14 }}>Type de séance</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SESSION_TYPES.map(t => (
                <button key={t} onClick={() => setSessionType(sessionType === t ? '' : t)} style={{
                  padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${sessionType === t ? '#1a3a2a' : '#e8e4dc'}`,
                  background: sessionType === t ? '#1a3a2a' : 'transparent',
                  color: sessionType === t ? '#fff' : '#6b6b6b', cursor: 'pointer', fontFamily: 'inherit',
                }}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/coach-kiosk/rpe')} style={{
            width: 160, height: 72, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer',
          }}>Retour</button>
          <button onClick={handleSubmit} disabled={submitting || !rpe} style={{
            flex: 1, height: 72, borderRadius: 999, border: 'none',
            background: rpe ? 'linear-gradient(90deg, #0f5b3d 0%, #164a34 100%)' : '#555',
            color: '#fff', fontWeight: 900, fontSize: 22, cursor: submitting || !rpe ? 'not-allowed' : 'pointer',
            boxShadow: rpe ? '0 16px 32px rgba(15,91,61,0.35)' : 'none',
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
