import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calc1RM(weight, reps) {
  const w = parseFloat(weight), r = parseInt(reps)
  if (!w || !r || r <= 0) return null
  return Math.round(w * (1 + r / 30) * 10) / 10
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function getWeekLabel(weekKey) {
  const d = new Date(weekKey + 'T00:00:00')
  const end = new Date(d); end.setDate(d.getDate() + 6)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

const RPE_COLORS = ['','#3ecf8e','#3ecf8e','#3ecf8e','#3ecf8e','#fbbf24','#fbbf24','#ff7043','#ff7043','#ff4566','#ff4566']

const PATTERNS = [
  {
    key: 'pousse_haut', label: 'Poussé haut', color: '#4d9fff', emoji: '⬆️',
    exercises: ['Développé couché barre','Développé couché haltères','Développé incliné','Développé décliné','Développé militaire','Développé militaire haltères','Pompes lestées','Dips lestés'],
  },
  {
    key: 'tire_haut', label: 'Tiré haut', color: '#9d7dea', emoji: '⬇️',
    exercises: ['Traction prise large','Traction prise serrée','Traction pronation','Tirage vertical prise large','Tirage vertical prise serrée','Rowing barre','Rowing haltère','Rowing poulie basse'],
  },
  {
    key: 'pousse_bas', label: 'Poussé bas', color: '#3ecf8e', emoji: '🦵',
    exercises: ['Squat barre','Squat avant','Goblet squat','Presse à cuisses','Fente barre','Fente haltères','Split squat','Fente bulgare'],
  },
  {
    key: 'tire_bas', label: 'Tiré bas', color: '#ff7043', emoji: '🏋️',
    exercises: ['Soulevé de terre','Soulevé de terre roumain','Soulevé de terre sumo','Good morning','Hip thrust barre','Hip thrust machine','Leg curl couché','Leg curl assis'],
  },
  {
    key: 'gainage', label: 'Gainage / Core', color: '#fbbf24', emoji: '🔷',
    exercises: ['Planche','Planche latérale','Rollout','Ab wheel','Crunch lesté','Relevé de jambes','Russian twist lesté','Pallof press'],
  },
  {
    key: 'explosif', label: 'Explosif / Pliométrique', color: '#ff4566', emoji: '⚡',
    exercises: ['Épaulé-jeté','Arraché','Épaulé','Jeté','Box jump lesté','Squat jump lesté','Médecine ball slam','Power clean'],
  },
  {
    key: 'cardio', label: 'Cardio / Conditioning', color: '#26d4e8', emoji: '🏃',
    exercises: ['Sprint','Rameur','Ski erg','Bike assault','Kettlebell swing','Burpees lestés','Sled push','Sled pull'],
  },
]

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ points, color = '#3ecf8e', h = 80, showDots = true, showGrid = true }) {
  if (points.length < 2) return (
    <div style={{ height: h, display: 'grid', placeItems: 'center', color: T.textDim, fontSize: 12 }}>
      Pas assez de données
    </div>
  )
  const vals = points.map(p => p.value)
  const max = Math.max(...vals), min = Math.min(...vals)
  const range = max - min || 1
  const W = 100, pad = 10

  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * (W - pad * 2),
    y: h - pad - ((p.value - min) / range) * (h - pad * 2),
    ...p
  }))

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')

  // Area fill
  const areaD = `${pathD} L ${coords[coords.length-1].x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`

  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width: '100%', display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {showGrid && [0.25, 0.5, 0.75].map(r => (
        <line key={r} x1={0} y1={h * r} x2={W} y2={h * r} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      ))}
      <path d={areaD} fill={`url(#grad-${color.replace('#','')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

// ─── Saisie d'un TOPSET ───────────────────────────────────────────────────────
function TopsetForm({ exercises, onSaved }) {
  const { user, profile, isCoach } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const [exerciseName, setExerciseName] = useState('')
  const [showExList, setShowExList] = useState(false)
  const [sets, setSets] = useState([{ weight: '', reps: '', rpe: '' }])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [selectedPattern, setSelectedPattern] = useState(null)

  const filteredEx = useMemo(() => {
    if (selectedPattern) {
      const pattern = PATTERNS.find(p => p.key === selectedPattern)
      if (pattern) {
        // Merge pattern exercises with DB exercises matching
        const patternExs = pattern.exercises
        const dbMatches = exercises.filter(e =>
          patternExs.some(pe => e.toLowerCase().includes(pe.split(' ')[0].toLowerCase()))
        )
        // Combine, deduplicate
        return [...new Set([...patternExs, ...dbMatches])]
      }
    }
    return exercises.filter(e =>
      !exerciseName || e.toLowerCase().includes(exerciseName.toLowerCase())
    )
  }, [selectedPattern, exercises, exerciseName])

  function addSet() { setSets(prev => [...prev, { weight: '', reps: '', rpe: '' }]) }
  function updateSet(i, key, val) { setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s)) }
  function removeSet(i) { setSets(prev => prev.filter((_, idx) => idx !== i)) }

  const bestSet = useMemo(() => {
    return sets.reduce((best, s) => {
      const rm = calc1RM(s.weight, s.reps)
      if (!rm) return best
      return !best || rm > calc1RM(best.weight, best.reps) ? s : best
    }, null)
  }, [sets])

  const best1RM = bestSet ? calc1RM(bestSet.weight, bestSet.reps) : null
  const totalVolume = sets.reduce((s, st) => s + (parseFloat(st.weight) || 0) * (parseInt(st.reps) || 0), 0)

  async function handleSave() {
    if (!exerciseName || sets.every(s => !s.weight)) return
    setSaving(true)
    for (const s of sets) {
      if (!s.weight) continue
      await supabase.from('topset_logs').insert({
        user_id: user.id, date: today,
        exercise_name: exerciseName,
        weight_kg: parseFloat(s.weight),
        reps: parseInt(s.reps) || null,
        rpe: parseFloat(s.rpe) || null,
        estimated_1rm: calc1RM(s.weight, s.reps),
        notes: notes || null,
      })
    }
    setSaving(false)
    setExerciseName(''); setSets([{ weight: '', reps: '', rpe: '' }]); setNotes('')
    onSaved()
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Pattern de mouvement */}
      <div>
        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Pattern de mouvement</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PATTERNS.map(p => (
            <button key={p.key} onClick={() => { setSelectedPattern(prev => prev === p.key ? null : p.key); setExerciseName('') }}
              style={{ padding: '6px 10px', borderRadius: 10, border: `1px solid ${selectedPattern === p.key ? p.color + '50' : T.border}`, background: selectedPattern === p.key ? `${p.color}15` : 'transparent', color: selectedPattern === p.key ? p.color : T.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exercice — liste déroulante selon le pattern */}
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Exercice</div>
        {selectedPattern ? (
          <select value={exerciseName} onChange={e => setExerciseName(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', color: exerciseName ? T.text : T.textDim, fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
            <option value="" style={{ background: '#1a1f2e' }}>— Choisir un exercice —</option>
            {filteredEx.map(ex => <option key={ex} value={ex} style={{ background: '#1a1f2e' }}>{ex}</option>)}
          </select>
        ) : (
          <>
            <input value={exerciseName} onChange={e => { setExerciseName(e.target.value); setShowExList(true) }}
              onFocus={() => setShowExList(true)}
              placeholder="Ou tape un exercice directement..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', color: T.text, fontSize: 14, outline: 'none' }} />
            {showExList && filteredEx.length > 0 && exerciseName && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#1a1f2e', border: `1px solid ${T.border}`, borderRadius: 10, maxHeight: 180, overflowY: 'auto', marginTop: 4 }}>
                {filteredEx.slice(0, 8).map(ex => (
                  <div key={ex} onClick={() => { setExerciseName(ex); setShowExList(false) }}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: T.text, borderBottom: `1px solid ${T.border}22` }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {ex}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Séries */}
      <div>
        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Séries</div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr 80px 28px', gap: 6, marginBottom: 4 }}>
          {['#', 'Charge (kg)', 'Reps', 'RPE', '1RM est.', ''].map(h => (
            <div key={h} style={{ fontSize: 10, color: T.textDim, textAlign: h === '#' ? 'center' : 'left' }}>{h}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          {sets.map((s, i) => {
            const rm = calc1RM(s.weight, s.reps)
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr 80px 28px', gap: 6, alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.accentLight, textAlign: 'center' }}>{i + 1}</div>
                {['weight', 'reps', 'rpe'].map(key => (
                  <input key={key} type="number" value={s[key]} onChange={e => updateSet(i, key, e.target.value)}
                    placeholder={key === 'weight' ? 'kg' : key === 'reps' ? 'reps' : 'RPE'}
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${s.rpe && key === 'rpe' ? RPE_COLORS[Math.round(s.rpe)] + '40' : T.border}`, borderRadius: 8, padding: '8px', color: T.text, fontSize: 14, outline: 'none', textAlign: 'center', width: '100%', boxSizing: 'border-box' }} />
                ))}
                <div style={{ fontSize: 13, fontWeight: 800, color: rm ? T.accentLight : T.textDim, textAlign: 'center' }}>
                  {rm ? `${rm}` : '—'}
                </div>
                <button onClick={() => removeSet(i)} style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: `1px solid ${T.border}`, color: T.textDim, cursor: 'pointer', fontSize: 14, display: 'grid', placeItems: 'center' }}>×</button>
              </div>
            )
          })}
        </div>

        <button onClick={addSet} style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 10, background: `${T.accent}10`, border: `1px dashed ${T.accent}30`, color: T.accentLight, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Série
        </button>
      </div>

      {/* Récap */}
      {(best1RM || totalVolume > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {best1RM && (
            <div style={{ padding: '10px 14px', background: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Meilleur 1RM</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: T.accentLight, fontFamily: T.fontDisplay }}>{best1RM} <span style={{ fontSize: 11 }}>kg</span></div>
            </div>
          )}
          {totalVolume > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(77,159,255,0.08)', border: '1px solid rgba(77,159,255,0.2)', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Volume total</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#4d9fff', fontFamily: T.fontDisplay }}>{Math.round(totalVolume).toLocaleString('fr-FR')} <span style={{ fontSize: 11 }}>kg</span></div>
            </div>
          )}
        </div>
      )}

      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Conditions, ressenti, technique..."
        rows={2}
        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />

      <Btn onClick={handleSave} disabled={saving || !exerciseName || sets.every(s => !s.weight)}>
        {saving ? 'Enregistrement...' : 'Enregistrer le TOPSET'}
      </Btn>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PrepTopsetPage() {
  const { user, profile, isCoach } = useAuth()
  const [logs, setLogs] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('saisie')
  const [selectedEx, setSelectedEx] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: logsData }, { data: exData }] = await Promise.all([
      supabase.from('topset_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(200),
      supabase.from('exercises').select('name').order('name'),
    ])
    setLogs(logsData || [])
    setExercises((exData || []).map(e => e.name))
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // ── Analyses ─────────────────────────────────────────────────────────────────

  // PRs par exercice (meilleur 1RM estimé)
  const prs = useMemo(() => {
    const map = {}
    for (const log of logs) {
      const rm = log.estimated_1rm || calc1RM(log.weight_kg, log.reps)
      if (!map[log.exercise_name] || (rm || 0) > (map[log.exercise_name].rm || 0)) {
        map[log.exercise_name] = { ...log, rm }
      }
    }
    return Object.values(map).sort((a, b) => b.rm - a.rm)
  }, [logs])

  // Exercices uniques
  const exerciseNames = useMemo(() => [...new Set(logs.map(l => l.exercise_name))], [logs])

  // Données graphique pour l'exercice sélectionné (point par point)
  const selectedLogs = useMemo(() => {
    if (!selectedEx) return []
    return logs.filter(l => l.exercise_name === selectedEx)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [logs, selectedEx])

  const chartPoints1RM = useMemo(() => selectedLogs.map(l => ({
    value: l.estimated_1rm || calc1RM(l.weight_kg, l.reps) || 0,
    date: l.date, weight: l.weight_kg, reps: l.reps, rpe: l.rpe,
  })).filter(p => p.value > 0), [selectedLogs])

  const chartPointsVolume = useMemo(() => {
    // Volume par session
    const byDate = {}
    for (const l of selectedLogs) {
      if (!byDate[l.date]) byDate[l.date] = 0
      byDate[l.date] += (l.weight_kg || 0) * (l.reps || 0)
    }
    return Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).map(([date, vol]) => ({ value: vol, date }))
  }, [selectedLogs])

  // Volumétrie hebdo pour l'exercice sélectionné
  const weeklyVolume = useMemo(() => {
    const weeks = {}
    for (const l of selectedLogs) {
      const wk = getWeekKey(l.date)
      if (!weeks[wk]) weeks[wk] = 0
      weeks[wk] += (l.weight_kg || 0) * (l.reps || 0)
    }
    return Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0]))
  }, [selectedLogs])


  const TABS = [
    { key: 'saisie',   label: 'Saisir' },
    ...(isCoach ? [
      { key: 'records',  label: 'Records' },
      { key: 'analyse',  label: 'Analyse' },
    ] : []),
  ]

  return (
    <PageWrap>
      <style>{`
        .topset-set-row { display: grid; grid-template-columns: 28px 1fr 1fr 1fr 80px 28px; gap: 6px; }
        @media (max-width: 480px) { .topset-set-row { grid-template-columns: 24px 1fr 1fr 1fr 24px; } }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* Header */}
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Prépa physique
          </div>
          <div style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>TOPSET</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 4 }}>{logs.length} entrées · {exerciseNames.length} exercices</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${tab === t.key ? T.accent + '40' : T.border}`, background: tab === t.key ? `${T.accent}12` : 'transparent', color: tab === t.key ? T.accentLight : T.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Saisie ── */}
        {tab === 'saisie' && (
          <Card>
            <TopsetForm exercises={exercises} onSaved={load} />
          </Card>
        )}

        {/* ── Records ── */}
        {tab === 'records' && (
          <>
            {prs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: T.textDim }}>Aucun record — saisis ton premier TOPSET !</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {prs.map((pr, idx) => (
                  <div key={pr.exercise_name} onClick={() => { setSelectedEx(pr.exercise_name); setTab('analyse') }}
                    style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {idx < 3 && <span style={{ fontSize: 16 }}>{['🥇','🥈','🥉'][idx]}</span>}
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.exercise_name}</div>
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>
                        {new Date(pr.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {pr.weight_kg ? ` · ${pr.weight_kg}kg` : ''}
                        {pr.reps ? ` × ${pr.reps} reps` : ''}
                        {pr.rpe ? ` @RPE${pr.rpe}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: T.accentLight, fontFamily: T.fontDisplay, lineHeight: 1 }}>{pr.rm}</div>
                      <div style={{ fontSize: 10, color: T.textDim }}>kg 1RM est.</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Analyse ── */}
        {tab === 'analyse' && (
          <>
            {/* Sélecteur exercice */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>Choisir un exercice</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {exerciseNames.map(ex => (
                  <button key={ex} onClick={() => setSelectedEx(ex)}
                    style={{ padding: '7px 12px', borderRadius: 10, border: `1px solid ${selectedEx === ex ? T.accent + '50' : T.border}`, background: selectedEx === ex ? `${T.accent}15` : 'transparent', color: selectedEx === ex ? T.accentLight : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {ex}
                  </button>
                ))}
              </div>
            </Card>

            {selectedEx && (
              <>
                {/* PR de cet exercice */}
                {(() => {
                  const pr = prs.find(p => p.exercise_name === selectedEx)
                  return pr ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                      {[
                        { label: 'Meilleur 1RM', value: `${pr.rm} kg`, color: T.accentLight },
                        { label: 'Charge record', value: pr.weight_kg ? `${pr.weight_kg} kg` : '—', color: '#4d9fff' },
                        { label: 'Reps record', value: pr.reps ? `${pr.reps} reps` : '—', color: '#9d7dea' },
                        { label: 'Nb sessions', value: selectedLogs.length, color: '#fbbf24' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 10, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: T.fontDisplay }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : null
                })()}

                {/* Graphique 1RM point par point */}
                {chartPoints1RM.length >= 2 && (
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>Progression 1RM estimé — tous les TOPSET</div>
                    <div style={{ fontSize: 11, color: T.textDim, marginBottom: 12 }}>Chaque point = une séance</div>
                    <Sparkline points={chartPoints1RM} color={T.accentLight} h={100} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textDim, marginTop: 6 }}>
                      <span>{new Date(chartPoints1RM[0].date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      <span style={{ color: T.accentLight, fontWeight: 700 }}>
                        {chartPoints1RM[chartPoints1RM.length - 1].value} kg
                      </span>
                      <span>{new Date(chartPoints1RM[chartPoints1RM.length-1].date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </Card>
                )}

                {/* Volumétrie hebdo */}
                {weeklyVolume.length >= 2 && (
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Volumétrie semaine par semaine</div>
                    <Sparkline points={weeklyVolume.map(([, v]) => ({ value: v }))} color="#4d9fff" h={70} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                      {weeklyVolume.slice(-6).map(([wk, vol]) => (
                        <div key={wk} style={{ flex: '1 1 80px', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center', border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 10, color: T.textDim }}>{getWeekLabel(wk)}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#4d9fff', fontFamily: T.fontDisplay }}>{Math.round(vol).toLocaleString('fr-FR')}</div>
                          <div style={{ fontSize: 9, color: T.textDim }}>kg</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Historique détaillé */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Toutes les entrées — {selectedEx}</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {selectedLogs.slice(0, 20).map(log => {
                      const rm = log.estimated_1rm || calc1RM(log.weight_kg, log.reps)
                      return (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${T.border}` }}>
                          <div>
                            <div style={{ fontSize: 12, color: T.textMid }}>{new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 2 }}>
                              {log.weight_kg}kg
                              {log.reps ? ` × ${log.reps}` : ''}
                              {log.rpe ? <span style={{ color: RPE_COLORS[Math.round(log.rpe)], marginLeft: 6 }}>@RPE{log.rpe}</span> : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {rm && <div style={{ fontSize: 16, fontWeight: 900, color: T.accentLight, fontFamily: T.fontDisplay }}>~{rm} kg</div>}
                            <div style={{ fontSize: 10, color: T.textDim }}>1RM est.</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </>
            )}

            {!selectedEx && exerciseNames.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: T.textDim }}>Aucune donnée — commence par saisir des TOPSET</div>
            )}
          </>
        )}
      </div>
    </PageWrap>
  )
}

const styles = {
  card: {
    background: 'rgba(12,16,24,0.85)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: '14px 16px',
  }
}
