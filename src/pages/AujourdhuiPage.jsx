import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { useDirty } from '../components/DirtyContext'
import { Card, Btn, Badge, PageWrap } from '../components/UI'
import { SEANCE_ICONS, T } from '../lib/data'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function emptySet() {
  return {
    reps: '',
    weight: '',
    rpe: '',
  }
}

function normalizeExercises(programExercises = []) {
  return [...programExercises]
    .sort((a, b) => Number(a.exercise_order || 0) - Number(b.exercise_order || 0))
    .map((row) => ({
      exercise: row.exercise,
      sets_target: row.sets_target || 1,
      reps_target: row.reps_target || '',
      rpe_target: row.rpe_target || '',
      sets: Array.from({ length: row.sets_target || 1 }, () => emptySet()),
    }))
}

function ExerciseSetRow({ setIndex, setData, onChange, onRemove, canRemove }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 120px 100px 44px',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <input
        value={setData.reps}
        onChange={(e) => onChange(setIndex, 'reps', e.target.value)}
        placeholder="Reps"
        type="number"
        min="0"
        style={{
          height: 44,
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: T.surface,
          color: T.text,
          padding: '0 12px',
          fontSize: 14,
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      <input
        value={setData.weight}
        onChange={(e) => onChange(setIndex, 'weight', e.target.value)}
        placeholder="Poids (kg)"
        type="number"
        min="0"
        step="0.5"
        style={{
          height: 44,
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: T.surface,
          color: T.text,
          padding: '0 12px',
          fontSize: 14,
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      <input
        value={setData.rpe}
        onChange={(e) => onChange(setIndex, 'rpe', e.target.value)}
        placeholder="RPE"
        type="number"
        min="0"
        step="0.5"
        style={{
          height: 44,
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: T.surface,
          color: T.text,
          padding: '0 12px',
          fontSize: 14,
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      <button
        type="button"
        disabled={!canRemove}
        onClick={() => onRemove(setIndex)}
        style={{
          height: 44,
          width: 44,
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: 'transparent',
          color: canRemove ? T.textDim : 'rgba(255,255,255,0.25)',
          cursor: canRemove ? 'pointer' : 'default',
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        ×
      </button>
    </div>
  )
}

function ExerciseCard({
  item,
  index,
  onSetChange,
  onAddSet,
  onRemoveSet,
}) {
  return (
    <Card style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              color: T.text,
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            {item.exercise}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            <Badge>{item.sets_target || 1} séries prévues</Badge>
            {item.reps_target ? <Badge color={T.blue}>{item.reps_target} reps</Badge> : null}
            {item.rpe_target ? <Badge color={T.orange}>RPE {item.rpe_target}</Badge> : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddSet(index)}
          style={{
            height: 40,
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: T.text,
            cursor: 'pointer',
            padding: '0 12px',
            fontWeight: 800,
          }}
        >
          + Ajouter une série
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 120px 100px 44px',
            gap: 8,
            padding: '0 2px',
          }}
        >
          {['Reps', 'Poids', 'RPE', ''].map((label) => (
            <div
              key={label}
              style={{
                color: T.textDim,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {item.sets.map((setRow, setIndex) => (
          <ExerciseSetRow
            key={`${item.exercise}-${setIndex}`}
            setIndex={setIndex}
            setData={setRow}
            onChange={(rowIndex, field, value) => onSetChange(index, rowIndex, field, value)}
            onRemove={(rowIndex) => onRemoveSet(index, rowIndex)}
            canRemove={item.sets.length > 1}
          />
        ))}
      </div>
    </Card>
  )
}

export default function AujourdhuiPage() {
  const { user } = useAuth()
  const { markDirty, markClean } = useDirty()

  const [assignment, setAssignment] = useState(null)
  const [exercises, setExercises] = useState([])
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const today = useMemo(() => todayString(), [])

  const loadToday = useCallback(async () => {
    if (!user?.id) {
      setAssignment(null)
      setExercises([])
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, programs(name, seance_type, program_exercises(*))')
        .eq('athlete_id', user.id)
        .eq('assigned_date', today)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        throw error
      }

      const current = data?.[0] || null

      setAssignment(current)
      setNotes('')

      if (current?.programs?.program_exercises?.length) {
        setExercises(normalizeExercises(current.programs.program_exercises))
      } else {
        setExercises([])
      }

      markClean()
    } catch (error) {
      console.error('Erreur chargement séance du jour :', error)
      setAssignment(null)
      setExercises([])
      setErrorMessage("Impossible de charger la séance du jour.")
    } finally {
      setLoading(false)
    }
  }, [user?.id, today, markClean])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  const updateSet = useCallback((exerciseIndex, setIndex, field, value) => {
    setExercises((current) =>
      current.map((exercise, exIndex) => {
        if (exIndex !== exerciseIndex) return exercise

        return {
          ...exercise,
          sets: exercise.sets.map((setRow, rowIndex) =>
            rowIndex === setIndex ? { ...setRow, [field]: value } : setRow
          ),
        }
      })
    )
    markDirty()
  }, [markDirty])

  const addSet = useCallback((exerciseIndex) => {
    setExercises((current) =>
      current.map((exercise, exIndex) =>
        exIndex === exerciseIndex
          ? { ...exercise, sets: [...exercise.sets, emptySet()] }
          : exercise
      )
    )
    markDirty()
  }, [markDirty])

  const removeSet = useCallback((exerciseIndex, setIndex) => {
    setExercises((current) =>
      current.map((exercise, exIndex) => {
        if (exIndex !== exerciseIndex) return exercise
        if (exercise.sets.length <= 1) return exercise

        return {
          ...exercise,
          sets: exercise.sets.filter((_, rowIndex) => rowIndex !== setIndex),
        }
      })
    )
    markDirty()
  }, [markDirty])

  const handleNotesChange = useCallback((value) => {
    setNotes(value)
    markDirty()
  }, [markDirty])

  const totalLoggedSets = useMemo(() => {
    return exercises.reduce((sum, exercise) => {
      return (
        sum +
        exercise.sets.filter((setRow) => setRow.reps || setRow.weight || setRow.rpe).length
      )
    }, 0)
  }, [exercises])

  const handleSave = useCallback(async () => {
    if (!user?.id) return

    const setsToInsert = []
    let setOrder = 0

    exercises.forEach((exercise) => {
      exercise.sets.forEach((setRow) => {
        const hasData = setRow.reps || setRow.weight || setRow.rpe
        if (!hasData) return

        setsToInsert.push({
          exercise: exercise.exercise,
          reps: setRow.reps ? parseInt(setRow.reps, 10) : null,
          weight: setRow.weight ? parseFloat(setRow.weight) : null,
          rpe: setRow.rpe ? parseFloat(setRow.rpe) : null,
          set_order: setOrder,
        })

        setOrder += 1
      })
    })

    if (setsToInsert.length === 0) {
      setErrorMessage('Saisis au moins une série avant de sauvegarder.')
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const sessionType = assignment?.programs?.seance_type || 'Séance du jour'

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          date: today,
          seance_type: sessionType,
          notes: notes.trim() || null,
        })
        .select()
        .single()

      if (sessionError) {
        throw sessionError
      }

      const rows = setsToInsert.map((row) => ({
        ...row,
        session_id: session.id,
      }))

      const { error: setsError } = await supabase
        .from('sets')
        .insert(rows)

      if (setsError) {
        throw setsError
      }

      setSuccessMessage('Séance enregistrée avec succès.')
      markClean()
      await loadToday()
    } catch (error) {
      console.error('Erreur enregistrement séance :', error)
      setErrorMessage("Impossible d'enregistrer la séance.")
    } finally {
      setSaving(false)
    }
  }, [user?.id, exercises, assignment, today, notes, markClean, loadToday])

  return (
    <PageWrap>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gap: 18,
        }}
      >
        <Card
          glow
          style={{
            padding: '24px 22px',
            background:
              'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%), linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '8px 12px',
              borderRadius: 999,
              border: `1px solid ${T.accent + '28'}`,
              background: 'rgba(45,255,155,0.10)',
              color: T.accentLight,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Séance du jour
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div
                style={{
                  color: T.text,
                  fontFamily: T.fontDisplay,
                  fontWeight: 900,
                  fontSize: 30,
                  lineHeight: 1,
                }}
              >
                AUJOURD'HUI
              </div>

              <div
                style={{
                  color: T.textMid,
                  fontSize: 14,
                  marginTop: 10,
                  lineHeight: 1.65,
                }}
              >
                {assignment?.programs?.name
                  ? `Programme assigné : ${assignment.programs.name}`
                  : "Aucun programme assigné pour aujourd'hui."}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {assignment?.programs?.seance_type ? (
                <Badge>
                  {(SEANCE_ICONS[assignment.programs.seance_type] || '💪') + ' ' + assignment.programs.seance_type}
                </Badge>
              ) : null}

              <Badge color={T.blue}>{today}</Badge>
            </div>
          </div>
        </Card>

        {errorMessage ? (
          <Card
            style={{
              padding: 16,
              border: '1px solid rgba(255,120,120,0.22)',
              background: 'rgba(255,90,90,0.06)',
            }}
          >
            <div style={{ color: '#FFB3B3', fontWeight: 800, fontSize: 14 }}>
              {errorMessage}
            </div>
          </Card>
        ) : null}

        {successMessage ? (
          <Card
            style={{
              padding: 16,
              border: `1px solid ${T.accent}22`,
              background: 'rgba(57,224,122,0.07)',
            }}
          >
            <div style={{ color: T.accentLight, fontWeight: 800, fontSize: 14 }}>
              {successMessage}
            </div>
          </Card>
        ) : null}

        {loading ? (
          <Card style={{ padding: 20 }}>
            <div style={{ color: T.textDim, fontSize: 14 }}>
              Chargement de la séance du jour...
            </div>
          </Card>
        ) : !assignment ? (
          <Card style={{ padding: 20 }}>
            <div
              style={{
                color: T.text,
                fontWeight: 800,
                fontSize: 15,
                marginBottom: 8,
              }}
            >
              Aucun programme aujourd’hui
            </div>

            <div style={{ color: T.textMid, fontSize: 14 }}>
              Aucun programme ne t’a été assigné pour cette date.
            </div>
          </Card>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <Card style={{ padding: 16 }}>
                <div
                  style={{
                    color: T.textSub,
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Exercices
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {exercises.length}
                </div>
              </Card>

              <Card style={{ padding: 16 }}>
                <div
                  style={{
                    color: T.textSub,
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Séries saisies
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {totalLoggedSets}
                </div>
              </Card>
            </div>

            <Card style={{ padding: 18 }}>
              <div
                style={{
                  color: T.text,
                  fontWeight: 900,
                  fontSize: 16,
                  marginBottom: 12,
                }}
              >
                Notes de séance
              </div>

              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Ressenti, énergie, douleurs, remarques..."
                style={{
                  width: '100%',
                  minHeight: 110,
                  resize: 'vertical',
                  borderRadius: 14,
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  color: T.text,
                  padding: 14,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </Card>

            <div style={{ display: 'grid', gap: 14 }}>
              {exercises.map((exercise, index) => (
                <ExerciseCard
                  key={`${exercise.exercise}-${index}`}
                  item={exercise}
                  index={index}
                  onSetChange={updateSet}
                  onAddSet={addSet}
                  onRemoveSet={removeSet}
                />
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={loadToday}
                disabled={saving}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: `1px solid ${T.border}`,
                  background: 'rgba(255,255,255,0.03)',
                  color: T.text,
                  padding: '0 16px',
                  cursor: saving ? 'default' : 'pointer',
                  fontWeight: 800,
                  fontSize: 14,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                Réinitialiser
              </button>

              <Btn onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer la séance'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </PageWrap>
  )
}
