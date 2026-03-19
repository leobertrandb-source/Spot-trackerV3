import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

// ─── Config ───────────────────────────────────────────────────────────────────
const SESSION_TYPES = [
  { key: 'force',     label: 'Force',      color: '#ff7043', emoji: '🏋️' },
  { key: 'cardio',    label: 'Cardio',     color: '#4d9fff', emoji: '🏃' },
  { key: 'technique', label: 'Technique',  color: '#9d7dea', emoji: '🎯' },
  { key: 'mixte',     label: 'Mixte',      color: '#fbbf24', emoji: '⚡' },
  { key: 'autre',     label: 'Autre',      color: '#8899aa', emoji: '📋' },
]

const SPEED_BANDS = [
  { key: 'lent',    label: 'Lent',    range: '< 8 km/h',     color: '#3ecf8e' },
  { key: 'modere',  label: 'Modéré',  range: '8–12 km/h',    color: '#fbbf24' },
  { key: 'rapide',  label: 'Rapide',  range: '12–18 km/h',   color: '#ff7043' },
  { key: 'sprint',  label: 'Sprint',  range: '> 18 km/h',    color: '#ff4566' },
]

const RPE_LABELS = ['','Repos actif','Très facile','Facile','Modéré','Modéré+','Difficile','Difficile+','Très difficile','Très difficile+','Maximum']
const RPE_COLORS = ['','#3ecf8e','#3ecf8e','#3ecf8e','#3ecf8e','#fbbf24','#fbbf24','#ff7043','#ff7043','#ff4566','#ff4566']

// ─── Helpers charge ───────────────────────────────────────────────────────────
function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function getWeekLabel(weekKey) {
  const d = new Date(weekKey + 'T00:00:00')
  const end = new Date(d); end.setDate(d.getDate() + 6)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

function acwrColor(r) {
  if (!r) return T.textDim
  if (r < 0.8)  return '#4d9fff'
  if (r <= 1.3) return '#3ecf8e'
  if (r <= 1.5) return '#fbbf24'
  return '#ff4566'
}

function acwrLabel(r) {
  if (!r) return '—'
  if (r < 0.8)  return 'Sous-charge'
  if (r <= 1.3) return 'Zone optimale ✓'
  if (r <= 1.5) return 'Vigilance'
  return 'Surcharge ⚠️'
}

// ─── Mini sparkline SVG ───────────────────────────────────────────────────────
function Sparkline({ data, color = '#3ecf8e', h = 50 }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const W = 100, pad = 6
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = h - pad - (v / max) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width: '100%', display: 'block' }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.split(' ').map((pt, i) => {
        const [x, y] = pt.split(',').map(Number)
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      })}
    </svg>
  )
}

