import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card } from '../components/UI'
import { T } from '../lib/data'

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function calcACWR(weeks, currentWeekKey) {
  // Charge aiguë = semaine en cours
  // Charge chronique = moyenne des 4 dernières semaines
  const sorted = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0]))
  const idx = sorted.findIndex(([k]) => k === currentWeekKey)
  if (idx < 0) return null
  const acute = sorted[idx][1].volume
  const chronic4 = sorted.slice(Math.max(0, idx - 3), idx + 1).map(([, v]) => v.volume)
  if (chronic4.length === 0) return null
  const chronicAvg = chronic4.reduce((s, v) => s + v, 0) / chronic4.length
  if (!chronicAvg) return null
  return Math.round((acute / chronicAvg) * 100) / 100
}

function acwrColor(ratio) {
  if (!ratio) return T.textDim
  if (ratio < 0.8) return '#4d9fff'   // sous-charge
  if (ratio <= 1.3) return '#3ecf8e'  // zone optimale
  if (ratio <= 1.5) return '#fbbf24'  // vigilance
  return '#ff4566'                     // surcharge
}

function acwrLabel(ratio) {
  if (!ratio) return '—'
  if (ratio < 0.8) return 'Sous-charge'
  if (ratio <= 1.3) return 'Zone optimale ✓'
  if (ratio <= 1.5) return 'Vigilance'
  return 'Surcharge ⚠️'
}

