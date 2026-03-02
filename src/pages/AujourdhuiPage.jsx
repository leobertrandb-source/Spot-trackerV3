import { useState, useEffect } from 'react'
import { useDirty } from '../components/DirtyContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, PageHeader, Input, Select, Btn, Badge, PageWrap } from '../components/UI'
import { ALL_EXERCISES, SEANCE_ICONS, T } from '../lib/data'

// ── Bibliothèque latérale pour l'athlète ──────────────────────────
function ExoLibrary({ onAdd }) {
  const [search, setSearch] = useState('')
  const filtered = ALL_EXERCISES.filter(e => e.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Input label="Ajouter un exercice" value={search} onChange={setSearch} placeholder="Rechercher..." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 300, overflowY: 'auto' }}>
        {filtered.map(exo => (
          <div
            key={exo}
            draggable
            onDragStart={e => e.dataTransfer.setData('exercise', exo)}
            onClick={() => onAdd(exo)}
            style={{
              padding: '8px 11px', background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: T.radiusSm, fontSize: 12, color: T.textMid,
              cursor: 'grab', userSelect: 'none', transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.text }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMid }}
          >
            <span style={{ color: T.accentDim, fontSize: 10 }}>⠿</span>
            {exo}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bloc d'un exercice avec saisie de séries ──────────────────────
function ExerciseBlock({ exo, onRemove, onUpdateSet, onAddSet, onRemoveSet }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.radiusSm, overflow: 'hidden', transition: 'border-color .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHi}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      {/* Header exercice */}
      <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: T.accent, fontSize: 10 }}>▸</span>
          <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 14, color: T.text }}>{exo.exercise}</div>
          {exo.sets_target && (
            <Badge color={T.accent}>{exo.sets_target}×{exo.reps_target || '?'}{exo.rpe_target ? ` @RPE${exo.rpe_target}` : ''}</Badge>
          )}
        </div>
        <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 6px' }}
          onMouseEnter={e => e.currentTarget.style.color = T.danger}
          onMouseLeave={e => e.currentTarget.style.color = T.textDim}
        >×</button>
      </div>

      {/* Sets */}
      <div style={{ padding: '10px 14px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 28px', gap: 8, marginBottom: 8 }}>
          {['Série', 'Rép.', 'Charge kg', 'RPE'].map(h => (
            <div key={h} style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9, letterSpacing: 1.5, color: T.textDim, textTransform: 'uppercase' }}>{h}</div>
          ))}
          <div />
        </div>

        {exo.sets.map((set, si) => (
          <div key={si} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 28px', gap: 8, marginBottom: 7, alignItems: 'center' }}>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 16, color: T.accentDim, textAlign: 'center' }}>{si + 1}</div>
            <Input label="" value={set.reps} onChange={v => onUpdateSet(si, 'reps', v)} type="number" placeholder={exo.reps_target || '10'} min="0" />
            <Input label="" value={set.weight} onChange={v => onUpdateSet(si, 'weight', v)} type="number" placeholder="60" min="0" step="0.5" />
            <Input label="" value={set.rpe} onChange={v => onUpdateSet(si, 'rpe', v)} type="number" placeholder={exo.rpe_target || '8'} min="1" step="0.5" />
            <button onClick={() => onRemoveSet(si)} style={{ background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 14 }}
              onMouseEnter={e => e.currentTarget.style.color = T.danger}
              onMouseLeave={e => e.currentTarget.style.color = T.textDim}
            >×</button>
          </div>
        ))}

        <button onClick={onAddSet} style={{
          background: 'transparent', border: `1px dashed ${T.accent}33`,
          borderRadius: T.radiusSm, color: T.accentDim, padding: '6px 14px',
          fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 11, letterSpacing: 1,
          textTransform: 'uppercase', cursor: 'pointer', marginTop: 4, transition: 'all .2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.accent + '33'; e.currentTarget.style.color = T.accentDim }}
        >+ Série</button>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────
export default function AujourdhuiPage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [exercises, setExercises] = useState([])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState(null)
  const { markDirty, markClean } = useDirty()

  useEffect(() => {
    loadToday()
  }, [])

  async function loadToday() {
    // Cherche une assignation pour aujourd'hui
    const { data: assigns } = await supabase
      .from('assignments')
      .select('*, programs(name, seance_type, program_exercises(*))')
      .eq('athlete_id', user.id)
      .eq('assigned_date', today)
      .order('created_at', { ascending: false })
      .limit(1)

    setLoading(false)

    if (assigns?.length) {
      const a = assigns[0]
      setAssignment(a)
      // Pré-charge les exercices du programme
      const exos = (a.programs?.program_exercises || [])
        .sort((x, y) => x.exercise_order - y.exercise_order)
        .map(e => ({
          exercise: e.exercise,
          sets_target: e.sets_target,
          reps_target: e.reps_target,
          rpe_target: e.rpe_target,
          sets: Array.from({ length: e.sets_target || 1 }, () => ({ reps: '', weight: '', rpe: '' })),
        }))
      setExercises(exos)
    }
  }

  function addExercise(name) {
    markDirty()
    setExercises(p => [...p, {
      exercise: name, sets_target: null, reps_target: null, rpe_target: null,
      sets: [{ reps: '', weight: '', rpe: '' }],
    }])
  }

  function removeExercise(i) {
    setExercises(p => p.filter((_, idx) => idx !== i))
  }

  function updateSet(exoIdx, setIdx, field, val) {
    markDirty()
    setExercises(p => p.map((e, ei) => ei !== exoIdx ? e : {
      ...e,
      sets: e.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: val }),
    }))
  }

  function addSet(exoIdx) {
    setExercises(p => p.map((e, ei) => ei !== exoIdx ? e : {
      ...e, sets: [...e.sets, { reps: '', weight: '', rpe: '' }],
    }))
  }

  function removeSet(exoIdx, setIdx) {
    setExercises(p => p.map((e, ei) => ei !== exoIdx ? e : {
      ...e, sets: e.sets.filter((_, si) => si !== setIdx),
    }))
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragOver(false)
    const name = e.dataTransfer.getData('exercise')
    if (name) addExercise(name)
  }

  async function handleSave() {
    const allSets = exercises.flatMap(e => e.sets.filter(s => s.reps || s.weight))
    if (!allSets.length) return alert('Saisis au moins une série.')
    setStatus('saving')

    const seanceType = assignment?.programs?.seance_type || 'Séance libre'
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, date: today, seance_type: seanceType, notes })
      .select().single()

    if (error) { setStatus('error'); return }

    const setsToInsert = []
    exercises.forEach(e => {
      e.sets.forEach((s, si) => {
        if (s.reps || s.weight) {
          setsToInsert.push({
            session_id: session.id, exercise: e.exercise,
            reps: s.reps ? parseInt(s.reps) : null,
            weight: s.weight ? parseFloat(s.weight) : null,
            rpe: s.rpe ? parseFloat(s.rpe) : null,
            set_order: setsToInsert.length,
          })
        }
      })
    })

    const { error: e2 } = await supabase.from('sets').insert(setsToInsert)
    if (e2) { setStatus('error'); return }

    setStatus('saved')
    markClean()
    setTimeout(() => setStatus(null), 4000)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: T.textDim, fontFamily: T.fontDisplay, fontSize: 12, letterSpacing: 2 }}>
      Chargement...
    </div>
  )

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <PageWrap>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 36, letterSpacing: 2, color: T.text, lineHeight: 1 }}>
          AUJOURD'HUI
        </div>
        <div style={{ fontSize: 14, color: T.textMid, marginTop: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
      </div>

      {/* Bandeau programme assigné */}
      {assignment ? (
        <div style={{
          background: `linear-gradient(135deg, ${T.accentGlow}, transparent)`,
          border: `1px solid ${T.accent}44`, borderRadius: T.radiusLg,
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 26 }}>{SEANCE_ICONS[assignment.programs?.seance_type] || '💪'}</div>
          <div>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 16, color: T.accent }}>{assignment.programs?.name}</div>
            <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
              {assignment.programs?.seance_type}
              {assignment.note && <span style={{ marginLeft: 10, fontStyle: 'italic', color: T.textDim }}>"{assignment.note}"</span>}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontFamily: T.fontDisplay, fontSize: 11, color: T.textDim, letterSpacing: 1 }}>
            Programme assigné par ton coach
          </div>
        </div>
      ) : (
        <div style={{
          background: T.card, border: `1px dashed ${T.border}`,
          borderRadius: T.radiusLg, padding: '16px 20px',
          fontFamily: T.fontDisplay, fontSize: 12, color: T.textDim, letterSpacing: 1, textAlign: 'center',
        }}>
          Aucune séance assignée pour aujourd'hui — crée ta propre séance ci-dessous
        </div>
      )}

      {/* Zone principale */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>

        {/* Exercices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              minHeight: exercises.length ? 'auto' : 100,
              border: exercises.length ? 'none' : `2px dashed ${isDragOver ? T.accent : T.border}`,
              borderRadius: T.radiusSm,
              padding: exercises.length ? 0 : '28px 20px',
              background: isDragOver && !exercises.length ? T.accentGlow : 'transparent',
              transition: 'all .2s',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            {exercises.length === 0 ? (
              <div style={{ textAlign: 'center', color: T.textDim, fontFamily: T.fontDisplay, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
                {isDragOver ? '↓ Relâche ici' : 'Glisse des exercices depuis la liste ou clique dessus →'}
              </div>
            ) : (
              exercises.map((exo, i) => (
                <ExerciseBlock
                  key={i}
                  exo={exo}
                  onRemove={() => removeExercise(i)}
                  onUpdateSet={(si, f, v) => updateSet(i, si, f, v)}
                  onAddSet={() => addSet(i)}
                  onRemoveSet={si => removeSet(i, si)}
                />
              ))
            )}
          </div>

          {/* Notes + Save */}
          {exercises.length > 0 && (
            <Card style={{ padding: '16px 20px' }}>
              <Input label="Notes de séance" value={notes} onChange={setNotes} placeholder="Ressenti, douleurs, contexte..." />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, gap: 14, alignItems: 'center' }}>
                {status === 'saved' && (
                  <div style={{ color: T.accent, fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>✓ Séance enregistrée !</div>
                )}
                {status === 'error' && (
                  <div style={{ color: T.danger, fontFamily: T.fontDisplay, fontSize: 12 }}>Erreur — vérifie ta connexion</div>
                )}
                <Btn onClick={handleSave} disabled={status === 'saving' || status === 'saved'}>
                  {status === 'saving' ? 'Enregistrement...' : 'Terminer la séance'}
                </Btn>
              </div>
            </Card>
          )}
        </div>

        {/* Bibliothèque */}
        <Card style={{ padding: '18px 16px', alignSelf: 'start', position: 'sticky', top: 20 }}>
          <Label style={{ marginBottom: 12 }}>Exercices</Label>
          <ExoLibrary onAdd={addExercise} />
        </Card>
      </div>
    </PageWrap>
  )
}
