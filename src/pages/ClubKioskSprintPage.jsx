// create table public.sprint_logs (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references public.profiles(id) on delete cascade,
//   date date not null,
//   time_10m numeric(5,3),
//   time_30m numeric(5,3),
//   unique(user_id, date)
// );

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

function TimeInput({ label, value, onChange, hint }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="number" min="0" step="0.01" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0.00"
          style={{
            width: '100%', height: 64, padding: '0 50px 0 14px', borderRadius: 14,
            border: '2px solid #e8e4dc', background: '#f9f8f6',
            fontSize: 28, fontWeight: 900, color: '#1a1a1a',
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', textAlign: 'center',
          }}
        />
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: '#9e9e9e' }}>s</span>
      </div>
      {hint && <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

export default function ClubKioskSprintPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [t10, setT10] = useState('')
  const [t30, setT30] = useState('')
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
    const t = setTimeout(() => navigate('/coach-kiosk/sprint'), 1500)
    return () => clearTimeout(t)
  }, [submitted, navigate])

  async function handleSubmit() {
    if (!t10 && !t30) { setError('Entre au moins un temps.'); return }
    setSubmitting(true); setError('')

    const { error } = await supabase.from('sprint_logs').upsert({
      user_id: playerId,
      date: today,
      time_10m: t10 ? parseFloat(t10) : null,
      time_30m: t30 ? parseFloat(t30) : null,
    }, { onConflict: 'user_id,date' })

    setSubmitting(false)
    if (error) { setError(`Erreur : ${error.message}`); return }
    setSubmitted(true)
  }

  if (submitted) return (
    <KioskSuccessScreen
      title={`Merci ${player?.full_name || ''}`}
      message={`Sprint enregistré${t10 ? ` · 10m : ${t10}s` : ''}${t30 ? ` · 30m : ${t30}s` : ''}`}
      footer="Retour à la liste..."
    />
  )

  const split20 = t10 && t30 ? (parseFloat(t30) - parseFloat(t10)).toFixed(3) : null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
      padding: '28px 20px 40px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8c857b', marginBottom: 6 }}>
            Sprint
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
          <div style={{ display: 'flex', gap: 16 }}>
            <TimeInput label="10 mètres" value={t10} onChange={setT10} hint="Ex : 1.72" />
            <TimeInput label="30 mètres" value={t30} onChange={setT30} hint="Ex : 4.18" />
          </div>

          {split20 && (
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 12, background: '#fdecea', border: '1px solid #f5c6c6', fontSize: 13, fontWeight: 700, color: '#c0392b' }}>
              Split 10–30m : {split20}s
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/coach-kiosk/sprint')} style={{
            width: 140, height: 68, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
          }}>Retour</button>
          <button onClick={handleSubmit} disabled={submitting || (!t10 && !t30)} style={{
            flex: 1, height: 68, borderRadius: 999, border: 'none',
            background: (t10 || t30) ? 'linear-gradient(90deg, #7a0f0f 0%, #c0392b 100%)' : '#444',
            color: '#fff', fontWeight: 900, fontSize: 20,
            cursor: submitting || (!t10 && !t30) ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
