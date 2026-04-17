// SQL à créer dans Supabase si inexistant :
// create table public.kiosk_topset (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references public.profiles(id) on delete cascade,
//   date date not null,
//   exercise text not null,
//   weight_kg numeric(6,2),
//   reps integer,
//   created_at timestamptz default now()
// );

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskSuccessScreen from '../components/kiosk/KioskSuccessScreen'

const BASE_EXERCISES = [
  'Squat',
  'Front Squat',
  'Développé couché',
  'Soulevé de terre',
  'Hip Thrust',
  'Rowing barre',
  'Développé militaire',
  'Tractions',
  'RDL',
  'Leg Press',
]

export default function ClubKioskTopsetPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [entries, setEntries] = useState([]) // { exercise, weight, reps }
  const [exercise, setExercise] = useState('')
  const [customExercise, setCustomExercise] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
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
    const t = setTimeout(() => navigate('/coach-kiosk/topset'), 1500)
    return () => clearTimeout(t)
  }, [submitted, navigate])

  function addEntry() {
    const name = exercise === '__custom__' ? customExercise.trim() : exercise
    if (!name) { setError('Sélectionne un exercice.'); return }
    if (!weight && !reps) { setError('Entre au moins le poids ou les reps.'); return }
    setError('')
    setEntries(prev => [...prev, { exercise: name, weight, reps }])
    setWeight('')
    setReps('')
  }

  function removeEntry(i) {
    setEntries(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    if (!entries.length) { setError('Ajoute au moins un exercice.'); return }
    setSubmitting(true); setError('')

    const rows = entries.map(e => ({
      user_id: playerId,
      date: today,
      exercise: e.exercise,
      weight_kg: e.weight ? parseFloat(e.weight) : null,
      reps: e.reps ? parseInt(e.reps) : null,
    }))

    const { error } = await supabase.from('kiosk_topset').insert(rows)
    setSubmitting(false)
    if (error) { setError(`Erreur : ${error.message}`); return }
    setSubmitted(true)
  }

  if (submitted) return (
    <KioskSuccessScreen
      title={`Merci ${player?.full_name || ''}`}
      message={`${entries.length} exercice${entries.length > 1 ? 's' : ''} enregistré${entries.length > 1 ? 's' : ''}`}
      footer="Retour à la liste..."
    />
  )

  const selectedName = exercise === '__custom__' ? customExercise.trim() : exercise
  const canAdd = selectedName && (weight || reps)
  const w = parseFloat(weight)
  const r = parseInt(reps)
  const orm = w && r && r > 0 ? Math.round(w * (1 + r / 30)) : null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(22,22,22,0.96) 0%, rgba(7,7,7,1) 65%)',
      padding: '28px 20px 40px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8c857b', marginBottom: 6 }}>
            Topset
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

        {/* Formulaire ajout */}
        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 20, padding: '22px 22px', marginBottom: 14, boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }}>

          {/* Sélecteur exercice */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6b6b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Exercice
            </label>
            <select
              value={exercise}
              onChange={e => { setExercise(e.target.value); setCustomExercise('') }}
              style={{
                width: '100%', height: 48, padding: '0 14px', borderRadius: 12,
                border: '1.5px solid #e8e4dc', background: '#f9f8f6',
                fontSize: 15, fontWeight: 600, color: '#1a1a1a',
                outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="">-- Choisir --</option>
              {BASE_EXERCISES.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
              <option value="__custom__">Autre (saisie libre)</option>
            </select>

            {exercise === '__custom__' && (
              <input
                value={customExercise}
                onChange={e => setCustomExercise(e.target.value)}
                placeholder="Nom de l'exercice"
                style={{
                  width: '100%', marginTop: 8, height: 44, padding: '0 14px', borderRadius: 12,
                  border: '1.5px solid #e8e4dc', background: '#f9f8f6',
                  fontSize: 15, fontWeight: 600, color: '#1a1a1a',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            )}
          </div>

          {/* Poids + Reps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6b6b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Poids (kg)
              </label>
              <input
                type="number" min="0" step="0.5" value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="Ex : 100"
                style={{
                  width: '100%', height: 48, padding: '0 14px', borderRadius: 12,
                  border: '1.5px solid #e8e4dc', background: '#f9f8f6',
                  fontSize: 22, fontWeight: 800, color: '#1a1a1a',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  textAlign: 'center',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6b6b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Répétitions
              </label>
              <input
                type="number" min="1" step="1" value={reps}
                onChange={e => setReps(e.target.value)}
                placeholder="Ex : 3"
                style={{
                  width: '100%', height: 48, padding: '0 14px', borderRadius: 12,
                  border: '1.5px solid #e8e4dc', background: '#f9f8f6',
                  fontSize: 22, fontWeight: 800, color: '#1a1a1a',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  textAlign: 'center',
                }}
              />
            </div>
          </div>

          {orm && (
            <div style={{ marginBottom: 14, padding: '9px 14px', borderRadius: 10, background: '#f0f7ff', border: '1px solid #b8d4f0', fontSize: 13, fontWeight: 700, color: '#1a6db5' }}>
              1RM estimé (Epley) ≈ {orm} kg
            </div>
          )}

          <button onClick={addEntry} disabled={!canAdd} style={{
            width: '100%', height: 46, borderRadius: 12, border: 'none',
            background: canAdd ? '#1a3a2a' : '#d1cfc9',
            color: '#fff', fontWeight: 800, fontSize: 15,
            cursor: canAdd ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          }}>
            + Ajouter
          </button>
        </div>

        {/* Liste des entrées ajoutées */}
        {entries.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 20, padding: '18px 22px', marginBottom: 20, boxShadow: '0 10px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Séance ({entries.length} exercice{entries.length > 1 ? 's' : ''})
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {entries.map((e, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 12, background: '#f9f8f6', border: '1px solid #e8e4dc',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{e.exercise}</div>
                    <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 2 }}>
                      {e.weight ? `${e.weight} kg` : '—'}{e.weight && e.reps ? ' · ' : ''}{e.reps ? `${e.reps} reps` : ''}
                      {e.weight && e.reps ? ` · 1RM ≈ ${Math.round(parseFloat(e.weight) * (1 + parseInt(e.reps) / 30))} kg` : ''}
                    </div>
                  </div>
                  <button onClick={() => removeEntry(i)} style={{
                    width: 30, height: 30, borderRadius: 8, border: 'none',
                    background: '#fdecea', color: '#c0392b', cursor: 'pointer',
                    fontSize: 16, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/coach-kiosk/topset')} style={{
            width: 140, height: 68, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
          }}>Retour</button>
          <button onClick={handleSubmit} disabled={submitting || !entries.length} style={{
            flex: 1, height: 68, borderRadius: 999, border: 'none',
            background: entries.length ? 'linear-gradient(90deg, #0f3a6b 0%, #1a4a8a 100%)' : '#444',
            color: '#fff', fontWeight: 900, fontSize: 20,
            cursor: submitting || !entries.length ? 'not-allowed' : 'pointer',
            boxShadow: entries.length ? '0 12px 28px rgba(26,74,138,0.35)' : 'none',
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Enregistrement...' : `Valider${entries.length > 0 ? ` (${entries.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
