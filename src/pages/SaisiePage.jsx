import { useEffect, useMemo, useState } from 'react'
import { useDirty } from '../components/DirtyContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Input, Btn, Badge, PageWrap } from '../components/UI'
import { SEANCES, SEANCE_ICONS, T } from '../lib/data'

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))]
}

export default function SaisiePage() {
  const { user } = useAuth()
  const { markDirty, markClean } = useDirty()

  const today = new Date().toISOString().split('T')[0]
  const seanceKeys = Object.keys(SEANCES)

  const allExercises = useMemo(() => {
    return uniq(Object.values(SEANCES).flat())
      .sort((a, b) => a.localeCompare(b, 'fr'))
  }, [])

  const [date, setDate] = useState(today)
  const [seance, setSeance] = useState(seanceKeys[0] || '')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState(null)

  const [exerciseSearch, setExerciseSearch] = useState('')
  const [libraryMode, setLibraryMode] = useState('all') // all | session

  const defaultExercise = SEANCES[seance]?.[0] || allExercises[0] || ''

  const [sets, setSets] = useState([
    { exercise: defaultExercise, reps: '', weight: '', rpe: '' },
  ])

  useEffect(() => {
    if (!sets.length) {
      setSets([{ exercise: defaultExercise, reps: '', weight: '', rpe: '' }])
    }
  }, [defaultExercise, sets.length])

  const sessionExercises = useMemo(() => {
    return SEANCES[seance] || []
  }, [seance])

  const libraryExercises = useMemo(() => {
    const source = libraryMode === 'session' ? sessionExercises : allExercises
    const q = exerciseSearch.trim().toLowerCase()

    if (!q) return source

    return source.filter((exercise) =>
      String(exercise).toLowerCase().includes(q)
    )
  }, [allExercises, sessionExercises, libraryMode, exerciseSearch])

  function touchDirty() {
    markDirty?.()
    if (status) setStatus(null)
  }

  function addSet(exerciseName = '') {
    const nextExercise = exerciseName || defaultExercise
    setSets((prev) => [
      ...prev,
      { exercise: nextExercise, reps: '', weight: '', rpe: '' },
    ])
    touchDirty()
  }

  function removeSet(index) {
    setSets((prev) => {
      const next = prev.filter((_, idx) => idx !== index)
      return next.length
        ? next
        : [{ exercise: defaultExercise, reps: '', weight: '', rpe: '' }]
    })
    touchDirty()
  }

  function updateSet(index, field, value) {
    setSets((prev) =>
      prev.map((setRow, idx) =>
        idx === index ? { ...setRow, [field]: value } : setRow
      )
    )
    touchDirty()
  }

  function changeSeance(nextSeance) {
    setSeance(nextSeance)
    const nextDefault = SEANCES[nextSeance]?.[0] || allExercises[0] || ''
    setSets([{ exercise: nextDefault, reps: '', weight: '', rpe: '' }])
    setExerciseSearch('')
    touchDirty()
  }

  async function handleSave() {
    if (!user?.id) {
      setStatus('error')
      return
    }

    const valid = sets.filter((setRow) => setRow.exercise && (setRow.reps || setRow.weight))

    if (!valid.length) {
      window.alert('Ajoute au moins une série avec un exercice et des données.')
      return
    }

    setStatus('saving')

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        date,
        seance_type: seance,
        notes: notes || null,
      })
      .select()
      .single()

    if (sessionError) {
      console.error(sessionError)
      setStatus('error')
      return
    }

    const payload = valid.map((setRow, index) => ({
      session_id: session.id,
      exercise: setRow.exercise,
      reps: setRow.reps ? parseInt(setRow.reps, 10) : null,
      weight: setRow.weight ? parseFloat(setRow.weight) : null,
      rpe: setRow.rpe ? parseFloat(setRow.rpe) : null,
      set_order: index,
    }))

    const { error: setsError } = await supabase.from('sets').insert(payload)

    if (setsError) {
      console.error(setsError)
      setStatus('error')
      return
    }

    setStatus('saved')
    markClean?.()
    setSets([{ exercise: defaultExercise, reps: '', weight: '', rpe: '' }])
    setNotes('')
    setExerciseSearch('')
    setTimeout(() => setStatus(null), 3000)
  }

  return (
    <PageWrap>
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 900,
            fontSize: 36,
            letterSpacing: 2,
            color: T.text,
            lineHeight: 1,
          }}
        >
          NOUVELLE SÉANCE
        </div>

        <div
          style={{
            fontFamily: T.fontBody,
            fontSize: 14,
            color: T.textMid,
            marginTop: 6,
          }}
        >
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {seanceKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => changeSeance(key)}
            style={{
              background: seance === key ? T.accentGlow : T.card,
              border: `1px solid ${seance === key ? T.accent + '55' : T.border}`,
              borderRadius: T.radiusLg,
              padding: '14px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all .2s',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>
              {SEANCE_ICONS[key] || '💪'}
            </div>

            <div
              style={{
                fontFamily: T.fontDisplay,
                fontWeight: 800,
                fontSize: 12,
                color: seance === key ? T.accent : T.text,
                letterSpacing: 0.5,
              }}
            >
              {key}
            </div>
          </button>
        ))}
      </div>

      <Card>
        <Label>Détails</Label>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 16,
          }}
        >
          <Input
            label="Date"
            value={date}
            onChange={(value) => {
              setDate(value)
              touchDirty()
            }}
            type="date"
          />

          <Input
            label="Notes"
            value={notes}
            onChange={(value) => {
              setNotes(value)
              touchDirty()
            }}
            placeholder="Ressenti, douleurs, contexte..."
          />
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) 320px',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Card>
          <Label>Séries effectuées</Label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2.2fr 0.8fr 1fr 0.8fr 32px',
              gap: 8,
              marginBottom: 10,
              padding: '0 2px',
            }}
          >
            {['Exercice', 'Rép.', 'Charge kg', 'RPE'].map((header) => (
              <div
                key={header}
                style={{
                  fontFamily: T.fontDisplay,
                  fontWeight: 700,
                  fontSize: 9,
                  letterSpacing: 2,
                  color: T.textDim,
                  textTransform: 'uppercase',
                }}
              >
                {header}
              </div>
            ))}
            <div />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sets.map((setRow, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.2fr 0.8fr 1fr 0.8fr 32px',
                  gap: 8,
                  alignItems: 'end',
                  padding: '10px 12px',
                  background: T.surface,
                  borderRadius: T.radiusSm,
                  border: `1px solid ${T.border}`,
                }}
              >
                <label style={{ display: 'grid', gap: 8 }}>
                  <span
                    style={{
                      color: T.textSub || T.textDim,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    &nbsp;
                  </span>

                  <select
                    value={setRow.exercise}
                    onChange={(e) => updateSet(index, 'exercise', e.target.value)}
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                      background: T.surface,
                      color: T.text,
                      padding: '0 14px',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      width: '100%',
                    }}
                  >
                    {allExercises.map((exercise) => (
                      <option key={exercise} value={exercise}>
                        {exercise}
                      </option>
                    ))}
                  </select>
                </label>

                <Input
                  label=""
                  value={setRow.reps}
                  onChange={(value) => updateSet(index, 'reps', value)}
                  type="number"
                  placeholder="10"
                  min="0"
                />

                <Input
                  label=""
                  value={setRow.weight}
                  onChange={(value) => updateSet(index, 'weight', value)}
                  type="number"
                  placeholder="60"
                  min="0"
                  step="0.5"
                />

                <Input
                  label=""
                  value={setRow.rpe}
                  onChange={(value) => updateSet(index, 'rpe', value)}
                  type="number"
                  placeholder="8"
                  min="1"
                  step="0.5"
                />

                <button
                  type="button"
                  onClick={() => removeSet(index)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radiusSm,
                    color: T.textDim,
                    cursor: 'pointer',
                    width: 32,
                    height: 38,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 18,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => addSet()}
              style={{
                background: 'transparent',
                border: `1px dashed ${T.accent}44`,
                borderRadius: T.radiusSm,
                color: T.accent,
                padding: '9px 18px',
                fontFamily: T.fontDisplay,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              + Ajouter une série
            </button>

            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              {status === 'saved' ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    color: T.accent,
                    fontFamily: T.fontDisplay,
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: 1,
                  }}
                >
                  <span style={{ fontSize: 16 }}>✓</span> Séance enregistrée
                </div>
              ) : null}

              {status === 'error' ? (
                <div
                  style={{
                    color: T.danger,
                    fontFamily: T.fontDisplay,
                    fontSize: 12,
                  }}
                >
                  Erreur — vérifie ta connexion
                </div>
              ) : null}

              <Btn onClick={handleSave} disabled={status === 'saving'}>
                {status === 'saving' ? 'Enregistrement...' : 'Enregistrer'}
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <Label>Bibliothèque d’exercices</Label>

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setLibraryMode('all')}
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: `1px solid ${libraryMode === 'all' ? T.accent + '40' : T.border}`,
                  background:
                    libraryMode === 'all'
                      ? 'rgba(45,255,155,0.10)'
                      : 'rgba(255,255,255,0.03)',
                  color: libraryMode === 'all' ? T.accentLight : T.textMid,
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                Toute la bibliothèque
              </button>

              <button
                type="button"
                onClick={() => setLibraryMode('session')}
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: `1px solid ${libraryMode === 'session' ? T.accent + '40' : T.border}`,
                  background:
                    libraryMode === 'session'
                      ? 'rgba(45,255,155,0.10)'
                      : 'rgba(255,255,255,0.03)',
                  color: libraryMode === 'session' ? T.accentLight : T.textMid,
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                Exos de la séance
              </button>
            </div>

            <Input
              label="Rechercher un exercice"
              value={exerciseSearch}
              onChange={setExerciseSearch}
              placeholder="Développé couché, squat, rowing..."
            />

            <div
              style={{
                maxHeight: 460,
                overflowY: 'auto',
                display: 'grid',
                gap: 8,
                paddingRight: 4,
              }}
            >
              {libraryExercises.length === 0 ? (
                <div
                  style={{
                    color: T.textDim,
                    fontSize: 13,
                    padding: '8px 2px',
                  }}
                >
                  Aucun exercice trouvé.
                </div>
              ) : (
                libraryExercises.map((exercise) => (
                  <button
                    key={exercise}
                    type="button"
                    onClick={() => addSet(exercise)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '11px 12px',
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                      background: 'rgba(255,255,255,0.03)',
                      color: T.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{exercise}</span>
                    <Badge>Ajouter</Badge>
                  </button>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </PageWrap>
  )
}
