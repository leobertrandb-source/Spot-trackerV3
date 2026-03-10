import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageWrap, Card, Btn } from '../components/UI'
import { T, SEANCE_ICONS } from '../lib/data'

function estimate1RM(weight, reps) {
  const w = Number(weight || 0)
  const r = Number(reps || 0)
  if (!w || !r) return 0
  return w * (1 + r / 30)
}

function getStatusFromSessions(sessions) {
  if (!sessions?.length) return 'Aucune donnée'

  const sorted = [...sessions].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const recent = sorted.slice(0, 3)
  const latest = recent[0]

  const daysSinceLast = latest?.date
    ? Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24))
    : null

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

export default function CoachClientDetailPage() {
  const { id } = useParams()

  const [client, setClient] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClient()
  }, [id])

  async function loadClient() {
    if (!id) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (profileError) {
        console.error(profileError)
      }

      setClient(profileData || null)

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, user_id, date, seance_type, notes')
        .eq('user_id', id)
        .order('date', { ascending: false })

      if (sessionsError) {
        console.error(sessionsError)
        setSessions([])
        setLoading(false)
        return
      }

      const sessionIds = (sessionsData || []).map((s) => s.id)

      let setsData = []
      if (sessionIds.length) {
        const { data, error } = await supabase
          .from('sets')
          .select('*')
          .in('session_id', sessionIds)

        if (error) {
          console.error(error)
        } else {
          setsData = data || []
        }
      }

      const builtSessions = (sessionsData || []).map((session) => ({
        ...session,
        sets: setsData.filter((set) => set.session_id === session.id),
      }))

      setSessions(builtSessions)
    } catch (error) {
      console.error(error)
      setClient(null)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const sessionsCount = sessions.length
    const totalSets = sessions.reduce((sum, session) => sum + (session.sets?.length || 0), 0)
    const totalVolume = sessions.reduce(
      (sum, session) =>
        sum +
        (session.sets || []).reduce(
          (sessionSum, set) => sessionSum + Number(set.weight || 0) * Number(set.reps || 0),
          0
        ),
      0
    )

    const bestWeight = sessions.reduce((max, session) => {
      const localBest = (session.sets || []).reduce(
        (innerMax, set) => Math.max(innerMax, Number(set.weight || 0)),
        0
      )
      return Math.max(max, localBest)
    }, 0)

    const best1RM = sessions.reduce((max, session) => {
      const localBest = (session.sets || []).reduce(
        (innerMax, set) => Math.max(innerMax, estimate1RM(set.weight, set.reps)),
        0
      )
      return Math.max(max, localBest)
    }, 0)

    return {
      sessionsCount,
      totalSets,
      totalVolume,
      bestWeight,
      best1RM,
      status: getStatusFromSessions(sessions),
    }
  }, [sessions])

  return (
    <PageWrap>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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

          <Link to="/coach/clients" style={{ textDecoration: 'none' }}>
            <Btn>Retour aux clients</Btn>
          </Link>
        </div>

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
                    {client.email}
                  </div>

                  <div style={{ color: T.textMid, fontSize: 13, marginTop: 10 }}>
                    Objectif : {client.goal_type || 'Non défini'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: `1px solid ${T.border}`,
                    background: 'rgba(255,255,255,0.03)',
                    color: T.text,
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {stats.status}
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
                <div style={{ color: T.textSub, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Séances
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.sessionsCount}
                </div>
              </Card>

              <Card style={{ padding: 16 }}>
                <div style={{ color: T.textSub, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Séries
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.totalSets}
                </div>
              </Card>

              <Card style={{ padding: 16 }}>
                <div style={{ color: T.textSub, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Meilleure charge
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.bestWeight ? `${stats.bestWeight.toFixed(1)} kg` : '—'}
                </div>
              </Card>

              <Card style={{ padding: 16 }}>
                <div style={{ color: T.textSub, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                  1RM estimé
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.best1RM ? `${stats.best1RM.toFixed(1)} kg` : '—'}
                </div>
              </Card>

              <Card style={{ padding: 16 }}>
                <div style={{ color: T.textSub, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Volume total
                </div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                  {stats.totalVolume ? `${Math.round(stats.totalVolume)} kg` : '—'}
                </div>
              </Card>
            </div>

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
                    const totalVolume = (session.sets || []).reduce(
                      (sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0),
                      0
                    )

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
                              <div style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>
                                {session.seance_type || 'Séance'}
                              </div>
                              <div style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>
                                {session.date}
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
                          </div>
                        </div>

                        {session.notes ? (
                          <div style={{ color: T.textMid, fontSize: 12, lineHeight: 1.55 }}>
                            Notes : {session.notes}
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