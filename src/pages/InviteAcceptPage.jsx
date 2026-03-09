import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, Label, Select, StatCard, PageWrap, Btn, Input } from '../components/UI'
import { CHART_COLORS, SEANCE_ICONS, T } from '../lib/data'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../components/AuthContext'

function estimate1RM(weight, reps) {
  const w = Number(weight || 0)
  const r = Number(reps || 0)
  if (!w || !r) return 0
  return w * (1 + r / 30)
}

function getClientStatus(sessions) {
  if (!sessions?.length) {
    return {
      label: 'Aucune donnée',
      tone: 'neutral',
      note: 'Aucune séance enregistrée.',
    }
  }

  const sorted = [...sessions].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const recent = sorted.slice(0, 3)
  const latest = recent[0]

  const daysSinceLast = latest?.date
    ? Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  if (daysSinceLast !== null && daysSinceLast > 10) {
    return {
      label: 'Inactif',
      tone: 'neutral',
      note: `Aucune séance depuis ${daysSinceLast} jours.`,
    }
  }

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

    if (avgRpe >= 9 && lastVolume <= firstVolume) {
      return {
        label: 'Fatigue haute',
        tone: 'danger',
        note: 'RPE élevé et progression récente faible.',
      }
    }

    if (recent.length >= 3) {
      const maxVolume = Math.max(...volumes)
      const minVolume = Math.min(...volumes)
      const stable = maxVolume - minVolume < Math.max(1, maxVolume * 0.05)

      if (stable) {
        return {
          label: 'Stagnation',
          tone: 'warn',
          note: 'Volume global très stable sur les dernières séances.',
        }
      }
    }

    if (lastVolume > firstVolume * 1.05) {
      return {
        label: 'Progression',
        tone: 'accent',
        note: 'Volume récent en hausse.',
      }
    }
  }

  return {
    label: 'Stable',
    tone: 'neutral',
    note: 'Tendance globalement stable.',
  }
}

function getToneStyle(tone) {
  if (tone === 'accent') {
    return {
      background: 'rgba(45,255,155,0.10)',
      border: `1px solid ${T.accent + '28'}`,
      color: T.accentLight,
    }
  }

  if (tone === 'warn') {
    return {
      background: 'rgba(255,180,80,0.10)',
      border: '1px solid rgba(255,180,80,0.24)',
      color: '#FFC783',
    }
  }

  if (tone === 'danger') {
    return {
      background: 'rgba(255,110,110,0.10)',
      border: '1px solid rgba(255,110,110,0.24)',
      color: '#FF9D9D',
    }
  }

  return {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: T.textMid,
  }
}

