import { useState, useEffect } from 'react'
import { useDirty } from '../components/DirtyContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Input, Btn, Badge, PageWrap } from '../components/UI'
import { SEANCE_ICONS, T } from '../lib/data'

// ── Helpers assistant progression ─────────────────────────────────
function roundToNearestStep(value, step = 2.5) {
  if (!value || Number.isNaN(Number(value))) return 0
  return Math.round(Number(value) / step) * step
}

function estimate1RM(weight, reps) {
  const w = Number(weight || 0)
  const r = Number(reps || 0)

  if (!w || !r) return 0
  return w * (1 + r / 30)
}

function getSuggestedWeight(lastWeight, repsArray, targetReps) {
  const weight = Number(lastWeight || 0)
  const reps = (repsArray || []).map((r) => Number(r || 0)).filter(Boolean)
  const target = Number(targetReps || 0)

  if (!weight || !reps.length || !target) return null

  const success = reps.every((r) => r >= target)
  const successCount = reps.filter((r) => r >= target).length
  const almost = successCount >= reps.length - 1

  if (success) {
    return {
      weight: roundToNearestStep(weight + 2.5),
      status: 'increase',
      label: 'Progression validée',
    }
  }

  if (almost) {
    return {
      weight: roundToNearestStep(weight),
      status: 'repeat',
      label: 'Encore une validation',
    }
  }

  return {
    weight: roundToNearestStep(weight * 0.95),
    status: 'reduce',
    label: 'Charge à alléger',
  }
}

function getPotentialMeta(suggestedWeight, bestWeight) {
  const suggested = Number(suggestedWeight || 0)
  const best = Number(bestWeight || 0)

  if (!suggested) {
    return {
      title: 'Progression en cours',
      color: T.textSub,
      textColor: T.text,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    }
  }

  if (suggested > best) {
    return {
      title: '🏆 Record de charge possible',
      color: '#FFD76A',
      textColor: '#FFE7A6',
      background: 'rgba(255,215,0,0.08)',
      border: '1px solid rgba(255,215,0,0.28)',
    }
  }

  if (suggested === best) {
    return {
      title: 'Validation du niveau actuel',
      color: T.accentLight,
      textColor: T.text,
      background: 'rgba(45,255,155,0.08)',
      border: `1px solid ${T.accent + '26'}`,
    }
  }

  return {
    title: 'Séance de consolidation',
    color: T.textSub,
    textColor: T.text,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  }
}

async function fetchExerciseHistory(supabaseClient, userId, exerciseName) {
  const { data, error } = await supabaseClient
    .from('sets')
    .select(`
      reps,
      weight,
      rpe,
      set_order,
      session_id,
      sessions!inner (
        id,
        user_id,
        date
      )
    `)
    .eq('sessions.user_id', userId)
    .eq('exercise', exerciseName)
    .order('date', { foreignTable: 'sessions', ascending: false })
    .order('set_order', { ascending: true })

  if (error) {
    console.error(`Erreur récupération historique pour ${exerciseName}:`, error)
    return null
  }

  const rows = data || []
  if (!rows.length) return null

  const latestSessionId = rows[0].session_id
  const latestRows = rows.filter((row) => row.session_id === latestSessionId)

  const allTimeBestWeight = rows.reduce((max, row) => {
    const w = Number(row.weight || 0)
    return w > max ? w : max
  }, 0)

  const allTimeBest1RM = rows.reduce((max, row) => {
    const value = estimate1RM(row.weight, row.reps)
    return value > max ? value : max
  }, 0)

  const lastWeight = Number(latestRows[0]?.weight || 0)
  const repsArray = latestRows.map((row) => Number(row.reps || 0))
  const last1RM = latestRows.reduce((max, row) => {
    const value = estimate1RM(row.weight, row.reps)
    return value > max ? value : max
  }, 0)

  return {
    date: latestRows[0]?.sessions?.date || null,
    lastWeight,
    repsArray,
    last1RM,
    allTimeBestWeight,
    allTimeBest1RM,
  }
}

