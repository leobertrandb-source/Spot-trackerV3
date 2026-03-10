import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Input, Select, Btn, Badge, PageWrap } from '../components/UI'
import { SEANCES, ALL_EXERCISES, SEANCE_ICONS, T } from '../lib/data'

function ExoLibrary({ onAdd }) {
  const [search, setSearch] = useState('')

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ALL_EXERCISES
    return ALL_EXERCISES.filter((exercise) =>
      exercise.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Input
        label="Rechercher un exercice"
        value={search}
        onChange={setSearch}
        placeholder="Développé, squat, curl..."
      />

      <div
        style={{
          display: 'grid',
          gap: 8,
          maxHeight: 360,
          overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {filteredExercises.map((exercise) => (
          <button
            key={exercise}
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('exercise', exercise)}
            onClick={() => onAdd(exercise)}
            style={{
              padding: '10px 12px',
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              fontSize: 13,
              color: T.textMid,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: T.accentDim, fontSize: 11 }}>＋</span>
            <span>{exercise}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ExerciseRow({ exercise, index, onChange, onRemove }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) 110px 120px 110px 44px',
        gap: 8,
        alignItems: 'end',
        padding: '10px 12px',
        borderRadius: 14,
        border: `1px solid ${T.border}`,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <div>
        <div
          style={{
            color: T.text,
            fontWeight: 800,
            fontSize: 14,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {exercise.exercise}
        </div>
      </div>

      <Input
        label=""
        value={exercise.sets_target ?? ''}
        onChange={(value) => onChange(index, 'sets_target', value)}
        type="number"
        min="1"
        placeholder="4"
      />

      <Input
        label=""
        value={exercise.reps_target ?? ''}
        onChange={(value) => onChange(index, 'reps_target', value)}
        placeholder="8-10"
      />

      <Input
        label=""
        value={exercise.rpe_target ?? ''}
        onChange={(value) => onChange(index, 'rpe_target', value)}
        type="number"
        min="1"
        step="0.5"
        placeholder="8"
      />

      <button
        type="button"
        onClick={() => onRemove(index)}
        style={{
          height: 48,
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: 'transparent',
          color: T.textDim,
          cursor: 'pointer',
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        ×
      </button>
    </div>
  )
}

function ProgramCard({ program, onDelete }) {
  const exercises = program.program_exercises || []

  return (
    <Card style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 18 }}>
              {SEANCE_ICONS[program.seance_type] || '📋'}
            </div>

            <div
              style={{
                color: T.text,
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              {program.name || 'Programme'}
            </div>

            <Badge>{program.seance_type || 'Séance'}</Badge>
          </div>

          <div
            style={{
              color: T.textDim,
              fontSize: 13,
              marginTop: 8,
            }}
          >
            {exercises.length} exercice{exercises.length > 1 ? 's' : ''}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(program.id)}
          style={{
            height: 40,
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            background: 'transparent',
            color: T.danger,
            cursor: 'pointer',
            fontWeight: 800,
            padding: '0 12px',
          }}
        >
          Supprimer
        </button>
      </div>

      {exercises.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gap: 8,
            marginTop: 14,
          }}
        >
          {exercises
            .slice()
            .sort((a, b) => Number(a.exercise_order || 0) - Number(b.exercise_order || 0))
            .map((exerciseRow) => (
              <div
                key={exerciseRow.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${T.border}`,
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    color: T.text,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {exerciseRow.exercise}
                </div>

                <div
                  style={{
                    color: T.textDim,
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {exerciseRow.sets_target || '—'} séries • {exerciseRow.reps_target || '—'} reps
                  {exerciseRow.rpe_target ? ` • RPE ${exerciseRow.rpe_target}` : ''}
                </div>
              </div>
            ))}
        </div>
      ) : null}
    </Card>
  )
}

export default function ProgramBuilderPage() {
  const { user } = useAuth()

  const [athletes, setAthletes] = useState([])
  const [programs, setPrograms] = useState([])
  const [assignments, setAssignments] = useState([])

  const [progName, setProgName] = useState('')
  const [progType, setProgType] = useState(Object.keys(SEANCES)[0] || '')
  const [exercises, setExercises] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)

  const [assignProgram, setAssignProgram] = useState('')
  const [assignAthlete, setAssignAthlete] = useState('')
  const [assignDate, setAssignDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [assignNote, setAssignNote] = useState('')

  const [loading, setLoading] = useState(true)
  const [savingProgram, setSavingProgram] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadAll = useCallback(async () => {
    if (!user?.id) {
      setAthletes([])
      setPrograms([])
      setAssignments([])
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const [{ data: athletesData, error: athletesError }, { data: programsData, error: programsError }, { data: assignmentsData, error: assignmentsError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'athlete')
            .order('full_name', { ascending: true }),

          supabase
            .from('programs')
            .select('*, program_exercises(*)')
            .eq('coach_id', user.id)
            .order('created_at', { ascending: false }),

          supabase
            .from('assignments')
            .select('*, programs(name, seance_type), profiles(full_name, email)')
            .order('assigned_date', { ascending: false })
            .limit(20),
        ])

      if (athletesError) throw athletesError
      if (programsError) throw programsError
      if (assignmentsError) throw assignmentsError

      const nextAthletes = athletesData || []
      const nextPrograms = programsData || []
      const nextAssignments = assignmentsData || []

      setAthletes(nextAthletes)
      setPrograms(nextPrograms)
      setAssignments(nextAssignments)

      if (!assignProgram && nextPrograms.length > 0) {
        setAssignProgram(nextPrograms[0].id)
      }

      if (!assignAthlete && nextAthletes.length > 0) {
        setAssignAthlete(nextAthletes[0].id)
      }
    } catch (error) {
      console.error('Erreur chargement programmes :', error)
      setErrorMessage("Impossible de charger les programmes pour le moment.")
    } finally {
      setLoading(false)
    }
  }, [user?.id, assignProgram, assignAthlete])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const addExercise = useCallback((name) => {
    setExercises((current) => [
      ...current,
      {
        exercise: name,
        sets_target: '',
        reps_target: '',
        rpe_target: '',
        exercise_order: current.length,
      },
    ])
  }, [])

  const updateExercise = useCallback((index, field, value) => {
    setExercises((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    )
  }, [])

  const removeExercise = useCallback((index) => {
    setExercises((current) =>
      current
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({
          ...item,
          exercise_order: itemIndex,
        }))
    )
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragOver(false)
      const name = e.dataTransfer.getData('exercise')
      if (name) addExercise(name)
    },
    [addExercise]
  )

  const saveProgram = useCallback(async () => {
    const cleanName = progName.trim()

    if (!user?.id) return
    if (!cleanName || exercises.length === 0) {
      setErrorMessage('Ajoute un nom de programme et au moins un exercice.')
      return
    }

    setSavingProgram(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data: createdProgram, error: programError } = await supabase
        .from('programs')
        .insert({
          coach_id: user.id,
          name: cleanName,
          seance_type: progType,
        })
        .select()
        .single()

      if (programError) throw programError

      const exerciseRows = exercises.map((exercise, index) => ({
        program_id: createdProgram.id,
        exercise: exercise.exercise,
        sets_target: exercise.sets_target ? parseInt(exercise.sets_target, 10) : null,
        reps_target: exercise.reps_target || null,
        rpe_target: exercise.rpe_target ? parseFloat(exercise.rpe_target) : null,
        exercise_order: index,
      }))

      const { error: exercisesError } = await supabase
        .from('program_exercises')
        .insert(exerciseRows)

      if (exercisesError) throw exercisesError

      setProgName('')
      setExercises([])
      setSuccessMessage('Programme créé avec succès.')
      await loadAll()
    } catch (error) {
      console.error('Erreur création programme :', error)
      setErrorMessage(error.message || 'Impossible de créer le programme.')
    } finally {
      setSavingProgram(false)
    }
  }, [user?.id, progName, progType, exercises, loadAll])

  const saveAssignment = useCallback(async () => {
    if (!assignProgram || !assignAthlete || !assignDate) {
      setErrorMessage("Sélectionne un programme, un athlète et une date.")
      return
    }

    setAssigning(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error } = await supabase.from('assignments').insert({
        program_id: assignProgram,
        athlete_id: assignAthlete,
        assigned_date: assignDate,
        note: assignNote.trim() || null,
      })

      if (error) throw error

      setAssignNote('')
      setSuccessMessage('Programme assigné avec succès.')
      await loadAll()
    } catch (error) {
      console.error('Erreur assignation programme :', error)
      setErrorMessage(error.message || "Impossible d'assigner le programme.")
    } finally {
      setAssigning(false)
    }
  }, [assignProgram, assignAthlete, assignDate, assignNote, loadAll])

  const deleteProgram = useCallback(
    async (id) => {
      if (!window.confirm('Supprimer ce programme ?')) return

      setErrorMessage('')
      setSuccessMessage('')

      try {
        const { error } = await supabase.from('programs').delete().eq('id', id)
        if (error) throw error
        setSuccessMessage('Programme supprimé.')
        await loadAll()
      } catch (error) {
        console.error('Erreur suppression programme :', error)
        setErrorMessage(error.message || 'Impossible de supprimer le programme.')
      }
    },
    [loadAll]
  )

  const deleteAssignment = useCallback(
    async (id) => {
      if (!window.confirm('Supprimer cette assignation ?')) return

      setErrorMessage('')
      setSuccessMessage('')

      try {
        const { error } = await supabase.from('assignments').delete().eq('id', id)
        if (error) throw error
        setSuccessMessage('Assignation supprimée.')
        await loadAll()
      } catch (error) {
        console.error('Erreur suppression assignation :', error)
        setErrorMessage(error.message || "Impossible de supprimer l'assignation.")
      }
    },
    [loadAll]
  )

  const programTypeOptions = useMemo(() => {
    return Object.keys(SEANCES).map((key) => ({
      value: key,
      label: key,
    }))
  }, [])

  const athleteOptions = useMemo(() => {
    return athletes.map((athlete) => ({
      value: athlete.id,
      label: athlete.full_name || athlete.email || 'Athlète',
    }))
  }, [athletes])

  const programOptions = useMemo(() => {
    return programs.map((program) => ({
      value: program.id,
      label: program.name || 'Programme',
    }))
  }, [programs])

  return (
    <PageWrap>
      <div
        style={{
          maxWidth: 1240,
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
            Programmes coach
          </div>

          <div
            style={{
              color: T.text,
              fontFamily: T.fontDisplay,
              fontWeight: 900,
              fontSize: 30,
              lineHeight: 1,
            }}
          >
            CONSTRUCTEUR DE PROGRAMMES
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.65,
              marginTop: 10,
            }}
          >
            Crée des programmes et assigne-les à tes athlètes.
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <Card style={{ padding: 20 }}>
            <Label>Nouveau programme</Label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 280px)',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <Input
                label="Nom du programme"
                value={progName}
                onChange={setProgName}
                placeholder="Ex : Pecs Force S1"
              />

              <Select
                label="Type de séance"
                value={progType}
                onChange={setProgType}
                options={programTypeOptions}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 320px',
                gap: 18,
                alignItems: 'start',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.6fr) 110px 120px 110px 44px',
                    gap: 8,
                    marginBottom: 8,
                    padding: '0 2px',
                  }}
                >
                  {['Exercice', 'Séries', 'Rép.', 'RPE', ''].map((label) => (
                    <div
                      key={label}
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                        color: T.textDim,
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    minHeight: 160,
                    borderRadius: 16,
                    border: `2px dashed ${isDragOver ? T.accent : T.border}`,
                    background: isDragOver ? T.accentGlow : 'transparent',
                    padding: exercises.length > 0 ? 8 : 24,
                    display: 'grid',
                    gap: 8,
                    transition: 'all .2s ease',
                  }}
                >
                  {exercises.length === 0 ? (
                    <div
                      style={{
                        color: T.textDim,
                        fontSize: 13,
                        textAlign: 'center',
                        alignSelf: 'center',
                      }}
                    >
                      Glisse des exercices ici ou clique dans la bibliothèque.
                    </div>
                  ) : (
                    exercises.map((exercise, index) => (
                      <ExerciseRow
                        key={`${exercise.exercise}-${index}`}
                        exercise={exercise}
                        index={index}
                        onChange={updateExercise}
                        onRemove={removeExercise}
                      />
                    ))
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: 16,
                  }}
                >
                  <Btn onClick={saveProgram} disabled={savingProgram}>
                    {savingProgram ? 'Création...' : 'Créer le programme'}
                  </Btn>
                </div>
              </div>

              <div>
                <div
                  style={{
                    color: T.text,
                    fontWeight: 800,
                    fontSize: 16,
                    marginBottom: 10,
                  }}
                >
                  Bibliothèque d’exercices
                </div>

                <ExoLibrary onAdd={addExercise} />
              </div>
            </div>
          </Card>

          <Card style={{ padding: 20 }}>
            <Label>Assigner un programme</Label>

            <div style={{ display: 'grid', gap: 12 }}>
              <Select
                label="Programme"
                value={assignProgram}
                onChange={setAssignProgram}
                options={programOptions}
              />

              <Select
                label="Athlète"
                value={assignAthlete}
                onChange={setAssignAthlete}
                options={athleteOptions}
              />

              <Input
                label="Date d'assignation"
                type="date"
                value={assignDate}
                onChange={setAssignDate}
              />

              <Input
                label="Note"
                value={assignNote}
                onChange={setAssignNote}
                placeholder="Consignes pour l’athlète"
              />

              <Btn
                onClick={saveAssignment}
                disabled={
                  assigning ||
                  !assignProgram ||
                  !assignAthlete ||
                  !assignDate
                }
              >
                {assigning ? 'Assignation...' : 'Assigner le programme'}
              </Btn>
            </div>
          </Card>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <Card style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                marginBottom: 14,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  color: T.text,
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                Programmes enregistrés
              </div>

              <button
                type="button"
                onClick={loadAll}
                disabled={loading}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: 'rgba(255,255,255,0.03)',
                  color: T.text,
                  cursor: loading ? 'default' : 'pointer',
                  padding: '0 12px',
                  fontWeight: 800,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Chargement...' : 'Rafraîchir'}
              </button>
            </div>

            {loading ? (
              <div style={{ color: T.textDim, fontSize: 14 }}>
                Chargement des programmes...
              </div>
            ) : programs.length === 0 ? (
              <div style={{ color: T.textMid, fontSize: 14 }}>
                Aucun programme enregistré pour le moment.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {programs.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onDelete={deleteProgram}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card style={{ padding: 20 }}>
            <div
              style={{
                color: T.text,
                fontWeight: 900,
                fontSize: 18,
                marginBottom: 14,
              }}
            >
              Dernières assignations
            </div>

            {loading ? (
              <div style={{ color: T.textDim, fontSize: 14 }}>
                Chargement des assignations...
              </div>
            ) : assignments.length === 0 ? (
              <div style={{ color: T.textMid, fontSize: 14 }}>
                Aucune assignation récente.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                      background: 'rgba(255,255,255,0.03)',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: T.text,
                            fontWeight: 800,
                            fontSize: 14,
                          }}
                        >
                          {assignment.programs?.name || 'Programme'}
                        </div>

                        <div
                          style={{
                            color: T.textDim,
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          Pour {assignment.profiles?.full_name || assignment.profiles?.email || 'Athlète'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteAssignment(assignment.id)}
                        style={{
                          height: 34,
                          borderRadius: 10,
                          border: `1px solid ${T.border}`,
                          background: 'transparent',
                          color: T.danger,
                          cursor: 'pointer',
                          padding: '0 10px',
                          fontWeight: 800,
                        }}
                      >
                        Supprimer
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      {assignment.programs?.seance_type ? (
                        <Badge>{assignment.programs.seance_type}</Badge>
                      ) : null}

                      <div
                        style={{
                          color: T.textDim,
                          fontSize: 12,
                        }}
                      >
                        Assigné le {assignment.assigned_date || '—'}
                      </div>
                    </div>

                    {assignment.note ? (
                      <div
                        style={{
                          color: T.textMid,
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        Note : {assignment.note}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageWrap>
  )
}
