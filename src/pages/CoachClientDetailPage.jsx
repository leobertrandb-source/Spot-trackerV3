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
  const [activeTab, setActiveTab] = useState('performances')
  const [prepData, setPrepData] = useState({ hooper: [], compo: [], topsets: [], charge: [] })
  // Nutrition
  const [nutri, setNutri] = useState({ weight: '', height: '', age: '', sex: 'homme', activity: '1.55', goal: 'maintain' })
  const [nutriGoals, setNutriGoals] = useState(null)
  const [nutriSaving, setNutriSaving] = useState(false)
  const [nutriMsg, setNutriMsg] = useState('')

  const loadClient = useCallback(async () => {
    if (!id) {
      setClient(null)
      setSessions([])
      setPrepData({ hooper: [], compo: [], topsets: [], charge: [] })
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

      // 🔥 FIX PRINCIPAL : charger les données de prépa avec l'ID DU CLIENT de l'URL
      const [
        { data: hooperData, error: hooperError },
        { data: compoData, error: compoError },
        { data: chargeData, error: chargeError },
      ] = await Promise.all([
        supabase
          .from('hooper_logs')
          .select('*')
          .eq('user_id', id)
          .order('date', { ascending: false }),
        supabase
          .from('body_composition_logs')
          .select('*')
          .eq('user_id', id)
          .order('date', { ascending: false }),
        supabase
          .from('charge_externe_logs')
          .select('*')
          .eq('user_id', id)
          .order('date', { ascending: false }),
      ])

      if (hooperError) throw hooperError
      if (compoError) throw compoError
      if (chargeError) throw chargeError

      let topsetsData = []
      const topsetsQuery = await supabase
        .from('topsets_logs')
        .select('*')
        .eq('user_id', id)
        .order('date', { ascending: false })

      if (!topsetsQuery.error) {
        topsetsData = topsetsQuery.data || []
      } else {
        console.warn('topsets_logs indisponible ou inaccessible :', topsetsQuery.error.message)
      }

      setPrepData({
        hooper: hooperData || [],
        compo: compoData || [],
        topsets: topsetsData,
        charge: chargeData || [],
      })

      // Charger objectifs nutrition
      const { data: goalsData } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', id)
        .maybeSingle()

      if (goalsData) {
        setNutriGoals(goalsData)
        setNutri((prev) => ({
          ...prev,
          weight: goalsData.weight_kg || '',
          height: goalsData.height_cm || '',
          age: goalsData.age || '',
          sex: goalsData.sex || 'homme',
          activity: goalsData.activity_factor || '1.55',
          goal: goalsData.goal_type || 'maintain',
        }))
      }
    } catch (error) {
      console.error('Erreur chargement fiche client :', error)
      setClient(null)
      setSessions([])
      setPrepData({ hooper: [], compo: [], topsets: [], charge: [] })
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

  function calcMifflin({ weight, height, age, sex, activity, goal }) {
    const w = parseFloat(weight), h = parseFloat(height), a = parseFloat(age)
    if (!w || !h || !a) return null
    const bmr = sex === 'homme'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161
    const tdee = bmr * parseFloat(activity)
    const goalKcal = goal === 'deficit' ? Math.round(tdee - 400)
                   : goal === 'surplus' ? Math.round(tdee + 300)
                   : Math.round(tdee)
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calories: goalKcal,
      proteins: Math.round(w * 2),
      carbs: Math.round((goalKcal * 0.40) / 4),
      fats: Math.round((goalKcal * 0.25) / 9),
    }
  }

  const calculated = calcMifflin(nutri)

  async function saveNutriGoals() {
    if (!calculated) return
    setNutriSaving(true)
    setNutriMsg('')
    const payload = {
      user_id: id,
      calories: calculated.calories,
      proteins: calculated.proteins,
      carbs: calculated.carbs,
      fats: calculated.fats,
      weight_kg: parseFloat(nutri.weight) || null,
      height_cm: parseFloat(nutri.height) || null,
      age: parseInt(nutri.age) || null,
      sex: nutri.sex,
      activity_factor: nutri.activity,
      goal_type: nutri.goal,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('nutrition_goals').upsert(payload, { onConflict: 'user_id' })
    if (error) setNutriMsg('Erreur : ' + error.message)
    else { setNutriMsg('Objectifs enregistrés ✓'); setNutriGoals(payload) }
    setNutriSaving(false)
  }

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
                fontSize: 'clamp(20px,3vw,30px)',
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { key: 'performances', label: '📊 Performances' },
                { key: 'nutrition', label: '🥗 Nutrition' },
                { key: 'prepa', label: '⚡ Prépa physique' },
              ].map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${activeTab === t.key ? T.accent + '40' : T.border}`, background: activeTab === t.key ? T.accent + '12' : 'transparent', color: activeTab === t.key ? T.accentLight : T.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab !== 'prepa' && activeTab !== 'nutrition' && <>
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
            </>}

            {activeTab === 'nutrition' && <div style={{ marginTop: 0 }}>
              <div style={{ color: T.text, fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 20, marginBottom: 16 }}>
                Nutrition & Métabolisme
              </div>

              <Card style={{ padding: 20 }}>
                <div style={{ color: T.text, fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Calcul Mifflin-St Jeor</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                  {[
                    { key: 'weight', label: 'Poids (kg)', placeholder: '75' },
                    { key: 'height', label: 'Taille (cm)', placeholder: '175' },
                    { key: 'age', label: 'Âge', placeholder: '25' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                      <input type="number" value={nutri[key]} onChange={(e) => setNutri((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', color: T.text, fontSize: 14, outline: 'none' }} />
                    </div>
                  ))}

                  <div>
                    <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Sexe</div>
                    <select value={nutri.sex} onChange={(e) => setNutri((p) => ({ ...p, sex: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', color: T.text, fontSize: 14, outline: 'none', appearance: 'none' }}>
                      <option value="homme" style={{ background: '#1a1a2e' }}>Homme</option>
                      <option value="femme" style={{ background: '#1a1a2e' }}>Femme</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Activité</div>
                    <select value={nutri.activity} onChange={(e) => setNutri((p) => ({ ...p, activity: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', color: T.text, fontSize: 14, outline: 'none', appearance: 'none' }}>
                      <option value="1.2" style={{ background: '#1a1a2e' }}>Sédentaire</option>
                      <option value="1.375" style={{ background: '#1a1a2e' }}>Légèrement actif</option>
                      <option value="1.55" style={{ background: '#1a1a2e' }}>Modérément actif</option>
                      <option value="1.725" style={{ background: '#1a1a2e' }}>Très actif</option>
                      <option value="1.9" style={{ background: '#1a1a2e' }}>Extrêmement actif</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Objectif</div>
                    <select value={nutri.goal} onChange={(e) => setNutri((p) => ({ ...p, goal: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', color: T.text, fontSize: 14, outline: 'none', appearance: 'none' }}>
                      <option value="deficit" style={{ background: '#1a1a2e' }}>Perte de poids (−400 kcal)</option>
                      <option value="maintain" style={{ background: '#1a1a2e' }}>Maintien</option>
                      <option value="surplus" style={{ background: '#1a1a2e' }}>Prise de masse (+300 kcal)</option>
                    </select>
                  </div>
                </div>

                {calculated && (
                  <div style={{ background: 'rgba(62,207,142,0.06)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 10 }}>
                      {[
                        { label: 'Métabolisme base', value: `${calculated.bmr} kcal`, color: T.accentLight },
                        { label: 'Dépense totale', value: `${calculated.tdee} kcal`, color: T.accentLight },
                        { label: 'Objectif', value: `${calculated.calories} kcal`, color: '#fbbf24', big: true },
                      ].map(({ label, value, color, big }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: big ? 22 : 18, fontWeight: 900, color, fontFamily: T.fontDisplay }}>{value}</div>
                          <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Protéines', value: `${calculated.proteins}g`, color: '#4d9fff' },
                        { label: 'Glucides', value: `${calculated.carbs}g`, color: '#3ecf8e' },
                        { label: 'Lipides', value: `${calculated.fats}g`, color: '#ff7043' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ padding: '6px 14px', borderRadius: 20, background: `${color}15`, border: `1px solid ${color}30` }}>
                          <span style={{ fontWeight: 800, color, fontSize: 13 }}>{value}</span>
                          <span style={{ color: T.textDim, fontSize: 12, marginLeft: 5 }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!calculated && (
                  <div style={{ color: T.textDim, fontSize: 13, marginBottom: 14, textAlign: 'center', padding: '12px 0' }}>
                    Renseigne poids, taille et âge pour voir le calcul
                  </div>
                )}

                {nutriMsg && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: nutriMsg.includes('Erreur') ? '#ff7b7b' : T.accentLight, marginBottom: 10 }}>
                    {nutriMsg}
                  </div>
                )}

                <Btn onClick={saveNutriGoals} disabled={!calculated || nutriSaving}>
                  {nutriSaving ? 'Enregistrement...' : 'Assigner ces objectifs au client'}
                </Btn>

                {nutriGoals && (
                  <div style={{ marginTop: 10, fontSize: 12, color: T.textDim }}>
                    Objectifs actuels : {nutriGoals.calories} kcal · P {nutriGoals.proteins}g · G {nutriGoals.carbs}g · L {nutriGoals.fats}g
                  </div>
                )}
              </Card>
            </div>}

            {activeTab === 'prepa' && <PrepDataView prepData={prepData} />}
          </>
        )}
      </div>
    </PageWrap>
  )
}

function scoreLabel2(total) {
  if (!total) return { text: '—', color: T.textDim }
  if (total <= 7) return { text: 'Très bon', color: '#3ecf8e' }
  if (total <= 13) return { text: 'Correct', color: '#3ecf8e' }
  if (total <= 20) return { text: 'Vigilance', color: '#fbbf24' }
  return { text: 'Fatigue importante', color: '#ff4566' }
}
function calc1RMLocal(w, r) {
  const wn = parseFloat(w), rn = parseInt(r)
  if (!wn || !rn) return null
  return Math.round(wn * (1 + rn / 30) * 10) / 10
}
function MiniLine({ data, color = '#3ecf8e' }) {
  if (data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 0.1
  const W = 100, pad = 6, h = 50
  const pts = data.map((v, i) => `${(pad + (i / (data.length - 1)) * (W - pad * 2)).toFixed(1)},${(h - pad - ((v - min) / range) * (h - pad * 2)).toFixed(1)}`).join(' ')
  return <svg viewBox={`0 0 ${W} ${h}`} style={{ width: '100%', display: 'block' }} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function PrepDataView({ prepData }) {
  const { hooper, compo, topsets, charge } = prepData
  const today = new Date().toISOString().split('T')[0]
  const lastH = hooper[0], lastC = compo[0]
  const hooperScore = lastH ? lastH.fatigue + lastH.sommeil + lastH.stress + lastH.courbatures : null
  const si = scoreLabel2(hooperScore)

  function getWk(d) { const dt = new Date(d + 'T00:00:00'), day = dt.getDay() || 7; dt.setDate(dt.getDate() - day + 1); return dt.toISOString().split('T')[0] }
  const wkCharge = charge.reduce((acc, c) => { const wk = getWk(c.date); acc[wk] = (acc[wk] || 0) + (c.charge_ua || c.rpe * c.duree_min); return acc }, {})
  const wkKeys = Object.keys(wkCharge).sort()
  const curWk = getWk(today), idx = wkKeys.indexOf(curWk)
  const acute = wkCharge[curWk] || 0
  const chronic = wkKeys.slice(Math.max(0, idx - 3), idx + 1).map((k) => wkCharge[k])
  const chronAvg = chronic.length ? chronic.reduce((a, b) => a + b, 0) / chronic.length : 0
  const acwr = chronAvg ? Math.round((acute / chronAvg) * 100) / 100 : null

  const prs = topsets.reduce((acc, log) => {
    const rm = log.estimated_1rm || calc1RMLocal(log.weight_kg, log.reps)
    if (!acc[log.exercise_name] || (rm || 0) > (acc[log.exercise_name].rm || 0)) acc[log.exercise_name] = { ...log, rm }
    return acc
  }, {})

  const acwrColor = !acwr ? T.textDim : acwr <= 1.3 ? '#3ecf8e' : acwr <= 1.5 ? '#fbbf24' : '#ff4566'

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>HOOPER</div>
        {lastH ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 36, fontWeight: 900, color: si.color, fontFamily: T.fontDisplay, lineHeight: 1 }}>{hooperScore}<span style={{ fontSize: 16 }}>/40</span></div>
                <div style={{ fontSize: 13, color: si.color, fontWeight: 700, marginTop: 4 }}>{si.text}</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{lastH.date === today ? "✓ Rempli aujourd'hui" : `Il y a ${Math.floor((Date.now() - new Date(lastH.date + 'T00:00:00').getTime()) / 86400000)}j`}</div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                {[['Fatigue', lastH.fatigue, '#ff7043'], ['Sommeil', lastH.sommeil, '#9d7dea'], ['Stress', lastH.stress, '#4d9fff'], ['Courbatures', lastH.courbatures, '#ff4566']].map(([l, v, c]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12 }}>
                    <span style={{ color: T.textDim }}>{l}</span><span style={{ color: c, fontWeight: 700 }}>{v}/10</span>
                  </div>
                ))}
              </div>
            </div>
            {hooper.length >= 2 && <MiniLine data={hooper.slice(0, 14).reverse().map((h) => h.fatigue + h.sommeil + h.stress + h.courbatures)} color={si.color} />}
            {lastH.doms_zones && Object.values(lastH.doms_zones).some((z) => z.level > 0) && (
              <div style={{ marginTop: 8, padding: '7px 12px', background: 'rgba(255,69,102,0.06)', borderRadius: 10, fontSize: 12, color: '#ff4566' }}>
                🩹 DOMS : {Object.entries(lastH.doms_zones).filter(([, v]) => v.level > 0).map(([k]) => k.replace('_', ' ')).join(', ')}
              </div>
            )}
          </div>
        ) : <div style={{ color: T.textDim, fontSize: 13 }}>Aucun questionnaire rempli</div>}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 }}>Composition corporelle</div>
          {lastC ? (() => {
            let n = null; try { n = lastC.notes ? JSON.parse(lastC.notes) : null } catch {}
            return (
              <div style={{ display: 'grid', gap: 8 }}>
                {/* Impédancemétrie */}
                {[['Poids', lastC.weight_kg, 'kg', '#3ecf8e'], ['Masse grasse', lastC.body_fat_pct, '%', '#ff7043'], ['Masse maigre', lastC.muscle_mass_kg, 'kg', '#4d9fff']].filter(([, v]) => v).map(([l, v, u, c]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: T.textDim }}>{l}</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: c, fontFamily: T.fontDisplay }}>{v}<span style={{ fontSize: 10, marginLeft: 2 }}>{u}</span></span>
                  </div>
                ))}
                {/* Pliométrie */}
                {n?.mg1?.resultat && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: T.textDim }}>MG1 (4 plis)</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{n.mg1.resultat}%</span>
                  </div>
                )}
                {n?.mg2?.resultat && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: T.textDim }}>MG2 (7 plis)</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#ff7043' }}>{n.mg2.resultat}%</span>
                  </div>
                )}
                {/* Silhouette */}
                {n?.silhouette && Object.values(n.silhouette).some(v => v) && (
                  <div style={{ marginTop: 4, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6, fontWeight: 700 }}>Silhouette (cm)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      {[['epaule','Épaule'],['poitrine','Poitrine'],['hanche','Hanche'],['taille','Taille'],['cuisse','Cuisse'],['genoux','Genoux']].filter(([k]) => n.silhouette[k]).map(([k,l]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: T.textDim }}>{l}</span>
                          <span style={{ color: T.text, fontWeight: 700 }}>{n.silhouette[k]}cm</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Conditions */}
                {n?.impedance && (
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {n.heure && <span>🕐 {n.heure}</span>}
                    {n.impedance.eau_litres && <span>💧{n.impedance.eau_litres}L</span>}
                    {n.impedance.alcool_veille && <span>🍷Alcool</span>}
                    {n.impedance.cafeine_veille && <span>☕Caféïne</span>}
                    {n.impedance.cycle_phase && n.impedance.cycle_phase !== 'na' && <span>🔄{n.impedance.cycle_phase}</span>}
                  </div>
                )}
                <div style={{ fontSize: 10, color: T.textDim }}>{new Date(lastC.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            )
          })() : <div style={{ color: T.textDim, fontSize: 12 }}>Aucune mesure</div>}
        </Card>

        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 }}>Charge externe</div>
          {acwr !== null ? (
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: acwrColor, fontFamily: T.fontDisplay }}>{acwr}</div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>ACWR · {Math.round(acute)} UA / semaine</div>
            </div>
          ) : <div style={{ color: T.textDim, fontSize: 12 }}>Pas assez de données</div>}
        </Card>
      </div>

      {Object.keys(prs).length > 0 && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 }}>TOPSET — Records</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {Object.values(prs).sort((a, b) => (b.rm || 0) - (a.rm || 0)).slice(0, 6).map((pr) => (
              <div key={pr.exercise_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{pr.exercise_name}</div>
                  <div style={{ fontSize: 11, color: T.textDim }}>{pr.weight_kg}kg{pr.reps ? ` × ${pr.reps}` : ''}{pr.rpe ? ` @RPE${pr.rpe}` : ''}</div>
                </div>
                {pr.rm && <div style={{ fontSize: 18, fontWeight: 900, color: T.accentLight, fontFamily: T.fontDisplay }}>~{pr.rm}kg</div>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
