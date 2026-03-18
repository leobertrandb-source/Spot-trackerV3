import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

// ─── Config ───────────────────────────────────────────────────────────────────
const CYCLE_PHASES = [
  { key: 'menstruation', label: 'Menstruation (J1–J5)',    color: '#ff4566' },
  { key: 'folliculaire', label: 'Phase folliculaire (J6–J13)', color: '#fbbf24' },
  { key: 'ovulation',    label: 'Ovulation (J14)',          color: '#3ecf8e' },
  { key: 'luteale',      label: 'Phase lutéale (J15–J28)',  color: '#9d7dea' },
  { key: 'na',           label: 'Non applicable',           color: '#6b7f94' },
]

const ACTIVITE_OPTIONS = [
  { key: 'repos',    label: 'Repos complet',      color: '#3ecf8e' },
  { key: 'leger',    label: 'Léger (<30 min)',     color: '#fbbf24' },
  { key: 'modere',   label: 'Modéré (30–60 min)', color: '#ff7043' },
  { key: 'intense',  label: 'Intense (>60 min)',   color: '#ff4566' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lineChart(data, color, h = 80) {
  if (data.length < 2) return null
  const vals = data.map(d => d.value)
  const max = Math.max(...vals), min = Math.min(...vals)
  const range = max - min || 0.1
  const W = 100, pad = 8
  const coords = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: h - pad - ((d.value - min) / range) * (h - pad * 2),
    ...d,
  }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const area = `${path} L ${coords[coords.length-1].x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`
  return { coords, path, area, min, max }
}

function LineGraph({ data, color = '#3ecf8e', h = 80, unit = '' }) {
  const chart = lineChart(data, color, h)
  if (!chart) return (
    <div style={{ height: h, display: 'grid', placeItems: 'center', color: T.textDim, fontSize: 12 }}>
      Pas assez de données (min. 2)
    </div>
  )
  const { coords, path, area, min, max } = chart
  return (
    <div>
      <svg viewBox={`0 0 100 ${h}`} style={{ width: '100%', display: 'block' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(r => (
          <line key={r} x1={0} y1={h * r} x2={100} y2={h * r} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}
        <path d={area} fill={`url(#g${color.replace('#','')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="2.5" fill={color} />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textDim, marginTop: 4 }}>
        <span>{data[0]?.date ? new Date(data[0].date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</span>
        <span style={{ color, fontWeight: 700 }}>
          {data[data.length - 1]?.value}{unit}
          {data.length >= 2 && (() => {
            const diff = data[data.length-1].value - data[0].value
            const sign = diff > 0 ? '+' : ''
            const c = diff > 0 ? '#ff7043' : '#3ecf8e'
            return <span style={{ color: c, marginLeft: 6 }}>({sign}{Math.round(diff * 10) / 10}{unit})</span>
          })()}
        </span>
        <span>{data[data.length-1]?.date ? new Date(data[data.length-1].date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrepCompoPage() {
  const { user, profile } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const isCoach = profile?.role === 'coach'

  const [tab, setTab] = useState('saisie')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Mesures
  const [mesures, setMesures] = useState({ weight_kg: '', body_fat_pct: '', muscle_mass_kg: '' })

  // Questionnaire pré-impédance
  const [questionnaire, setQuestionnaire] = useState({
    heure: '',
    cycle_phase: '',
    eau_litres: '',
    alcool_veille: false,
    cafeine_veille: false,
    activite_veille: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('body_composition_logs')
      .select('*').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(30)
    setHistory(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!mesures.weight_kg && !mesures.body_fat_pct) return
    setSaving(true); setMsg('')
    const { error } = await supabase.from('body_composition_logs').insert({
      user_id: user.id, date: today,
      weight_kg:       parseFloat(mesures.weight_kg) || null,
      body_fat_pct:    parseFloat(mesures.body_fat_pct) || null,
      muscle_mass_kg:  parseFloat(mesures.muscle_mass_kg) || null,
      notes: JSON.stringify({
        heure:           questionnaire.heure || null,
        cycle_phase:     questionnaire.cycle_phase || null,
        eau_litres:      parseFloat(questionnaire.eau_litres) || null,
        alcool_veille:   questionnaire.alcool_veille,
        cafeine_veille:  questionnaire.cafeine_veille,
        activite_veille: questionnaire.activite_veille || null,
      }),
    })
    if (error) setMsg('Erreur : ' + error.message)
    else {
      setMsg('Mesure enregistrée ✓')
      setMesures({ weight_kg: '', body_fat_pct: '', muscle_mass_kg: '' })
      setQuestionnaire({ heure: '', cycle_phase: '', eau_litres: '', alcool_veille: false, cafeine_veille: false, activite_veille: '' })
      load()
    }
    setSaving(false)
  }

  // ── Données graphiques ────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
    return {
      poids:  sorted.filter(h => h.weight_kg).map(h => ({ value: parseFloat(h.weight_kg), date: h.date })),
      graisse: sorted.filter(h => h.body_fat_pct).map(h => ({ value: parseFloat(h.body_fat_pct), date: h.date })),
      maigre: sorted.filter(h => h.muscle_mass_kg).map(h => ({ value: parseFloat(h.muscle_mass_kg), date: h.date })),
    }
  }, [history])

  // Dernière mesure
  const last = history[0]
  const prev = history[1]

  function diff(key) {
    if (!last?.[key] || !prev?.[key]) return null
    const d = parseFloat(last[key]) - parseFloat(prev[key])
    return { d: Math.round(d * 10) / 10, positive: d > 0 }
  }

  const TABS = [
    { key: 'saisie',  label: 'Saisir' },
    ...(isCoach ? [{ key: 'analyse', label: 'Analyse' }] : []),
  ]

  return (
    <PageWrap>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* Header */}
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Prépa physique
          </div>
          <div style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>Composition corporelle</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 4 }}>{history.length} mesure{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}</div>
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
          <>
            {/* Questionnaire pré-impédance */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 14 }}>
                Conditions de mesure
                <span style={{ fontSize: 11, color: T.textDim, fontWeight: 400, marginLeft: 8 }}>Pour fiabiliser les résultats</span>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>

                {/* Heure */}
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Heure de la mesure</div>
                  <input type="time" value={questionnaire.heure} onChange={e => setQuestionnaire(p => ({ ...p, heure: e.target.value }))}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', color: T.text, fontSize: 14, outline: 'none' }} />
                </div>

                {/* Cycle menstruel */}
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Cycle menstruel</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CYCLE_PHASES.map(p => (
                      <button key={p.key} onClick={() => setQuestionnaire(prev => ({ ...prev, cycle_phase: prev.cycle_phase === p.key ? '' : p.key }))}
                        style={{ padding: '6px 10px', borderRadius: 10, border: `1px solid ${questionnaire.cycle_phase === p.key ? p.color + '50' : T.border}`, background: questionnaire.cycle_phase === p.key ? `${p.color}15` : 'transparent', color: questionnaire.cycle_phase === p.key ? p.color : T.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hydratation */}
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Eau bue aujourd'hui (litres)</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {[0.5, 1, 1.5, 2, 2.5].map(v => (
                      <button key={v} onClick={() => setQuestionnaire(p => ({ ...p, eau_litres: String(v) }))}
                        style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${questionnaire.eau_litres === String(v) ? '#26d4e8' + '50' : T.border}`, background: questionnaire.eau_litres === String(v) ? 'rgba(38,212,232,0.12)' : 'transparent', color: questionnaire.eau_litres === String(v) ? '#26d4e8' : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {v}L
                      </button>
                    ))}
                    <input type="number" value={questionnaire.eau_litres} onChange={e => setQuestionnaire(p => ({ ...p, eau_litres: e.target.value }))}
                      placeholder="Autre"
                      style={{ width: 60, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '7px 8px', color: T.text, fontSize: 12, outline: 'none', textAlign: 'center' }} />
                  </div>
                </div>

                {/* Booléens */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'alcool_veille', label: '🍷 Alcool la veille', color: '#ff7043' },
                    { key: 'cafeine_veille', label: '☕ Caféïne aujourd\'hui', color: '#fbbf24' },
                  ].map(({ key, label, color }) => (
                    <button key={key} onClick={() => setQuestionnaire(p => ({ ...p, [key]: !p[key] }))}
                      style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${questionnaire[key] ? color + '50' : T.border}`, background: questionnaire[key] ? `${color}15` : 'rgba(255,255,255,0.02)', color: questionnaire[key] ? color : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
                      {label}
                      <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{questionnaire[key] ? 'Oui' : 'Non'}</div>
                    </button>
                  ))}
                </div>

                {/* Activité veille */}
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Activité physique (veille)</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ACTIVITE_OPTIONS.map(a => (
                      <button key={a.key} onClick={() => setQuestionnaire(p => ({ ...p, activite_veille: p.activite_veille === a.key ? '' : a.key }))}
                        style={{ padding: '7px 12px', borderRadius: 10, border: `1px solid ${questionnaire.activite_veille === a.key ? a.color + '50' : T.border}`, background: questionnaire.activite_veille === a.key ? `${a.color}15` : 'transparent', color: questionnaire.activite_veille === a.key ? a.color : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Mesures */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 14 }}>Mesures</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                {[
                  { key: 'weight_kg',     label: 'Poids',          unit: 'kg',  color: '#3ecf8e' },
                  { key: 'body_fat_pct',  label: 'Masse grasse',   unit: '%',   color: '#ff7043' },
                  { key: 'muscle_mass_kg', label: 'Masse maigre',  unit: 'kg',  color: '#4d9fff' },
                ].map(({ key, label, unit, color }) => {
                  const v = diff(key)
                  return (
                    <div key={key}>
                      <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                      <input type="number" step="0.1" value={mesures[key]} onChange={e => setMesures(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={last?.[key] ? String(last[key]) : '—'}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`, borderRadius: 10, padding: '10px 12px', color, fontSize: 20, fontWeight: 900, outline: 'none', textAlign: 'center', fontFamily: T.fontDisplay }} />
                      <div style={{ textAlign: 'center', fontSize: 10, color: T.textDim, marginTop: 3 }}>{unit}</div>
                      {v && <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: v.positive ? '#ff7043' : '#3ecf8e', marginTop: 2 }}>{v.positive ? '+' : ''}{v.d} {unit} vs dernière</div>}
                    </div>
                  )
                })}
              </div>
            </Card>

            {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.includes('Erreur') ? '#ff7b7b' : T.accentLight }}>{msg}</div>}
            <Btn onClick={handleSave} disabled={saving || (!mesures.weight_kg && !mesures.body_fat_pct)}>
              {saving ? 'Enregistrement...' : 'Enregistrer la mesure'}
            </Btn>
          </>
        )}

        {/* ── Analyse (coach only) ── */}
        {tab === 'analyse' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 30, color: T.textDim }}>Chargement...</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: T.textDim }}>Aucune mesure enregistrée</div>
            ) : (
              <>
                {/* Dernière mesure */}
                {last && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                    {[
                      { key: 'weight_kg',      label: 'Poids',        unit: 'kg', color: '#3ecf8e' },
                      { key: 'body_fat_pct',   label: 'Masse grasse', unit: '%',  color: '#ff7043' },
                      { key: 'muscle_mass_kg', label: 'Masse maigre', unit: 'kg', color: '#4d9fff' },
                    ].map(({ key, label, unit, color }) => {
                      const v = diff(key)
                      return last[key] ? (
                        <div key={key} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: `1px solid ${T.border}`, textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: T.fontDisplay }}>{last[key]}<span style={{ fontSize: 12, marginLeft: 2 }}>{unit}</span></div>
                          {v && <div style={{ fontSize: 11, fontWeight: 700, color: v.positive ? '#ff7043' : '#3ecf8e', marginTop: 4 }}>{v.positive ? '+' : ''}{v.d}{unit}</div>}
                        </div>
                      ) : null
                    })}
                  </div>
                )}

                {/* Graphiques */}
                {[
                  { data: chartData.poids,   label: 'Évolution du poids',        unit: ' kg',  color: '#3ecf8e' },
                  { data: chartData.graisse, label: 'Évolution masse grasse',     unit: '%',   color: '#ff7043' },
                  { data: chartData.maigre,  label: 'Évolution masse maigre',     unit: ' kg',  color: '#4d9fff' },
                ].filter(c => c.data.length >= 2).map(({ data, label, unit, color }) => (
                  <Card key={label}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>{label}</div>
                    <LineGraph data={data} color={color} h={90} unit={unit} />
                  </Card>
                ))}

                {/* Historique */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Historique des mesures</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>{['Date', 'Poids', 'Masse grasse', 'Masse maigre', 'Conditions'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.textDim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {history.map(log => {
                          let cond = null
                          try { cond = log.notes ? JSON.parse(log.notes) : null } catch {}
                          const flags = []
                          if (cond?.alcool_veille) flags.push('🍷')
                          if (cond?.cafeine_veille) flags.push('☕')
                          if (cond?.cycle_phase && cond.cycle_phase !== 'na') {
                            const phase = CYCLE_PHASES.find(p => p.key === cond.cycle_phase)
                            if (phase) flags.push(phase.label.split(' ')[0])
                          }
                          return (
                            <tr key={log.id}>
                              <td style={{ padding: '8px 10px', color: T.textMid, borderBottom: `1px solid ${T.border}22`, whiteSpace: 'nowrap', fontSize: 12 }}>
                                {new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#3ecf8e', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.weight_kg ? `${log.weight_kg} kg` : '—'}</td>
                              <td style={{ padding: '8px 10px', color: '#ff7043', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.body_fat_pct ? `${log.body_fat_pct}%` : '—'}</td>
                              <td style={{ padding: '8px 10px', color: '#4d9fff', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.muscle_mass_kg ? `${log.muscle_mass_kg} kg` : '—'}</td>
                              <td style={{ padding: '8px 10px', color: T.textDim, borderBottom: `1px solid ${T.border}22`, fontSize: 12 }}>
                                {cond?.heure && <span style={{ marginRight: 6 }}>🕐{cond.heure}</span>}
                                {cond?.eau_litres && <span style={{ marginRight: 6 }}>💧{cond.eau_litres}L</span>}
                                {flags.join(' ')}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </PageWrap>
  )
}
