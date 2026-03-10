import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, StatCard, Badge } from '../components/UI'
import { T } from '../lib/data'

function formatDate(value) {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return String(value)
  }
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(a, b) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
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

function buildWeeklyBuckets(sessions) {
  const buckets = new Map()

  sessions.forEach((session) => {
    if (!session.date) return
    const date = new Date(session.date)
    if (Number.isNaN(date.getTime())) return

    const weekKey = `${date.getFullYear()}-${String(getWeekNumber(date)).padStart(2, '0')}`

    const current = buckets.get(weekKey) || {
      key: weekKey,
      label: weekLabel(date),
      sessions: 0,
      volume: 0,
      sets: 0,
    }

    current.sessions += 1
    current.volume += getSessionVolume(session)
    current.sets += session.sets?.length || 0

    buckets.set(weekKey, current)
  })

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key))
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function weekLabel(date) {
  return `S${getWeekNumber(date)} ${date.getFullYear()}`
}

function getTrendLabel(first, last) {
  if (!first && !last) return 'Stable'
  if (!first && last) return 'En hausse'

  const base = Number(first || 0)
  const now = Number(last || 0)

  if (!base && !now) return 'Stable'
  if (!base && now) return 'En hausse'

  const diff = ((now - base) / base) * 100

  if (diff > 5) return 'En hausse'
  if (diff < -5) return 'En baisse'
  return 'Stable'
}

