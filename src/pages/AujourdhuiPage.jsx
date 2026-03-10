import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { useDirty } from '../components/DirtyContext'
import { PageWrap, Card, Btn, Badge, Input } from '../components/UI'
import { SEANCE_ICONS, T } from '../lib/data'

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function emptySetFromExercise(exerciseRow = {}) {
  return {
    exercise: exerciseRow.exercise || '',
    reps: '',
    weight: '',
    rpe: '',
    sets_target: exerciseRow.sets_target || '',
    reps_target: exerciseRow.reps_target || '',
    rpe_target: exerciseRow.rpe_target || '',
  }
}

function normalizeProgramExercises(rows = []) {
  return [...rows]
    .sort((a, b) => Number(a.exercise_order || 0) - Number(b.exercise_order || 0))
    .map((row) => ({
      exercise: row.exercise || '',
      sets_target: row.sets_target || '',
      reps_target: row.reps_target || '',
      rpe_target: row.rpe_target || '',
      sets: Array.from(
        { length: Math.max(1, Number(row.sets_target || 1)) },
        () => emptySetFromExercise(row)
      ),
    }))
}

function SessionExerciseCard({
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
            {item.sets_target ? <Badge>{item.sets_target} séries prévues</Badge> : null}
            {item.reps_target ? <Badge color={T.blue || '#5BA7FF'}>{item.reps_target} reps</Badge> : null}
            {item.rpe_target ? <Badge color={T.orange || '#FFB454'}>RPE {item.rpe_target}</Badge> : null}
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
          <div
            key={`${item.exercise}-${setIndex}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 120px 100px 44px',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <input
              value={setRow.reps}
              onChange={(e) => onSetChange(index, setIndex, 'reps', e.target.value)}
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
              value={setRow.weight}
              onChange={(e) => onSetChange(index, setIndex, 'weight', e.target.value)}
              placeholder="Poids"
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
              value={setRow.rpe}
              onChange={(e) => onSetChange(index, setIndex, 'rpe', e.target.value)}
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
              disabled={item.sets.length <= 1}
              onClick={() => onRemoveSet(index, setIndex)}
              style={{
                height: 44,
                width: 44,
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: 'transparent',
                color: item.sets.length <= 1 ? 'rgba(255,255,255,0.25)' : T.textDim,
                cursor: item.sets.length <= 1 ? 'default' : 'pointer',
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function AujourdhuiPage() {
  const { user } = useAuth()
  const { markDirty, markClean } = useDirty()

  const [assignment, setAssignment] = useState(null)
  const [sessionExercises, setSessionExercises] = useState([])
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const today = useMemo(() => todayString(), [])

  const loadTodaySession = useCallback(async () => {
    if (!user?.id) {
      setAssignment(null)
      setSessionExercises([])
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

      const currentAssignment = data?.[0] || null
      setAssignment(currentAssignment)
      setNotes('')

      const programExercises = currentAssignment?.programs?.program_exercises || []
      setSessionExercises(normalizeProgramExercises(programExercises))
      markClean?.()
    } catch (error) {
      console.error('Erreur chargement séance du jour :', error)
      setAssignment(null)
      setSessionExercises([])
      setErrorMessage("Impossible de charger la séance du jour.")
    } finally {
      setLoading(false)
    }
  }, [user?.id, today, markClean])

  useEffect(() => {
    loadTodaySession()
  }, [loadTodaySession])

  function touchDirty() {
    markDirty?.()
    if (successMessage) setSuccessMessage('')
  }

  const updateSet = useCallback((exerciseIndex, setIndex, field, value) => {
    setSessionExercises((current) =>
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
    touchDirty()
  }, [successMessage, markDirty])

  const addSet = useCallback((exerciseIndex) => {
    setSessionExercises((current) =>
      current.map((exercise, exIndex) =>
        exIndex === exerciseIndex
          ? {
              ...exercise,
              sets: [
                ...exercise.sets,
                {
                  exercise: exercise.exercise,
                  reps: '',
                  weight: '',
                  rpe: '',
                  sets_target: exercise.sets_target,
                  reps_target: exercise.reps_target,
                  rpe_target: exercise.rpe_target,
                },
              ],
            }
          : exercise
      )
    )
    touchDirty()
  }, [successMessage, markDirty])

  const removeSet = useCallback((exerciseIndex, setIndex) => {
    setSessionExercises((current) =>
      current.map((exercise, exIndex) => {
        if (exIndex !== exerciseIndex) return exercise
        if (exercise.sets.length <= 1) return exercise

        return {
          ...exercise,
          sets: exercise.sets.filter((_, rowIndex) => rowIndex !== setIndex),
        }
      })
    )
    touchDirty()
  }, [successMessage, markDirty])

  const totalLoggedSets = useMemo(() => {
    return sessionExercises.reduce((sum, exercise) => {
      return (
        sum +
        exercise.sets.filter((setRow) => setRow.reps || setRow.weight || setRow.rpe).length
      )
    }, 0)
  }, [sessionExercises])

  const exerciseCount = sessionExercises.length

  async function handleSave() {
    if (!user?.id) return

    const rows = []
    let setOrder = 0

    sessionExercises.forEach((exercise) => {
      exercise.sets.forEach((setRow) => {
        const hasData = setRow.reps || setRow.weight || setRow.rpe
        if (!hasData) return

        rows.push({
          exercise: exercise.exercise,
          reps: setRow.reps ? parseInt(setRow.reps, 10) : null,
          weight: setRow.weight ? parseFloat(setRow.weight) : null,
          rpe: setRow.rpe ? parseFloat(setRow.rpe) : null,
          set_order: setOrder,
        })

        setOrder += 1
      })
    })

    if (!rows.length) {
      setErrorMessage('Saisis au moins une série avant de sauvegarder.')
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const seanceType = assignment?.programs?.seance_type || 'Séance du jour'

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          date: today,
          seance_type: seanceType,
          notes: notes.trim() || null,
        })
        .select()
        .single()

      if (sessionError) {
        throw sessionError
      }

      const payload = rows.map((row) => ({
        ...row,
        session_id: session.id,
      }))

      const { error: setsError } = await supabase
        .from('sets')
        .insert(payload)

      if (setsError) {
        throw setsError
      }

      setSuccessMessage('Séance enregistrée avec succès.')
      markClean?.()
      await loadTodaySession()
    } catch (error) {
      console.error('Erreur enregistrement séance du jour :', error)
      setErrorMessage("Impossible d'enregistrer la séance du jour.")
    } finally {
      setSaving(false)
    }
  }

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
                  : "Aucun programme assigné aujourd'hui."}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {assignment?.programs?.seance_type ? (
                <Badge>
                  {(SEANCE_ICONS[assignment.programs.seance_type] || '💪') +
                    ' ' +
                    assignment.programs.seance_type}
                </Badge>
              ) : (
                <Badge color={T.blue || '#5BA7FF'}>Séance non assignée</Badge>
              )}

              <Badge>{today}</Badge>
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

            <div style={{ color: T.textMid, fontSize: 14, lineHeight: 1.6 }}>
              Aucun programme ne t’a été assigné pour cette date.
            </div>

            <div style={{ marginTop: 16 }}>
              <Link to="/entrainement/libre" style={{ textDecoration: 'none' }}>
                <Btn>Démarrer une séance libre</Btn>
              </Link>
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
                  {exerciseCount}
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

              <Input
                label=""
                value={notes}
                onChange={(value) => {
                  setNotes(value)
                  touchDirty()
                }}
                placeholder="Ressenti, énergie, douleurs, remarques..."
              />
            </Card>

            <div style={{ display: 'grid', gap: 14 }}>
              {sessionExercises.map((exercise, index) => (
                <SessionExerciseCard
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
                onClick={loadTodaySession}
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
