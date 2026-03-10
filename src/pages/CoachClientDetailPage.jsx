import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageWrap, Card, Btn, Badge } from '../components/UI'
import { T, SEANCE_ICONS } from '../lib/data'

function estimate1RM(weight, reps) {
  const w = Number(weight || 0)
  const r = Number(reps || 0)

  if (!w || !r) return 0

  return w * (1 + r / 30)
}

function getDaysSince(dateValue) {
  if (!dateValue) return null

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null

  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusFromSessions(sessions) {
  if (!sessions?.length) return 'Aucune donnée'

  const sorted = [...sessions].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const recent = sorted.slice(0, 3)
  const latest = recent[0]

  const daysSinceLast = getDaysSince(latest?.date)

  if (daysSinceLast !== null && daysSinceLast > 10) return 'Inactif'

  const volumes = recent.map((session) =>
    (session.sets || []).reduce(
      (sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0),
      0
    )
  )

  const avgRpeValues = recent
    .flatMap((session) => (session.sets || []).map((set) => Number(set.rpe || 0)))
    .filter(Boolean)

  const avgRpe = avgRpeValues.length
    ? avgRpeValues.reduce((a, b) => a + b, 0) / avgRpeValues.length
    : 0

  if (recent.length >= 2) {
    const firstVolume = Number(volumes[recent.length - 1] || 0)
    const lastVolume = Number(volumes[0] || 0)

    if (avgRpe >= 9 && lastVolume <= firstVolume) return 'Fatigue haute'
    if (lastVolume > firstVolume * 1.05) return 'Progression'
  }

  if (recent.length >= 3) {
    const maxVolume = Math.max(...volumes)
    const minVolume = Math.min(...volumes)
    const stable = maxVolume - minVolume < Math.max(1, maxVolume * 0.05)

    if (stable) return 'Stagnation'
  }

  return 'Stable'
}

function getStatusColor(status) {
  switch (status) {
    case 'Progression':
      return T.accent
    case 'Fatigue haute':
      return T.orange
    case 'Inactif':
      return T.danger
    case 'Stagnation':
      return T.blue
    default:
      return T.textMid
  }
}

function formatDate(value) {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return String(value)
  }
}

function getSessionVolume(session) {
  return (session.sets || []).reduce(
    (sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0),
    0
  )
}

