import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, Label, Select, StatCard, PageWrap } from '../components/UI'
import { ALL_EXERCISES, CHART_COLORS, SEANCE_ICONS, T } from '../lib/data'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function CoachPage() {
  const [athletes, setAthletes] = useState([])
  const [selected, setSelected] = useState('')
  const [sessions, setSessions] = useState([])
  const [usedExos, setUsedExos] = useState([])
  const [exercise, setExercise] = useState('')
  const [metric, setMetric] = useState('weight')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email').eq('role', 'athlete').order('full_name')
      .then(({ data }) => {
        setAthletes(data || [])
        if (data?.length) setSelected(data[0].id)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selected) return
    async function loadAthlete() {
      const { data: sess } = await supabase.from('sessions').select('id, date, seance_type').eq('user_id', selected).order('date')
      if (!sess?.length) { setSessions([]); setUsedExos([]); return }
      const ids = sess.map(s => s.id)
      const { data: sets } = await supabase.from('sets').select('*').in('session_id', ids)
      setSessions(sess.map(s => ({ ...s, sets: (sets || []).filter(set => set.session_id === s.id) })))
      const exos = [...new Set((sets || []).map(s => s.exercise))]
      setUsedExos(exos)
      if (exos.length) setExercise(exos[0])
    }
    loadAthlete()
  }, [selected])

  const chartData = (() => {
    if (!exercise) return []
    return sessions.flatMap(session => {
      const matching = session.sets.filter(s => s.exercise === exercise && s[metric])
      if (!matching.length) return []
      const best = matching.reduce((acc, s) => (parseFloat(s[metric]) || 0) > (parseFloat(acc[metric]) || 0) ? s : acc, matching[0])
      const val = parseFloat(best[metric])
      return val > 0 ? [{ date: session.date, [metric]: val }] : []
    })
  })()

  const stats = (() => {
    if (!chartData.length) return null
    const vals = chartData.map(d => d[metric])
    return { max: Math.max(...vals), last: vals[vals.length - 1], progress: vals.length > 1 ? ((vals[vals.length - 1] - vals[0]) / vals[0] * 100).toFixed(1) : 0 }
  })()

  const currentAthlete = athletes.find(a => a.id === selected)
  const unit = metric === 'weight' ? 'kg' : 'rép.'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: T.textDim, fontFamily: T.fontDisplay, letterSpacing: 2, fontSize: 12 }}>
      Chargement...
    </div>
  )

  if (!athletes.length) return (
    <PageWrap>
      <Card style={{ textAlign: 'center', padding: '60px 40px' }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 60, color: T.border, marginBottom: 16 }}>◉</div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 20, color: T.text }}>AUCUN ATHLÈTE</div>
        <div style={{ fontSize: 14, color: T.textMid, marginTop: 8 }}>Tes athlètes apparaîtront ici une fois inscrits.</div>
      </Card>
    </PageWrap>
  )

  return (
    <PageWrap>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 36, letterSpacing: 2, color: T.text, lineHeight: 1 }}>VUE COACH</div>
        <div style={{ fontSize: 14, color: T.textMid, marginTop: 6 }}>{athletes.length} athlète{athletes.length > 1 ? 's' : ''} inscrit{athletes.length > 1 ? 's' : ''}</div>
      </div>

      {/* Athlete selector */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {athletes.map((a, i) => (
          <button key={a.id} onClick={() => setSelected(a.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: selected === a.id ? T.accentGlow : T.card,
            border: `1px solid ${selected === a.id ? T.accent + '55' : T.border}`,
            borderRadius: T.radiusLg, padding: '12px 16px', cursor: 'pointer', transition: 'all .2s',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: `${CHART_COLORS[i % CHART_COLORS.length]}22`,
              border: `2px solid ${CHART_COLORS[i % CHART_COLORS.length]}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 14,
              color: CHART_COLORS[i % CHART_COLORS.length],
            }}>
              {(a.full_name || a.email)[0].toUpperCase()}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: selected === a.id ? T.accent : T.text }}>
                {a.full_name || a.email}
              </div>
              <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>
                {selected === a.id ? `${sessions.length} séances` : 'Athlète'}
              </div>
            </div>
          </button>
        ))}
      </div>

      {currentAthlete && sessions.length > 0 && (
        <>
          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              <StatCard label="Séances" value={sessions.length} accent />
              <StatCard label="Record" value={`${stats.max} ${unit}`} />
              <StatCard label="Dernière" value={`${stats.last} ${unit}`} />
              <StatCard label="Progression" value={`${stats.progress > 0 ? '+' : ''}${stats.progress}%`} accent={stats.progress > 0} />
            </div>
          )}

          {/* Filtres */}
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <Select label="Exercice" value={exercise} onChange={setExercise} options={usedExos.length ? usedExos : ALL_EXERCISES} />
              <Select label="Métrique" value={metric} onChange={setMetric} options={[{ value: 'weight', label: 'Charge (kg)' }, { value: 'reps', label: 'Répétitions' }]} />
            </div>
          </Card>

          {/* Chart */}
          <Card glow>
            <Label>{currentAthlete.full_name} — {exercise}</Label>
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="coachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.accent} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusSm }} />
                  <Area type="monotone" dataKey={metric} stroke={T.accent} strokeWidth={2.5} fill="url(#coachGrad)" dot={{ fill: T.accent, r: 4, strokeWidth: 0 }} activeDot={{ r: 7, fill: T.accent }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: T.textDim, fontFamily: T.fontDisplay, fontSize: 11, letterSpacing: 2 }}>
                PAS ASSEZ DE DONNÉES
              </div>
            )}
          </Card>

          {/* Recent sessions */}
          <Card>
            <Label>Dernières séances</Label>
            {[...sessions].reverse().slice(0, 6).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: `1px solid ${T.surface}` }}>
                <div style={{ fontSize: 18 }}>{SEANCE_ICONS[s.seance_type] || '💪'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: T.text }}>{s.seance_type}</div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{s.sets.length} séries</div>
                </div>
                <div style={{ fontFamily: T.fontDisplay, fontSize: 11, color: T.textDim, letterSpacing: 1 }}>{s.date}</div>
              </div>
            ))}
          </Card>
        </>
      )}

      {currentAthlete && !sessions.length && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 13, color: T.textDim }}>{currentAthlete.full_name} n'a pas encore enregistré de séance.</div>
        </Card>
      )}
    </PageWrap>
  )
}
