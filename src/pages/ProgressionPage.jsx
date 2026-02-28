import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Select, StatCard, PageWrap } from '../components/UI'
import { ALL_EXERCISES, CHART_COLORS, T } from '../lib/data'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: T.radiusSm, padding: '10px 14px',
      boxShadow: T.shadowCard,
    }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 11, color: T.accent, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 18, color: p.color }}>
          {p.value} <span style={{ fontSize: 11, fontWeight: 400, color: T.textMid }}>{p.name === 'weight' ? 'kg' : 'rép.'}</span>
        </div>
      ))}
    </div>
  )
}

export default function ProgressionPage() {
  const { user } = useAuth()
  const [allSessions, setAllSessions] = useState([])
  const [usedExercises, setUsedExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [metric, setMetric] = useState('weight')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: sessions } = await supabase.from('sessions').select('id, date, seance_type').eq('user_id', user.id).order('date')
      if (!sessions?.length) { setLoading(false); return }
      const ids = sessions.map(s => s.id)
      const { data: sets } = await supabase.from('sets').select('*').in('session_id', ids)
      const merged = sessions.map(s => ({ ...s, sets: (sets || []).filter(set => set.session_id === s.id) }))
      setAllSessions(merged)
      const exos = [...new Set((sets || []).map(s => s.exercise))]
      setUsedExercises(exos)
      if (exos.length) setSelectedExercise(exos[0])
      setLoading(false)
    }
    load()
  }, [user.id])

  const chartData = (() => {
    if (!selectedExercise) return []
    const points = []
    allSessions.forEach(session => {
      const matching = session.sets.filter(s => s.exercise === selectedExercise && s[metric])
      if (!matching.length) return
      const best = matching.reduce((acc, s) => (parseFloat(s[metric]) || 0) > (parseFloat(acc[metric]) || 0) ? s : acc, matching[0])
      const val = parseFloat(best[metric])
      if (val > 0) points.push({ date: session.date, [metric]: val })
    })
    return points
  })()

  const stats = (() => {
    if (!chartData.length) return null
    const vals = chartData.map(d => d[metric])
    return {
      max: Math.max(...vals),
      last: vals[vals.length - 1],
      first: vals[0],
      progress: vals.length > 1 ? ((vals[vals.length - 1] - vals[0]) / vals[0] * 100).toFixed(1) : 0,
      sessions: chartData.length,
    }
  })()

  const unit = metric === 'weight' ? 'kg' : 'rép.'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: T.textDim, fontFamily: T.fontDisplay, letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' }}>
      Chargement...
    </div>
  )

  if (!allSessions.length) return (
    <PageWrap>
      <Card style={{ textAlign: 'center', padding: '60px 40px' }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 60, color: T.border, marginBottom: 16 }}>◎</div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 20, color: T.text, letterSpacing: 1, marginBottom: 8 }}>AUCUNE DONNÉE</div>
        <div style={{ fontSize: 14, color: T.textMid }}>Enregistre ta première séance pour voir ta progression.</div>
      </Card>
    </PageWrap>
  )

  return (
    <PageWrap>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 36, letterSpacing: 2, color: T.text, lineHeight: 1 }}>PROGRESSION</div>
        <div style={{ fontSize: 14, color: T.textMid, marginTop: 6 }}>Suivi de tes performances dans le temps</div>
      </div>

      {/* Filtres */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <Select label="Exercice" value={selectedExercise} onChange={setSelectedExercise} options={usedExercises.length ? usedExercises : ALL_EXERCISES} />
          <Select label="Métrique" value={metric} onChange={setMetric} options={[{ value: 'weight', label: 'Charge (kg)' }, { value: 'reps', label: 'Répétitions' }]} />
        </div>
      </Card>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <StatCard label="Record" value={`${stats.max}`} sub={unit} accent />
          <StatCard label="Dernière" value={`${stats.last}`} sub={unit} />
          <StatCard label="Départ" value={`${stats.first}`} sub={unit} />
          <StatCard
            label="Progression"
            value={`${stats.progress > 0 ? '+' : ''}${stats.progress}%`}
            sub="depuis le début"
            accent={stats.progress > 0}
          />
          <StatCard label="Séances" value={stats.sessions} sub="avec cet exo" />
        </div>
      )}

      {/* Graphique principal */}
      <Card glow>
        <Label>{selectedExercise} — {metric === 'weight' ? 'Charge (kg)' : 'Répétitions'}</Label>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.fontBody }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.fontBody }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {stats && <ReferenceLine y={stats.max} stroke={T.accent + '33'} strokeDasharray="4 4" />}
              <Area type="monotone" dataKey={metric} stroke={T.accent} strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: T.accent, r: 4, strokeWidth: 0 }} activeDot={{ r: 7, fill: T.accent, strokeWidth: 2, stroke: T.bg }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: 50, color: T.textDim, fontFamily: T.fontDisplay, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
            {chartData.length === 1 ? 'Continue — une séance de plus pour voir la courbe' : 'Pas de données pour cet exercice'}
          </div>
        )}
      </Card>
    </PageWrap>
  )
}