export default function CoachClientDetailPage() {
  const { id } = useParams()

  const [client, setClient] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadClient = useCallback(async () => {
    if (!id) {
      setClient(null)
      setSessions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      setClient(profileData || null)

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, user_id, date, seance_type, notes')
        .eq('user_id', id)
        .order('date', { ascending: false })

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

      const setsBySession = setsData.reduce((acc, set) => {
        if (!acc[set.session_id]) acc[set.session_id] = []
        acc[set.session_id].push(set)
        return acc
      }, {})

      const builtSessions = (sessionsData || []).map((session) => ({
        ...session,
        sets: setsBySession[session.id] || [],
      }))

      setSessions(builtSessions)
    } catch (error) {
      console.error('Erreur chargement fiche client :', error)
      setClient(null)
      setSessions([])
      setErrorMessage("Impossible de charger la fiche client pour le moment.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadClient()
  }, [loadClient])

  const stats = useMemo(() => {
    const sessionsCount = sessions.length

    const totalSets = sessions.reduce((sum, session) => {
      return sum + (session.sets?.length || 0)
    }, 0)

    const totalVolume = sessions.reduce((sum, session) => {
      return sum + getSessionVolume(session)
    }, 0)

    const bestWeight = sessions.reduce((max, session) => {
      const sessionBest = (session.sets || []).reduce((innerMax, set) => {
        return Math.max(innerMax, Number(set.weight || 0))
      }, 0)

      return Math.max(max, sessionBest)
    }, 0)

    const best1RM = sessions.reduce((max, session) => {
      const sessionBest = (session.sets || []).reduce((innerMax, set) => {
        return Math.max(innerMax, estimate1RM(set.weight, set.reps))
      }, 0)

      return Math.max(max, sessionBest)
    }, 0)

    const lastSessionDate = sessions[0]?.date || null
    const daysSinceLast = getDaysSince(lastSessionDate)

    return {
      sessionsCount,
      totalSets,
      totalVolume,
      bestWeight,
      best1RM,
      status: getStatusFromSessions(sessions),
      lastSessionDate,
      daysSinceLast,
    }
  }, [sessions])

  const topExercises = useMemo(() => {
    const exerciseMap = new Map()

    sessions.forEach((session) => {
      ;(session.sets || []).forEach((set) => {
        const exercise = String(set.exercise || 'Exercice').trim()
        const current = exerciseMap.get(exercise) || {
          name: exercise,
          sets: 0,
          volume: 0,
          bestWeight: 0,
        }

        current.sets += 1
        current.volume += Number(set.weight || 0) * Number(set.reps || 0)
        current.bestWeight = Math.max(current.bestWeight, Number(set.weight || 0))

        exerciseMap.set(exercise, current)
      })
    })

    return [...exerciseMap.values()]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5)
  }, [sessions])

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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
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
              FICHE CLIENT
            </div>

            <div
              style={{
                color: T.textMid,
                fontSize: 14,
                marginTop: 10,
              }}
            >
              Détail du suivi, des séances et des performances.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={loadClient}
              disabled={loading}
              style={{
                height: 46,
                padding: '0 16px',
                borderRadius: 14,
                border: `1px solid ${T.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: T.text,
                fontWeight: 800,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Chargement...' : 'Rafraîchir'}
            </button>

            <Link to="/coach/clients" style={{ textDecoration: 'none' }}>
              <Btn>Retour aux clients</Btn>
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <Card
            style={{
              padding: 16,
              border: '1px solid rgba(255,120,120,0.22)',
              background: 'rgba(255,90,90,0.06)',
            }}
          >
            <div
              style={{
                color: '#FFB3B3',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              {errorMessage}
            </div>
          </Card>
        ) : null}

        {loading ? (
          <Card style={{ padding: 20 }}>
            <div style={{ color: T.textDim }}>Chargement du client...</div>
          </Card>
        ) : !client ? (
          <Card style={{ padding: 20 }}>
            <div style={{ color: T.textMid }}>Client introuvable.</div>
          </Card>
        ) : (
          <>
            <Card
              glow
              style={{
                padding: '22px 20px',
                background:
                  'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%), linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 14,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      color: T.text,
                      fontWeight: 900,
                      fontSize: 22,
                    }}
                  >
                    {client.full_name || 'Client'}
                  </div>

                  <div style={{ color: T.textDim, fontSize: 13, marginTop: 6 }}>
                    {client.email || 'Email non renseigné'}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Badge>{client.role || 'athlete'}</Badge>
                    {client.goal_type ? <Badge color={T.blue}>{client.goal_type}</Badge> : null}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    justifyItems: 'end',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: `1px solid ${(getStatusColor(stats.status) || T.border) + '30'}`,
                      background: `${getStatusColor(stats.status)}18`,
                      color: getStatusColor(stats.status),
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  >
                    {stats.status}
                  </div>

                  <div
                    style={{
                      color: T.textMid,
                      fontSize: 12,
                    }}
                  >
                    Dernière séance : {stats.lastSessionDate ? formatDate(stats.lastSessionDate) : '—'}
                  </div>
                </div>
              </div>
            </Card>

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
                  Séances
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.sessionsCount}
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
                  Séries
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.totalSets}
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
                  Meilleure charge
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.bestWeight ? `${stats.bestWeight.toFixed(1)} kg` : '—'}
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
                  1RM estimé
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.best1RM ? `${stats.best1RM.toFixed(1)} kg` : '—'}
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
                  Volume total
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.totalVolume ? `${Math.round(stats.totalVolume)} kg` : '—'}
                </div>
              </Card>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.9fr)',
                gap: 18,
              }}
            >
              <Card style={{ padding: '18px 18px' }}>
                <div
                  style={{
                    color: T.text,
                    fontFamily: T.fontDisplay,
                    fontWeight: 800,
                    fontSize: 18,
                    marginBottom: 12,
                  }}
                >
                  Dernières séances
                </div>

                {sessions.length === 0 ? (
                  <div style={{ color: T.textMid, fontSize: 14 }}>
                    Aucune séance enregistrée.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {sessions.slice(0, 8).map((session) => {
                      const totalVolume = getSessionVolume(session)
                      const avgRpeValues = (session.sets || [])
                        .map((set) => Number(set.rpe || 0))
                        .filter(Boolean)

                      const avgRpe = avgRpeValues.length
                        ? avgRpeValues.reduce((a, b) => a + b, 0) / avgRpeValues.length
                        : null

                      return (
                        <div
                          key={session.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            display: 'grid',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ fontSize: 18 }}>
                                {SEANCE_ICONS[session.seance_type] || '💪'}
                              </div>

                              <div>
                                <div
                                  style={{
                                    color: T.text,
                                    fontWeight: 800,
                                    fontSize: 14,
                                  }}
                                >
                                  {session.seance_type || 'Séance'}
                                </div>

                                <div
                                  style={{
                                    color: T.textDim,
                                    fontSize: 12,
                                    marginTop: 4,
                                  }}
                                >
                                  {formatDate(session.date)}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                color: T.textMid,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {session.sets.length} séries • {Math.round(totalVolume)} kg
                              {avgRpe ? ` • RPE ${avgRpe.toFixed(1)}` : ''}
                            </div>
                          </div>

                          {session.notes ? (
                            <div
                              style={{
                                color: T.textMid,
                                fontSize: 12,
                                lineHeight: 1.55,
                              }}
                            >
                              Notes : {session.notes}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>

              <Card style={{ padding: 18 }}>
                <div
                  style={{
                    color: T.text,
                    fontFamily: T.fontDisplay,
                    fontWeight: 800,
                    fontSize: 18,
                    marginBottom: 12,
                  }}
                >
                  Exercices les plus travaillés
                </div>

                {topExercises.length === 0 ? (
                  <div style={{ color: T.textMid, fontSize: 14 }}>
                    Pas encore assez de données d'exercices.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {topExercises.map((exercise) => (
                      <div
                        key={exercise.name}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
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
                            color: T.textDim,
                            fontSize: 12,
                            marginTop: 6,
                          }}
                        >
                          {exercise.sets} séries • {Math.round(exercise.volume)} kg de volume • meilleur set à{' '}
                          {exercise.bestWeight ? `${exercise.bestWeight} kg` : '—'}
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