// ── Bibliothèque latérale pour l'athlète ──────────────────────────
function ExoLibrary({ onAdd, isMobile = false }) {
  const [search, setSearch] = useState('')
  const [libraryExercises, setLibraryExercises] = useState([])
  const [loadingLibrary, setLoadingLibrary] = useState(true)
  const [libraryError, setLibraryError] = useState('')
  const [selectedExercise, setSelectedExercise] = useState(null)

  useEffect(() => {
    loadExercises()
  }, [])

  async function loadExercises() {
    setLoadingLibrary(true)
    setLibraryError('')

    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erreur chargement exercices:', error)
      setLibraryError("Impossible de charger les exercices.")
      setLoadingLibrary(false)
      return
    }

    const loaded = data || []
    setLibraryExercises(loaded)

    if (loaded.length && !selectedExercise) {
      setSelectedExercise(loaded[0])
    }

    setLoadingLibrary(false)
  }

  const filtered = libraryExercises.filter((e) =>
    e.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Input
        label="Ajouter un exercice"
        value={search}
        onChange={setSearch}
        placeholder="Rechercher..."
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: isMobile ? 260 : 320,
          overflowY: 'auto',
        }}
      >
        {loadingLibrary ? (
          <div
            style={{
              padding: '8px 4px',
              color: T.textDim,
              fontSize: 12,
            }}
          >
            Chargement...
          </div>
        ) : libraryError ? (
          <div
            style={{
              padding: '8px 4px',
              color: T.danger,
              fontSize: 12,
            }}
          >
            {libraryError}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: '8px 4px',
              color: T.textDim,
              fontSize: 12,
            }}
          >
            Aucun exercice trouvé.
          </div>
        ) : (
          filtered.map((exo) => {
            const isSelected = selectedExercise?.id === exo.id

            return (
              <div
                key={exo.id}
                draggable={!isMobile}
                onDragStart={(e) => e.dataTransfer.setData('exercise', exo.name)}
                onClick={() => setSelectedExercise(exo)}
                style={{
                  padding: isMobile ? '9px 10px' : '8px 10px',
                  background: isSelected ? T.accentGlow : T.surface,
                  border: `1px solid ${isSelected ? T.accent : T.border}`,
                  borderRadius: T.radiusSm,
                  fontSize: 12,
                  color: T.textMid,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all .15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = T.accent
                    e.currentTarget.style.color = T.text
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = T.border
                    e.currentTarget.style.color = T.textMid
                  }
                }}
              >
                <div
                  style={{
                    width: isMobile ? 46 : 42,
                    height: isMobile ? 46 : 42,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: exo.image_url
                      ? `url("${exo.image_url}") center/cover no-repeat`
                      : 'linear-gradient(135deg, rgba(30,40,34,0.96), rgba(10,14,12,0.98))',
                    border: `1px solid ${T.border}`,
                  }}
                />

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      color: T.text,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {exo.name}
                  </div>

                  <div
                    style={{
                      color: T.textDim,
                      fontSize: 11,
                      marginTop: 3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {exo.muscle_group || '—'} • {exo.equipment || '—'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAdd(exo.name)
                  }}
                  style={{
                    background: T.accent,
                    border: 'none',
                    borderRadius: 8,
                    width: isMobile ? 28 : 24,
                    height: isMobile ? 28 : 24,
                    color: '#fff',
                    fontWeight: 900,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title="Ajouter à la séance"
                >
                  +
                </button>
              </div>
            )
          })
        )}
      </div>

      {selectedExercise && (
        <Card style={{ marginTop: 12, padding: isMobile ? 12 : 14 }}>
          <div
            style={{
              height: isMobile ? 130 : 150,
              borderRadius: 12,
              marginBottom: 12,
              background: selectedExercise.image_url
                ? `url("${selectedExercise.image_url}") center/cover no-repeat`
                : 'linear-gradient(135deg, rgba(30,40,34,0.96), rgba(10,14,12,0.98))',
              border: `1px solid ${T.border}`,
            }}
          />

          <div
            style={{
              color: T.text,
              fontWeight: 800,
              fontSize: isMobile ? 15 : 16,
              lineHeight: 1.3,
            }}
          >
            {selectedExercise.name}
          </div>

          <div
            style={{
              fontSize: 12,
              color: T.textDim,
              marginTop: 5,
              lineHeight: 1.5,
            }}
          >
            {selectedExercise.muscle_group || '—'} • {selectedExercise.equipment || '—'} •{' '}
            {selectedExercise.level || '—'}
          </div>

          {selectedExercise.description && (
            <div
              style={{
                fontSize: 13,
                marginTop: 12,
                color: T.textMid,
                lineHeight: 1.65,
              }}
            >
              {selectedExercise.description}
            </div>
          )}

          {selectedExercise.instructions?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  color: T.text,
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                Exécution
              </div>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  color: T.textMid,
                  fontSize: 13,
                  lineHeight: 1.65,
                }}
              >
                {selectedExercise.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedExercise.tips?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  color: T.text,
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                Conseils
              </div>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  color: T.textMid,
                  fontSize: 13,
                  lineHeight: 1.65,
                }}
              >
                {selectedExercise.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <Btn onClick={() => onAdd(selectedExercise.name)}>
              Ajouter à la séance
            </Btn>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Bloc d'un exercice avec assistant ─────────────────────────────
function ExerciseBlock({
  exo,
  suggestionData,
  onRemove,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onApplySuggestedWeight,
  isMobile = false,
}) {
  const gridColumns = isMobile ? '34px 1fr 1fr 1fr 24px' : '40px 1fr 1fr 1fr 28px'
  const suggestion = suggestionData?.suggestion || null
  const history = suggestionData?.history || null
  const potentialMeta = history
    ? getPotentialMeta(suggestion?.weight, history.allTimeBestWeight)
    : null

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        overflow: 'hidden',
        transition: 'border-color .2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = T.borderHi
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.border
      }}
    >
      <div
        style={{
          padding: isMobile ? '10px 12px' : '11px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: T.accent, fontSize: 10 }}>▸</span>

          <div
            style={{
              fontFamily: T.fontDisplay,
              fontWeight: 800,
              fontSize: isMobile ? 13 : 14,
              color: T.text,
              minWidth: 0,
            }}
          >
            {exo.exercise}
          </div>

          {exo.sets_target && (
            <Badge color={T.accent}>
              {exo.sets_target}×{exo.reps_target || '?'}
              {exo.rpe_target ? ` @RPE${exo.rpe_target}` : ''}
            </Badge>
          )}
        </div>

        <button
          onClick={onRemove}
          style={{
            background: 'transparent',
            border: 'none',
            color: T.textDim,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '2px 6px',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = T.danger
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = T.textDim
          }}
        >
          ×
        </button>
      </div>

      {history ? (
        <div
          style={{
            padding: isMobile ? '10px 10px 0' : '10px 14px 0',
            display: 'grid',
            gap: 8,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                color: T.textSub,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Dernière séance
            </div>

            <div
              style={{
                color: T.textMid,
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {history.lastWeight ? `${history.lastWeight} kg` : 'Charge non renseignée'} —{' '}
              {history.repsArray.join(' / ')}
              {history.date ? ` • ${history.date}` : ''}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
              gap: 8,
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  color: T.textSub,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 5,
                }}
              >
                1RM estimé
              </div>
              <div style={{ color: T.text, fontWeight: 900, fontSize: 14 }}>
                {history.last1RM ? `${history.last1RM.toFixed(1)} kg` : '—'}
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  color: T.textSub,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 5,
                }}
              >
                Record charge
              </div>
              <div style={{ color: T.text, fontWeight: 900, fontSize: 14 }}>
                {history.allTimeBestWeight ? `${history.allTimeBestWeight.toFixed(1)} kg` : '—'}
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: potentialMeta?.background || 'rgba(255,255,255,0.03)',
                border: potentialMeta?.border || '1px solid rgba(255,255,255,0.06)',
                gridColumn: isMobile ? '1 / -1' : 'auto',
              }}
            >
              <div
                style={{
                  color: potentialMeta?.color || T.textSub,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 5,
                }}
              >
                Potentiel
              </div>
              <div
                style={{
                  color: potentialMeta?.textColor || T.text,
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                {potentialMeta?.title || 'Progression en cours'}
              </div>
            </div>
          </div>

          {suggestion ? (
            <div
              style={{
                padding: '12px 12px',
                borderRadius: 14,
                background: T.accentGlowSm,
                border: `1px solid ${T.accent + '22'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    color: T.accentLight,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 5,
                  }}
                >
                  Charge conseillée
                </div>

                <div style={{ color: T.text, fontSize: 16, fontWeight: 900 }}>
                  {suggestion.weight} kg
                </div>

                <div style={{ color: T.textMid, fontSize: 12, marginTop: 4 }}>
                  {suggestion.label}
                </div>
              </div>

              <button
                type="button"
                onClick={onApplySuggestedWeight}
                style={{
                  border: `1px solid ${T.accent + '30'}`,
                  background: 'rgba(45,255,155,0.10)',
                  color: T.accentLight,
                  borderRadius: 12,
                  padding: '9px 12px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                Appliquer la charge
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ padding: isMobile ? '10px 10px 12px' : '10px 14px 14px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridColumns,
            gap: 8,
            marginBottom: 8,
          }}
        >
          {['Série', 'Rép.', 'Charge kg', 'RPE'].map((h) => (
            <div
              key={h}
              style={{
                fontFamily: T.fontDisplay,
                fontWeight: 700,
                fontSize: isMobile ? 8 : 9,
                letterSpacing: 1.3,
                color: T.textDim,
                textTransform: 'uppercase',
              }}
            >
              {h}
            </div>
          ))}
          <div />
        </div>

        {exo.sets.map((set, si) => (
          <div
            key={si}
            style={{
              display: 'grid',
              gridTemplateColumns: gridColumns,
              gap: 8,
              marginBottom: 7,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontFamily: T.fontDisplay,
                fontWeight: 900,
                fontSize: isMobile ? 14 : 16,
                color: T.accentDim,
                textAlign: 'center',
              }}
            >
              {si + 1}
            </div>

            <Input
              label=""
              value={set.reps}
              onChange={(v) => onUpdateSet(si, 'reps', v)}
              type="number"
              placeholder={exo.reps_target || '10'}
              min="0"
            />

            <Input
              label=""
              value={set.weight}
              onChange={(v) => onUpdateSet(si, 'weight', v)}
              type="number"
              placeholder={
                suggestion?.weight && !set.weight ? String(suggestion.weight) : '60'
              }
              min="0"
              step="0.5"
            />

            <Input
              label=""
              value={set.rpe}
              onChange={(v) => onUpdateSet(si, 'rpe', v)}
              type="number"
              placeholder={exo.rpe_target || '8'}
              min="1"
              step="0.5"
            />

            <button
              onClick={() => onRemoveSet(si)}
              style={{
                background: 'transparent',
                border: 'none',
                color: T.textDim,
                cursor: 'pointer',
                fontSize: isMobile ? 13 : 14,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = T.danger
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = T.textDim
              }}
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={onAddSet}
          style={{
            background: 'transparent',
            border: `1px dashed ${T.accent}33`,
            borderRadius: T.radiusSm,
            color: T.accentDim,
            padding: isMobile ? '7px 12px' : '6px 14px',
            fontFamily: T.fontDisplay,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            cursor: 'pointer',
            marginTop: 4,
            transition: 'all .2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.accent
            e.currentTarget.style.color = T.accent
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.accent + '33'
            e.currentTarget.style.color = T.accentDim
          }}
        >
          + Série
        </button>
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
  const [exerciseSuggestions, setExerciseSuggestions] = useState({})
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)
  const { markDirty, markClean } = useDirty()

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (user?.id) {
      loadToday()
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !exercises.length) {
      setExerciseSuggestions({})
      return
    }

    loadSuggestions()
  }, [user?.id, exercises])

  async function loadToday() {
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

      const exos = (a.programs?.program_exercises || [])
        .sort((x, y) => x.exercise_order - y.exercise_order)
        .map((e) => ({
          exercise: e.exercise,
          sets_target: e.sets_target,
          reps_target: e.reps_target,
          rpe_target: e.rpe_target,
          sets: Array.from({ length: e.sets_target || 1 }, () => ({
            reps: '',
            weight: '',
            rpe: '',
          })),
        }))

      setExercises(exos)
      return
    }

    setExercises([])
  }

  async function loadSuggestions() {
    const nextSuggestions = {}

    for (const exo of exercises) {
      const history = await fetchExerciseHistory(supabase, user.id, exo.exercise)

      if (!history) {
        nextSuggestions[exo.exercise] = null
        continue
      }

      const suggestion = getSuggestedWeight(
        history.lastWeight,
        history.repsArray,
        exo.reps_target
      )

      nextSuggestions[exo.exercise] = {
        history,
        suggestion,
      }
    }

    setExerciseSuggestions(nextSuggestions)
  }

  function addExercise(name) {
    markDirty()
    setExercises((p) => [
      ...p,
      {
        exercise: name,
        sets_target: null,
        reps_target: null,
        rpe_target: null,
        sets: [{ reps: '', weight: '', rpe: '' }],
      },
    ])
  }

  function removeExercise(i) {
    setExercises((p) => p.filter((_, idx) => idx !== i))
  }

  function updateSet(exoIdx, setIdx, field, val) {
    markDirty()
    setExercises((p) =>
      p.map((e, ei) =>
        ei !== exoIdx
          ? e
          : {
              ...e,
              sets: e.sets.map((s, si) =>
                si !== setIdx ? s : { ...s, [field]: val }
              ),
            }
      )
    )
  }

  function addSet(exoIdx) {
    markDirty()
    setExercises((p) =>
      p.map((e, ei) =>
        ei !== exoIdx
          ? e
          : {
              ...e,
              sets: [...e.sets, { reps: '', weight: '', rpe: '' }],
            }
      )
    )
  }

  function removeSet(exoIdx, setIdx) {
    markDirty()
    setExercises((p) =>
      p.map((e, ei) =>
        ei !== exoIdx
          ? e
          : {
              ...e,
              sets: e.sets.filter((_, si) => si !== setIdx),
            }
      )
    )
  }

  function applySuggestedWeight(exoIdx) {
    const exo = exercises[exoIdx]
    const suggestion = exerciseSuggestions[exo.exercise]?.suggestion

    if (!suggestion?.weight) return

    markDirty()

    setExercises((prev) =>
      prev.map((item, index) =>
        index !== exoIdx
          ? item
          : {
              ...item,
              sets: item.sets.map((set) => ({
                ...set,
                weight: String(suggestion.weight),
              })),
            }
      )
    )
  }

  function handleDrop(e) {
    if (isMobile) return
    e.preventDefault()
    setIsDragOver(false)
    const name = e.dataTransfer.getData('exercise')
    if (name) addExercise(name)
  }

  async function handleSave() {
    const allSets = exercises.flatMap((e) =>
      e.sets.filter((s) => s.reps || s.weight)
    )

    if (!allSets.length) {
      return alert('Saisis au moins une série.')
    }

    setStatus('saving')

    const seanceType = assignment?.programs?.seance_type || 'Séance libre'

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        date: today,
        seance_type: seanceType,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      setStatus('error')
      return
    }

    let setOrderCounter = 0
    const setsToInsert = []

    exercises.forEach((e) => {
      e.sets.forEach((s) => {
        if (s.reps || s.weight) {
          setsToInsert.push({
            session_id: session.id,
            exercise: e.exercise,
            reps: s.reps ? parseInt(s.reps, 10) : null,
            weight: s.weight ? parseFloat(s.weight) : null,
            rpe: s.rpe ? parseFloat(s.rpe) : null,
            set_order: setOrderCounter,
          })
          setOrderCounter += 1
        }
      })
    })

    const { error: setsError } = await supabase.from('sets').insert(setsToInsert)

    if (setsError) {
      console.error(setsError)
      setStatus('error')
      return
    }

    setStatus('saved')
    markClean()
    setTimeout(() => setStatus(null), 4000)
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 300,
          color: T.textDim,
          fontFamily: T.fontDisplay,
          fontSize: 12,
          letterSpacing: 2,
        }}
      >
        Chargement...
      </div>
    )
  }

  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <PageWrap>
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 900,
            fontSize: isMobile ? 28 : 36,
            letterSpacing: isMobile ? 1.2 : 2,
            color: T.text,
            lineHeight: 1,
          }}
        >
          AUJOURD'HUI
        </div>

        <div
          style={{
            fontSize: isMobile ? 13 : 14,
            color: T.textMid,
            marginTop: 6,
            textTransform: 'capitalize',
          }}
        >
          {dateLabel}
        </div>
      </div>

      {assignment ? (
        <div
          style={{
            background: `linear-gradient(135deg, ${T.accentGlow}, transparent)`,
            border: `1px solid ${T.accent}44`,
            borderRadius: T.radiusLg,
            padding: isMobile ? '12px 14px' : '14px 20px',
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 14,
            flexWrap: isMobile ? 'wrap' : 'nowrap',
          }}
        >
          <div style={{ fontSize: isMobile ? 22 : 26 }}>
            {SEANCE_ICONS[assignment.programs?.seance_type] || '💪'}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.fontDisplay,
                fontWeight: 800,
                fontSize: isMobile ? 15 : 16,
                color: T.accent,
              }}
            >
              {assignment.programs?.name}
            </div>

            <div
              style={{
                fontSize: 12,
                color: T.textMid,
                marginTop: 2,
                lineHeight: 1.5,
              }}
            >
              {assignment.programs?.seance_type}
              {assignment.note && (
                <span
                  style={{
                    marginLeft: 10,
                    fontStyle: 'italic',
                    color: T.textDim,
                  }}
                >
                  "{assignment.note}"
                </span>
              )}
            </div>
          </div>

          {!isMobile ? (
            <div
              style={{
                marginLeft: 'auto',
                fontFamily: T.fontDisplay,
                fontSize: 11,
                color: T.textDim,
                letterSpacing: 1,
              }}
            >
              Programme assigné par ton coach
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                fontFamily: T.fontDisplay,
                fontSize: 10,
                color: T.textDim,
                letterSpacing: 1,
              }}
            >
              Programme assigné par ton coach
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: T.card,
            border: `1px dashed ${T.border}`,
            borderRadius: T.radiusLg,
            padding: isMobile ? '14px 14px' : '16px 20px',
            fontFamily: T.fontDisplay,
            fontSize: 12,
            color: T.textDim,
            letterSpacing: 1,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          Aucune séance assignée pour aujourd'hui — crée ta propre séance ci-dessous
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
          gap: isMobile ? 16 : 20,
          marginTop: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            onDragOver={
              isMobile
                ? undefined
                : (e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }
            }
            onDragLeave={isMobile ? undefined : () => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              minHeight: exercises.length ? 'auto' : isMobile ? 84 : 100,
              border: exercises.length
                ? 'none'
                : `2px dashed ${isDragOver ? T.accent : T.border}`,
              borderRadius: T.radiusSm,
              padding: exercises.length ? 0 : isMobile ? '20px 14px' : '28px 20px',
              background:
                isDragOver && !exercises.length ? T.accentGlow : 'transparent',
              transition: 'all .2s',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {exercises.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: T.textDim,
                  fontFamily: T.fontDisplay,
                  fontSize: isMobile ? 10 : 11,
                  letterSpacing: isMobile ? 1.2 : 2,
                  textTransform: 'uppercase',
                  lineHeight: 1.6,
                }}
              >
                {isMobile
                  ? 'Ajoute des exercices depuis la bibliothèque ci-dessous'
                  : isDragOver
                    ? '↓ Relâche ici'
                    : 'Glisse des exercices depuis la liste ou clique sur + →'}
              </div>
            ) : (
              exercises.map((exo, i) => (
                <ExerciseBlock
                  key={`${exo.exercise}-${i}`}
                  exo={exo}
                  suggestionData={exerciseSuggestions[exo.exercise] || null}
                  onRemove={() => removeExercise(i)}
                  onUpdateSet={(si, f, v) => updateSet(i, si, f, v)}
                  onAddSet={() => addSet(i)}
                  onRemoveSet={(si) => removeSet(i, si)}
                  onApplySuggestedWeight={() => applySuggestedWeight(i)}
                  isMobile={isMobile}
                />
              ))
            )}
          </div>

          {exercises.length > 0 && (
            <Card style={{ padding: isMobile ? '14px 14px' : '16px 20px' }}>
              <Input
                label="Notes de séance"
                value={notes}
                onChange={setNotes}
                placeholder="Ressenti, douleurs, contexte..."
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: 14,
                  gap: 14,
                  alignItems: isMobile ? 'stretch' : 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                }}
              >
                {status === 'saved' && (
                  <div
                    style={{
                      color: T.accent,
                      fontFamily: T.fontDisplay,
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: 1,
                    }}
                  >
                    ✓ Séance enregistrée !
                  </div>
                )}

                {status === 'error' && (
                  <div
                    style={{
                      color: T.danger,
                      fontFamily: T.fontDisplay,
                      fontSize: 12,
                    }}
                  >
                    Erreur — vérifie ta connexion
                  </div>
                )}

                <Btn
                  onClick={handleSave}
                  disabled={status === 'saving' || status === 'saved'}
                >
                  {status === 'saving' ? 'Enregistrement...' : 'Terminer la séance'}
                </Btn>
              </div>
            </Card>
          )}
        </div>

        <Card
          style={{
            padding: isMobile ? '14px 12px' : '18px 16px',
            alignSelf: 'start',
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : 20,
          }}
        >
          <Label style={{ marginBottom: 12 }}>Exercices</Label>
          <ExoLibrary onAdd={addExercise} isMobile={isMobile} />
        </Card>
      </div>
    </PageWrap>
  )
}
