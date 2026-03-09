import { useEffect, useMemo, useState } from 'react'
import { useDirty } from '../components/DirtyContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Input, Btn, Badge, PageWrap } from '../components/UI'
import { SEANCE_ICONS, T } from '../lib/data'

// ── Helpers progression ───────────────────────────────────────────
function roundToStep(value, step = 2.5) {
  const n = Number(value || 0)
  if (!n) return 0
  return Math.round(n / step) * step
}

function estimate1RM(weight, reps) {
  const w = Number(weight || 0)
  const r = Number(reps || 0)
  if (!w || !r) return 0
  return w * (1 + r / 30)
}

function formatSessionLine(session) {
  if (!session) return 'Aucune donnée'
  const weightLabel = session.mainWeight ? `${session.mainWeight} kg` : 'Poids libre'
  return `${weightLabel} — ${session.repsArray.join(' / ')}`
}

function getProgressionModel(meta, exerciseName) {
  const name = (exerciseName || '').toLowerCase()
  const equipment = (meta?.equipment || '').toLowerCase()
  const movement = (meta?.movement_type || '').toLowerCase()

  if (equipment === 'bodyweight' || name.includes('traction') || name.includes('pull-up') || name.includes('dips')) {
    return {
      type: 'bodyweight',
      repStep: 1,
      label: 'Progression en reps',
    }
  }

  if (equipment === 'machine' || name.includes('machine') || name.includes('leg press') || name.includes('presse')) {
    return {
      type: 'weight',
      step: 5,
      label: 'Progression machine',
    }
  }

  if (equipment === 'cable' || name.includes('poulie') || name.includes('cable')) {
    return {
      type: 'weight',
      step: movement === 'isolation' ? 1 : 2.5,
      label: 'Progression câble',
    }
  }

  if (equipment === 'dumbbell' || name.includes('haltère') || name.includes('haltères') || name.includes('dumbbell')) {
    return {
      type: 'weight',
      step: movement === 'isolation' ? 1 : 2,
      label: 'Progression haltères',
    }
  }

  return {
    type: 'weight',
    step: movement === 'isolation' ? 1 : 2.5,
    label: 'Progression charge',
  }
}