export default function ProgressionPage() {
  const { user } = useAuth()

  const [sessions, setSessions] = useState([])
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

  const overview = useMemo(() => {
    const totalSessions = sessions.length
    const totalSets = sessions.reduce((sum, session) => sum + (session.sets?.length || 0), 0)
    const totalVolume = sessions.reduce((sum, session) => sum + getSessionVolume(session), 0)

    const firstDate = sessions[0]?.date || null
    const lastDate = sessions[sessions.length - 1]?.date || null
    const activeDays = firstDate && lastDate ? Math.max(1, daysBetween(firstDate, lastDate) + 1) : 0

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
      activeDays,
      bestWeight,
      best1RM,
      firstDate,
      lastDate,
    }
  }, [sessions])

  const exerciseStats = useMemo(() => {
    const map = new Map()

    sessions.forEach((session) => {
      ;(session.sets || []).forEach((setRow) => {
        const name = String(setRow.exercise || 'Exercice').trim()
        const current = map.get(name) || {
          name,
          totalSets: 0,
          totalVolume: 0,
          bestWeight: 0,
          best1RM: 0,
          occurrences: 0,
        }

        current.totalSets += 1
        current.totalVolume += Number(setRow.weight || 0) * Number(setRow.reps || 0)
        current.bestWeight = Math.max(current.bestWeight, Number(setRow.weight || 0))
        current.best1RM = Math.max(current.best1RM, estimate1RM(setRow.weight, setRow.reps))
        current.occurrences += 1

        map.set(name, current)
      })
    })

    return [...map.values()].sort((a, b) => b.totalVolume - a.totalVolume)
  }, [sessions])

  const weeklyTrend = useMemo(() => buildWeeklyBuckets(sessions), [sessions])

  const trendSummary = useMemo(() => {
    if (weeklyTrend.length < 2) {
      return {
        sessionsTrend: 'Stable',
        volumeTrend: 'Stable',
      }
    }

    const first = weeklyTrend[0]
    const last = weeklyTrend[weeklyTrend.length - 1]

    return {
      sessionsTrend: getTrendLabel(first.sessions, last.sessions),
      volumeTrend: getTrendLabel(first.volume, last.volume),
    }
  }, [weeklyTrend])

  const strongestExercises = useMemo(() => {
    return [...exerciseStats]
      .sort((a, b) => b.best1RM - a.best1RM)
      .slice(0, 6)
  }, [exerciseStats])

  const mostWorkedExercises = useMemo(() => {
    return [...exerciseStats]
      .sort((a, b) => b.totalSets - a.totalSets)
      .slice(0, 6)
  }, [exerciseStats])

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
            Progression
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
            MA PROGRESSION
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.65,
              marginTop: 10,
            }}
          >
            Suis ton volume, tes performances et tes exercices forts dans le temps.
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
              Enregistre quelques séances pour commencer à voir ta progression.
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.9fr)',
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
                    Évolution hebdomadaire
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge>{trendSummary.sessionsTrend} fréquence</Badge>
                    <Badge color={T.blue || '#5BA7FF'}>{trendSummary.volumeTrend} volume</Badge>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {weeklyTrend.slice(-8).map((week) => {
                    const maxVolume = Math.max(...weeklyTrend.map((item) => item.volume), 1)
                    const width = Math.max(6, (week.volume / maxVolume) * 100)

                    return (
                      <div
                        key={week.key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '110px minmax(0, 1fr) auto',
                          gap: 12,
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            color: T.textDim,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {week.label}
                        </div>

                        <div
                          style={{
                            height: 14,
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, width)}%`,
                              background: T.accent,
                              borderRadius: 999,
                            }}
                          />
                        </div>

                        <div
                          style={{
                            color: T.text,
                            fontSize: 12,
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {Math.round(week.volume)} kg
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    color: T.textMid,
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  Période suivie : {overview.firstDate ? formatDate(overview.firstDate) : '—'} →{' '}
                  {overview.lastDate ? formatDate(overview.lastDate) : '—'}
                </div>
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
                  Résumé rapide
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{
                        color: T.textDim,
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      Période active
                    </div>

                    <div
                      style={{
                        color: T.text,
                        fontSize: 20,
                        fontWeight: 900,
                        marginTop: 8,
                      }}
                    >
                      {overview.activeDays || 0} jours
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{
                        color: T.textDim,
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      Exercices suivis
                    </div>

                    <div
                      style={{
                        color: T.text,
                        fontSize: 20,
                        fontWeight: 900,
                        marginTop: 8,
                      }}
                    >
                      {exerciseStats.length}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{
                        color: T.textDim,
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      Tendance volume
                    </div>

                    <div
                      style={{
                        color: T.text,
                        fontSize: 20,
                        fontWeight: 900,
                        marginTop: 8,
                      }}
                    >
                      {trendSummary.volumeTrend}
                    </div>
                  </div>
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
                    color: T.text,
                    fontWeight: 900,
                    fontSize: 18,
                    marginBottom: 14,
                  }}
                >
                  Exercices les plus travaillés
                </div>

                {mostWorkedExercises.length === 0 ? (
                  <div style={{ color: T.textMid, fontSize: 14 }}>
                    Pas encore assez de données.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {mostWorkedExercises.map((exercise) => (
                      <div
                        key={exercise.name}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${T.border}`,
                          display: 'grid',
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            color: T.text,
                            fontWeight: 800,
                            fontSize: 14,
                          }}
                        >
                          {exercise.name}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Badge>{exercise.totalSets} séries</Badge>
                          <Badge color={T.blue || '#5BA7FF'}>
                            {Math.round(exercise.totalVolume)} kg
                          </Badge>
                        </div>
                      </div>
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
                  Exercices les plus forts
                </div>

                {strongestExercises.length === 0 ? (
                  <div style={{ color: T.textMid, fontSize: 14 }}>
                    Pas encore assez de données.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {strongestExercises.map((exercise) => (
                      <div
                        key={exercise.name}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${T.border}`,
                          display: 'grid',
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            color: T.text,
                            fontWeight: 800,
                            fontSize: 14,
                          }}
                        >
                          {exercise.name}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Badge>{exercise.bestWeight ? `${exercise.bestWeight.toFixed(1)} kg` : '—'}</Badge>
                          <Badge color={T.orange || '#FFB454'}>
                            1RM {exercise.best1RM ? exercise.best1RM.toFixed(1) : '—'} kg
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </PageWrap>
  )
}