// ─── Formulaire saisie rapide ─────────────────────────────────────────────────
export function ChargeExterneForm({ sessionId = null, onSaved = null, compact = false }) {
  const { user, profile, isCoach } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const [rpe, setRpe] = useState(6)
  const [duree, setDuree] = useState('')
  const [type, setType] = useState('force')
  const [notes, setNotes] = useState('')
  const [km, setKm] = useState('')
  const [vitesseMoy, setVitesseMoy] = useState('')
  const [speedBands, setSpeedBands] = useState({ lent: '', modere: '', rapide: '', sprint: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const charge = rpe && duree ? rpe * parseInt(duree) : null

  async function handleSave() {
    if (!duree) return
    setSaving(true)
    const kmData = {
      text: notes || '',
      km_total: parseFloat(km) || null,
      vitesse_moy: parseFloat(vitesseMoy) || null,
      speed_bands: Object.values(speedBands).some(v => v) ? speedBands : null,
    }
    const { error } = await supabase.from('charge_externe_logs').insert({
      user_id: user.id, date: today,
      rpe, duree_min: parseInt(duree),
      type_seance: type,
      session_id: sessionId || null,
      notes: JSON.stringify(kmData),
    })
    if (!error) { setSaved(true); if (onSaved) onSaved() }
    setSaving(false)
  }

  if (saved) return (
    <div style={{ padding: '12px 16px', background: 'rgba(62,207,142,0.08)', border: `1px solid ${T.accent}30`, borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
      <span>✅</span>
      <div style={{ fontSize: 13, color: T.accentLight, fontWeight: 700 }}>
        Charge enregistrée — {charge} UA (RPE {rpe} × {duree} min)
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {!compact && <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Charge de séance</div>}

      {/* RPE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>RPE — Effort perçu</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: RPE_COLORS[rpe] }}>{rpe}/10 — {RPE_LABELS[rpe]}</div>
        </div>
        <input type="range" min={1} max={10} value={rpe} onChange={e => setRpe(Number(e.target.value))}
          style={{ width: '100%', accentColor: RPE_COLORS[rpe], cursor: 'pointer' }} />
        <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < rpe ? RPE_COLORS[rpe] : 'rgba(255,255,255,0.07)', transition: 'background 0.15s' }} />
          ))}
        </div>
      </div>

      {/* Durée */}
      <div>
        <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Durée (minutes)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[30, 45, 60, 75, 90].map(d => (
            <button key={d} onClick={() => setDuree(String(d))}
              style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${duree === String(d) ? T.accent + '50' : T.border}`, background: duree === String(d) ? `${T.accent}15` : 'transparent', color: duree === String(d) ? T.accentLight : T.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {d}'
            </button>
          ))}
          <input type="number" value={duree} onChange={e => setDuree(e.target.value)}
            placeholder="Autre"
            style={{ width: 70, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 10px', color: T.text, fontSize: 13, outline: 'none', textAlign: 'center' }} />
        </div>
      </div>

      {/* Type */}
      <div>
        <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Type de séance</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SESSION_TYPES.map(t => (
            <button key={t.key} onClick={() => setType(t.key)}
              style={{ padding: '7px 12px', borderRadius: 10, border: `1px solid ${type === t.key ? t.color + '50' : T.border}`, background: type === t.key ? `${t.color}15` : 'transparent', color: type === t.key ? t.color : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kilométrage */}
      <div>
        <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Kilométrage (optionnel)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: T.textDim, marginBottom: 4 }}>Distance totale (km)</div>
            <input type="number" step="0.1" value={km} onChange={e => setKm(e.target.value)} placeholder="ex: 8.5"
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', color: T.text, fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.textDim, marginBottom: 4 }}>Vitesse moyenne (km/h)</div>
            <input type="number" step="0.1" value={vitesseMoy} onChange={e => setVitesseMoy(e.target.value)} placeholder="ex: 12"
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', color: T.text, fontSize: 14, outline: 'none' }} />
          </div>
        </div>

        {/* Bandes de vitesse */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8 }}>Répartition par bandes de vitesse (km)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: 8 }}>
            {SPEED_BANDS.map(band => (
              <div key={band.key}>
                <div style={{ fontSize: 10, fontWeight: 700, color: band.color, marginBottom: 4 }}>{band.label}</div>
                <div style={{ fontSize: 9, color: T.textDim, marginBottom: 4 }}>{band.range}</div>
                <input type="number" step="0.1" value={speedBands[band.key]} onChange={e => setSpeedBands(p => ({...p, [band.key]: e.target.value}))}
                  placeholder="km"
                  style={{ width: '100%', boxSizing: 'border-box', background: `${band.color}08`, border: `1px solid ${band.color}30`, borderRadius: 8, padding: '7px 8px', color: band.color, fontSize: 13, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
              </div>
            ))}
          </div>
          {/* Barre visuelle */}
          {Object.values(speedBands).some(v => parseFloat(v) > 0) && (() => {
            const total = SPEED_BANDS.reduce((s, b) => s + (parseFloat(speedBands[b.key]) || 0), 0)
            return total > 0 ? (
              <div style={{ marginTop: 10, height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                {SPEED_BANDS.map(band => {
                  const pct = ((parseFloat(speedBands[band.key]) || 0) / total) * 100
                  return pct > 0 ? <div key={band.key} style={{ width: `${pct}%`, background: band.color, transition: 'width 0.3s' }} title={`${band.label}: ${speedBands[band.key]}km`} /> : null
                })}
              </div>
            ) : null
          })()}
        </div>
      </div>

      {/* Charge calculée */}
      {charge && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${RPE_COLORS[rpe]}10`, border: `1px solid ${RPE_COLORS[rpe]}30`, borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: T.textMid }}>Charge calculée (RPE × durée)</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: RPE_COLORS[rpe], fontFamily: T.fontDisplay }}>{charge} <span style={{ fontSize: 12, fontWeight: 600 }}>UA</span></div>
        </div>
      )}

      {!compact && (
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes sur la séance..."
          rows={2}
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
      )}

      <Btn onClick={handleSave} disabled={saving || !duree}>
        {saving ? 'Enregistrement...' : `Enregistrer la charge${charge ? ` (${charge} UA)` : ''}`}
      </Btn>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PrepChargeExternePage() {
  const { user, profile, isCoach } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('saisie') // 'saisie' | 'analyse'

  const load = useCallback(async () => {
    setLoading(true)
    const since = new Date(); since.setDate(since.getDate() - 84) // 12 semaines
    const { data } = await supabase.from('charge_externe_logs')
      .select('*').eq('user_id', user.id)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // ── Calculs hebdo ────────────────────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    const weeks = {}
    for (const log of logs) {
      const wk = getWeekKey(log.date)
      if (!weeks[wk]) weeks[wk] = { charge: 0, seances: 0, rpes: [], types: {} }
      weeks[wk].charge += log.charge_ua || (log.rpe * log.duree_min)
      weeks[wk].seances += 1
      weeks[wk].rpes.push(log.rpe)
      const t = log.type_seance || 'autre'
      weeks[wk].types[t] = (weeks[wk].types[t] || 0) + 1
    }
    return weeks
  }, [logs])

  const weekKeys = useMemo(() => Object.keys(weeklyData).sort(), [weeklyData])
  const currentWeek = getWeekKey(new Date().toISOString().split('T')[0])

  // ACWR : charge aiguë / moyenne chronique 4 semaines
  const acwr = useMemo(() => {
    const idx = weekKeys.indexOf(currentWeek)
    if (idx < 0) return null
    const acute = weeklyData[currentWeek]?.charge || 0
    const chronic4 = weekKeys.slice(Math.max(0, idx - 3), idx + 1).map(k => weeklyData[k].charge)
    if (!chronic4.length) return null
    const avg = chronic4.reduce((s, v) => s + v, 0) / chronic4.length
    if (!avg) return null
    return Math.round((acute / avg) * 100) / 100
  }, [weeklyData, weekKeys, currentWeek])

  const thisWeek = weeklyData[currentWeek] || { charge: 0, seances: 0, rpes: [] }
  const avgRpe = thisWeek.rpes.length ? (thisWeek.rpes.reduce((a, b) => a + b, 0) / thisWeek.rpes.length).toFixed(1) : null

  const chartData = weekKeys.slice(-8).map(wk => weeklyData[wk].charge)
  const seancesData = weekKeys.slice(-8).map(wk => weeklyData[wk].seances)

  const today = new Date().toISOString().split('T')[0]
  const alreadyToday = logs.some(l => l.date === today)


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
          <div style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>Charge externe</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 4 }}>RPE × Durée — Unités arbitraires (UA)</div>
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

        {/* ── Tab Saisie ── */}
        {tab === 'saisie' && (
          <Card>
            {alreadyToday && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: `${T.accent}10`, borderRadius: 10, fontSize: 12, color: T.accentLight, fontWeight: 700 }}>
                ✓ Une charge a déjà été saisie aujourd'hui — tu peux en ajouter une autre (double séance)
              </div>
            )}
            <ChargeExterneForm onSaved={load} />
          </Card>
        )}

        {/* ── Tab Analyse ── */}
        {tab === 'analyse' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 30, color: T.textDim }}>Calcul...</div>
            ) : (
              <>
                {/* ACWR */}
                <Card glow>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>ACWR — Ratio charge aiguë / chronique</div>
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 3 }}>Charge aiguë = semaine en cours · Charge chronique = moy. 4 semaines</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 40, fontWeight: 900, color: acwrColor(acwr), fontFamily: T.fontDisplay, lineHeight: 1 }}>{acwr ?? '—'}</div>
                      <div style={{ fontSize: 12, color: acwrColor(acwr), fontWeight: 700, marginTop: 4 }}>{acwrLabel(acwr)}</div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ position: 'absolute', left: 0, width: '40%', height: '100%', background: 'rgba(77,159,255,0.3)' }} />
                    <div style={{ position: 'absolute', left: '40%', width: '25%', height: '100%', background: 'rgba(62,207,142,0.3)' }} />
                    <div style={{ position: 'absolute', left: '65%', width: '10%', height: '100%', background: 'rgba(251,191,36,0.3)' }} />
                    <div style={{ position: 'absolute', left: '75%', width: '25%', height: '100%', background: 'rgba(255,69,102,0.3)' }} />
                    {acwr && <div style={{ position: 'absolute', top: 0, bottom: 0, width: 4, borderRadius: 2, background: acwrColor(acwr), left: `${Math.min(97, Math.max(2, (acwr / 2) * 100))}%`, transition: 'left 0.4s' }} />}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textDim }}>
                    <span>0</span><span>0.8 Sous</span><span>1.3 Optimal</span><span>1.5</span><span>2+ Surcharge</span>
                  </div>
                </Card>

                {/* Stats semaine */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Charge aiguë', value: `${Math.round(thisWeek.charge)}`, unit: 'UA', color: acwrColor(acwr) },
                    { label: 'Séances', value: thisWeek.seances, unit: '', color: '#4d9fff' },
                    { label: 'RPE moyen', value: avgRpe ?? '—', unit: '/10', color: avgRpe ? RPE_COLORS[Math.round(avgRpe)] : T.textDim },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: T.fontDisplay }}>
                        {value} <span style={{ fontSize: 11, color: T.textDim }}>{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Graphiques */}
                {chartData.length >= 2 && (
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 14 }}>Évolution 8 semaines</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Charge (UA)</div>
                        <Sparkline data={chartData} color="#3ecf8e" h={60} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Séances / semaine</div>
                        <Sparkline data={seancesData} color="#4d9fff" h={60} />
                      </div>
                    </div>
                  </Card>
                )}

                {/* Tableau hebdo */}
                {weekKeys.length > 0 && (
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Détail par semaine</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr>{['Semaine', 'Charge (UA)', 'Séances', 'RPE moy.', 'ACWR'].map(h => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.textDim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {weekKeys.slice(-8).reverse().map(wk => {
                            const w = weeklyData[wk]
                            const isCurrent = wk === currentWeek
                            const idx = weekKeys.indexOf(wk)
                            const chronic = weekKeys.slice(Math.max(0, idx - 3), idx + 1).map(k => weeklyData[k].charge)
                            const avg = chronic.length ? chronic.reduce((a, b) => a + b, 0) / chronic.length : 0
                            const ratio = avg ? Math.round((w.charge / avg) * 100) / 100 : null
                            const avgR = w.rpes.length ? (w.rpes.reduce((a, b) => a + b, 0) / w.rpes.length).toFixed(1) : '—'
                            return (
                              <tr key={wk} style={{ background: isCurrent ? 'rgba(62,207,142,0.03)' : 'transparent' }}>
                                <td style={{ padding: '8px 10px', color: isCurrent ? T.accentLight : T.textMid, fontWeight: isCurrent ? 700 : 400, borderBottom: `1px solid ${T.border}22`, whiteSpace: 'nowrap', fontSize: 12 }}>
                                  {getWeekLabel(wk)}{isCurrent ? ' ←' : ''}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#3ecf8e', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{Math.round(w.charge)}</td>
                                <td style={{ padding: '8px 10px', color: '#4d9fff', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{w.seances}</td>
                                <td style={{ padding: '8px 10px', color: RPE_COLORS[Math.round(avgR)] || T.textMid, fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{avgR}</td>
                                <td style={{ padding: '8px 10px', color: acwrColor(ratio), fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{ratio ?? '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Historique séances */}
                {logs.length > 0 && (
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Dernières séances</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {logs.slice(0, 10).map(log => {
                        const typeInfo = SESSION_TYPES.find(t => t.key === log.type_seance) || SESSION_TYPES[4]
                        const ua = log.charge_ua || log.rpe * log.duree_min
                        return (
                          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${T.border}` }}>
                            <div>
                              <div style={{ fontSize: 13, color: T.text, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span>{typeInfo.emoji}</span>
                                <span>{new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                <span style={{ fontSize: 11, color: typeInfo.color, fontWeight: 700 }}>{typeInfo.label}</span>
                              </div>
                              <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>RPE {log.rpe} × {log.duree_min} min</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 18, fontWeight: 900, color: RPE_COLORS[log.rpe], fontFamily: T.fontDisplay }}>{ua}</div>
                              <div style={{ fontSize: 10, color: T.textDim }}>UA</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {logs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 30, color: T.textDim, fontSize: 14 }}>
                    Aucune donnée — saisis ta première charge !
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </PageWrap>
  )
}