export default function CoachPage() {
  const { user } = useAuth()

  const [athletes, setAthletes] = useState([])
  const [selected, setSelected] = useState('')
  const [sessions, setSessions] = useState([])
  const [usedExos, setUsedExos] = useState([])
  const [exercise, setExercise] = useState('')
  const [metric, setMetric] = useState('weight')
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function loadAthletes() {
      if (!user?.id) return

      setLoading(true)

      const { data: links, error: linksError } = await supabase
        .from('coach_clients')
        .select('client_id')
        .eq('coach_id', user.id)

      if (linksError) {
        console.error('Erreur chargement relations coach_clients:', linksError)
        setAthletes([])
        setSelected('')
        setLoading(false)
        return
      }

      const clientIds = (links || []).map((row) => row.client_id).filter(Boolean)

      if (!clientIds.length) {
        setAthletes([])
        setSelected('')
        setLoading(false)
        return
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', clientIds)
        .order('full_name')

      if (profilesError) {
        console.error('Erreur chargement profils clients:', profilesError)
        setAthletes([])
        setSelected('')
        setLoading(false)
        return
      }

      const builtAthletes = profiles || []
      setAthletes(builtAthletes)

      if (builtAthletes.length) {
        setSelected((current) =>
          builtAthletes.some((a) => a.id === current) ? current : builtAthletes[0].id
        )
      } else {
        setSelected('')
      }

      setLoading(false)
    }

    loadAthletes()
  }, [user?.id])

  useEffect(() => {
    if (!selected) {
      setSessions([])
      setUsedExos([])
      setExercise('')
      return
    }

    async function loadAthlete() {
      const { data: sess, error: sessError } = await supabase
        .from('sessions')
        .select('id, date, seance_type')
        .eq('user_id', selected)
        .order('date')

      if (sessError) {
        console.error('Erreur chargement sessions athlete:', sessError)
        setSessions([])
        setUsedExos([])
        setExercise('')
        return
      }

      if (!sess?.length) {
        setSessions([])
        setUsedExos([])
        setExercise('')
        return
      }

      const ids = sess.map((s) => s.id)

      const { data: sets, error: setsError } = await supabase
        .from('sets')
        .select('*')
        .in('session_id', ids)

      if (setsError) {
        console.error('Erreur chargement sets athlete:', setsError)
      }

      const builtSessions = sess.map((s) => ({
        ...s,
        sets: (sets || []).filter((set) => set.session_id === s.id),
      }))

      setSessions(builtSessions)

      const exos = [...new Set((sets || []).map((s) => s.exercise).filter(Boolean))]
      setUsedExos(exos)

      if (exos.length) {
        setExercise((current) => (exos.includes(current) ? current : exos[0]))
      } else {
        setExercise('')
      }
    }

    loadAthlete()
  }, [selected])

  async function createInvite() {
    if (!inviteEmail.trim() || !user?.id) return

    setInviteLoading(true)
    setInviteLink('')

    const token =
      globalThis.crypto?.randomUUID?.().replace(/-/g, '') ||
      `${Date.now()}${Math.random().toString(36).slice(2, 12)}`

    const { error } = await supabase.from('coach_invites').insert({
      coach_id: user.id,
      email: inviteEmail.trim().toLowerCase(),
      invite_token: token,
      status: 'pending',
    })

    if (error) {
      console.error('Erreur création invitation:', error)
      alert(error.message || "Impossible de créer l'invitation.")
      setInviteLoading(false)
      return
    }

    setInviteLink(`${window.location.origin}/invite/${token}`)
    setInviteLoading(false)
  }

  async function copyInviteLink() {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink)
      alert('Lien copié')
    } catch (error) {
      console.error(error)
      alert('Impossible de copier le lien')
    }
  }

  const chartData = useMemo(() => {
    if (!exercise) return []

    return sessions.flatMap((session) => {
      const matching = session.sets.filter((s) => s.exercise === exercise && s[metric] != null)

      if (!matching.length) return []

      const best =
        metric === 'weight'
          ? matching.reduce((acc, s) =>
              (parseFloat(s.weight) || 0) > (parseFloat(acc.weight) || 0) ? s : acc
            , matching[0])
          : matching.reduce((acc, s) =>
              (parseFloat(s.reps) || 0) > (parseFloat(acc.reps) || 0) ? s : acc
            , matching[0])

      const val = parseFloat(best[metric])

      return val > 0 ? [{ date: session.date, [metric]: val }] : []
    })
  }, [sessions, exercise, metric])

  const stats = useMemo(() => {
    if (!chartData.length) return null

    const vals = chartData.map((d) => d[metric])
    const first = vals[0]
    const last = vals[vals.length - 1]

    return {
      max: Math.max(...vals),
      last,
      progress:
        vals.length > 1 && first
          ? (((last - first) / first) * 100).toFixed(1)
          : '0.0',
    }
  }, [chartData, metric])

  const radarClients = useMemo(() => {
    return athletes.map((athlete) => {
      const athleteSessions = sessions.length && athlete.id === selected ? sessions : []
      const status = athlete.id === selected ? getClientStatus(athleteSessions) : null

      return {
        ...athlete,
        status,
      }
    })
  }, [athletes, sessions, selected])

  const currentAthlete = athletes.find((a) => a.id === selected)
  const currentStatus = getClientStatus(sessions)
  const unit = metric === 'weight' ? 'kg' : 'rép.'

  const totalSets = sessions.reduce((sum, session) => sum + (session.sets?.length || 0), 0)

  const bestEstimated1RM = useMemo(() => {
    const values = sessions.flatMap((session) =>
      (session.sets || []).map((set) => estimate1RM(set.weight, set.reps))
    )
    return values.length ? Math.max(...values) : 0
  }, [sessions])

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
          letterSpacing: 2,
          fontSize: 12,
        }}
      >
        Chargement...
      </div>
    )
  }

  if (!athletes.length) {
    return (
      <PageWrap>
        <div style={{ display: 'grid', gap: 18, maxWidth: 980 }}>
          <Card style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div
              style={{
                fontFamily: T.fontDisplay,
                fontWeight: 900,
                fontSize: 60,
                color: T.border,
                marginBottom: 16,
              }}
            >
              ◉
            </div>
            <div
              style={{
                fontFamily: T.fontDisplay,
                fontWeight: 800,
                fontSize: 20,
                color: T.text,
              }}
            >
              AUCUN CLIENT
            </div>
            <div style={{ fontSize: 14, color: T.textMid, marginTop: 8 }}>
              Commence par inviter ton premier client.
            </div>
          </Card>

          <Card>
            <Label>Inviter un client</Label>

            <div style={{ display: 'grid', gap: 12 }}>
              <Input
                label="Email"
                value={inviteEmail}
                onChange={setInviteEmail}
                placeholder="client@email.com"
              />

              <Btn onClick={createInvite} disabled={inviteLoading || !inviteEmail.trim()}>
                {inviteLoading ? 'Création...' : "Générer un lien d'invitation"}
              </Btn>

              {inviteLink ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                      background: T.surface,
                      color: T.textMid,
                      fontSize: 12,
                      wordBreak: 'break-all',
                    }}
                  >
                    {inviteLink}
                  </div>

                  <Btn variant="secondary" onClick={copyInviteLink}>
                    Copier le lien
                  </Btn>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </PageWrap>
    )
  }

  return (
    <PageWrap>
      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontFamily: T.fontDisplay,
              fontWeight: 900,
              fontSize: isMobile ? 28 : 36,
              letterSpacing: 2,
              color: T.text,
              lineHeight: 1,
            }}
          >
            VUE COACH
          </div>

          <div style={{ fontSize: 14, color: T.textMid, marginTop: 6 }}>
            {athletes.length} client{athletes.length > 1 ? 's' : ''}
          </div>
        </div>

        <Card
          style={{
            padding: isMobile ? '14px 14px' : '18px 18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <Label>Radar clients</Label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile
                    ? '1fr'
                    : 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 10,
                }}
              >
                {radarClients.map((athlete, i) => {
                  const active = selected === athlete.id
                  const toneStyle = athlete.status
                    ? getToneStyle(athlete.status.tone)
                    : getToneStyle('neutral')

                  return (
                    <button
                      key={athlete.id}
                      onClick={() => setSelected(athlete.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: active ? T.accentGlow : T.card,
                        border: `1px solid ${active ? T.accent + '55' : T.border}`,
                        borderRadius: T.radiusLg,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: `${CHART_COLORS[i % CHART_COLORS.length]}22`,
                          border: `2px solid ${CHART_COLORS[i % CHART_COLORS.length]}55`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: T.fontDisplay,
                          fontWeight: 900,
                          fontSize: 14,
                          color: CHART_COLORS[i % CHART_COLORS.length],
                          flexShrink: 0,
                        }}
                      >
                        {(athlete.full_name || athlete.email || '?')[0].toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontFamily: T.fontDisplay,
                            fontWeight: 700,
                            fontSize: 13,
                            color: active ? T.accent : T.text,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {athlete.full_name || athlete.email}
                        </div>

                        <div
                          style={{
                            ...toneStyle,
                            display: 'inline-flex',
                            marginTop: 6,
                            padding: '5px 8px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {athlete.status?.label || 'Client'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              style={{
                width: isMobile ? '100%' : 320,
                maxWidth: '100%',
              }}
            >
              <Label>Inviter un client</Label>

              <div style={{ display: 'grid', gap: 10 }}>
                <Input
                  label="Email"
                  value={inviteEmail}
                  onChange={setInviteEmail}
                  placeholder="client@email.com"
                />

                <Btn onClick={createInvite} disabled={inviteLoading || !inviteEmail.trim()}>
                  {inviteLoading ? 'Création...' : "Générer un lien"}
                </Btn>

                {inviteLink ? (
                  <>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: `1px solid ${T.border}`,
                        background: T.surface,
                        color: T.textMid,
                        fontSize: 12,
                        wordBreak: 'break-all',
                      }}
                    >
                      {inviteLink}
                    </div>

                    <Btn variant="secondary" onClick={copyInviteLink}>
                      Copier le lien
                    </Btn>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        {currentAthlete ? (
          <>
            <Card
              style={{
                padding: isMobile ? '14px 14px' : '18px 18px',
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
                      fontFamily: T.fontDisplay,
                      fontWeight: 800,
                      fontSize: isMobile ? 18 : 20,
                    }}
                  >
                    {currentAthlete.full_name || currentAthlete.email}
                  </div>

                  <div style={{ color: T.textMid, fontSize: 13, marginTop: 6 }}>
                    {currentStatus.note}
                  </div>
                </div>

                <div
                  style={{
                    ...getToneStyle(currentStatus.tone),
                    display: 'inline-flex',
                    padding: '7px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {currentStatus.label}
                </div>
              </div>
            </Card>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? '1fr 1fr'
                  : 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 10,
              }}
            >
              <StatCard label="Séances" value={sessions.length} accent />
              <StatCard label="Séries" value={totalSets} />
              <StatCard
                label="Record"
                value={stats ? `${stats.max} ${unit}` : '—'}
              />
              <StatCard
                label="Dernière"
                value={stats ? `${stats.last} ${unit}` : '—'}
              />
              <StatCard
                label="Progression"
                value={stats ? `${Number(stats.progress) > 0 ? '+' : ''}${stats.progress}%` : '—'}
                accent={stats ? Number(stats.progress) > 0 : false}
              />
              <StatCard
                label="1RM estimé"
                value={bestEstimated1RM ? `${bestEstimated1RM.toFixed(1)} kg` : '—'}
              />
            </div>

            <Card>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(200px, 1fr))',
                  gap: 16,
                }}
              >
                <Select
                  label="Exercice"
                  value={exercise}
                  onChange={setExercise}
                  options={usedExos.map((e) => ({ value: e, label: e }))}
                />

                <Select
                  label="Métrique"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: 'weight', label: 'Charge (kg)' },
                    { value: 'reps', label: 'Répétitions' },
                  ]}
                />
              </div>
            </Card>

            <Card glow>
              <Label>
                {currentAthlete.full_name || currentAthlete.email}
                {exercise ? ` — ${exercise}` : ''}
              </Label>

              {chartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="coachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T.accent} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: T.textDim, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: T.textDim, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: T.card,
                        border: `1px solid ${T.border}`,
                        borderRadius: T.radiusSm,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={metric}
                      stroke={T.accent}
                      strokeWidth={2.5}
                      fill="url(#coachGrad)"
                      dot={{ fill: T.accent, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 7, fill: T.accent }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: T.textDim,
                    fontFamily: T.fontDisplay,
                    fontSize: 11,
                    letterSpacing: 2,
                  }}
                >
                  PAS ASSEZ DE DONNÉES
                </div>
              )}
            </Card>

            <Card>
              <Label>Dernières séances</Label>

              {[...sessions].reverse().slice(0, 6).map((s) => {
                const totalVolume = (s.sets || []).reduce(
                  (sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0),
                  0
                )

                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '11px 0',
                      borderBottom: `1px solid ${T.surface}`,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ fontSize: 18 }}>{SEANCE_ICONS[s.seance_type] || '💪'}</div>

                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div
                        style={{
                          fontFamily: T.fontDisplay,
                          fontWeight: 700,
                          fontSize: 13,
                          color: T.text,
                        }}
                      >
                        {s.seance_type}
                      </div>

                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                        {s.sets.length} séries • {Math.round(totalVolume)} kg volume
                      </div>
                    </div>

                    <div
                      style={{
                        fontFamily: T.fontDisplay,
                        fontSize: 11,
                        color: T.textDim,
                        letterSpacing: 1,
                      }}
                    >
                      {s.date}
                    </div>
                  </div>
                )
              })}
            </Card>
          </>
        ) : null}
      </div>
    </PageWrap>
  )
}