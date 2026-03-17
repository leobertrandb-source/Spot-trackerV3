import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Input, Badge } from '../components/UI'
import { SEANCE_ICONS, T } from '../lib/data'

function formatDate(value) {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return String(value)
  }
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

export default function HistoriquePage() {
  const { user } = useAuth()

  const [sessions, setSessions] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadHistory = useCallback(async () => {
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
      console.error('Erreur chargement historique :', error)
      setSessions([])
      setErrorMessage("Impossible de charger l'historique pour le moment.")
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase()

    return sessions.filter((session) => {
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

  const stats = useMemo(() => {
    const totalSessions = filteredSessions.length
    const totalSets = filteredSessions.reduce((sum, session) => sum + (session.sets?.length || 0), 0)
    const totalVolume = filteredSessions.reduce((sum, session) => sum + getSessionVolume(session), 0)

    return {
      totalSessions,
      totalSets,
      totalVolume,
    }
  }, [filteredSessions])

  const typeOptions = useMemo(() => {
    const values = [...new Set(sessions.map((session) => session.seance_type).filter(Boolean))]
    return values
  }, [sessions])

  const handleDeleteSession = useCallback(
    async (sessionId) => {
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
    },
    []
  )

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
            Historique
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
            MES SÉANCES
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.65,
              marginTop: 10,
            }}
          >
            Retrouve toutes tes séances passées et leurs performances.
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
              {stats.totalSessions}
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
              Volume total
            </div>
            <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
              {Math.round(stats.totalVolume)} kg
            </div>
          </Card>
        </div>

        <Card style={{ padding: 18 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 220px auto',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <Input
              label="Rechercher"
              value={search}
              onChange={setSearch}
              placeholder="Type de séance, exercice, notes..."
            />

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
              onClick={loadHistory}
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

        <Card style={{ padding: 18 }}>
          {loading ? (
            <div style={{ color: T.textDim, fontSize: 14 }}>
              Chargement de l'historique...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div
                style={{
                  color: T.text,
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                Aucune séance trouvée
              </div>

              <div
                style={{
                  color: T.textMid,
                  fontSize: 14,
                }}
              >
                {sessions.length === 0
                  ? "Tu n'as encore enregistré aucune séance."
                  : 'Aucun résultat ne correspond à tes filtres.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredSessions.map((session) => {
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
                          <Badge color={T.blue}>
                            {session.sets.length} série{session.sets.length > 1 ? 's' : ''}
                          </Badge>

                          <Badge color={T.orange}>
                            {Math.round(volume)} kg volume
                          </Badge>

                          {avgRpe ? (
                            <Badge>RPE {avgRpe.toFixed(1)}</Badge>
                          ) : null}
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
                        {exercises.slice(0, 8).map((exercise) => (
                          <Badge key={exercise}>{exercise}</Badge>
                        ))}

                        {exercises.length > 8 ? (
                          <Badge color={T.textDim}>+{exercises.length - 8}</Badge>
                        ) : null}
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
                            minWidth: 640,
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
      </div>
    </PageWrap>
  )
}
