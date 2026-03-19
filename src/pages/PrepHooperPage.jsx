import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

// ─── Config ──────────────────────────────────────────────────────────────────
const HOOPER_FIELDS = [
  { key: 'fatigue',     label: 'Fatigue',     color: '#ff7043',
    levels: ['', 'Pas fatigué', 'Peu fatigué', 'Légèrement fatigué', 'Modérément fatigué', 'Assez fatigué', 'Fatigué', 'Bien fatigué', 'Très fatigué', 'Épuisé', 'Totalement épuisé'] },
  { key: 'sommeil',     label: 'Sommeil',     color: '#9d7dea',
    levels: ['', 'Excellent', 'Très bien dormi', 'Bien dormi', 'Plutôt bien', 'Correct', 'Passable', 'Mauvais', 'Très mauvais', 'Terrible', 'Pas dormi'] },
  { key: 'stress',      label: 'Stress',      color: '#4d9fff',
    levels: ['', 'Aucun stress', 'Très peu stressé', 'Peu stressé', 'Légèrement stressé', 'Modérément stressé', 'Assez stressé', 'Stressé', 'Très stressé', 'Extrêmement stressé', 'Stress maximal'] },
  { key: 'courbatures', label: 'Courbatures', color: '#ff4566',
    levels: ['', 'Aucune', 'Très légères', 'Légères', 'Modérées', 'Assez présentes', 'Présentes', 'Importantes', 'Très importantes', 'Sévères', 'Insupportables'] },
]

const DOMS_ZONES = [
  { key: 'nuque',      label: 'Nuque / Cou',        emoji: '🔺' },
  { key: 'epaules',    label: 'Épaules',             emoji: '💠' },
  { key: 'coudes',     label: 'Coudes',              emoji: '💠' },
  { key: 'poignets',   label: 'Poignets',            emoji: '💠' },
  { key: 'tronc',      label: 'Tronc / Abdominaux',  emoji: '🔷' },
  { key: 'lombaires',  label: 'Bas du dos / Lombaires', emoji: '🔷' },
  { key: 'hanches',    label: 'Hanches',             emoji: '💠' },
  { key: 'cuisses',    label: 'Cuisses',             emoji: '🔷' },
  { key: 'genoux',     label: 'Genoux',              emoji: '💠' },
  { key: 'chevilles',  label: 'Chevilles',           emoji: '💠' },
  { key: 'pieds',      label: 'Pieds',               emoji: '🔷' },
]

const INQUIETUDE_LABELS = ['', 'Pas inquiet', 'Peu inquiet', 'Très inquiet']
const INQUIETUDE_COLORS = ['', '#3ecf8e', '#fbbf24', '#ff4566']

// ─── Calcul Z-score ───────────────────────────────────────────────────────────
function calcZScore(value, history, key) {
  const n = history.length >= 20 ? 20 : history.length >= 10 ? history.length : null
  if (!n) return null
  const vals = history.slice(0, n).map(h => Number(h[key] || 0)).filter(Boolean)
  if (vals.length < 3) return null
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const std = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length)
  if (!std) return 0
  return Math.round(((value - mean) / std) * 100) / 100
}

function zColor(z) {
  if (z === null) return T.textDim
  if (z < -1) return '#3ecf8e'
  if (z < 0)  return '#3ecf8e'
  if (z < 1)  return '#fbbf24'
  return '#ff4566'
}

function zLabel(z) {
  if (z === null) return 'Insuffisant'
  if (z < -1) return 'Bien en dessous de sa moyenne'
  if (z < 0)  return 'En dessous de sa moyenne'
  if (z < 1)  return 'Dans sa moyenne'
  return 'Au-dessus de sa moyenne ⚠️'
}

// ─── Score total ──────────────────────────────────────────────────────────────
function scoreLabel(total) {
  if (total <= 7)  return { text: 'Très bon',           color: '#3ecf8e' }
  if (total <= 13) return { text: 'Correct',            color: '#3ecf8e' }
  if (total <= 20) return { text: 'Vigilance',          color: '#fbbf24' }
  return              { text: 'Fatigue importante',   color: '#ff4566' }
}

