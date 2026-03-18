import { useEffect, useState, useRef } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"
import { T } from "../lib/data"
import { computeSmartProgression } from "../lib/smartProgressionEngine"
import SmartCoachCard from "../components/SmartCoachCard"

const C = {
  bg: '#07090e', card: 'rgba(12,16,24,0.85)', border: 'rgba(255,255,255,0.07)',
  text: '#edf2f7', sub: '#6b7f94', accent: '#3ecf8e', red: '#ff4566',
}
const GLASS = {
  background: C.card, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${C.border}`, borderRadius: 16,
}
const GROUP_COLORS = {
  'Pectoraux':'#4d9fff','Dos':'#9d7dea','Épaules':'#ff7043','Biceps':'#26d4e8',
  'Triceps':'#38bdf8','Jambes':'#3ecf8e','Fessiers':'#a78bfa','Abdominaux':'#fbbf24',
  'Mollets':'#34d399','Cardio':'#f87171','Autre':'#8899aa',
}
function gc(g) { return GROUP_COLORS[g] || '#8899aa' }

function extractYoutubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function YoutubeEmbed({ url }) {
  const [playing, setPlaying] = useState(false)
  const id = extractYoutubeId(url)
  if (!id) return null
  if (playing) return (
    <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
      <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen title="video" />
    </div>
  )
  return (
    <div onClick={() => setPlaying(true)} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', background: '#111', cursor: 'pointer', position: 'relative' }}>
      <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.35)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,0,0,0.9)', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: '16px solid white', marginLeft: 3 }} />
        </div>
      </div>
    </div>
  )
}

function ExercisePicker({ exercises, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  const groups = [...new Set(exercises.map(e => e.muscle_group).filter(Boolean))]
  const filtered = exercises.filter(e => {
    if (filterGroup && e.muscle_group !== filterGroup) return false
    if (search && !e.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...GLASS, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 800, color: C.text, fontFamily: "'Syne',sans-serif" }}>Choisir un exercice</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: C.sub, width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
          <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 14, outline: 'none' }} />
        </div>
        <div style={{ padding: '8px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterGroup('')} style={{ padding: '4px 12px', borderRadius: 14, fontSize: 11, fontWeight: 700, border: `1px solid ${!filterGroup ? C.accent + '50' : C.border}`, background: !filterGroup ? `${C.accent}15` : 'transparent', color: !filterGroup ? C.accent : C.sub, cursor: 'pointer' }}>Tous</button>
          {groups.map(g => { const c = gc(g); const sel = filterGroup === g; return (
            <button key={g} onClick={() => setFilterGroup(sel ? '' : g)} style={{ padding: '4px 12px', borderRadius: 14, fontSize: 11, fontWeight: 700, border: `1px solid ${sel ? c + '50' : C.border}`, background: sel ? `${c}15` : 'transparent', color: sel ? c : C.sub, cursor: 'pointer' }}>{g}</button>
          )})}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(ex => {
            const c = gc(ex.muscle_group)
            const id = extractYoutubeId(ex.youtube_url)
            const thumb = id ? `https://img.youtube.com/vi/${id}/default.jpg` : null
            return (
              <div key={ex.id} onClick={() => onSelect(ex)} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: `${c}15`, border: `1px solid ${c}30`, display: 'grid', placeItems: 'center' }}>
                  {thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>💪</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                  {ex.muscle_group && <div style={{ fontSize: 11, color: c, marginTop: 2 }}>{ex.muscle_group}</div>}
                </div>
                {ex.youtube_url && <span style={{ fontSize: 10, color: '#ff4444', fontWeight: 700, flexShrink: 0 }}>▶</span>}
              </div>
            )
          })}
          {filtered.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: C.sub, fontSize: 13 }}>Aucun exercice trouvé</div>}
        </div>
      </div>
    </div>
  )
}

