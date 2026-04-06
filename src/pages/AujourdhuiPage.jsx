import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap } from '../components/UI'
import { T } from '../lib/data'

const today = new Date().toISOString().split('T')[0]
const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

function extractYoutubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

// ─── Bloc exercice ────────────────────────────────────────────────────────────
function ExerciseBlock({ ex, exIndex, onChange }) {
  const [videoOpen, setVideoOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const ytId = extractYoutubeId(ex.youtube_url)
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null

  // ex.sets = [{reps, load, rest, note}] from program_day_exercises JSON
  const sets = Array.isArray(ex.sets) ? ex.sets : []

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.015)' }}>

      {/* Header exercice */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.border}` }}>
        {thumb ? (
          <img src={thumb} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 18 }}>💪</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{ex.exercise_name}</div>
          {ex.muscle_group && <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>{ex.muscle_group}</div>}
        </div>
        {ytId && (
          <button onClick={() => { setVideoOpen(o => !o); setPlaying(false) }}
            style={{ padding: '5px 10px', borderRadius: 8, background: videoOpen ? `${T.accent}15` : 'rgba(255,255,255,0.05)', border: `1px solid ${videoOpen ? T.accent + '40' : T.border}`, color: videoOpen ? T.accent : T.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {videoOpen ? '▲ Vidéo' : '▶ Vidéo'}
          </button>
        )}
      </div>

      {/* Vidéo */}
      {videoOpen && ytId && (
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
            {!playing ? (
              <div onClick={() => setPlaying(true)} style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}>
                <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,0,0,0.9)', display: 'grid', placeItems: 'center' }}>
                    <span style={{ color: '#fff', fontSize: 16, marginLeft: 3 }}>▶</span>
                  </div>
                </div>
              </div>
            ) : (
              <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            )}
          </div>
          {ex.description && (
            <div style={{ marginTop: 8, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>{ex.description}</div>
          )}
        </div>
      )}

      {/* Notes coach */}
      {ex.notes && (
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${T.border}`, background: `${T.accent}06`, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 11, color: T.accent, flexShrink: 0, marginTop: 1 }}>📋</span>
          <span style={{ fontSize: 12, color: T.textMid, lineHeight: 1.5 }}>{ex.notes}</span>
        </div>
      )}

      {/* Tableau séries */}
      <div style={{ padding: '10px 16px' }}>
        {/* Header colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '28px 60px 1fr 1fr 64px', gap: 6, marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: T.textDim, textAlign: 'center' }}>#</div>
          <div style={{ fontSize: 10, color: T.textDim }}>Cible</div>
          <div style={{ fontSize: 10, color: T.textDim }}>Poids (kg)</div>
          <div style={{ fontSize: 10, color: T.textDim }}>Reps</div>
          <div style={{ fontSize: 10, color: T.textDim }}>RPE</div>
        </div>

        {sets.map((set, si) => (
          <div key={si} style={{ display: 'grid', gridTemplateColumns: '28px 60px 1fr 1fr 64px', gap: 6, marginBottom: 5, alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, textAlign: 'center' }}>{si + 1}</div>
            <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600 }}>{set.reps || '—'}</div>
            <input
              type="number" min="0" step="0.5"
              placeholder={set.load || '0'}
              value={ex.logged?.[si]?.weight ?? ''}
              onChange={e => onChange(exIndex, si, 'weight', e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 8px', color: T.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            <input
              type="number" min="0"
              placeholder="0"
              value={ex.logged?.[si]?.reps ?? ''}
              onChange={e => onChange(exIndex, si, 'reps', e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 8px', color: T.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            <input
              type="number" min="1" max="10" step="0.5"
              placeholder="—"
              value={ex.logged?.[si]?.rpe ?? ''}
              onChange={e => onChange(exIndex, si, 'rpe', e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 8px', color: T.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AujourdhuiPage() {
  const { user } = useAuth()
  const [assignment, setAssignment] = useState(null)
  const [exercises, setExercises]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('assignments')
        .select('id, program_day_id, programs(name), program_days(name, program_day_exercises(*))')
        .eq('athlete_id', user.id)
        .eq('assigned_date', today)
        .order('created_at', { ascending: false })
        .limit(1)

      const asgn = data?.[0] || null
      setAssignment(asgn)

      if (!asgn) { setExercises([]); setLoading(false); return }

      const rawExercises = (asgn.program_days?.program_day_exercises || [])
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

      // Charger les infos exercices (vidéo, description, muscle_group)
      const exIds = rawExercises.map(e => e.exercise_id).filter(Boolean)
      let exMap = {}
      if (exIds.length) {
        const { data: exData } = await supabase
          .from('exercises').select('id, youtube_url, description, muscle_group').in('id', exIds)
        exMap = Object.fromEntries((exData || []).map(e => [e.id, e]))
      }

      setExercises(rawExercises.map(ex => {
        let sets = ex.sets
        if (typeof ex.reps === 'string' && ex.reps.trim().startsWith('[')) {
          try { sets = JSON.parse(ex.reps) } catch {}
        }
        if (!Array.isArray(sets)) {
          const n = Number(ex.sets) || 3
          sets = Array.from({ length: n }, () => ({ reps: ex.reps || '—', load: '', rest: ex.rest_seconds || 90 }))
        }
        const info = exMap[ex.exercise_id] || {}
        return {
          ...ex,
          sets,
          youtube_url: info.youtube_url || null,
          description: info.description || null,
          muscle_group: info.muscle_group || null,
          logged: Array.from({ length: sets.length }, () => ({ weight: '', reps: '', rpe: '' })),
        }
      }))
    } catch (e) { console.error(e); setError('Erreur de chargement.') }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  function handleChange(exIndex, setIndex, field, value) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIndex) return ex
      const logged = ex.logged.map((l, j) => j === setIndex ? { ...l, [field]: value } : l)
      return { ...ex, logged }
    }))
    if (saved) setSaved(false)
  }

  async function handleSave() {
    if (!user?.id) return
    const rows = []
    let order = 0
    exercises.forEach(ex => {
      ex.logged.forEach((l, si) => {
        if (!l.weight && !l.reps) return
        rows.push({
          exercise: ex.exercise_name,
          reps: l.reps ? parseInt(l.reps) : null,
          weight: l.weight ? parseFloat(l.weight) : null,
          rpe: l.rpe ? parseFloat(l.rpe) : null,
          set_order: order++,
        })
      })
    })

    if (!rows.length) { setError('Saisis au moins une série.'); return }

    setSaving(true); setError('')
    try {
      const { data: session, error: sErr } = await supabase
        .from('sessions').insert({ user_id: user.id, date: today, seance_type: assignment?.programs?.name || 'Séance du jour' })
        .select().single()
      if (sErr) throw sErr
      const { error: setErr } = await supabase.from('sets').insert(rows.map(r => ({ ...r, session_id: session.id })))
      if (setErr) throw setErr
      setSaved(true)
    } catch (e) { console.error(e); setError('Erreur lors de la sauvegarde.') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <PageWrap>
      <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontSize: 13 }}>Chargement…</div>
    </PageWrap>
  )

  return (
    <PageWrap>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '4px 0 60px', display: 'grid', gap: 12, fontFamily: "'DM Sans',sans-serif" }}>

        {/* Header */}
        <div style={{ paddingBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{todayLabel}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.3px' }}>
            {assignment ? (assignment.program_days?.name || assignment.programs?.name || 'Séance du jour') : 'Pas de séance aujourd\'hui'}
          </div>
          {assignment && exercises.length > 0 && (
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>
              {exercises.length} exercice{exercises.length > 1 ? 's' : ''} · {exercises.reduce((s, e) => s + (e.sets?.length || 0), 0)} séries au programme
            </div>
          )}
        </div>

        {/* Pas de programme */}
        {!assignment && !loading && (
          <div style={{ padding: '32px 20px', textAlign: 'center', border: `1px dashed ${T.border}`, borderRadius: 14 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗓️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Aucune séance prévue</div>
            <div style={{ fontSize: 13, color: T.textDim }}>Ton coach n'a pas assigné de programme pour aujourd'hui.</div>
          </div>
        )}

        {/* Exercices */}
        {exercises.map((ex, i) => (
          <ExerciseBlock key={ex.id || i} ex={ex} exIndex={i} onChange={handleChange} />
        ))}

        {/* Erreur */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', fontSize: 13, color: '#f43f5e', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Bouton save */}
        {exercises.length > 0 && (
          <button onClick={handleSave} disabled={saving || saved}
            style={{ height: 48, borderRadius: 12, border: 'none', background: saved ? `${T.accent}20` : `linear-gradient(135deg, ${T.accent}, #2ab377)`, color: saved ? T.accent : '#05100a', fontWeight: 800, fontSize: 15, cursor: saving || saved ? 'default' : 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s' }}>
            {saving ? 'Enregistrement…' : saved ? '✓ Séance enregistrée' : 'Enregistrer la séance'}
          </button>
        )}
      </div>
    </PageWrap>
  )
}