// ─── Composants ───────────────────────────────────────────────────────────────
function SliderField({ field, value, onChange }) {
  const { key, label, color, levels } = field
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{label}</div>
          {value > 0 && <div style={{ fontSize: 12, color, marginTop: 2, fontWeight: 600 }}>{levels[value]}</div>}
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color, fontFamily: T.fontDisplay, minWidth: 36, textAlign: 'right' }}>{value}</div>
      </div>
      <input type="range" min={1} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }} />
      <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < value ? color : 'rgba(255,255,255,0.07)', transition: 'background 0.15s' }} />
        ))}
      </div>
    </Card>
  )
}

function DomsZoneRow({ zone, data, onChange }) {
  const { key, label, emoji } = zone
  const zoneData = data[key] || { level: 0, inquietude: 0 }
  const active = zoneData.level > 0

  return (
    <div style={{ padding: '12px 14px', borderRadius: 14, border: `1px solid ${active ? '#ff456640' : T.border}`, background: active ? 'rgba(255,69,102,0.04)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: active ? 12 : 0 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.text }}>{label}</div>
        <button onClick={() => onChange(key, 'level', active ? 0 : 5)}
          style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${active ? '#ff456640' : T.border}`, background: active ? 'rgba(255,69,102,0.1)' : 'transparent', color: active ? '#ff4566' : T.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          {active ? `Niveau ${zoneData.level}` : '+ Ajouter'}
        </button>
      </div>

      {active && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6 }}>Intensité de la douleur : <span style={{ color: '#ff4566', fontWeight: 700 }}>{zoneData.level}/10</span></div>
            <input type="range" min={1} max={10} value={zoneData.level}
              onChange={e => onChange(key, 'level', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#ff4566', cursor: 'pointer' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6 }}>Niveau d'inquiétude</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3].map(v => (
                <button key={v} onClick={() => onChange(key, 'inquietude', v)}
                  style={{ flex: 1, padding: '7px 6px', borderRadius: 10, border: `1px solid ${zoneData.inquietude === v ? INQUIETUDE_COLORS[v] + '50' : T.border}`, background: zoneData.inquietude === v ? `${INQUIETUDE_COLORS[v]}15` : 'transparent', color: zoneData.inquietude === v ? INQUIETUDE_COLORS[v] : T.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {INQUIETUDE_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mini graphique SVG ───────────────────────────────────────────────────────
function TrendChart({ data, color = '#3ecf8e', height = 60 }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const range = max - min || 1
  const W = 200, H = height, pad = 8
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',').map(Number)
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />
      })}
    </svg>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PrepHooperPage() {
  const { user, profile, isCoach } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const [values, setValues] = useState({ fatigue: 5, sommeil: 5, stress: 5, courbatures: 5 })
  const [domsZones, setDomsZones] = useState({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedToday, setSavedToday] = useState(false)
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('saisie') // 'saisie' | 'doms' | 'historique'

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('hooper_logs')
      .select('*').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(30)
    if (!data) return
    setHistory(data)
    const todayLog = data.find(d => d.date === today)
    if (todayLog) {
      setValues({ fatigue: todayLog.fatigue, sommeil: todayLog.sommeil, stress: todayLog.stress, courbatures: todayLog.courbatures })
      setDomsZones(todayLog.doms_zones || {})
      setNotes(todayLog.notes || '')
      setSavedToday(true)
    }
  }

  function updateDoms(zoneKey, field, val) {
    setDomsZones(prev => ({ ...prev, [zoneKey]: { ...(prev[zoneKey] || {}), [field]: val } }))
  }

  async function handleSave() {
    setSaving(true)
    const payload = { user_id: user.id, date: today, ...values, doms_zones: domsZones, notes }
    const { error } = await supabase.from('hooper_logs').upsert(payload, { onConflict: 'user_id,date' })
    if (!error) { setSavedToday(true); loadData() }
    setSaving(false)
  }

  // ── Calculs ─────────────────────────────────────────────────────────────────
  const total = values.fatigue + values.sommeil + values.stress + values.courbatures
  const scoreInfo = scoreLabel(total)
  const sampleSize = history.length >= 20 ? 20 : history.length >= 10 ? history.length : null

  const zScores = useMemo(() => {
    return HOOPER_FIELDS.reduce((acc, f) => {
      acc[f.key] = calcZScore(values[f.key], history, f.key)
      return acc
    }, {})
  }, [values, history])

  const zTotal = useMemo(() => calcZScore(total, history.map(h => ({ total: h.fatigue + h.sommeil + h.stress + h.courbatures })), 'total'), [total, history])

  const trendData = useMemo(() => history.slice(0, 14).reverse().map(h => h.fatigue + h.sommeil + h.stress + h.courbatures), [history])
  const activeDoms = Object.entries(domsZones).filter(([, v]) => v.level > 0)


  const TABS = [
    { key: 'saisie',     label: 'HOOPER' },
    { key: 'doms',       label: `DOMS${activeDoms.length > 0 ? ` (${activeDoms.length})` : ''}` },
    ...(isCoach ? [{ key: 'historique', label: 'Évolution' }] : []),
  ]

  return (
    <PageWrap>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* Header */}
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Prépa physique
          </div>
          <div style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>Questionnaire HOOPER</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 4 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {savedToday && <span style={{ marginLeft: 10, color: T.accentLight, fontSize: 12, fontWeight: 700 }}>✓ Rempli aujourd'hui</span>}
          </div>
        </div>

        {/* Score du jour */}
        <Card glow>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Score HOOPER</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: scoreInfo.color, fontFamily: T.fontDisplay, lineHeight: 1 }}>{total}</div>
              <div style={{ fontSize: 13, color: scoreInfo.color, fontWeight: 700, marginTop: 4 }}>/40 — {scoreInfo.text}</div>
            </div>
            {isCoach && zTotal !== null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Z-score {sampleSize ? `(n=${sampleSize})` : ''}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: zColor(zTotal), fontFamily: T.fontDisplay }}>{zTotal > 0 ? '+' : ''}{zTotal}</div>
                <div style={{ fontSize: 11, color: zColor(zTotal), fontWeight: 600, marginTop: 2 }}>{zLabel(zTotal)}</div>
              </div>
            )}
            {isCoach && !sampleSize && history.length > 0 && (
              <div style={{ fontSize: 11, color: T.textDim, textAlign: 'right' }}>
                Z-score disponible<br />dès 10 réponses<br />({Math.max(0, 10 - history.length)} restantes)
              </div>
            )}
          </div>

          {/* Barre score */}
          <div style={{ marginTop: 14, position: 'relative', height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, width: '17.5%', height: '100%', background: 'rgba(62,207,142,0.4)' }} />
            <div style={{ position: 'absolute', left: '17.5%', width: '15%', height: '100%', background: 'rgba(62,207,142,0.25)' }} />
            <div style={{ position: 'absolute', left: '32.5%', width: '17.5%', height: '100%', background: 'rgba(251,191,36,0.35)' }} />
            <div style={{ position: 'absolute', left: '50%', width: '50%', height: '100%', background: 'rgba(255,69,102,0.3)' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, width: 4, borderRadius: 2, background: scoreInfo.color, left: `${Math.min(98, (total / 40) * 100)}%`, transition: 'left 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textDim, marginTop: 4 }}>
            <span>0 Très bon</span><span>8</span><span>14</span><span>21</span><span>40 Fatigue</span>
          </div>
        </Card>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: `1px solid ${tab === t.key ? T.accent + '40' : T.border}`, background: tab === t.key ? `${T.accent}12` : 'transparent', color: tab === t.key ? T.accentLight : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab HOOPER ── */}
        {tab === 'saisie' && (
          <>
            {HOOPER_FIELDS.map(field => (
              <SliderField key={field.key} field={field} value={values[field.key]}
                onChange={v => setValues(p => ({ ...p, [field.key]: v }))} />
            ))}

            {/* Z-scores par item — coach uniquement */}
            {isCoach && sampleSize && (
              <Card>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 12 }}>
                  Z-scores par item <span style={{ fontSize: 11, color: T.textDim, fontWeight: 400 }}>(n={sampleSize})</span>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {HOOPER_FIELDS.map(f => {
                    const z = zScores[f.key]
                    return (
                      <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                        <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{f.label}</div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ fontSize: 11, color: T.textDim }}>{zLabel(z)}</div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: zColor(z), fontFamily: T.fontDisplay, minWidth: 36, textAlign: 'right' }}>
                            {z !== null ? `${z > 0 ? '+' : ''}${z}` : '—'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>Notes (optionnel)</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Ressenti général, contexte particulier..."
                rows={2}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
            </Card>

            <Btn onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : savedToday ? '✓ Mettre à jour' : 'Enregistrer'}
            </Btn>
          </>
        )}

        {/* ── Tab DOMS ── */}
        {tab === 'doms' && (
          <>
            <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6 }}>
              Indique les zones douloureuses du jour. Pour chaque zone, précise l'intensité et ton niveau d'inquiétude.
            </div>

            {DOMS_ZONES.map(zone => (
              <DomsZoneRow key={zone.key} zone={zone} data={domsZones} onChange={updateDoms} />
            ))}

            {activeDoms.length > 0 && (
              <Card style={{ borderColor: 'rgba(255,69,102,0.2)', background: 'rgba(255,69,102,0.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#ff4566', marginBottom: 8 }}>Zones actives</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {activeDoms.map(([key, data]) => {
                    const zone = DOMS_ZONES.find(z => z.key === key)
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <span style={{ color: T.text }}>{zone?.label}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ color: '#ff4566', fontWeight: 700 }}>{data.level}/10</span>
                          {data.inquietude > 0 && (
                            <span style={{ color: INQUIETUDE_COLORS[data.inquietude], fontSize: 11, fontWeight: 700 }}>
                              {INQUIETUDE_LABELS[data.inquietude]}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            <Btn onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Btn>
          </>
        )}

        {/* ── Tab Historique / Évolution ── */}
        {tab === 'historique' && (
          <>
            {trendData.length >= 3 && (
              <Card>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Score total — 14 derniers jours</div>
                <TrendChart data={trendData} color={scoreInfo.color} height={80} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.textDim, marginTop: 6 }}>
                  <span>Il y a {trendData.length - 1}j</span>
                  <span>Aujourd'hui</span>
                </div>
              </Card>
            )}

            {/* Évolution par item */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Évolution par item</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {HOOPER_FIELDS.map(f => {
                  const d = history.slice(0, 10).reverse().map(h => Number(h[f.key] || 0))
                  return (
                    <div key={f.key}>
                      <div style={{ fontSize: 11, color: f.color, fontWeight: 700, marginBottom: 4 }}>{f.label}</div>
                      <TrendChart data={d} color={f.color} height={50} />
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Tableau 14 derniers */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Historique détaillé</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {history.slice(0, 14).map(log => {
                  const s = log.fatigue + log.sommeil + log.stress + log.courbatures
                  const si = scoreLabel(s)
                  const domsCount = Object.values(log.doms_zones || {}).filter(v => v.level > 0).length
                  return (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${T.border}` }}>
                      <div>
                        <div style={{ fontSize: 13, color: T.textMid }}>
                          {new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                          F{log.fatigue} S{log.sommeil} St{log.stress} C{log.courbatures}
                          {domsCount > 0 && <span style={{ marginLeft: 8, color: '#ff4566' }}> · {domsCount} zone{domsCount > 1 ? 's' : ''} DOMS</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: si.color, fontFamily: T.fontDisplay }}>{s}</div>
                        {sampleSize && (() => {
                          const z = calcZScore(s, history.map(h => ({ total: h.fatigue + h.sommeil + h.stress + h.courbatures })).slice(history.indexOf(log) + 1), 'total')
                          return z !== null ? <div style={{ fontSize: 10, color: zColor(z) }}>z={z > 0 ? '+' : ''}{z}</div> : null
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </PageWrap>
  )
}
