import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, StatCard, Badge } from '../components/UI'
import { SEANCE_ICONS, T } from '../lib/data'

function formatDate(value) {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return String(value)
  }
}

function estimate1RM(weight, reps) {
  const w = Number(weight || 0)
  const r = Number(reps || 0)

  if (!w || !r) return 0
  return w * (1 + r / 30)
}

function getSessionVolume(session) {
  return (session.sets || []).reduce((sum, setRow) => {
    return sum + Number(setRow.weight || 0) * Number(setRow.reps || 0)
  }, 0)
}

function getSessionAvgRpe(session) {
  const values = (session.sets || [])
    .map((setRow) => Number(setRow.rpe || 0))
    .filter(Boolean)

  if (!values.length) return null

  return values.reduce((a, b) => a + b, 0) / values.length
}

function getUniqueExercises(session) {
  const names = new Set(
    (session.sets || [])
      .map((setRow) => String(setRow.exercise || '').trim())
      .filter(Boolean)
  )

  return [...names]
}

function buildExerciseTimeline(sessions, exerciseName) {
  if (!exerciseName) return []

  return sessions
    .map((session) => {
      const matchingSets = (session.sets || []).filter(
        (setRow) => String(setRow.exercise || '').trim() === exerciseName
      )

      if (!matchingSets.length) return null

      const bestWeight = matchingSets.reduce(
        (max, row) => Math.max(max, Number(row.weight || 0)),
        0
      )

      const best1RM = matchingSets.reduce(
        (max, row) => Math.max(max, estimate1RM(row.weight, row.reps)),
        0
      )

      const volume = matchingSets.reduce(
        (sum, row) => sum + Number(row.weight || 0) * Number(row.reps || 0),
        0
      )

      const totalReps = matchingSets.reduce(
        (sum, row) => sum + Number(row.reps || 0),
        0
      )

      return {
        sessionId: session.id,
        date: session.date,
        label: formatDate(session.date),
        bestWeight,
        best1RM,
        volume,
        setsCount: matchingSets.length,
        totalReps,
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

function buildPath(points, width, height, accessor) {
  if (!points.length) return ''

  const values = points.map(accessor)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
      const y = height - ((accessor(point) - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function getPointCoords(points, width, height, accessor) {
  if (!points.length) return []

  const values = points.map(accessor)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  return points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
    const y = height - ((accessor(point) - min) / range) * height

    return {
      ...point,
      x,
      y,
      value: accessor(point),
    }
  })
}

function MiniLineChart({
  title,
  points,
  accessor,
  valueFormatter,
  lineColor = T.accent,
  fillColor = 'rgba(45,255,155,0.08)',
}) {
  const width = 560
  const height = 180

  const coords = useMemo(
    () => getPointCoords(points, width, height, accessor),
    [points, accessor]
  )

  const path = useMemo(
    () => buildPath(points, width, height, accessor),
    [points, accessor]
  )

  const areaPath = useMemo(() => {
    if (!coords.length) return ''

    const first = coords[0]
    const last = coords[coords.length - 1]
    const line = coords
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ')

    return `${line} L ${last.x.toFixed(2)} ${height} L ${first.x.toFixed(2)} ${height} Z`
  }, [coords])

  return (
    <Card style={{ padding: 18 }}>
      <div
        style={{
          color: T.text,
          fontWeight: 900,
          fontSize: 16,
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      {points.length === 0 ? (
        <div style={{ color: T.textDim, fontSize: 14 }}>
          Pas assez de données pour afficher la courbe.
        </div>
      ) : (
        <>
          <div
            style={{
              width: '100%',
              overflowX: 'auto',
            }}
          >
            <svg
              width="100%"
              viewBox={`0 0 ${width} ${height + 24}`}
              style={{
                display: 'block',
                minWidth: 320,
              }}
            >
              <defs>
                <linearGradient id={`grad-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = ratio * height
                return (
                  <line
                    key={ratio}
                    x1="0"
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                )
              })}

              {areaPath ? (
                <path
                  d={areaPath}
                  fill={`url(#grad-${title.replace(/\s+/g, '-')})`}
                  stroke="none"
                />
              ) : null}

              {path ? (
                <path
                  d={path}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {coords.map((point) => (
                <g key={`${title}-${point.sessionId}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4.5"
                    fill={lineColor}
                  />
                </g>
              ))}
            </svg>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(points.length, 6)}, minmax(0, 1fr))`,
              gap: 8,
              marginTop: 10,
            }}
          >
            {points.slice(-6).map((point) => (
              <div
                key={`${title}-legend-${point.sessionId}`}
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${T.border}`,
                }}
              >
                <div
                  style={{
                    color: T.textDim,
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  {point.label}
                </div>
                <div
                  style={{
                    color: T.text,
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {valueFormatter(accessor(point))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

export default function ProgressionPage() {
  const { user } = useAuth()

  const [sessions, setSessions] = useState([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadProgress = useCallback(async () => {
    if (!user?.id) {
      setSessions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, user_id, date, seance_type, notes')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (sessionsError) {
        throw sessionsError
      }

      const sessionIds = (sessionsData || []).map((session) => session.id).filter(Boolean)

      let setsData = []

      if (sessionIds.length > 0) {
        const { data, error } = await supabase
          .from('sets')
          .select('*')
          .in('session_id', sessionIds)
          .order('set_order', { ascending: true })

        if (error) {
          throw error
        }

        setsData = data || []
      }

      const setsBySession = setsData.reduce((acc, row) => {
        if (!acc[row.session_id]) acc[row.session_id] = []
        acc[row.session_id].push(row)
        return acc
      }, {})

      const built = (sessionsData || []).map((session) => ({
        ...session,
        sets: setsBySession[session.id] || [],
      }))

      setSessions(built)
    } catch (error) {
      console.error('Erreur chargement progression :', error)
      setSessions([])
      setErrorMessage("Impossible de charger la progression pour le moment.")
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const allExercises = useMemo(() => {
    const names = new Set()

    sessions.forEach((session) => {
      ;(session.sets || []).forEach((setRow) => {
        const name = String(setRow.exercise || '').trim()
        if (name) names.add(name)
      })
    })

    return [...names].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [sessions])

  useEffect(() => {
    if (!selectedExercise && allExercises.length > 0) {
      setSelectedExercise(allExercises[0])
    }
  }, [allExercises, selectedExercise])

  const exerciseTimeline = useMemo(() => {
    return buildExerciseTimeline(sessions, selectedExercise)
  }, [sessions, selectedExercise])

  const overview = useMemo(() => {
    const totalSessions = sessions.length
    const totalSets = sessions.reduce((sum, session) => sum + (session.sets?.length || 0), 0)
    const totalVolume = sessions.reduce((sum, session) => sum + getSessionVolume(session), 0)

    const bestWeight = sessions.reduce((max, session) => {
      const currentBest = (session.sets || []).reduce(
        (innerMax, setRow) => Math.max(innerMax, Number(setRow.weight || 0)),
        0
      )
      return Math.max(max, currentBest)
    }, 0)

    const best1RM = sessions.reduce((max, session) => {
      const currentBest = (session.sets || []).reduce(
        (innerMax, setRow) => Math.max(innerMax, estimate1RM(setRow.weight, setRow.reps)),
        0
      )
      return Math.max(max, currentBest)
    }, 0)

    return {
      totalSessions,
      totalSets,
      totalVolume,
      bestWeight,
      best1RM,
    }
  }, [sessions])

  const selectedExerciseStats = useMemo(() => {
    if (!exerciseTimeline.length) {
      return {
        sessionsCount: 0,
        bestWeight: 0,
        best1RM: 0,
        totalVolume: 0,
        trend: '—',
      }
    }

    const first = exerciseTimeline[0]
    const last = exerciseTimeline[exerciseTimeline.length - 1]

    const bestWeight = Math.max(...exerciseTimeline.map((item) => item.bestWeight), 0)
    const best1RM = Math.max(...exerciseTimeline.map((item) => item.best1RM), 0)
    const totalVolume = exerciseTimeline.reduce((sum, item) => sum + item.volume, 0)

    let trend = 'Stable'
    if (last.bestWeight > first.bestWeight) trend = 'En hausse'
    if (last.bestWeight < first.bestWeight) trend = 'En baisse'

    return {
      sessionsCount: exerciseTimeline.length,
      bestWeight,
      best1RM,
      totalVolume,
      trend,
    }
  }, [exerciseTimeline])

  const typeOptions = useMemo(() => {
    const values = [...new Set(sessions.map((session) => session.seance_type).filter(Boolean))]
    return values
  }, [sessions])

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase()

    return [...sessions]
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .filter((session) => {
        const matchesType =
          typeFilter === 'all' || String(session.seance_type || '') === typeFilter

        if (!matchesType) return false

        if (!q) return true

        const sessionType = String(session.seance_type || '').toLowerCase()
        const notes = String(session.notes || '').toLowerCase()
        const exercises = getUniqueExercises(session).join(' ').toLowerCase()

        return (
          sessionType.includes(q) ||
          notes.includes(q) ||
          exercises.includes(q)
        )
      })
  }, [sessions, search, typeFilter])

  const handleDeleteSession = useCallback(async (sessionId) => {
    const confirmed = window.confirm('Supprimer cette séance et toutes ses séries ?')
    if (!confirmed) return

    setErrorMessage('')

    try {
      const { error: setsError } = await supabase
        .from('sets')
        .delete()
        .eq('session_id', sessionId)

      if (setsError) {
        throw setsError
      }

      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (sessionError) {
        throw sessionError
      }

      setSessions((current) => current.filter((session) => session.id !== sessionId))
    } catch (error) {
      console.error('Erreur suppression séance :', error)
      setErrorMessage("Impossible de supprimer la séance.")
    }
  }, [])

  return (
    <PageWrap>
      <style>{`
        @media (max-width: 640px) {
          .resp-hide-mobile { display: none !important; }
          .resp-stack { flex-direction: column !important; }
          .resp-full { width: 100% !important; min-width: 0 !important; }
        }
      `}</style>
      <div
        style={{
          maxWidth: 1220,
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
            Progression
          </div>

          <div
            style={{
              color: T.text,
              fontFamily: T.fontDisplay,
              fontWeight: 900,
              fontSize: 'clamp(20px,3vw,30px)',
              lineHeight: 1,
            }}
          >
            PROGRESSION & HISTORIQUE
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.65,
              marginTop: 10,
            }}
          >
            Suis tes charges, ton volume et toutes tes séances au même endroit.
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

        {loading ? (
          <Card style={{ padding: 20 }}>
            <div style={{ color: T.textDim, fontSize: 14 }}>
              Chargement de la progression...
            </div>
          </Card>
        ) : sessions.length === 0 ? (
          <Card style={{ padding: 20 }}>
            <div
              style={{
                color: T.text,
                fontWeight: 800,
                fontSize: 15,
                marginBottom: 8,
              }}
            >
              Pas encore de données
            </div>

            <div style={{ color: T.textMid, fontSize: 14 }}>
              Enregistre quelques séances pour afficher tes courbes de progression.
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
              <StatCard label="Séances totales" value={overview.totalSessions} accent />
              <StatCard label="Séries totales" value={overview.totalSets} />
              <StatCard label="Volume total" value={`${Math.round(overview.totalVolume)} kg`} />
              <StatCard
                label="Meilleure charge"
                value={overview.bestWeight ? `${overview.bestWeight.toFixed(1)} kg` : '—'}
              />
              <StatCard
                label="Meilleur 1RM estimé"
                value={overview.best1RM ? `${overview.best1RM.toFixed(1)} kg` : '—'}
              />
            </div>

            <Card style={{ padding: 18 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    color: T.text,
                    fontWeight: 900,
                    fontSize: 18,
                  }}
                >
                  Courbes d'évolution par exercice
                </div>

                <div style={{ minWidth: 260 }}>
                  <select
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    style={{
                      height: 46,
                      width: '100%',
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                      background: T.surface,
                      color: T.text,
                      padding: '0 14px',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {allExercises.map((exercise) => (
                      <option key={exercise} value={exercise}>
                        {exercise}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <Card style={{ padding: 14 }}>
                  <div
                    style={{
                      color: T.textSub,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Séances sur l'exercice
                  </div>
                  <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                    {selectedExerciseStats.sessionsCount}
                  </div>
                </Card>

                <Card style={{ padding: 14 }}>
                  <div
                    style={{
                      color: T.textSub,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Meilleure charge
                  </div>
                  <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                    {selectedExerciseStats.bestWeight
                      ? `${selectedExerciseStats.bestWeight.toFixed(1)} kg`
                      : '—'}
                  </div>
                </Card>

                <Card style={{ padding: 14 }}>
                  <div
                    style={{
                      color: T.textSub,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    1RM estimé
                  </div>
                  <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                    {selectedExerciseStats.best1RM
                      ? `${selectedExerciseStats.best1RM.toFixed(1)} kg`
                      : '—'}
                  </div>
                </Card>

                <Card style={{ padding: 14 }}>
                  <div
                    style={{
                      color: T.textSub,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Tendance
                  </div>
                  <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                    {selectedExerciseStats.trend}
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
                <MiniLineChart
                  title="Meilleure charge"
                  points={exerciseTimeline}
                  accessor={(point) => point.bestWeight}
                  valueFormatter={(value) => `${Number(value || 0).toFixed(1)} kg`}
                  lineColor={T.accent}
                />

                <MiniLineChart
                  title="Volume"
                  points={exerciseTimeline}
                  accessor={(point) => point.volume}
                  valueFormatter={(value) => `${Math.round(Number(value || 0))} kg`}
                  lineColor={T.blue || '#5BA7FF'}
                />
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 220px auto',
                  gap: 12,
                  alignItems: 'end',
                  marginBottom: 14,
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
                    Rechercher dans l'historique
                  </span>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Séance, exercice, notes..."
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
                  />
                </label>

                <label style={{ display: 'grid', gap: 8 }}>
                  <span
                    style={{
                      color: T.textSub || T.textDim,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    Type de séance
                  </span>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
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
                    <option value="all">Toutes</option>
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={loadProgress}
                  disabled={loading}
                  style={{
                    height: 48,
                    borderRadius: 14,
                    border: `1px solid ${T.border}`,
                    background: 'rgba(255,255,255,0.03)',
                    color: T.text,
                    padding: '0 16px',
                    cursor: loading ? 'default' : 'pointer',
                    fontWeight: 800,
                    fontSize: 14,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Chargement...' : 'Rafraîchir'}
                </button>
              </div>

              <div
                style={{
                  color: T.text,
                  fontWeight: 900,
                  fontSize: 18,
                  marginBottom: 14,
                }}
              >
                Historique des séances
              </div>

              {filteredHistory.length === 0 ? (
                <div style={{ color: T.textDim, fontSize: 14 }}>
                  Aucun résultat pour ces filtres.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {filteredHistory.map((session) => {
                    const volume = getSessionVolume(session)
                    const avgRpe = getSessionAvgRpe(session)
                    const exercises = getUniqueExercises(session)

                    return (
                      <div
                        key={session.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 18,
                          border: `1px solid ${T.border}`,
                          background: 'rgba(255,255,255,0.03)',
                          display: 'grid',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            flexWrap: 'wrap',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                flexWrap: 'wrap',
                              }}
                            >
                              <div style={{ fontSize: 18 }}>
                                {SEANCE_ICONS[session.seance_type] || '💪'}
                              </div>

                              <div
                                style={{
                                  color: T.text,
                                  fontWeight: 900,
                                  fontSize: 15,
                                }}
                              >
                                {session.seance_type || 'Séance'}
                              </div>

                              <Badge>{formatDate(session.date)}</Badge>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                gap: 8,
                                flexWrap: 'wrap',
                                marginTop: 10,
                              }}
                            >
                              <Badge color={T.blue || '#5BA7FF'}>
                                {session.sets.length} série{session.sets.length > 1 ? 's' : ''}
                              </Badge>

                              <Badge color={T.orange || '#FFB454'}>
                                {Math.round(volume)} kg volume
                              </Badge>

                              {avgRpe ? <Badge>RPE {avgRpe.toFixed(1)}</Badge> : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            style={{
                              height: 38,
                              borderRadius: 12,
                              border: `1px solid ${T.border}`,
                              background: 'transparent',
                              color: T.danger,
                              cursor: 'pointer',
                              padding: '0 12px',
                              fontWeight: 800,
                            }}
                          >
                            Supprimer
                          </button>
                        </div>

                        {exercises.length > 0 ? (
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                            {exercises.slice(0, 10).map((exercise) => (
                              <button
                                key={`${session.id}-${exercise}`}
                                type="button"
                                onClick={() => setSelectedExercise(exercise)}
                                style={{
                                  height: 28,
                                  padding: '0 10px',
                                  borderRadius: 999,
                                  border: `1px solid ${T.border}`,
                                  background:
                                    exercise === selectedExercise
                                      ? 'rgba(45,255,155,0.10)'
                                      : 'rgba(255,255,255,0.03)',
                                  color:
                                    exercise === selectedExercise
                                      ? T.accentLight
                                      : T.textMid,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                {exercise}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {session.notes ? (
                          <div
                            style={{
                              color: T.textMid,
                              fontSize: 13,
                              lineHeight: 1.6,
                            }}
                          >
                            Notes : {session.notes}
                          </div>
                        ) : null}

                        {session.sets.length > 0 ? (
                          <div
                            style={{
                              overflowX: 'auto',
                              borderRadius: 14,
                              border: `1px solid ${T.border}`,
                            }}
                          >
                            <table
                              style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                minWidth: 700,
                              }}
                            >
                              <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                  <th
                                    style={{
                                      textAlign: 'left',
                                      padding: '12px 14px',
                                      color: T.textDim,
                                      fontSize: 11,
                                      textTransform: 'uppercase',
                                      letterSpacing: 1,
                                    }}
                                  >
                                    Exercice
                                  </th>
                                  <th
                                    style={{
                                      textAlign: 'left',
                                      padding: '12px 14px',
                                      color: T.textDim,
                                      fontSize: 11,
                                      textTransform: 'uppercase',
                                      letterSpacing: 1,
                                    }}
                                  >
                                    Reps
                                  </th>
                                  <th
                                    style={{
                                      textAlign: 'left',
                                      padding: '12px 14px',
                                      color: T.textDim,
                                      fontSize: 11,
                                      textTransform: 'uppercase',
                                      letterSpacing: 1,
                                    }}
                                  >
                                    Poids
                                  </th>
                                  <th
                                    style={{
                                      textAlign: 'left',
                                      padding: '12px 14px',
                                      color: T.textDim,
                                      fontSize: 11,
                                      textTransform: 'uppercase',
                                      letterSpacing: 1,
                                    }}
                                  >
                                    RPE
                                  </th>
                                  <th
                                    style={{
                                      textAlign: 'left',
                                      padding: '12px 14px',
                                      color: T.textDim,
                                      fontSize: 11,
                                      textTransform: 'uppercase',
                                      letterSpacing: 1,
                                    }}
                                  >
                                    1RM estimé
                                  </th>
                                  <th
                                    style={{
                                      textAlign: 'left',
                                      padding: '12px 14px',
                                      color: T.textDim,
                                      fontSize: 11,
                                      textTransform: 'uppercase',
                                      letterSpacing: 1,
                                    }}
                                  >
                                    Volume
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {session.sets.map((setRow) => (
                                  <tr
                                    key={setRow.id}
                                    style={{
                                      borderTop: `1px solid ${T.border}`,
                                      background:
                                        String(setRow.exercise || '').trim() === selectedExercise
                                          ? 'rgba(45,255,155,0.04)'
                                          : 'transparent',
                                    }}
                                  >
                                    <td style={{ padding: '12px 14px', color: T.text, fontSize: 13 }}>
                                      {setRow.exercise || 'Exercice'}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: T.textMid, fontSize: 13 }}>
                                      {setRow.reps ?? '—'}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: T.textMid, fontSize: 13 }}>
                                      {setRow.weight ?? '—'}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: T.textMid, fontSize: 13 }}>
                                      {setRow.rpe ?? '—'}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: T.textMid, fontSize: 13 }}>
                                      {setRow.weight && setRow.reps
                                        ? `${estimate1RM(setRow.weight, setRow.reps).toFixed(1)}`
                                        : '—'}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: T.textMid, fontSize: 13 }}>
                                      {Math.round(Number(setRow.weight || 0) * Number(setRow.reps || 0))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </PageWrap>
  )
}