// ─── Mini bar chart SVG ───────────────────────────────────────────────────────
function BarChart({ data, color = T.accent, label = '' }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 100, H = 48

  return (
    <div>
      {label && <div style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {data.map((d, i) => {
          const barH = (d.value / max) * (H - 8)
          const x = (i / data.length) * W + 1
          const w = (W / data.length) - 2
          const c = d.highlight ? '#fbbf24' : color
          return (
            <g key={i}>
              <rect x={x} y={H - barH} width={w} height={barH} rx={2} fill={c} opacity={0.8} />
            </g>
          )
        })}
        <line x1={0} y1={H} x2={W} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
      </svg>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatBlock({ label, value, unit, sub, color = T.accentLight, big = false }) {
  return (
    <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: big ? 28 : 22, fontWeight: 900, color, fontFamily: T.fontDisplay, lineHeight: 1 }}>
        {value} <span style={{ fontSize: big ? 13 : 11, fontWeight: 600, color: T.textDim }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PrepChargeExternePage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    // 12 semaines de données
    const since = new Date(); since.setDate(since.getDate() - 84)
    const sinceStr = since.toISOString().split('T')[0]

    const { data: sessData } = await supabase
      .from('sessions').select('id, date, user_id')
      .eq('user_id', user.id).gte('date', sinceStr)
      .order('date', { ascending: true })

    const ids = (sessData || []).map(s => s.id)
    let setsData = []
    if (ids.length > 0) {
      const { data } = await supabase.from('sets')
        .select('session_id, weight, reps')
        .in('session_id', ids)
      setsData = data || []
    }

    const setsBySession = setsData.reduce((acc, s) => {
      if (!acc[s.session_id]) acc[s.session_id] = []
      acc[s.session_id].push(s)
      return acc
    }, {})

    setSessions((sessData || []).map(s => ({
      ...s,
      sets: setsBySession[s.id] || [],
      volume: (setsBySession[s.id] || []).reduce((sum, st) => sum + (Number(st.weight) || 0) * (Number(st.reps) || 0), 0)
    })))
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // ── Calculs ─────────────────────────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    const weeks = {}
    for (const s of sessions) {
      const wk = getWeekKey(s.date)
      if (!weeks[wk]) weeks[wk] = { sessions: [], volume: 0, seances: 0 }
      weeks[wk].sessions.push(s)
      weeks[wk].volume += s.volume
      weeks[wk].seances += 1
    }
    return weeks
  }, [sessions])

  const weekKeys = useMemo(() => Object.keys(weeklyData).sort(), [weeklyData])
  const currentWeek = useMemo(() => getWeekKey(new Date().toISOString().split('T')[0]), [])

  // Volume total (toutes les semaines)
  const totalVolume = useMemo(() => sessions.reduce((s, se) => s + se.volume, 0), [sessions])

  // Semaine courante
  const thisWeek = weeklyData[currentWeek] || { sessions: [], volume: 0, seances: 0 }

  // Monotonie = volume semaine / écart-type (Foster)
  // Si toutes les séances ont le même volume → haute monotonie
  const monotonie = useMemo(() => {
    const vols = thisWeek.sessions.map(s => s.volume).filter(Boolean)
    if (vols.length < 2) return null
    const mean = vols.reduce((a, b) => a + b, 0) / vols.length
    const std = Math.sqrt(vols.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vols.length)
    if (!std) return null
    return Math.round((mean / std) * 100) / 100
  }, [thisWeek])

  const monotLabel = !monotonie ? '—'
    : monotonie < 1.5 ? 'Bonne variété ✓'
    : monotonie < 2   ? 'Modérée'
    : 'Élevée ⚠️'

  const monotColor = !monotonie ? T.textDim
    : monotonie < 1.5 ? '#3ecf8e'
    : monotonie < 2   ? '#fbbf24'
    : '#ff4566'

  // Contrainte = volume × monotonie
  const contrainte = monotonie && thisWeek.volume
    ? Math.round(thisWeek.volume * monotonie)
    : null

  // ACWR
  const acwr = useMemo(() => calcACWR(weeklyData, currentWeek), [weeklyData, currentWeek])

  // Données graphique 8 semaines
  const chartData = useMemo(() => {
    return weekKeys.slice(-8).map(wk => ({
      value: weeklyData[wk].volume,
      label: getWeekLabel(wk),
      highlight: wk === currentWeek,
    }))
  }, [weekKeys, weeklyData, currentWeek])

  const seancesChartData = useMemo(() => {
    return weekKeys.slice(-8).map(wk => ({
      value: weeklyData[wk].seances,
      highlight: wk === currentWeek,
    }))
  }, [weekKeys, weeklyData, currentWeek])

  if (loading) return (
    <PageWrap>
      <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>Calcul en cours...</div>
    </PageWrap>
  )

  return (
    <PageWrap>
      <style>{`
        .charge-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
        .acwr-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.06); position: relative; overflow: hidden; }
        .acwr-bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* Header */}
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Prépa physique
          </div>
          <div style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>Charge externe</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 6 }}>Analyse sur 12 semaines · {sessions.length} séances</div>
        </div>

        {/* ACWR — indicateur principal */}
        <Card glow>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>ACWR — Ratio charge aiguë / chronique</div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 3 }}>Zone optimale : 0.8 – 1.3 · Au-delà de 1.5 : risque élevé</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: acwrColor(acwr), fontFamily: T.fontDisplay, lineHeight: 1 }}>{acwr ?? '—'}</div>
              <div style={{ fontSize: 12, color: acwrColor(acwr), fontWeight: 700, marginTop: 4 }}>{acwrLabel(acwr)}</div>
            </div>
          </div>

          {/* Barre visuelle */}
          <div style={{ position: 'relative', height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 6 }}>
            {/* Zones colorées */}
            <div style={{ position: 'absolute', left: 0, width: '40%', height: '100%', background: 'rgba(77,159,255,0.3)' }} />
            <div style={{ position: 'absolute', left: '40%', width: '25%', height: '100%', background: 'rgba(62,207,142,0.3)' }} />
            <div style={{ position: 'absolute', left: '65%', width: '10%', height: '100%', background: 'rgba(251,191,36,0.3)' }} />
            <div style={{ position: 'absolute', left: '75%', width: '25%', height: '100%', background: 'rgba(255,69,102,0.3)' }} />
            {/* Curseur */}
            {acwr && (
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: 4, borderRadius: 2,
                background: acwrColor(acwr),
                left: `${Math.min(95, Math.max(2, (acwr / 2) * 100))}%`,
                transition: 'left 0.4s ease',
              }} />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textDim }}>
            <span>0</span><span>0.8</span><span>1.3</span><span>1.5</span><span>2+</span>
          </div>
        </Card>

        {/* Stats semaine courante */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 8 }}>
            Semaine en cours — {getWeekLabel(currentWeek)}
          </div>
          <div className="charge-grid">
            <StatBlock label="Volume" value={Math.round(thisWeek.volume).toLocaleString('fr-FR')} unit="kg" color="#3ecf8e" />
            <StatBlock label="Séances" value={thisWeek.seances} unit="séances" color="#4d9fff" />
            <StatBlock label="Monotonie" value={monotonie ?? '—'} unit="" sub={monotLabel} color={monotColor} />
            <StatBlock label="Contrainte" value={contrainte ? contrainte.toLocaleString('fr-FR') : '—'} unit="" sub="volume × monotonie" color="#9d7dea" />
          </div>
        </div>

        {/* Graphiques 8 semaines */}
        <Card>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 16 }}>Évolution sur 8 semaines</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <BarChart data={chartData} color="#3ecf8e" label="Volume (kg)" />
            </div>
            <div>
              <BarChart data={seancesChartData} color="#4d9fff" label="Séances / semaine" />
            </div>
          </div>
        </Card>

        {/* Tableau hebdomadaire */}
        <Card>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 12 }}>Détail par semaine</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Semaine', 'Séances', 'Volume', 'Moy/séance', 'ACWR'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.textDim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekKeys.slice(-8).reverse().map(wk => {
                  const w = weeklyData[wk]
                  const ratio = calcACWR(weeklyData, wk)
                  const isCurrent = wk === currentWeek
                  return (
                    <tr key={wk} style={{ background: isCurrent ? 'rgba(62,207,142,0.04)' : 'transparent' }}>
                      <td style={{ padding: '8px 10px', color: isCurrent ? T.accentLight : T.textMid, fontWeight: isCurrent ? 700 : 400, borderBottom: `1px solid ${T.border}22`, whiteSpace: 'nowrap' }}>
                        {getWeekLabel(wk)}{isCurrent ? ' ←' : ''}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#4d9fff', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{w.seances}</td>
                      <td style={{ padding: '8px 10px', color: '#3ecf8e', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{Math.round(w.volume).toLocaleString('fr-FR')} kg</td>
                      <td style={{ padding: '8px 10px', color: T.textMid, borderBottom: `1px solid ${T.border}22` }}>
                        {w.seances ? Math.round(w.volume / w.seances).toLocaleString('fr-FR') + ' kg' : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: acwrColor(ratio), fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>
                        {ratio ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Légende */}
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>À propos des métriques</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              ['Volume', 'Séries × répétitions × charge. Indicateur de la quantité de travail mécanique.'],
              ['Monotonie (Foster)', 'Volume moyen ÷ écart-type. Élevée (>2) = risque de surentraînement.'],
              ['Contrainte', 'Volume × Monotonie. Mesure la charge cumulée avec variation.'],
              ['ACWR', 'Charge semaine en cours ÷ moyenne 4 dernières semaines. 0.8–1.3 = zone optimale.'],
            ].map(([label, desc]) => (
              <div key={label} style={{ fontSize: 12, color: T.textDim, lineHeight: 1.5 }}>
                <span style={{ color: T.accentLight, fontWeight: 700 }}>{label}</span> — {desc}
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageWrap>
  )
}