function ExerciseBlock({ exEntry, index, onChange, onRemove, suggestion }) {
  const { exercise, sets } = exEntry
  const [showVideo, setShowVideo] = useState(false)
  const c = gc(exercise.muscle_group)

  function addSet() { onChange({ ...exEntry, sets: [...sets, { weight: '', reps: '', rpe: '' }] }) }
  function updateSet(i, key, val) { onChange({ ...exEntry, sets: sets.map((s, idx) => idx === i ? { ...s, [key]: val } : s) }) }
  function removeSet(i) { onChange({ ...exEntry, sets: sets.filter((_, idx) => idx !== i) }) }

  return (
    <div style={{ ...GLASS, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, fontFamily: "'Syne',sans-serif" }}>{exercise.name}</div>
          {exercise.muscle_group && <div style={{ fontSize: 11, color: c, marginTop: 1 }}>{exercise.muscle_group}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {exercise.youtube_url && (
            <button onClick={() => setShowVideo(v => !v)} style={{ padding: '5px 10px', borderRadius: 8, background: showVideo ? 'rgba(255,0,0,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showVideo ? 'rgba(255,0,0,0.3)' : C.border}`, color: showVideo ? '#ff4444' : C.sub, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>▶ Vidéo</button>
          )}
          <button onClick={() => onRemove(index)} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,69,102,0.08)', border: '1px solid rgba(255,69,102,0.2)', color: C.red, cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center' }}>×</button>
        </div>
      </div>
      <div style={{ padding: '14px 16px', display: 'grid', gap: 12 }}>
        {showVideo && exercise.youtube_url && <YoutubeEmbed url={exercise.youtube_url} />}
        {exercise.description && !showVideo && <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>{exercise.description}</div>}
        {suggestion && (
          <SmartCoachCard suggestion={suggestion} loading={false}
            onApply={() => { if (sets.length === 0) onChange({ ...exEntry, sets: [{ weight: String(suggestion.weight), reps: String(suggestion.reps), rpe: '' }] }) }} />
        )}
        {sets.length > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            <div className='saisie-set-row' style={{ display: 'grid', gap: 6 }}>
              {['#','KG','REPS','RPE',''].map(h => <div key={h} style={{ fontSize: 10, color: C.sub, textAlign: 'center' }}>{h}</div>)}
            </div>
            {sets.map((s, i) => (
              <div key={i} className='saisie-set-row' style={{ display: 'grid', gap: 6, alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: C.sub, textAlign: 'center', fontWeight: 700 }}>{i + 1}</div>
                {['weight','reps','rpe'].map(key => (
                  <input key={key} type="number" value={s[key]} onChange={e => updateSet(i, key, e.target.value)}
                    placeholder={key === 'weight' ? 'kg' : key === 'reps' ? 'reps' : 'RPE'}
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px', color: C.text, fontSize: 14, outline: 'none', textAlign: 'center', width: '100%', boxSizing: 'border-box' }} />
                ))}
                <button onClick={() => removeSet(i)} style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: `1px solid ${C.border}`, color: C.sub, cursor: 'pointer', fontSize: 14, display: 'grid', placeItems: 'center' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <button onClick={addSet} style={{ padding: '9px', borderRadius: 10, background: `${c}12`, border: `1px dashed ${c}40`, color: c, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Ajouter une série</button>
      </div>
    </div>
  )
}

export default function SaisiePage() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [sessionExercises, setSessionExercises] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('exercises').select('*').order('name').then(({ data }) => setExercises(data || []))
  }, [])

  async function loadSuggestion(exercise) {
    const { data: sessionsData } = await supabase.from('sessions').select('id,date').eq('user_id', user.id).order('date', { ascending: false }).limit(60)
    const sessionIds = (sessionsData || []).map(s => s.id)
    const sessionDateById = new Map((sessionsData || []).map(s => [s.id, s.date]))
    let history = []
    if (sessionIds.length > 0) {
      const { data: setsData } = await supabase.from('sets').select('session_id,exercise,reps,weight,rpe,set_order').eq('exercise', exercise.name).in('session_id', sessionIds)
      history = (setsData || []).map(s => ({ ...s, session_date: sessionDateById.get(s.session_id) || '' })).sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)))
    }
    return computeSmartProgression(history, 10)
  }

  async function handleSelectExercise(ex) {
    setShowPicker(false)
    const suggestion = await loadSuggestion(ex)
    setSessionExercises(prev => [...prev, { exercise: ex, sets: [{ weight: '', reps: '', rpe: '' }], suggestion }])
  }

  function updateEntry(index, updated) { setSessionExercises(prev => prev.map((e, i) => i === index ? updated : e)) }
  function removeExercise(index) { setSessionExercises(prev => prev.filter((_, i) => i !== index)) }

  async function saveSession() {
    if (sessionExercises.length === 0) return
    setSaving(true)
    try {
      const { data: session } = await supabase.from('sessions').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        name: sessionExercises.map(e => e.exercise.name).join(', '),
        type: 'libre',
      }).select().single()
      for (const entry of sessionExercises) {
        for (const s of entry.sets) {
          if (!s.weight && !s.reps) continue
          await supabase.from('sets').insert({ user_id: user.id, session_id: session?.id || null, exercise: entry.exercise.name, weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, rpe: Number(s.rpe) || 0 })
        }
      }
      setSaved(true)
      setSessionExercises([])
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const totalSets = sessionExercises.reduce((s, e) => s + e.sets.filter(x => x.weight || x.reps).length, 0)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 'clamp(14px,3vw,20px) clamp(12px,3vw,16px)', maxWidth: 720, margin: '0 auto', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700;800&display=swap');
      .saisie-set-row { grid-template-columns: 28px 1fr 1fr 1fr 28px; }
      @media (max-width: 360px) { .saisie-set-row { grid-template-columns: 24px 1fr 1fr 1fr 24px; gap: 4px; } }
    `}</style>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(20px,5vw,26px)', fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.6px' }}>Séance libre</h1>
        {sessionExercises.length > 0 && (
          <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>{sessionExercises.length} exercice{sessionExercises.length > 1 ? 's' : ''} · {totalSets} série{totalSets > 1 ? 's' : ''}</div>
        )}
      </div>

      {saved && (
        <div style={{ ...GLASS, padding: '14px 18px', marginBottom: 16, borderColor: `${C.accent}40`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>Séance enregistrée !</div>
            <button onClick={() => setSaved(false)} style={{ background: 'none', border: 'none', color: C.sub, fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 2 }}>Nouvelle séance</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {sessionExercises.map((entry, i) => (
          <ExerciseBlock key={`${entry.exercise.id}-${i}`} exEntry={entry} index={i}
            onChange={updated => updateEntry(i, updated)} onRemove={removeExercise} suggestion={entry.suggestion} />
        ))}

        <button onClick={() => setShowPicker(true)} style={{
          padding: '14px', borderRadius: 14,
          background: sessionExercises.length === 0 ? `${C.accent}15` : 'rgba(255,255,255,0.03)',
          border: `1px dashed ${sessionExercises.length === 0 ? C.accent + '60' : C.border}`,
          color: sessionExercises.length === 0 ? C.accent : C.sub,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne',sans-serif",
        }}>
          {sessionExercises.length === 0 ? '+ Choisir un exercice pour commencer' : '+ Ajouter un exercice'}
        </button>

        {sessionExercises.length > 0 && (
          <button onClick={saveSession} disabled={saving} style={{
            padding: '14px', borderRadius: 14, background: `linear-gradient(135deg,${C.accent},#2ab377)`,
            border: 'none', color: '#000', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer',
            fontFamily: "'Syne',sans-serif", opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Enregistrement...' : `💾 Sauvegarder la séance (${sessionExercises.length} exo${sessionExercises.length > 1 ? 's' : ''})`}
          </button>
        )}
      </div>

      {showPicker && <ExercisePicker exercises={exercises} onSelect={handleSelectExercise} onClose={() => setShowPicker(false)} />}
    </div>
  )
}
