// create table public.doms_logs (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references public.profiles(id) on delete cascade,
//   date date not null,
//   zones jsonb not null default '{}',
//   unique(user_id, date)
// );
// zones : { "Quadriceps": 2, "Ischio-jambiers": 1, ... }  — 1 = léger, 2 = intense

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

const ZONES = [
  { key: 'Quadriceps',         group: 'Membres inf.' },
  { key: 'Ischio-jambiers',    group: 'Membres inf.' },
  { key: 'Fessiers',           group: 'Membres inf.' },
  { key: 'Mollets',            group: 'Membres inf.' },
  { key: 'Adducteurs',         group: 'Membres inf.' },
  { key: 'Lombaires',          group: 'Dos / Tronc' },
  { key: 'Dorsaux',            group: 'Dos / Tronc' },
  { key: 'Abdominaux',         group: 'Dos / Tronc' },
  { key: 'Pectoraux',          group: 'Membres sup.' },
  { key: 'Épaules',            group: 'Membres sup.' },
  { key: 'Biceps / Triceps',   group: 'Membres sup.' },
  { key: 'Cervicaux / Trapèzes', group: 'Dos / Tronc' },
]

const INTENSITY = [
  { v: 0, label: 'Aucune',  color: '#e8e4dc', textColor: '#9e9e9e' },
  { v: 1, label: 'Légère',  color: '#fdf6e3', border: '#f0d080', textColor: '#b5830a' },
  { v: 2, label: 'Intense', color: '#fdecea', border: '#f5c6c6', textColor: '#c0392b' },
]

export default function ClubKioskDomsPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [zones, setZones] = useState({})
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
    const t = setTimeout(() => navigate('/coach-kiosk/doms'), 1500)
    return () => clearTimeout(t)
  }, [submitted, navigate])

  function cycleZone(key) {
    setZones(prev => {
      const current = prev[key] || 0
      const next = (current + 1) % 3
      if (next === 0) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: next }
    })
  }

  async function handleSubmit() {
    setSubmitting(true); setError('')

    const { error } = await supabase.from('doms_logs').upsert({
      user_id: playerId,
      date: today,
      zones,
    }, { onConflict: 'user_id,date' })

    setSubmitting(false)
    if (error) { setError(`Erreur : ${error.message}`); return }
    setSubmitted(true)
  }

  if (submitted) {
    const n = Object.keys(zones).length
    return (
      <KioskSuccessScreen
        title={`Merci ${player?.full_name || ''}`}
        message={n > 0 ? `${n} zone${n > 1 ? 's' : ''} renseignée${n > 1 ? 's' : ''}` : 'Aucune courbature — parfait'}
        footer="Retour à la liste..."
      />
    )
  }

  const groups = [...new Set(ZONES.map(z => z.group))]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
      padding: '28px 20px 40px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8c857b', marginBottom: 6 }}>
            DOMS · Courbatures localisées
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
            {player?.full_name || 'Athlète'}
          </div>
          <div style={{ fontSize: 12, color: '#8c857b', marginTop: 6 }}>
            Appuie sur les zones concernées — 1 clic = légère, 2 clics = intense
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: '11px 16px', borderRadius: 12, background: '#fff1f0', border: '1px solid #f3b7b2', color: '#b42318', fontWeight: 700, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 20, padding: '20px 20px', marginBottom: 14, boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }}>

          {groups.map(group => (
            <div key={group} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                {group}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ZONES.filter(z => z.group === group).map(z => {
                  const intensity = zones[z.key] || 0
                  const cfg = INTENSITY[intensity]
                  return (
                    <button key={z.key} onClick={() => cycleZone(z.key)} style={{
                      padding: '9px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                      border: `1.5px solid ${intensity > 0 ? cfg.border : '#e8e4dc'}`,
                      background: cfg.color,
                      fontSize: 13, fontWeight: 700, color: cfg.textColor,
                      transition: 'all 0.12s',
                    }}>
                      {z.key}
                      {intensity > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 11 }}>
                          {intensity === 1 ? '●' : '●●'}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {Object.keys(zones).length === 0 && (
            <div style={{ fontSize: 13, color: '#9e9e9e', textAlign: 'center', padding: '8px 0' }}>
              Aucune zone sélectionnée — tout va bien
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/coach-kiosk/doms')} style={{
            width: 140, height: 68, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
          }}>Retour</button>
          <button onClick={handleSubmit} disabled={submitting} style={{
            flex: 1, height: 68, borderRadius: 999, border: 'none',
            background: 'linear-gradient(90deg, #5a0a2a 0%, #8b1a4a 100%)',
            color: '#fff', fontWeight: 900, fontSize: 20, cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 12px 28px rgba(139,26,74,0.35)', opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
