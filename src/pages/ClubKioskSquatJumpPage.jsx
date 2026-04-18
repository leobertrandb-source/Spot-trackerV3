// create table public.squat_jump_logs (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references public.profiles(id) on delete cascade,
//   date date not null,
//   height_cm numeric(5,2) not null,
//   unique(user_id, date)
// );
// Ratio SJ/CMJ < 0.85 = manque de force explosive → travail force
// Ratio SJ/CMJ > 1.00 = utilisation énergie élastique optimale

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

export default function ClubKioskSquatJumpPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [value, setValue] = useState('')
  const [cmjToday, setCmjToday] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    const load = async () => {
      const [{ data: profile }, { data: cmj }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').eq('id', playerId).single(),
        supabase.from('charge_logs').select('cmj_cm').eq('user_id', playerId).eq('date', today).maybeSingle(),
      ])
      if (profile) setPlayer(profile)
      else setError("Impossible de charger l'athlète.")
      if (cmj?.cmj_cm) setCmjToday(parseFloat(cmj.cmj_cm))
    }
    load()
  }, [playerId, today])

  useEffect(() => {
    if (!submitted) return
    const t = setTimeout(() => navigate('/coach-kiosk/squat_jump'), 1500)
    return () => clearTimeout(t)
  }, [submitted, navigate])

  function adjust(delta) {
    setValue(prev => {
      const n = Math.max(0, Math.round(((parseFloat(prev) || 0) + delta) * 10) / 10)
      return String(n)
    })
  }

  async function handleSubmit() {
    const v = parseFloat(value)
    if (!v || v <= 0) { setError('Entre une hauteur valide (cm).'); return }
    setSubmitting(true); setError('')

    const { error } = await supabase.from('squat_jump_logs').upsert({
      user_id: playerId,
      date: today,
      height_cm: v,
    }, { onConflict: 'user_id,date' })

    setSubmitting(false)
    if (error) { setError(`Erreur : ${error.message}`); return }
    setSubmitted(true)
  }

  if (submitted) return (
    <KioskSuccessScreen
      title={`Merci ${player?.full_name || ''}`}
      message={`SJ ${value} cm enregistré`}
      footer="Retour à la liste..."
    />
  )

  const sj = parseFloat(value)
  const ratio = sj && cmjToday ? (sj / cmjToday) : null
  const ratioColor = ratio ? (ratio >= 0.95 ? '#2d6a4f' : ratio >= 0.85 ? '#b5830a' : '#c0392b') : null
  const ratioLabel = ratio ? (ratio >= 0.95 ? 'Utilisation élastique optimale' : ratio >= 0.85 ? 'Dans la norme' : 'Déficit force explosive') : null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
      padding: '28px 20px 40px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8c857b', marginBottom: 6 }}>
            Squat Jump · Sans contre-mouvement
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

        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 20, padding: '28px 22px', marginBottom: 14, boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#1a1a1a', lineHeight: 1 }}>{value || '—'}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#6b6b6b', marginLeft: 8 }}>cm</span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button onClick={() => adjust(-1)} style={{ flex: 1, height: 56, borderRadius: 14, border: '2px solid #e8e4dc', background: '#f5f3ef', fontSize: 28, fontWeight: 700, cursor: 'pointer' }}>−1</button>
            <button onClick={() => adjust(1)}  style={{ flex: 1, height: 56, borderRadius: 14, border: '2px solid #e8e4dc', background: '#f5f3ef', fontSize: 28, fontWeight: 700, cursor: 'pointer' }}>+1</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[-5, -0.5, +0.5, +5].map(d => (
              <button key={d} onClick={() => adjust(d)} style={{
                flex: 1, height: 40, borderRadius: 10, border: '1.5px solid #e8e4dc',
                background: 'transparent', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                color: d < 0 ? '#c0392b' : '#2d6a4f',
              }}>{d > 0 ? `+${d}` : d}</button>
            ))}
          </div>
          <input
            type="number" step="0.5" min="0" value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Saisie directe (cm)"
            style={{
              width: '100%', marginTop: 12, padding: '10px 14px', borderRadius: 12,
              border: '1.5px solid #e8e4dc', fontSize: 16, fontWeight: 700,
              outline: 'none', fontFamily: 'inherit', color: '#1a1a1a',
              background: '#f9f8f6', boxSizing: 'border-box', textAlign: 'center',
            }}
          />

          {/* Ratio SJ/CMJ si CMJ fait aujourd'hui */}
          {ratio && (
            <div style={{ marginTop: 16, padding: '11px 14px', borderRadius: 12, background: ratioColor + '15', border: `1px solid ${ratioColor}40`, fontSize: 13, fontWeight: 700, color: ratioColor }}>
              Ratio SJ/CMJ : {ratio.toFixed(2)} — {ratioLabel}
              <div style={{ fontSize: 11, fontWeight: 500, marginTop: 3, color: '#6b6b6b' }}>
                CMJ du jour : {cmjToday} cm
              </div>
            </div>
          )}
          {!cmjToday && value && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#9e9e9e' }}>
              Fais aussi le CMJ aujourd'hui pour obtenir le ratio SJ/CMJ
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/coach-kiosk/squat_jump')} style={{
            width: 140, height: 68, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
          }}>Retour</button>
          <button onClick={handleSubmit} disabled={submitting || !value} style={{
            flex: 1, height: 68, borderRadius: 999, border: 'none',
            background: value ? 'linear-gradient(90deg, #0d4a38 0%, #1a7a5e 100%)' : '#444',
            color: '#fff', fontWeight: 900, fontSize: 20,
            cursor: submitting || !value ? 'not-allowed' : 'pointer',
            boxShadow: value ? '0 12px 28px rgba(26,122,94,0.35)' : 'none',
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