function groupRowsBySession(rows) {
  const map = new Map()

  for (const row of rows) {
    if (!map.has(row.session_id)) {
      map.set(row.session_id, {
        sessionId: row.session_id,
        date: row.sessions?.date || null,
        sets: [],
      })
    }

    map.get(row.session_id).sets.push({
      reps: Number(row.reps || 0),
      weight: Number(row.weight || 0),
      rpe: Number(row.rpe || 0),
      set_order: Number(row.set_order || 0),
    })
  }

  return [...map.values()]
    .map((session) => {
      const orderedSets = [...session.sets].sort((a, b) => a.set_order - b.set_order)
      const repsArray = orderedSets.map((s) => s.reps)
      const weights = orderedSets.map((s) => s.weight).filter(Boolean)
      const rpes = orderedSets.map((s) => s.rpe).filter(Boolean)
      const volume = orderedSets.reduce((sum, s) => sum + Number(s.weight || 0) * Number(s.reps || 0), 0)
      const best1RM = orderedSets.reduce((max, s) => Math.max(max, estimate1RM(s.weight, s.reps)), 0)

      return {
        ...session,
        sets: orderedSets,
        repsArray,
        weights,
        mainWeight: weights[0] || 0,
        avgRpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 0,
        volume,
        best1RM,
      }
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}

function buildExerciseInsight(meta, sessions, targetReps, exerciseName) {
  if (!sessions.length) return null

  const latest = sessions[0]
  const previous = sessions[1] || null
  const recent3 = sessions.slice(0, 3)

  const bestWeight = sessions.reduce((max, s) => Math.max(max, Number(s.mainWeight || 0)), 0)
  const best1RM = sessions.reduce((max, s) => Math.max(max, Number(s.best1RM || 0)), 0)
  const bestVolume = sessions.reduce((max, s) => Math.max(max, Number(s.volume || 0)), 0)

  const progressionModel = getProgressionModel(meta, exerciseName)
  const target = Number(targetReps || 0)
  const repsArray = latest.repsArray || []
  const successCount = target ? repsArray.filter((r) => r >= target).length : 0
  const allSuccess = target ? repsArray.length > 0 && repsArray.every((r) => r >= target) : false
  const almost = target ? successCount >= Math.max(1, repsArray.length - 1) : false

  const avgRpe = Number(latest.avgRpe || 0)
  const fatigueHigh = avgRpe >= 9
  const fatigueVeryHigh = avgRpe >= 9.5

  const stagnation =
    recent3.length >= 3 &&
    recent3.every((s) => Number(s.mainWeight || 0) <= Number(latest.mainWeight || 0)) &&
    recent3.every((s) => {
      if (!target) return false
      const okCount = s.repsArray.filter((r) => r >= target).length
      return okCount < s.repsArray.length
    })

  let suggestion = null

  if (progressionModel.type === 'bodyweight') {
    const suggestedReps = allSuccess ? target + progressionModel.repStep : target
    suggestion = {
      type: 'reps',
      reps: suggestedReps,
      label: allSuccess ? 'Progression en reps possible' : 'Valider les reps actuelles',
    }
  } else {
    const currentWeight = Number(latest.mainWeight || 0)

    if (allSuccess) {
      suggestion = {
        type: 'weight',
        weight: roundToStep(currentWeight + progressionModel.step, progressionModel.step),
        label: 'Progression validée',
      }
    } else if (almost) {
      suggestion = {
        type: 'weight',
        weight: roundToStep(currentWeight, progressionModel.step),
        label: 'Encore une validation',
      }
    } else if (fatigueVeryHigh || successCount <= Math.floor(repsArray.length / 2)) {
      suggestion = {
        type: 'weight',
        weight: roundToStep(currentWeight * 0.95, progressionModel.step),
        label: 'Charge à alléger',
      }
    } else {
      suggestion = {
        type: 'weight',
        weight: roundToStep(currentWeight, progressionModel.step),
        label: 'Consolider la charge',
      }
    }
  }

  const suggestedWeight = Number(suggestion?.weight || 0)

  let potential = {
    title: 'Progression en cours',
    tone: 'neutral',
  }

  if (suggestion?.type === 'weight' && suggestedWeight > bestWeight) {
    potential = {
      title: '🏆 Record de charge possible',
      tone: 'gold',
    }
  } else if (suggestion?.type === 'weight' && suggestedWeight === bestWeight && bestWeight > 0) {
    potential = {
      title: 'Validation du niveau actuel',
      tone: 'accent',
    }
  } else if (stagnation || fatigueHigh) {
    potential = {
      title: 'Séance de consolidation',
      tone: 'neutral',
    }
  }

  const statusChips = []

  if (potential.tone === 'gold') {
    statusChips.push({ text: 'PR potentiel', tone: 'gold' })
  }

  if (stagnation) {
    statusChips.push({ text: 'Stagnation', tone: 'warn' })
  }

  if (fatigueHigh) {
    statusChips.push({ text: 'Fatigue haute', tone: 'danger' })
  }

  if (!statusChips.length) {
    statusChips.push({ text: 'Progression stable', tone: 'accent' })
  }

  let coachNote = null

  if (stagnation && fatigueHigh) {
    coachNote = 'Stagnation + fatigue élevée : consolider ou alléger cette semaine.'
  } else if (stagnation) {
    coachNote = 'Peu de progression récente : valide la fourchette avant de remonter.'
  } else if (fatigueHigh) {
    coachNote = 'RPE élevé sur la dernière séance : garde de la marge aujourd’hui.'
  } else if (potential.tone === 'gold') {
    coachNote = 'Conditions réunies pour tenter un nouveau meilleur poids.'
  }

  return {
    meta,
    progressionModel,
    latest,
    previous,
    bestWeight,
    best1RM,
    bestVolume,
    suggestion,
    potential,
    statusChips,
    coachNote,
  }
}

function getChipStyle(tone) {
  if (tone === 'gold') {
    return {
      background: 'rgba(255,215,0,0.10)',
      border: '1px solid rgba(255,215,0,0.30)',
      color: '#FFD76A',
    }
  }

  if (tone === 'danger') {
    return {
      background: 'rgba(255,110,110,0.10)',
      border: '1px solid rgba(255,110,110,0.24)',
      color: '#FF9D9D',
    }
  }

  if (tone === 'warn') {
    return {
      background: 'rgba(255,180,80,0.10)',
      border: '1px solid rgba(255,180,80,0.24)',
      color: '#FFC783',
    }
  }

  if (tone === 'accent') {
    return {
      background: 'rgba(45,255,155,0.10)',
      border: `1px solid ${T.accent + '28'}`,
      color: T.accentLight,
    }
  }

  return {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: T.textMid,
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
          <div style={{ padding: '8px 4px', color: T.textDim, fontSize: 12 }}>
            Chargement...
          </div>
        ) : libraryError ? (
          <div style={{ padding: '8px 4px', color: T.danger, fontSize: 12 }}>
            {libraryError}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '8px 4px', color: T.textDim, fontSize: 12 }}>
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

// ── Bloc exercice compact + détails repliables ────────────────────
function ExerciseBlock({
  exo,
  insight,
  onRemove,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onApplySuggestion,
  isMobile = false,
}) {
  const [showDetails, setShowDetails] = useState(false)
  const gridColumns = isMobile ? '34px 1fr 1fr 1fr 24px' : '40px 1fr 1fr 1fr 28px'
  const suggestion = insight?.suggestion || null

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

      {insight ? (
        <div style={{ padding: isMobile ? '10px 10px 0' : '10px 14px 0', display: 'grid', gap: 8 }}>
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
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    color: T.textSub,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Assistant
                </div>

                <div
                  style={{
                    color: T.text,
                    fontSize: 14,
                    fontWeight: 900,
                    lineHeight: 1.25,
                  }}
                >
                  {suggestion?.type === 'weight'
                    ? `${suggestion.weight} kg recommandés`
                    : suggestion?.type === 'reps'
                      ? `${suggestion.reps} reps recommandées`
                      : 'Analyse disponible'}
                </div>

                <div
                  style={{
                    color: T.textMid,
                    fontSize: 12,
                    marginTop: 5,
                    lineHeight: 1.55,
                  }}
                >
                  {formatSessionLine(insight.latest)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {insight.statusChips.map((chip) => (
                  <div
                    key={chip.text}
                    style={{
                      ...getChipStyle(chip.tone),
                      padding: '6px 9px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 0.3,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.text}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: 8,
                marginTop: 10,
              }}
            >
              <div
                style={{
                  padding: '9px 10px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ color: T.textSub, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Dernier
                </div>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 900, marginTop: 4 }}>
                  {insight.latest.mainWeight ? `${insight.latest.mainWeight} kg` : '—'}
                </div>
              </div>

              <div
                style={{
                  padding: '9px 10px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ color: T.textSub, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Record
                </div>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 900, marginTop: 4 }}>
                  {insight.bestWeight ? `${insight.bestWeight.toFixed(1)} kg` : '—'}
                </div>
              </div>

              <div
                style={{
                  padding: '9px 10px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ color: T.textSub, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                  1RM
                </div>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 900, marginTop: 4 }}>
                  {insight.best1RM ? `${insight.best1RM.toFixed(1)} kg` : '—'}
                </div>
              </div>

              <div
                style={{
                  padding: '9px 10px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ color: T.textSub, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Volume
                </div>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 900, marginTop: 4 }}>
                  {insight.bestVolume ? `${Math.round(insight.bestVolume)} kg` : '—'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginTop: 10,
              }}
            >
              <div style={{ color: T.textMid, fontSize: 12, lineHeight: 1.5 }}>
                {insight.coachNote || insight.suggestion?.label || 'Progression suivie automatiquement.'}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {suggestion?.type === 'weight' ? (
                  <button
                    type="button"
                    onClick={onApplySuggestion}
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
                    Appliquer
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent',
                    color: T.textMid,
                    borderRadius: 12,
                    padding: '9px 12px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {showDetails ? 'Masquer' : 'Détails'}
                </button>
              </div>
            </div>
          </div>

          {showDetails ? (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ color: T.textSub, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                Historique rapide
              </div>

              <div style={{ color: T.textMid, fontSize: 12, lineHeight: 1.6 }}>
                Dernière séance : {formatSessionLine(insight.latest)}
              </div>

              {insight.previous ? (
                <div style={{ color: T.textMid, fontSize: 12, lineHeight: 1.6 }}>
                  Séance précédente : {formatSessionLine(insight.previous)}
                </div>
              ) : null}

              <div style={{ color: T.textMid, fontSize: 12, lineHeight: 1.6 }}>
                Modèle : {insight.progressionModel.label}
              </div>

              <div style={{ color: T.textMid, fontSize: 12, lineHeight: 1.6 }}>
                Potentiel : {insight.potential.title}
              </div>
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
                insight?.suggestion?.type === 'weight' && insight?.suggestion?.weight && !set.weight
                  ? String(insight.suggestion.weight)
                  : '60'
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
  const [exerciseInsights, setExerciseInsights] = useState({})
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)
  const { markDirty, markClean } = useDirty()

  const exerciseNamesKey = useMemo(
    () => exercises.map((e) => e.exercise).join('|'),
    [exercises]
  )

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
    if (!user?.id || !exerciseNamesKey) {
      setExerciseInsights({})
      return
    }

    loadExerciseInsights()
  }, [user?.id, exerciseNamesKey])

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

  async function loadExerciseInsights() {
    const names = [...new Set(exercises.map((e) => e.exercise).filter(Boolean))]
    if (!names.length) return

    const { data: metaRows, error: metaError } = await supabase
      .from('exercises')
      .select('name, equipment, movement_type')
      .in('name', names)

    if (metaError) {
      console.error('Erreur récupération metadata exercices:', metaError)
    }

    const metaByName = (metaRows || []).reduce((acc, row) => {
      acc[row.name] = row
      return acc
    }, {})

    const nextInsights = {}

    for (const exo of exercises) {
      const { data, error } = await supabase
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
        .eq('sessions.user_id', user.id)
        .eq('exercise', exo.exercise)
        .order('date', { foreignTable: 'sessions', ascending: false })
        .order('set_order', { ascending: true })

      if (error) {
        console.error(`Erreur récupération historique pour ${exo.exercise}:`, error)
        nextInsights[exo.exercise] = null
        continue
      }

      const sessions = groupRowsBySession(data || [])
      nextInsights[exo.exercise] = buildExerciseInsight(
        metaByName[exo.exercise] || null,
        sessions,
        exo.reps_target,
        exo.exercise
      )
    }

    setExerciseInsights(nextInsights)
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

  function applySuggestion(exoIdx) {
    const exo = exercises[exoIdx]
    const insight = exerciseInsights[exo.exercise]
    const suggestion = insight?.suggestion

    if (!suggestion || suggestion.type !== 'weight' || !suggestion.weight) return

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
                  insight={exerciseInsights[exo.exercise] || null}
                  onRemove={() => removeExercise(i)}
                  onUpdateSet={(si, f, v) => updateSet(i, si, f, v)}
                  onAddSet={() => addSet(i)}
                  onRemoveSet={(si) => removeSet(i, si)}
                  onApplySuggestion={() => applySuggestion(i)}
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
