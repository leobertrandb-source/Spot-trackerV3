import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import RtpGame from '../components/RtpGame'

// ─── Design tokens — médical premium ─────────────────────────────────────────
const P = {
  bg:      '#f5f3ef',
  card:    '#ffffff',
  border:  '#e8e4dc',
  text:    '#1a1a1a',
  sub:     '#6b6b6b',
  dim:     '#9e9e9e',
  accent:  '#1a3a2a',
  green:   '#2d6a4f',
  yellow:  '#b5830a',
  red:     '#c0392b',
  blue:    '#1a3a5c',
  purple:  '#4a2d6b',
  teal:    '#1a5c52',
}

const DOMS_ZONES = [
  { key: 'nuque',      label: 'Nuque / Cou' },
  { key: 'epaules',   label: 'Épaules' },
  { key: 'coudes',    label: 'Coudes' },
  { key: 'poignets',  label: 'Poignets' },
  { key: 'tronc',     label: 'Tronc / Abdominaux' },
  { key: 'lombaires', label: 'Bas du dos / Lombaires' },
  { key: 'hanches',   label: 'Hanches' },
  { key: 'cuisses',   label: 'Cuisses' },
  { key: 'genoux',    label: 'Genoux' },
  { key: 'chevilles', label: 'Chevilles' },
  { key: 'pieds',     label: 'Pieds' },
]

const CHART_COLORS = {
  hooper:     '#2d6a4f',
  fatigue:    '#c0392b',
  sommeil:    '#4a2d6b',
  stress:     '#1a3a5c',
  courbatures:'#b5830a',
  poids:      '#1a3a2a',
  graisse:    '#c0392b',
  maigre:     '#1a3a5c',
  topset:     '#1a5c52',
  charge:     '#4a2d6b',
  mg1:        '#b5830a',
  mg2:        '#c0392b',
}

// ─── Hook D3-style SVG chart ──────────────────────────────────────────────────
function useD3Chart(containerRef, data, options = {}) {
  const { color = P.green, h = 120, smooth = true, showDots = true, showArea = true, animate = true } = options
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!containerRef.current || data.length < 2) return
    const el = containerRef.current
    const W = el.clientWidth || 400
    const H = h
    const pad = { t: 16, r: 16, b: 28, l: 48 }
    const innerW = W - pad.l - pad.r
    const innerH = H - pad.t - pad.b

    const vals = data.map(d => d.value)
    const max = Math.max(...vals), min = Math.min(...vals)
    const range = max - min || (max * 0.1) || 1
    const yMin = min - range * 0.1, yMax = max + range * 0.1

    const x = i => pad.l + (i / (data.length - 1)) * innerW
    const y = v => pad.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH

    // Catmull-Rom smooth path
    function smoothPath(points) {
      if (points.length < 2) return ''
      if (!smooth || points.length === 2) {
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
      }
      let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)]
        const p1 = points[i], p2 = points[i + 1]
        const p3 = points[Math.min(points.length - 1, i + 2)]
        const cp1x = p1[0] + (p2[0] - p0[0]) / 6
        const cp1y = p1[1] + (p2[1] - p0[1]) / 6
        const cp2x = p2[0] - (p3[0] - p1[0]) / 6
        const cp2y = p2[1] - (p3[1] - p1[1]) / 6
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
      }
      return d
    }

    const points = data.map((d, i) => [x(i), y(d.value)])
    const pathD = smoothPath(points)
    const areaD = `${pathD} L ${x(data.length-1).toFixed(1)} ${(pad.t+innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(pad.t+innerH).toFixed(1)} Z`

    // Y axis ticks
    const ticks = 3
    const tickVals = Array.from({length: ticks+1}, (_, i) => yMin + (yMax - yMin) * (i / ticks))

    // X axis labels (dates)
    const xLabels = data.length <= 8
      ? data.map((d, i) => ({ i, label: d.date ? new Date(d.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '' }))
      : [
          { i: 0, label: data[0].date ? new Date(data[0].date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '' },
          { i: Math.floor(data.length/2), label: data[Math.floor(data.length/2)].date ? new Date(data[Math.floor(data.length/2)].date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '' },
          { i: data.length-1, label: data[data.length-1].date ? new Date(data[data.length-1].date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '' },
        ]

    const uid = `chart-${Math.random().toString(36).slice(2,8)}`

    const svg = `
<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;display:block;overflow:visible">
  <defs>
    <linearGradient id="${uid}-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
    </linearGradient>
    ${animate ? `<style>
      #${uid}-path { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: ${uid}-draw 1.2s ease forwards; }
      @keyframes ${uid}-draw { to { stroke-dashoffset: 0; } }
    </style>` : ''}
  </defs>

  <!-- Grid lines -->
  ${tickVals.map(v => `<line x1="${pad.l}" y1="${y(v).toFixed(1)}" x2="${W-pad.r}" y2="${y(v).toFixed(1)}" stroke="${P.border}" stroke-width="1"/>`).join('')}

  <!-- Y axis ticks -->
  ${tickVals.map(v => `<text x="${pad.l-6}" y="${(y(v)+4).toFixed(1)}" text-anchor="end" font-size="9" fill="${P.dim}" font-family="DM Sans, sans-serif">${typeof v === 'number' ? Math.round(v*10)/10 : v}</text>`).join('')}

  <!-- Area fill -->
  ${showArea ? `<path d="${areaD}" fill="url(#${uid}-grad)"/>` : ''}

  <!-- Main path -->
  <path id="${uid}-path" d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Dots -->
  ${showDots ? points.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${P.card}" stroke="${color}" stroke-width="2"/>`).join('') : ''}

  <!-- Last value highlight -->
  <circle cx="${points[points.length-1][0].toFixed(1)}" cy="${points[points.length-1][1].toFixed(1)}" r="5" fill="${color}"/>

  <!-- X labels -->
  ${xLabels.map(({i, label}) => `<text x="${x(i).toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="9" fill="${P.sub}" font-family="DM Sans, sans-serif">${label}</text>`).join('')}
</svg>`

    el.innerHTML = svg
    setRendered(true)
  }, [data, color, h, smooth])

  return rendered
}

// ─── Modal historique ─────────────────────────────────────────────────────────
// ─── Périodes disponibles ────────────────────────────────────────────────────
const PERIODS = [
  { key: '2w',  label: '2 sem.',  days: 14  },
  { key: '4w',  label: '4 sem.',  days: 28  },
  { key: '2m',  label: '2 mois',  days: 60  },
  { key: '6m',  label: '6 mois',  days: 180 },
  { key: '1y',  label: '1 an',    days: 365 },
  { key: 'all', label: 'Tout',    days: null },
]

// ─── Modal historique — graphe interactif ─────────────────────────────────────
function ChartModal({ open, onClose, title, data, color, unit = '', series = null }) {
  const chartRef = useRef(null)
  const [period, setPeriod] = useState('all')
  const [hovered, setHovered] = useState(null) // { x, y, value, date, seriesValues? }

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  // Filtrer par période
  const filterByPeriod = (pts) => {
    if (!pts?.length) return pts || []
    const sel = PERIODS.find(p => p.key === period)
    if (!sel?.days) return pts
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - sel.days)
    return pts.filter(d => new Date(d.date+'T00:00:00') >= cutoff)
  }

  const filteredData   = filterByPeriod([...( data || [])].sort((a,b) => a.date.localeCompare(b.date)))
  const filteredSeries = series?.map(s => ({ ...s, data: filterByPeriod([...s.data].sort((a,b) => a.date.localeCompare(b.date))) }))

  // Dessin SVG inline (pas de useEffect — on calcule directement en render)
  const renderChart = () => {
    const W = 520, H = 180
    const pad = { t: 20, r: 20, b: 36, l: 44 }
    const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b

    // Rassembler tous les points
    const allPts = series
      ? filteredSeries.flatMap(s => s.data)
      : filteredData

    if (allPts.length < 2) return (
      <div style={{ height: H, display: 'grid', placeItems: 'center', color: P.dim, fontSize: 13, border: `1px dashed ${P.border}`, borderRadius: 10 }}>
        Pas assez de données sur cette période
      </div>
    )

    const allVals = allPts.map(d => d.value)
    const vMin = Math.min(...allVals), vMax = Math.max(...allVals)
    const vRange = vMax - vMin || 1
    const yMin = vMin - vRange * 0.12, yMax = vMax + vRange * 0.12

    const allDates = [...new Set(allPts.map(d => d.date))].sort()
    const d0 = new Date(allDates[0]+'T00:00:00').getTime()
    const d1 = new Date(allDates[allDates.length-1]+'T00:00:00').getTime()
    const dRange = d1 - d0 || 1

    const xOf = (date) => pad.l + ((new Date(date+'T00:00:00').getTime() - d0) / dRange) * iW
    const yOf = (val)  => pad.t + iH - ((val - yMin) / (yMax - yMin)) * iH

    // Ticks Y
    const yTicks = 4
    const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yMax - yMin) * (i / yTicks))

    // X labels (3 max)
    const xLabelIdxs = allDates.length <= 6
      ? allDates.map((_, i) => i)
      : [0, Math.floor(allDates.length / 2), allDates.length - 1]
    const xLabels = [...new Set(xLabelIdxs)].map(i => allDates[i])

    // Smooth path helper
    const smoothPath = (pts) => {
      if (pts.length < 2) return ''
      let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i-1)], p1 = pts[i], p2 = pts[i+1], p3 = pts[Math.min(pts.length-1, i+2)]
        const cp1x = p1[0] + (p2[0]-p0[0])/6, cp1y = p1[1] + (p2[1]-p0[1])/6
        const cp2x = p2[0] - (p3[0]-p1[0])/6, cp2y = p2[1] - (p3[1]-p1[1])/6
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
      }
      return d
    }

    // Séries à dessiner
    const seriesArr = series
      ? filteredSeries
      : [{ label: title, color, data: filteredData }]

    // Hover handler
    const handleMouseMove = (e) => {
      const svg = e.currentTarget.getBoundingClientRect()
      const mx = e.clientX - svg.left
      // Trouver la date la plus proche
      let closest = null, minDist = Infinity
      allDates.forEach(date => {
        const px = xOf(date)
        const dist = Math.abs(px - mx)
        if (dist < minDist) { minDist = dist; closest = date }
      })
      if (!closest || minDist > 40) { setHovered(null); return }
      const cx = xOf(closest)
      // Valeurs pour ce point
      const vals = seriesArr.map(s => {
        const pt = s.data.find(d => d.date === closest)
        return { label: s.label, color: s.color, value: pt?.value ?? null }
      })
      const mainVal = vals[0]?.value
      const cy = mainVal != null ? yOf(mainVal) : H / 2
      setHovered({ date: closest, cx, cy: Math.max(pad.t, Math.min(pad.t+iH, cy)), vals })
    }

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setHovered(null)}>
        <defs>
          {seriesArr.map((s, i) => (
            <linearGradient key={i} id={`mg-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} y1={yOf(v).toFixed(1)} x2={W-pad.r} y2={yOf(v).toFixed(1)} stroke={P.border} strokeWidth="1" />
            <text x={pad.l-6} y={(yOf(v)+4).toFixed(1)} textAnchor="end" fontSize="9" fill={P.dim} fontFamily="DM Sans, sans-serif">
              {Math.round(v*10)/10}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map((date, i) => (
          <text key={i} x={xOf(date).toFixed(1)} y={H-6} textAnchor={i===0?'start':i===xLabels.length-1?'end':'middle'}
            fontSize="9" fill={P.sub} fontFamily="DM Sans, sans-serif">
            {new Date(date+'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </text>
        ))}

        {/* Area + Line par série */}
        {seriesArr.map((s, si) => {
          const pts = s.data.map(d => [xOf(d.date), yOf(d.value)])
          if (pts.length < 2) return null
          const pathD = smoothPath(pts)
          const areaD = `${pathD} L ${pts[pts.length-1][0].toFixed(1)} ${(pad.t+iH).toFixed(1)} L ${pts[0][0].toFixed(1)} ${(pad.t+iH).toFixed(1)} Z`
          return (
            <g key={si}>
              <path d={areaD} fill={`url(#mg-${si})`} />
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((d, i) => (
                <circle key={i} cx={xOf(d.date).toFixed(1)} cy={yOf(d.value).toFixed(1)} r="3" fill={P.card} stroke={s.color} strokeWidth="2" />
              ))}
            </g>
          )
        })}

        {/* Hover line + tooltip */}
        {hovered && (
          <g>
            <line x1={hovered.cx} y1={pad.t} x2={hovered.cx} y2={pad.t+iH} stroke={P.sub} strokeWidth="1" strokeDasharray="4 3" />
            {hovered.vals.filter(v => v.value != null).map((v, i) => {
              const cy = yOf(v.value)
              return <circle key={i} cx={hovered.cx.toFixed(1)} cy={cy.toFixed(1)} r="5" fill={v.color} stroke={P.card} strokeWidth="2" />
            })}
          </g>
        )}
      </svg>
    )
  }

  // Tooltip box (outside SVG pour éviter les clipping issues)
  const renderTooltip = () => {
    if (!hovered) return null
    const last = hovered.vals.filter(v => v.value != null)
    if (!last.length) return null
    return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: P.bg, borderRadius: 10, border: `1px solid ${P.border}`, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: P.sub, fontWeight: 600 }}>
          {new Date(hovered.date+'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        {last.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
            {series && <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, flexShrink: 0 }} />}
            {series && <span style={{ fontSize: 11, color: P.sub }}>{v.label}</span>}
            <span style={{ fontSize: 18, fontWeight: 700, color: v.color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>
              {v.value}{unit}
            </span>
          </div>
        ))}
        {series && last.length === hovered.vals.length && (
          <div style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: P.text, fontFamily: "'DM Serif Display', serif" }}>
            Σ {last.reduce((a, v) => a + v.value, 0)}{unit}
          </div>
        )}
      </div>
    )
  }

  if (!open) return null

  const allCount = series ? series[0]?.data?.length : data?.length

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center', padding: '20px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: P.card, borderRadius: 20, width: '100%', maxWidth: 620,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{title}</div>
            <div style={{ fontSize: 12, color: P.sub, marginTop: 2 }}>{allCount} mesure{allCount > 1 ? 's' : ''} au total</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${P.border}`, background: P.bg, color: P.sub, fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center', lineHeight: 1 }}>×</button>
        </div>

        {/* Sélecteur de période */}
        <div style={{ padding: '14px 24px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${period === p.key ? color+'60' : P.border}`,
              background: period === p.key ? color+'15' : 'transparent',
              color: period === p.key ? color : P.sub,
              transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Graphe */}
        <div style={{ padding: '16px 24px 0' }}>
          {renderChart()}
          {renderTooltip()}
        </div>

        {/* Légende multi-séries */}
        {series && (
          <div style={{ padding: '12px 24px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {series.map(s => (
              <div key={s.label} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: P.sub }}>
                <div style={{ width: 14, height: 3, borderRadius: 2, background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}


// ─── Chart component ──────────────────────────────────────────────────────────
function D3Chart({ data, color, h = 120, title, lastValue, unit = '', delta = null }) {
  const ref = useRef(null)
  useD3Chart(ref, data, { color, h })

  if (data.length < 2) return (
    <div style={{ height: h, display: 'grid', placeItems: 'center', color: P.dim, fontSize: 12, border: `1px dashed ${P.border}`, borderRadius: 8 }}>
      Pas assez de données (min. 2 mesures)
    </div>
  )

  return (
    <div>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: P.sub }}>{title}</div>
          {lastValue != null && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              {delta != null && (
                <span style={{ fontSize: 11, color: delta > 0 ? P.red : P.green, fontWeight: 600 }}>
                  {delta > 0 ? '+' : ''}{Math.round(delta*10)/10}{unit}
                </span>
              )}
              <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'DM Serif Display', serif" }}>
                {lastValue}{unit}
              </span>
            </div>
          )}
        </div>
      )}
      <div ref={ref} />
    </div>
  )
}

// ─── Chart wrapper cliquable ──────────────────────────────────────────────────
function ClickableChart({ children, data, color, unit, title, series }) {
  const [open, setOpen] = useState(false)
  const hasData = series ? series.some(s => s.data.length > 0) : data?.length >= 1
  if (!hasData) return children
  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer', borderRadius: 8, transition: 'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        {children}
        <div style={{ textAlign: 'right', fontSize: 10, color: P.dim, marginTop: 4, letterSpacing: 0.5 }}>↗ Voir l'historique</div>
      </div>
      <ChartModal open={open} onClose={() => setOpen(false)} title={title} data={data || []} color={color} unit={unit} series={series} />
    </>
  )
}




// ─── Multi-series chart ───────────────────────────────────────────────────────
function MultiD3Chart({ series, h = 120 }) {
  const ref = useRef(null)
  const allData = series.flatMap(s => s.data)

  useEffect(() => {
    if (!ref.current || allData.length < 2) return
    const el = ref.current
    const W = el.clientWidth || 400
    const H = h
    const pad = { t: 16, r: 16, b: 28, l: 48 }
    const innerW = W - pad.l - pad.r
    const innerH = H - pad.t - pad.b

    // Find global domain
    const allVals = allData.map(d => d.value).filter(Boolean)
    if (!allVals.length) return
    const max = Math.max(...allVals), min = Math.min(...allVals)
    const range = max - min || 1
    const yMin = min - range * 0.1, yMax = max + range * 0.1

    // Find global date domain
    const allDates = allData.map(d => d.date).filter(Boolean).sort()
    const d0 = new Date(allDates[0]+'T00:00:00').getTime()
    const d1 = new Date(allDates[allDates.length-1]+'T00:00:00').getTime()
    const dtRange = d1 - d0 || 1

    const xByDate = d => pad.l + ((new Date(d+'T00:00:00').getTime() - d0) / dtRange) * innerW
    const y = v => pad.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH

    const ticks = 3
    const tickVals = Array.from({length: ticks+1}, (_, i) => yMin + (yMax - yMin) * (i / ticks))

    const uid = `mc-${Math.random().toString(36).slice(2,8)}`

    let paths = ''
    for (const s of series) {
      if (s.data.length < 2) continue
      const pts = s.data.map(d => [xByDate(d.date), y(d.value)])
      let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
      for (let i = 0; i < pts.length-1; i++) {
        const p0 = pts[Math.max(0,i-1)], p1 = pts[i], p2 = pts[i+1], p3 = pts[Math.min(pts.length-1,i+2)]
        const cp1x = p1[0]+(p2[0]-p0[0])/6, cp1y = p1[1]+(p2[1]-p0[1])/6
        const cp2x = p2[0]-(p3[0]-p1[0])/6, cp2y = p2[1]-(p3[1]-p1[1])/6
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
      }
      paths += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`
      pts.forEach(p => { paths += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="${P.card}" stroke="${s.color}" stroke-width="1.5"/>` })
    }

    const gridLines = tickVals.map(v => `<line x1="${pad.l}" y1="${y(v).toFixed(1)}" x2="${W-pad.r}" y2="${y(v).toFixed(1)}" stroke="${P.border}" stroke-width="1"/>`).join('')
    const yAxis = tickVals.map(v => `<text x="${pad.l-6}" y="${(y(v)+4).toFixed(1)}" text-anchor="end" font-size="9" fill="${P.dim}" font-family="DM Sans">${Math.round(v*10)/10}</text>`).join('')

    const xLabels = [0, allDates.length-1].map(i => {
      const d = allDates[i]
      if (!d) return ''
      return `<text x="${xByDate(d).toFixed(1)}" y="${H-4}" text-anchor="${i===0?'start':'end'}" font-size="9" fill="${P.sub}" font-family="DM Sans">${new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</text>`
    }).join('')

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;display:block;overflow:visible">${gridLines}${yAxis}${paths}${xLabels}</svg>`
  }, [series, h])

  return <div ref={ref} />
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, color, icon, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: color+'15', border: `1px solid ${color}25`, display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0 }}>{icon}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: P.text, letterSpacing: '-0.2px' }}>{title}</div>
            {badge && <div style={{ fontSize: 11, color: P.sub, marginTop: 2 }}>{badge}</div>}
          </div>
        </div>
        <div style={{ fontSize: 11, color: P.sub, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 18, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>⌄</span>
        </div>
      </div>
      {open && <div style={{ padding: '0 22px 22px', borderTop: `1px solid ${P.border}` }}>{children}</div>}
    </div>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, unit, color, delta, deltaUnit }) {
  return (
    <div style={{ padding: '12px 16px', background: P.bg, borderRadius: 10, border: `1px solid ${P.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: P.sub, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>
        {value}<span style={{ fontSize: 12, fontWeight: 400, color: P.sub, marginLeft: 3 }}>{unit}</span>
      </div>
      {delta != null && (
        <div style={{ fontSize: 11, color: delta > 0 ? P.red : P.green, marginTop: 4, fontWeight: 600 }}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta*10)/10)}{deltaUnit}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekKey(d) {
  const dt = new Date(d+'T00:00:00'), day = dt.getDay() || 7
  dt.setDate(dt.getDate()-day+1); return dt.toISOString().split('T')[0]
}
function scoreColor(s) {
  if (s <= 7) return P.green; if (s <= 13) return '#52b788'
  if (s <= 20) return P.yellow; return P.red
}

function extractKmData(notes) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}

  try {
    const match = notes.match(/km:(\{.*\})/)
    if (match) return JSON.parse(match[1])
  } catch {}

  return null
}


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrepAnalysePage() {
  const { user, profile, isCoach } = useAuth()
  const coachId = profile?.id || user?.id || null
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [data, setData] = useState({ hooper: [], compo: [], topsets: [], charge: [], chargeInterne: [] })
  const [loading, setLoading] = useState(true)
  const [selectedEx, setSelectedEx] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { data: profile },
      { data: hooper },
      { data: compo },
      { data: topsets },
      { data: charge },
      { data: chargeInterne },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', id).single(),
      supabase.from('hooper_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(60),
      supabase.from('body_composition_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(30),
      supabase.from('topset_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(100),
      supabase.from('charge_externe_logs').select('*').eq('user_id', id).order('date',{ascending:true}),
      supabase.from('charge_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(60),
    ])
    setClient(profile)
    setData({ hooper: hooper||[], compo: compo||[], topsets: topsets||[], charge: charge||[], chargeInterne: chargeInterne||[] })
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Calculs ──────────────────────────────────────────────────────────────────
  const hooperScores = useMemo(() => data.hooper.map(h => ({
    value: h.fatigue+h.sommeil+h.stress+h.courbatures, date: h.date
  })), [data.hooper])

  const lastH = data.hooper[data.hooper.length-1]
  const lastScore = lastH ? lastH.fatigue+lastH.sommeil+lastH.stress+lastH.courbatures : null
  const prevScore = data.hooper.length > 1 ? data.hooper[data.hooper.length-2].fatigue+data.hooper[data.hooper.length-2].sommeil+data.hooper[data.hooper.length-2].stress+data.hooper[data.hooper.length-2].courbatures : null

  const compoData = {
    poids:   data.compo.filter(c=>c.weight_kg).map(c=>({value:parseFloat(c.weight_kg),date:c.date})),
    graisse: data.compo.filter(c=>c.body_fat_pct).map(c=>({value:parseFloat(c.body_fat_pct),date:c.date})),
    maigre:  data.compo.filter(c=>c.muscle_mass_kg).map(c=>({value:parseFloat(c.muscle_mass_kg),date:c.date})),
  }
  const lastC = data.compo[data.compo.length-1]
  const prevC = data.compo.length > 1 ? data.compo[data.compo.length-2] : null
  const [selectedBilanIdx, setSelectedBilanIdx] = useState(null)
  const [selectedDomsLog, setSelectedDomsLog] = useState(null)
  const [rtpOpen, setRtpOpen] = useState(false)
  // Auto-sélectionner le dernier bilan quand les données arrivent
  useEffect(() => {
    if (data.compo.length > 0) setSelectedBilanIdx(data.compo.length - 1)
  }, [data.compo.length])
  const selectedC = selectedBilanIdx != null ? data.compo[selectedBilanIdx] : lastC
  const prevSelectedC = selectedBilanIdx != null && selectedBilanIdx > 0 ? data.compo[selectedBilanIdx - 1] : null

  const plioData = useMemo(() => {
    const mg1=[], mg2=[]
    for (const c of data.compo) {
      let n=null; try{n=c.notes?JSON.parse(c.notes):null}catch{}
      if(n?.mg1?.resultat) mg1.push({value:parseFloat(n.mg1.resultat),date:c.date})
      if(n?.mg2?.resultat) mg2.push({value:parseFloat(n.mg2.resultat),date:c.date})
    }
    return {mg1,mg2}
  }, [data.compo])

  const silhoData = useMemo(() => {
    const keys=['epaule','poitrine','hanche','taille','cuisse','genoux']
    const byKey={}
    for (const c of data.compo) {
      let n=null; try{n=c.notes?JSON.parse(c.notes):null}catch{}
      if(!n?.silhouette) continue
      for (const k of keys) {
        if(n.silhouette[k]) {
          if(!byKey[k]) byKey[k]=[]
          byKey[k].push({value:parseFloat(n.silhouette[k]),date:c.date})
        }
      }
    }
    return byKey
  }, [data.compo])

  const exerciseNames = useMemo(()=>[...new Set(data.topsets.map(t=>t.exercise_name))],[data.topsets])
  useEffect(()=>{if(exerciseNames.length&&!selectedEx)setSelectedEx(exerciseNames[0])},[exerciseNames])

  const topsetSeries = useMemo(()=>{
    if(!selectedEx) return []
    return data.topsets.filter(t=>t.exercise_name===selectedEx)
      .map(t=>({value:t.estimated_1rm||Math.round((t.weight_kg||0)*(1+(t.reps||0)/30)*10)/10,date:t.date}))
      .filter(t=>t.value>0)
  },[data.topsets,selectedEx])

  const prs = useMemo(()=>{
    const map={}
    for(const t of data.topsets){
      const rm=t.estimated_1rm||Math.round((t.weight_kg||0)*(1+(t.reps||0)/30)*10)/10
      if(!map[t.exercise_name]||rm>map[t.exercise_name]) map[t.exercise_name]=rm
    }
    return map
  },[data.topsets])

  const weeklyCharge = useMemo(()=>{
    const w={}
    for(const c of data.charge){
      const wk=getWeekKey(c.date); w[wk]=(w[wk]||0)+(c.charge_ua||c.rpe*c.duree_min)
    }
    return w
  },[data.charge])

  const wkKeys = useMemo(()=>Object.keys(weeklyCharge).sort(),[weeklyCharge])
  const curWk = getWeekKey(new Date().toISOString().split('T')[0])
  const idxCur = wkKeys.indexOf(curWk)
  const acute = weeklyCharge[curWk]||0
  const chronic4 = wkKeys.slice(Math.max(0,idxCur-3),idxCur+1).map(k=>weeklyCharge[k])
  const chronAvg = chronic4.length?chronic4.reduce((a,b)=>a+b,0)/chronic4.length:0
  const acwr = chronAvg?Math.round((acute/chronAvg)*100)/100:null
  const chargeSeriesData = wkKeys.slice(-12).map(wk=>({value:weeklyCharge[wk],date:wk}))

  const acwrColor = !acwr?P.sub:acwr<=1.3?P.green:acwr<=1.5?P.yellow:P.red

  const dateLabel = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})

  if (loading) return (
    <div style={{minHeight:'100vh',background:P.bg,display:'grid',placeItems:'center',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:13,color:P.sub}}>Chargement de l'analyse...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:P.bg, fontFamily:"'DM Sans', sans-serif", padding:'clamp(20px,3vw,36px) clamp(16px,3vw,28px)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Navigation */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <button onClick={() => navigate(-1)}
            style={{ background:'none', border:'none', color:P.sub, cursor:'pointer', fontSize:13, fontWeight:500, padding:0, display:'flex', gap:6, alignItems:'center' }}>
            ← Retour
          </button>
          <div style={{ display:'flex', gap:8 }}>
            {isCoach && (
              <button onClick={() => setRtpOpen(true)}
                style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${P.accent}`, background:`${P.accent}10`, color:P.accent, fontSize:12, cursor:'pointer', fontWeight:700 }}>
                🎮 Protocole RTP
              </button>
            )}
            <button onClick={load}
              style={{ padding:'7px 14px', borderRadius:20, border:`1px solid ${P.border}`, background:'transparent', color:P.sub, fontSize:11, cursor:'pointer', fontWeight:600 }}>
              ↻ Actualiser
            </button>
          </div>
        </div>

        {/* Header athlète */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:2, textTransform:'uppercase', color:P.sub, marginBottom:6 }}>
            ProSportConcept · Analyse prépa physique
          </div>
          <h1 style={{ fontFamily:"'DM Serif Display', serif", fontSize:'clamp(24px,4vw,34px)', fontWeight:400, color:P.text, margin:0, lineHeight:1.2 }}>
            {client?.full_name || client?.email}
          </h1>
          <div style={{ fontSize:13, color:P.sub, marginTop:6, textTransform:'capitalize' }}>{dateLabel}</div>
        </div>

        {/* Résumé rapide */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:10, marginBottom:28 }}>
          {lastScore !== null && (
            <StatPill label="HOOPER" value={lastScore} unit="/40" color={scoreColor(lastScore)} delta={prevScore !== null ? lastScore-prevScore : null} deltaUnit="" />
          )}
          {selectedC?.weight_kg && <StatPill label="Poids" value={selectedC.weight_kg} unit="kg" color={P.accent} delta={prevSelectedC?.weight_kg ? parseFloat(selectedC.weight_kg)-parseFloat(prevSelectedC.weight_kg) : null} deltaUnit="kg" />}
          {selectedC?.body_fat_pct && <StatPill label="Masse grasse" value={selectedC.body_fat_pct} unit="%" color={P.red} delta={prevSelectedC?.body_fat_pct ? parseFloat(selectedC.body_fat_pct)-parseFloat(prevSelectedC.body_fat_pct) : null} deltaUnit="%" />}
          {acwr !== null && <StatPill label="ACWR" value={acwr} unit="" color={acwrColor} />}
          {selectedEx && prs[selectedEx] && <StatPill label="1RM" value={`~${prs[selectedEx]}`} unit="kg" color={P.teal} />}
        </div>

        {/* ── HOOPER ── */}
        <Section title="HOOPER — Récupération" icon="🧠" color={P.green}
          badge={lastScore !== null ? `Score actuel : ${lastScore}/40 · ${lastScore<=7?'Très bon':lastScore<=13?'Correct':lastScore<=20?'Vigilance':'⚠️ Fatigue importante'}` : 'Aucune donnée'}
          defaultOpen={true}>
          <div style={{ paddingTop:20, display:'grid', gap:24 }}>
            <ClickableChart data={hooperScores} color={P.green} unit="" title="HOOPER — Score total /40">
              <D3Chart data={hooperScores} color={P.green} h={130} title="Score total /40" lastValue={lastScore} delta={prevScore!==null?lastScore-prevScore:null} />
            </ClickableChart>
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:12 }}>Détail par item</div>
            <ClickableChart title="HOOPER — Détail par item" series={[
                {label:'Fatigue',    color:CHART_COLORS.fatigue,     data:data.hooper.map(h=>({value:h.fatigue,    date:h.date}))},
                {label:'Sommeil',    color:CHART_COLORS.sommeil,     data:data.hooper.map(h=>({value:h.sommeil,    date:h.date}))},
                {label:'Stress',     color:CHART_COLORS.stress,      data:data.hooper.map(h=>({value:h.stress,     date:h.date}))},
                {label:'Courbatures',color:CHART_COLORS.courbatures, data:data.hooper.map(h=>({value:h.courbatures,date:h.date}))},
              ]}>
              <MultiD3Chart h={110} series={[
                {label:'Fatigue',    color:CHART_COLORS.fatigue,     data:data.hooper.map(h=>({value:h.fatigue,    date:h.date}))},
                {label:'Sommeil',    color:CHART_COLORS.sommeil,     data:data.hooper.map(h=>({value:h.sommeil,    date:h.date}))},
                {label:'Stress',     color:CHART_COLORS.stress,      data:data.hooper.map(h=>({value:h.stress,     date:h.date}))},
                {label:'Courbatures',color:CHART_COLORS.courbatures, data:data.hooper.map(h=>({value:h.courbatures,date:h.date}))},
              ]} />
            </ClickableChart>
              <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
                {[['Fatigue',CHART_COLORS.fatigue],['Sommeil',CHART_COLORS.sommeil],['Stress',CHART_COLORS.stress],['Courbatures',CHART_COLORS.courbatures]].map(([l,c])=>(
                  <div key={l} style={{ display:'flex', gap:5, alignItems:'center', fontSize:11, color:P.sub }}>
                    <div style={{ width:14, height:2.5, background:c, borderRadius:2 }} />{l}
                  </div>
                ))}
              </div>
            </div>
            {/* Tableau */}
            {data.hooper.length > 0 && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:`2px solid ${P.border}` }}>
                      {['Date','Score','F','S','St','C','DOMS'].map(h=>(
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600, fontSize:10, letterSpacing:0.8, textTransform:'uppercase', color:P.sub }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.hooper].reverse().slice(0,14).map(h=>{
                      const s=h.fatigue+h.sommeil+h.stress+h.courbatures
                      let dzRow = {}
                      try { const r = h.doms_zones; dzRow = typeof r === 'string' ? JSON.parse(r) : (r || {}) } catch {}
                      const domsN=Object.values(dzRow).filter(z=>z?.level>0).length
                      return (
                        <tr key={h.id} style={{ borderBottom:`1px solid ${P.border}` }}>
                          <td style={{ padding:'8px 10px', color:P.text }}>{new Date(h.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</td>
                          <td style={{ padding:'8px 10px', fontWeight:700, color:scoreColor(s), fontFamily:"'DM Serif Display',serif", fontSize:15 }}>{s}</td>
                          <td style={{ padding:'8px 10px', color:P.red, fontWeight:600 }}>{h.fatigue}</td>
                          <td style={{ padding:'8px 10px', color:P.purple, fontWeight:600 }}>{h.sommeil}</td>
                          <td style={{ padding:'8px 10px', color:P.blue, fontWeight:600 }}>{h.stress}</td>
                          <td style={{ padding:'8px 10px', color:P.yellow, fontWeight:600 }}>{h.courbatures}</td>
                          <td style={{ padding:'8px 10px', color:domsN>0?P.red:P.dim }}>
                            {domsN > 0 ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedDomsLog({...h, doms_zones: dzRow}) }}
                                style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:P.red, fontWeight:700, fontSize:12, textDecoration:'underline' }}
                              >
                                {domsN} zone{domsN>1?'s':''}
                              </button>
                            ) : '–'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Section>

        {/* ── COMPOSITION ── */}
        <Section title="Composition corporelle" icon="⚖️" color={P.blue}
          badge={selectedC ? `${selectedC.weight_kg||'—'}kg · MG ${selectedC.body_fat_pct||'—'}% · MM ${selectedC.muscle_mass_kg||'—'}kg` : 'Aucune mesure'}>
          <div style={{ paddingTop:20, display:'grid', gap:24 }}>

            {/* Graphiques courbes */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:20 }}>
              {[
                {data:compoData.poids,   color:CHART_COLORS.poids,   title:'Poids', unit:' kg',  key:'weight_kg'},
                {data:compoData.graisse, color:CHART_COLORS.graisse, title:'Masse grasse', unit:'%', key:'body_fat_pct'},
                {data:compoData.maigre,  color:CHART_COLORS.maigre,  title:'Masse maigre', unit:' kg', key:'muscle_mass_kg'},
              ].filter(g=>g.data.length>=2).map(({data,color,title,unit,key})=>(
                <ClickableChart key={title} data={data} color={color} unit={unit} title={title}>
                  <D3Chart data={data} color={color} h={110} title={title} unit={unit}
                    lastValue={selectedC?.[key]} delta={prevSelectedC?.[key]?parseFloat(selectedC[key])-parseFloat(prevSelectedC[key]):null} />
                </ClickableChart>
              ))}
            </div>

            {/* Navigateur de bilans */}
            {data.compo.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:P.bg, borderRadius:12, border:`1px solid ${P.border}` }}>
                <button
                  onClick={() => setSelectedBilanIdx(i => Math.max(0, (i ?? data.compo.length-1) - 1))}
                  disabled={selectedBilanIdx === 0}
                  style={{ width:30, height:30, borderRadius:'50%', border:`1px solid ${P.border}`, background:P.card, color:selectedBilanIdx===0?P.dim:P.text, fontSize:16, cursor:selectedBilanIdx===0?'default':'pointer', display:'grid', placeItems:'center' }}>
                  ‹
                </button>
                <div style={{ flex:1, textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:P.text }}>
                    {selectedC ? new Date(selectedC.date+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '—'}
                  </div>
                  <div style={{ fontSize:11, color:P.sub, marginTop:2 }}>
                    Bilan {(selectedBilanIdx??data.compo.length-1)+1} / {data.compo.length}
                    {selectedBilanIdx === data.compo.length-1 && <span style={{ marginLeft:6, color:P.green, fontWeight:600 }}>· Dernier</span>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBilanIdx(i => Math.min(data.compo.length-1, (i ?? data.compo.length-1) + 1))}
                  disabled={selectedBilanIdx === data.compo.length-1}
                  style={{ width:30, height:30, borderRadius:'50%', border:`1px solid ${P.border}`, background:P.card, color:selectedBilanIdx===data.compo.length-1?P.dim:P.text, fontSize:16, cursor:selectedBilanIdx===data.compo.length-1?'default':'pointer', display:'grid', placeItems:'center' }}>
                  ›
                </button>
              </div>
            )}

            {/* Bilan sélectionné — détail */}
            {selectedC && (() => {
              let n = null; try { n = selectedC.notes ? JSON.parse(selectedC.notes) : null } catch {}
              if (!n) return null
              return (
                <div style={{ display:'grid', gap:16, paddingTop:16, borderTop:`1px solid ${P.border}` }}>

                  {/* Conditions mesure */}
                  {n.impedance && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:8 }}>Conditions de mesure</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {n.heure && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>🕐 {n.heure}</span>}
                        {n.modele_balance && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>⚖️ {n.modele_balance}</span>}
                        {n.tenue && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>👕 {n.tenue}</span>}
                        {n.impedance.eau_litres && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>💧 {n.impedance.eau_litres}L</span>}
                        {n.impedance.heure_repas && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>🍽️ Repas {n.impedance.heure_repas}</span>}
                        {n.impedance.activite_veille && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>🏃 {n.impedance.activite_veille}</span>}
                        {n.impedance.cycle_phase && n.impedance.cycle_phase !== 'na' && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>🔄 {n.impedance.cycle_phase}</span>}
                        {n.impedance.alcool_veille && <span style={{ padding:'4px 10px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:20, fontSize:11, color:P.red }}>🍷 Alcool H-24</span>}
                        {n.impedance.cafeine_veille && <span style={{ padding:'4px 10px', background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:20, fontSize:11, color:P.yellow }}>☕ Caféïne</span>}
                        {n.impedance.pacemaker && <span style={{ padding:'4px 10px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:20, fontSize:11, color:P.red }}>⚠️ Pacemaker</span>}
                        {n.impedance.enceinte && <span style={{ padding:'4px 10px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:20, fontSize:11, color:P.red }}>⚠️ Enceinte</span>}
                      </div>
                    </div>
                  )}

                  {/* MG1 + MG2 — dernière mesure + évolution */}
                  {(plioData.mg1.length>0 || plioData.mg2.length>0) && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:10 }}>Pliométrie cutanée</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12, marginBottom: plioData.mg1.length>=2||plioData.mg2.length>=2 ? 16 : 0 }}>
                        {n.mg1 && (
                          <div style={{ padding:'14px 16px', background:P.bg, borderRadius:12, border:`1px solid ${P.border}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:P.text }}>MG1 — 4 plis</span>
                              {n.mg1.resultat && <span style={{ fontSize:20, fontWeight:700, color:P.yellow, fontFamily:"'DM Serif Display',serif" }}>{n.mg1.resultat}%</span>}
                            </div>
                            <div style={{ display:'grid', gap:4 }}>
                              {['sous_scapulaire','tricipital','supra_iliaque','ombilical'].filter(k=>n.mg1[k]).map(k=>(
                                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                                  <span style={{ color:P.sub, textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
                                  <span style={{ fontWeight:600, color:P.text }}>{n.mg1[k]} mm</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {n.mg2 && (
                          <div style={{ padding:'14px 16px', background:P.bg, borderRadius:12, border:`1px solid ${P.border}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:P.text }}>MG2 — 7 plis</span>
                              {n.mg2.resultat && <span style={{ fontSize:20, fontWeight:700, color:P.red, fontFamily:"'DM Serif Display',serif" }}>{n.mg2.resultat}%</span>}
                            </div>
                            <div style={{ display:'grid', gap:4 }}>
                              {['sous_scapulaire','tricipital','supra_iliaque','ombilical','bicipital','sural','quadricipital'].filter(k=>n.mg2[k]).map(k=>(
                                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                                  <span style={{ color:P.sub, textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
                                  <span style={{ fontWeight:600, color:P.text }}>{n.mg2[k]} mm</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Graphes évolution si >= 2 mesures */}
                      {(plioData.mg1.length>=2 || plioData.mg2.length>=2) && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16 }}>
                          {plioData.mg1.length>=2 && <ClickableChart data={plioData.mg1} color={CHART_COLORS.mg1} unit="%" title="Évolution MG1 — 4 plis"><D3Chart data={plioData.mg1} color={CHART_COLORS.mg1} h={90} title="Évolution MG1" unit="%" lastValue={plioData.mg1[plioData.mg1.length-1]?.value} delta={plioData.mg1[plioData.mg1.length-1].value-plioData.mg1[plioData.mg1.length-2].value} /></ClickableChart>}
                          {plioData.mg2.length>=2 && <ClickableChart data={plioData.mg2} color={CHART_COLORS.mg2} unit="%" title="Évolution MG2 — 7 plis"><D3Chart data={plioData.mg2} color={CHART_COLORS.mg2} h={90} title="Évolution MG2" unit="%" lastValue={plioData.mg2[plioData.mg2.length-1]?.value} delta={plioData.mg2[plioData.mg2.length-1].value-plioData.mg2[plioData.mg2.length-2].value} /></ClickableChart>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Silhouette — dernière mesure + évolution */}
                  {n.silhouette && Object.values(n.silhouette).some(v=>v) && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:10 }}>Mesure silhouette (cm)</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(100px,1fr))', gap:8, marginBottom:16 }}>
                        {[['epaule','Épaule'],['poitrine','Poitrine'],['hanche','Hanche'],['taille','Taille'],['cuisse','Cuisse'],['genoux','Genoux']].filter(([k])=>n.silhouette[k]).map(([k,l])=>(
                          <div key={k} style={{ padding:'10px 12px', background:P.bg, borderRadius:10, border:`1px solid ${P.border}`, textAlign:'center' }}>
                            <div style={{ fontSize:10, color:P.sub, marginBottom:4 }}>{l}</div>
                            <div style={{ fontSize:16, fontWeight:700, color:P.text, fontFamily:"'DM Serif Display',serif" }}>{n.silhouette[k]}</div>
                          </div>
                        ))}
                      </div>
                      {/* Graphes évolution si >= 2 mesures */}
                      {Object.values(silhoData).some(d=>d.length>=2) && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:16 }}>
                          {Object.entries({epaule:'Épaule',poitrine:'Poitrine',hanche:'Hanche',taille:'Taille',cuisse:'Cuisse',genoux:'Genoux'})
                            .filter(([k])=>silhoData[k]?.length>=2)
                            .map(([k,l])=>{
                              const colors={epaule:P.blue,poitrine:P.purple,hanche:P.red,taille:P.yellow,cuisse:P.green,genoux:P.teal}
                              const d=silhoData[k]
                              return <ClickableChart key={k} data={d} color={colors[k]||P.accent} unit=" cm" title={`Silhouette — ${l}`}><D3Chart data={d} color={colors[k]||P.accent} h={80} title={`${l}`} lastValue={d[d.length-1]?.value} unit=" cm" delta={d[d.length-1].value-d[d.length-2].value} /></ClickableChart>
                            })
                          }
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )
            })()}
          </div>
        </Section>

        {/* ── TESTS CHARGE INTERNE ── */}
        {data.chargeInterne.length > 0 && (() => {
          const ci = data.chargeInterne
          const last = ci[ci.length-1]
          const prev = ci.length > 1 ? ci[ci.length-2] : null
          const grip  = ci.filter(c=>c.prehension_kg).map(c=>({value:parseFloat(c.prehension_kg),date:c.date}))
          const submax = ci.filter(c=>c.submax_kg).map(c=>({value:parseFloat(c.submax_kg),date:c.date}))
          const cmj   = ci.filter(c=>c.cmj_cm).map(c=>({value:parseFloat(c.cmj_cm),date:c.date}))
          const badge = [
            last.prehension_kg ? `Grip ${last.prehension_kg}kg` : null,
            last.submax_kg     ? `Submax ${last.submax_kg}kg`   : null,
            last.cmj_cm        ? `CMJ ${last.cmj_cm}cm`         : null,
          ].filter(Boolean).join(' · ') || 'Données disponibles'
          return (
            <Section title="Tests — Charge interne" icon="💪" color={P.blue} badge={badge}>
              <div style={{ paddingTop:20, display:'grid', gap:20 }}>

                {/* Dernières valeurs */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:10 }}>
                  {[
                    { key:'prehension_kg', label:'Force préhension', unit:'kg', color:CHART_COLORS.stress,   desc:'GRIP' },
                    { key:'submax_kg',     label:'Submax',           unit:'kg', color:CHART_COLORS.sommeil,  desc:"FC 3' / FC 1'" },
                    { key:'cmj_cm',        label:'CMJ',              unit:'cm', color:CHART_COLORS.hooper,   desc:'Counter Movement Jump' },
                  ].filter(f => last[f.key]).map(({key,label,unit,color,desc}) => {
                    const delta = prev?.[key] ? parseFloat(last[key]) - parseFloat(prev[key]) : null
                    return (
                      <div key={key} style={{ padding:'12px 16px', background:P.bg, borderRadius:10, border:`1px solid ${P.border}` }}>
                        <div style={{ fontSize:10, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>
                          {last[key]}<span style={{ fontSize:12, color:P.sub, marginLeft:3 }}>{unit}</span>
                        </div>
                        {delta !== null && (
                          <div style={{ fontSize:11, color: delta > 0 ? P.green : P.red, marginTop:4, fontWeight:600 }}>
                            {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta*10)/10)}{unit}
                          </div>
                        )}
                        <div style={{ fontSize:10, color:P.dim, marginTop:4 }}>{desc}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Graphes évolution */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16 }}>
                  {grip.length>=2   && <ClickableChart data={grip}   color={CHART_COLORS.stress}  unit=" kg" title="Force de préhension (GRIP)"><D3Chart data={grip}   color={CHART_COLORS.stress}  h={100} title="Préhension (GRIP)" unit=" kg" lastValue={grip[grip.length-1]?.value}     delta={grip.length>1   ? grip[grip.length-1].value   - grip[grip.length-2].value   : null} /></ClickableChart>}
                  {submax.length>=2 && <ClickableChart data={submax} color={CHART_COLORS.sommeil} unit=" kg" title="Submax (FC 3' / FC 1')"><D3Chart data={submax} color={CHART_COLORS.sommeil} h={100} title="Submax" unit=" kg"            lastValue={submax[submax.length-1]?.value} delta={submax.length>1 ? submax[submax.length-1].value - submax[submax.length-2].value : null} /></ClickableChart>}
                  {cmj.length>=2    && <ClickableChart data={cmj}    color={CHART_COLORS.hooper}  unit=" cm" title="CMJ (Counter Movement Jump)"><D3Chart data={cmj}    color={CHART_COLORS.hooper}  h={100} title="CMJ" unit=" cm"              lastValue={cmj[cmj.length-1]?.value}       delta={cmj.length>1    ? cmj[cmj.length-1].value    - cmj[cmj.length-2].value    : null} /></ClickableChart>}
                </div>

                {/* Historique tableau */}
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ borderBottom:`2px solid ${P.border}` }}>
                        {['Date','Préhension','Submax','CMJ','Notes'].map(h=>(
                          <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...ci].reverse().map(log=>(
                        <tr key={log.id} style={{ borderBottom:`1px solid ${P.border}` }}>
                          <td style={{ padding:'8px 10px', color:P.text }}>{new Date(log.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'2-digit'})}</td>
                          <td style={{ padding:'8px 10px', fontWeight:600, color:CHART_COLORS.stress  }}>{log.prehension_kg ? `${log.prehension_kg} kg` : '—'}</td>
                          <td style={{ padding:'8px 10px', fontWeight:600, color:CHART_COLORS.sommeil }}>{log.submax_kg     ? `${log.submax_kg} kg`     : '—'}</td>
                          <td style={{ padding:'8px 10px', fontWeight:600, color:CHART_COLORS.hooper  }}>{log.cmj_cm        ? `${log.cmj_cm} cm`        : '—'}</td>
                          <td style={{ padding:'8px 10px', color:P.dim, fontSize:11 }}>{log.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </Section>
          )
        })()}

        {/* ── TOPSET ── */}
        <Section title="TOPSET — Progression & Volumétrie" icon="🏋️" color={P.teal}
          badge={selectedEx&&prs[selectedEx]?`${selectedEx} · Record : ~${prs[selectedEx]}kg`:exerciseNames.length?`${exerciseNames.length} exercices`:'Aucune donnée'}>
          <div style={{ paddingTop:20, display:'grid', gap:16 }}>
            {exerciseNames.length > 0 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {exerciseNames.map(ex=>(
                  <button key={ex} onClick={e=>{e.stopPropagation();setSelectedEx(ex)}}
                    style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${selectedEx===ex?P.teal:P.border}`, background:selectedEx===ex?P.teal:P.card, color:selectedEx===ex?'#fff':P.text, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {selectedEx && (() => {
              const logs = data.topsets.filter(t => t.exercise_name === selectedEx)
              if (!logs.length) return null

              // Calculs volumétrie
              const calc1RM = (w, r) => { const ww=parseFloat(w),rr=parseInt(r); if(!ww||!rr||rr<=0) return null; return Math.round(ww*(1+rr/30)*10)/10 }

              // Volume par séance (charge × reps par set, groupé par date)
              const volumeByDate = {}
              const tonnageByDate = {}
              const rpeByDate = {}
              const setsCountByDate = {}
              for (const t of logs) {
                if (!volumeByDate[t.date]) { volumeByDate[t.date]=0; tonnageByDate[t.date]=0; rpeByDate[t.date]=[]; setsCountByDate[t.date]=0 }
                const vol = (parseFloat(t.weight_kg)||0) * (parseInt(t.reps)||0)
                volumeByDate[t.date] += vol
                tonnageByDate[t.date] += parseFloat(t.weight_kg)||0
                if (t.rpe) rpeByDate[t.date].push(parseFloat(t.rpe))
                setsCountByDate[t.date] += 1
              }
              const dates = Object.keys(volumeByDate).sort()
              const volumeSeries = dates.map(d => ({ value: Math.round(volumeByDate[d]), date: d }))
              const rpeSeries = dates.filter(d => rpeByDate[d].length).map(d => ({ value: Math.round((rpeByDate[d].reduce((a,b)=>a+b,0)/rpeByDate[d].length)*10)/10, date: d }))

              // Totaux globaux
              const totalTonnage = logs.reduce((s,t) => s+(parseFloat(t.weight_kg)||0)*(parseInt(t.reps)||0),0)
              const totalSets = logs.length
              const avgRpe = logs.filter(t=>t.rpe).length ? Math.round((logs.filter(t=>t.rpe).reduce((s,t)=>s+parseFloat(t.rpe),0)/logs.filter(t=>t.rpe).length)*10)/10 : null

              return (
                <>
                  {/* Stats clés */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px,1fr))', gap:10 }}>
                    {[
                      { label:'Record 1RM', value:`~${prs[selectedEx]}`, unit:'kg', color:P.teal },
                      { label:'Tonnage total', value:Math.round(totalTonnage).toLocaleString('fr-FR'), unit:'kg', color:P.blue },
                      { label:'Sets total', value:totalSets, unit:'sets', color:P.purple },
                      ...(avgRpe ? [{ label:'RPE moyen', value:avgRpe, unit:'/10', color: avgRpe>=8?P.red:avgRpe>=6?P.yellow:P.green }] : []),
                    ].map(({label,value,unit,color}) => (
                      <div key={label} style={{ padding:'12px 14px', background:P.bg, borderRadius:10, border:`1px solid ${P.border}` }}>
                        <div style={{ fontSize:10, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:20, fontWeight:700, color, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>
                          {value}<span style={{ fontSize:11, color:P.sub, marginLeft:3 }}>{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Graphe 1RM */}
                  {topsetSeries.length>=2 && (
                    <ClickableChart data={topsetSeries} color={CHART_COLORS.topset} unit=" kg" title={`1RM — ${selectedEx}`}>
                      <D3Chart data={topsetSeries} color={CHART_COLORS.topset} h={110} title={`1RM estimé — ${selectedEx}`} unit=" kg" lastValue={topsetSeries[topsetSeries.length-1]?.value} delta={topsetSeries.length>1?topsetSeries[topsetSeries.length-1].value-topsetSeries[topsetSeries.length-2].value:null} />
                    </ClickableChart>
                  )}

                  {/* Graphe volume par séance */}
                  {volumeSeries.length>=2 && (
                    <ClickableChart data={volumeSeries} color={P.blue} unit=" kg" title={`Volume par séance — ${selectedEx}`}>
                      <D3Chart data={volumeSeries} color={P.blue} h={90} title="Volume par séance (charge × reps)" unit=" kg" lastValue={volumeSeries[volumeSeries.length-1]?.value} delta={volumeSeries.length>1?volumeSeries[volumeSeries.length-1].value-volumeSeries[volumeSeries.length-2].value:null} />
                    </ClickableChart>
                  )}

                  {/* Graphe RPE */}
                  {rpeSeries.length>=2 && (
                    <ClickableChart data={rpeSeries} color={P.yellow} unit="" title={`RPE moyen — ${selectedEx}`}>
                      <D3Chart data={rpeSeries} color={P.yellow} h={80} title="RPE moyen par séance" unit="" lastValue={rpeSeries[rpeSeries.length-1]?.value} delta={rpeSeries.length>1?rpeSeries[rpeSeries.length-1].value-rpeSeries[rpeSeries.length-2].value:null} />
                    </ClickableChart>
                  )}

                  {/* Historique détaillé par séance */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:10 }}>Détail des séances</div>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                          <tr style={{ borderBottom:`2px solid ${P.border}` }}>
                            {['Date','Charge','Reps','RPE','1RM est.','Volume','Sets'].map(h=>(
                              <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...logs].reverse().slice(0,20).map(log => {
                            const rm = log.estimated_1rm || calc1RM(log.weight_kg, log.reps)
                            const vol = (parseFloat(log.weight_kg)||0)*(parseInt(log.reps)||0)
                            return (
                              <tr key={log.id} style={{ borderBottom:`1px solid ${P.border}` }}>
                                <td style={{ padding:'7px 10px', color:P.text }}>{new Date(log.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'2-digit'})}</td>
                                <td style={{ padding:'7px 10px', fontWeight:700, color:P.teal }}>{log.weight_kg ? `${log.weight_kg} kg` : '—'}</td>
                                <td style={{ padding:'7px 10px', color:P.text }}>{log.reps || '—'}</td>
                                <td style={{ padding:'7px 10px', fontWeight:600, color:log.rpe>=8?P.red:log.rpe>=6?P.yellow:P.green }}>{log.rpe ? `@${log.rpe}` : '—'}</td>
                                <td style={{ padding:'7px 10px', fontWeight:700, color:P.teal, fontFamily:"'DM Serif Display',serif" }}>{rm ? `~${rm}kg` : '—'}</td>
                                <td style={{ padding:'7px 10px', color:P.blue, fontWeight:600 }}>{vol > 0 ? `${Math.round(vol).toLocaleString('fr-FR')} kg` : '—'}</td>
                                <td style={{ padding:'7px 10px', color:P.sub }}>{setsCountByDate[log.date] || '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Records tous exercices */}
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:10 }}>Records par exercice</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:8 }}>
                {Object.entries(prs).sort((a,b)=>b[1]-a[1]).map(([ex,rm])=>(
                  <div key={ex} onClick={()=>setSelectedEx(ex)} style={{ padding:'10px 14px', background: selectedEx===ex?`${P.teal}10`:P.bg, borderRadius:10, border:`1px solid ${selectedEx===ex?P.teal:P.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                    <span style={{ fontSize:12, color:P.text, fontWeight:500 }}>{ex}</span>
                    <span style={{ fontSize:16, fontWeight:700, color:P.teal, fontFamily:"'DM Serif Display',serif" }}>~{rm}kg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── CHARGE EXTERNE ── */}
        <Section title="Charge externe — ACWR" icon="⚡" color={P.purple}
          badge={acwr?`ACWR : ${acwr} · ${acute?Math.round(acute)+' UA cette semaine':''}`:data.charge.length+' séances enregistrées'}>
          <div style={{ paddingTop:20, display:'grid', gap:20 }}>
            {/* Gauge ACWR */}
            <div style={{ padding:'16px 20px', background:P.bg, borderRadius:12, border:`1px solid ${P.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:4 }}>Ratio charge aiguë / chronique</div>
                  <div style={{ fontSize:11, color:P.dim }}>Optimal : 0.8 – 1.3 · Au-delà de 1.5 : risque élevé</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:36, fontWeight:700, color:acwrColor, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>{acwr??'—'}</div>
                  <div style={{ fontSize:11, color:acwrColor, marginTop:4, fontWeight:600 }}>
                    {!acwr?'':acwr<=0.8?'Sous-charge':acwr<=1.3?'Zone optimale':acwr<=1.5?'Vigilance':'Surcharge ⚠️'}
                  </div>
                </div>
              </div>
              <div style={{ position:'relative', height:8, borderRadius:4, overflow:'hidden', background:P.border }}>
                <div style={{ position:'absolute', left:0, width:'40%', height:'100%', background:'#dbeafe' }} />
                <div style={{ position:'absolute', left:'40%', width:'25%', height:'100%', background:'#d1fae5' }} />
                <div style={{ position:'absolute', left:'65%', width:'10%', height:'100%', background:'#fef3c7' }} />
                <div style={{ position:'absolute', left:'75%', width:'25%', height:'100%', background:'#fee2e2' }} />
                {acwr && <div style={{ position:'absolute', top:0, bottom:0, width:3, borderRadius:2, background:acwrColor, left:`${Math.min(97,Math.max(2,(acwr/2)*100))}%`, transition:'left 0.4s', boxShadow:`0 0 4px ${acwrColor}` }} />}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:P.dim, marginTop:4, fontWeight:600 }}>
                <span>0</span><span>0.8</span><span>1.3</span><span>1.5</span><span>2</span>
              </div>
            </div>
            {chargeSeriesData.length>=2 && <ClickableChart data={chargeSeriesData} color={CHART_COLORS.charge} unit=" UA" title="Charge hebdomadaire (UA)"><D3Chart data={chargeSeriesData} color={CHART_COLORS.charge} h={120} title="Charge hebdomadaire (UA)" lastValue={Math.round(acute)} unit=" UA" /></ClickableChart>}

            {/* Kilométrage + bandes de vitesse */}
            {(() => {
              const SPEED_COLORS = { lent: '#3ecf8e', modere: '#fbbf24', rapide: '#ff7043', sprint: '#ff4566' }
              const SPEED_LABELS = { lent: 'Lent <8', modere: 'Modéré 8–12', rapide: 'Rapide 12–18', sprint: 'Sprint >18' }
              const seancesKm = data.charge
                .map(c => ({ ...c, km: extractKmData(c.notes) }))
                .filter(c => c.km && (c.km.km_total || c.km.speed_bands))

              if (!seancesKm.length) return null

              const kmSeries = seancesKm.filter(s => s.km.km_total).map(s => ({ value: parseFloat(s.km.km_total), date: s.date })).sort((a,b) => a.date.localeCompare(b.date))
              const totalKm = kmSeries.reduce((s, d) => s + d.value, 0)

              return (
                <div style={{ display:'grid', gap:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub }}>Kilométrage</div>
                    <div style={{ fontSize:18, fontWeight:700, color:P.blue, fontFamily:"'DM Serif Display',serif" }}>{Math.round(totalKm*10)/10} km total</div>
                  </div>

                  {kmSeries.length >= 2 && (
                    <ClickableChart data={kmSeries} color={P.blue} unit=" km" title="Kilométrage par séance">
                      <D3Chart data={kmSeries} color={P.blue} h={90} title="Kilométrage (km)" unit=" km" lastValue={kmSeries[kmSeries.length-1]?.value} delta={kmSeries.length>1?kmSeries[kmSeries.length-1].value-kmSeries[kmSeries.length-2].value:null} />
                    </ClickableChart>
                  )}

                  {/* Dernières séances avec bandes */}
                  <div style={{ display:'grid', gap:8 }}>
                    {seancesKm.slice(-5).reverse().map(s => {
                      const bands = s.km.speed_bands
                      const bandTotal = bands ? Object.values(bands).reduce((a,b) => a+(parseFloat(b)||0), 0) : 0
                      return (
                        <div key={s.id} style={{ padding:'10px 14px', background:P.bg, borderRadius:10, border:`1px solid ${P.border}` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: bands && bandTotal > 0 ? 8 : 0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:P.text }}>
                              {new Date(s.date+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}
                            </div>
                            <div style={{ display:'flex', gap:12, alignItems:'baseline' }}>
                              {s.km.km_total && <span style={{ fontSize:14, fontWeight:700, color:P.blue, fontFamily:"'DM Serif Display',serif" }}>{s.km.km_total} km</span>}
                              {s.km.vitesse_moy && <span style={{ fontSize:11, color:P.sub }}>{s.km.vitesse_moy} km/h moy.</span>}
                            </div>
                          </div>
                          {bands && bandTotal > 0 && (
                            <>
                              <div style={{ height:8, borderRadius:4, overflow:'hidden', display:'flex', marginBottom:6 }}>
                                {Object.entries(bands).filter(([,v]) => parseFloat(v)>0).map(([key, val]) => (
                                  <div key={key} style={{ width:`${(parseFloat(val)/bandTotal)*100}%`, background:SPEED_COLORS[key] }} title={`${SPEED_LABELS[key]}: ${val}km`} />
                                ))}
                              </div>
                              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                                {Object.entries(bands).filter(([,v]) => parseFloat(v)>0).map(([key, val]) => (
                                  <span key={key} style={{ fontSize:10, color:SPEED_COLORS[key], fontWeight:600 }}>{SPEED_LABELS[key].split(' ')[0]} {val}km</span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </Section>

      </div>

      {/* ── Panel DOMS détail ── */}
      {/* ── RTP Game ── */}
      {rtpOpen && isCoach && (
        <RtpGame
          athleteId={id}
          athleteName={client?.full_name || client?.email || ''}
          coachId={coachId}
          onClose={() => setRtpOpen(false)}
        />
      )}

      {selectedDomsLog && (() => {
        let dz = {}
        try {
          const raw = selectedDomsLog.doms_zones
          dz = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
        } catch { dz = {} }
        const activeZones = DOMS_ZONES.filter(z => (dz[z.key]?.level || 0) > 0)
        const date = new Date(selectedDomsLog.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        const INQUIETUDE_LABELS = ['', 'Pas inquiet', 'Peu inquiet', 'Très inquiet']
        return (
          <div onClick={() => setSelectedDomsLog(null)} style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 16,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: P.card, border: `1px solid ${P.border}`,
              borderRadius: 20, width: '100%', maxWidth: 460,
              maxHeight: '95vh', overflowY: 'auto',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
            }}>
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>🩹 DOMS — {date}</div>
                  <div style={{ fontSize: 12, color: P.sub, marginTop: 3 }}>
                    {activeZones.length} zone{activeZones.length > 1 ? 's' : ''} douloureuse{activeZones.length > 1 ? 's' : ''}
                  </div>
                </div>
                <button onClick={() => setSelectedDomsLog(null)} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${P.border}`, background: P.bg, color: P.sub, fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
              </div>
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 130px', gap: 16, alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  {activeZones.length === 0 ? (
                    <div style={{ fontSize: 13, color: P.green }}>✓ Aucune douleur</div>
                  ) : activeZones.map(zone => {
                    const zd = dz[zone.key]
                    const level = zd?.level || 0
                    const inq = zd?.inquietude || 0
                    const color = level <= 2 ? P.green : level <= 4 ? P.yellow : level <= 6 ? '#e07040' : P.red
                    return (
                      <div key={zone.key} style={{ padding: '10px 12px', borderRadius: 10, background: P.bg, border: `1px solid ${P.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color }}>{zone.label}</div>
                            {inq > 0 && <div style={{ fontSize: 11, color: P.sub }}>{INQUIETUDE_LABELS[inq]}</div>}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "'DM Serif Display',serif" }}>{level}/10</div>
                        </div>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: i < level ? color : `${color}20` }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, textAlign: 'center' }}>Carte</div>
                  <svg viewBox="0 0 200 460" style={{ width: '100%', height: 280, display: 'block' }}>
                    <image href="data:image/png;base64,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" x="0" y="0" width="200" height="460"/>
                    {DOMS_ZONES.map(zone => {
                      const POSITIONS = {
                        nuque:      [{x:100, y:28}],
                        epaules:    [{x:44,  y:75}, {x:156, y:75}],
                        coudes:     [{x:22,  y:160},{x:178, y:160}],
                        poignets:   [{x:16,  y:210},{x:184, y:210}],
                        tronc:      [{x:100, y:130}],
                        lombaires:  [{x:100, y:185}],
                        hanches:    [{x:72,  y:225},{x:128, y:225}],
                        cuisses:    [{x:72,  y:285},{x:128, y:285}],
                        genoux:     [{x:72,  y:340},{x:128, y:340}],
                        chevilles:  [{x:72,  y:400},{x:128, y:400}],
                        pieds:      [{x:72,  y:440},{x:128, y:440}],
                      }
                      const level = dz[zone.key]?.level || 0
                      if (!level) return null
                      const color = level <= 2 ? '#2d9e6b' : level <= 4 ? '#e6a817' : level <= 6 ? '#e07040' : '#c0392b'
                      const positions = POSITIONS[zone.key] || []
                      const r = 9 + level * 0.5
                      return positions.map((pos, i) => (
                        <g key={`${zone.key}-${i}`}>
                          <circle cx={pos.x} cy={pos.y} r={r+4} fill={color} opacity="0.2"/>
                          <circle cx={pos.x} cy={pos.y} r={r} fill={color} opacity="0.9"/>
                          <text x={pos.x} y={pos.y+1} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#fff" fontWeight="bold">{level}</text>
                        </g>
                      ))
                    })}
                  </svg>t { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import RtpGame from '../components/RtpGame'

// ─── Design tokens — médical premium ─────────────────────────────────────────
const P = {
  bg:      '#f5f3ef',
  card:    '#ffffff',
  border:  '#e8e4dc',
  text:    '#1a1a1a',
  sub:     '#6b6b6b',
  dim:     '#9e9e9e',
  accent:  '#1a3a2a',
  green:   '#2d6a4f',
  yellow:  '#b5830a',
  red:     '#c0392b',
  blue:    '#1a3a5c',
  purple:  '#4a2d6b',
  teal:    '#1a5c52',
}

const DOMS_ZONES = [
  { key: 'nuque',      label: 'Nuque / Cou' },
  { key: 'epaules',   label: 'Épaules' },
  { key: 'coudes',    label: 'Coudes' },
  { key: 'poignets',  label: 'Poignets' },
  { key: 'tronc',     label: 'Tronc / Abdominaux' },
  { key: 'lombaires', label: 'Bas du dos / Lombaires' },
  { key: 'hanches',   label: 'Hanches' },
  { key: 'cuisses',   label: 'Cuisses' },
  { key: 'genoux',    label: 'Genoux' },
  { key: 'chevilles', label: 'Chevilles' },
  { key: 'pieds',     label: 'Pieds' },
]

const CHART_COLORS = {
  hooper:     '#2d6a4f',
  fatigue:    '#c0392b',
  sommeil:    '#4a2d6b',
  stress:     '#1a3a5c',
  courbatures:'#b5830a',
  poids:      '#1a3a2a',
  graisse:    '#c0392b',
  maigre:     '#1a3a5c',
  topset:     '#1a5c52',
  charge:     '#4a2d6b',
  mg1:        '#b5830a',
  mg2:        '#c0392b',
}

// ─── Hook D3-style SVG chart ──────────────────────────────────────────────────
function useD3Chart(containerRef, data, options = {}) {
  const { color = P.green, h = 120, smooth = true, showDots = true, showArea = true, animate = true } = options
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!containerRef.current || data.length < 2) return
    const el = containerRef.current
    const W = el.clientWidth || 400
    const H = h
    const pad = { t: 16, r: 16, b: 28, l: 48 }
    const innerW = W - pad.l - pad.r
    const innerH = H - pad.t - pad.b

    const vals = data.map(d => d.value)
    const max = Math.max(...vals), min = Math.min(...vals)
    const range = max - min || (max * 0.1) || 1
    const yMin = min - range * 0.1, yMax = max + range * 0.1

    const x = i => pad.l + (i / (data.length - 1)) * innerW
    const y = v => pad.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH

    // Catmull-Rom smooth path
    function smoothPath(points) {
      if (points.length < 2) return ''
      if (!smooth || points.length === 2) {
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
      }
      let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)]
        const p1 = points[i], p2 = points[i + 1]
        const p3 = points[Math.min(points.length - 1, i + 2)]
        const cp1x = p1[0] + (p2[0] - p0[0]) / 6
        const cp1y = p1[1] + (p2[1] - p0[1]) / 6
        const cp2x = p2[0] - (p3[0] - p1[0]) / 6
        const cp2y = p2[1] - (p3[1] - p1[1]) / 6
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
      }
      return d
    }

    const points = data.map((d, i) => [x(i), y(d.value)])
    const pathD = smoothPath(points)
    const areaD = `${pathD} L ${x(data.length-1).toFixed(1)} ${(pad.t+innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(pad.t+innerH).toFixed(1)} Z`

    // Y axis ticks
    const ticks = 3
    const tickVals = Array.from({length: ticks+1}, (_, i) => yMin + (yMax - yMin) * (i / ticks))

    // X axis labels (dates)
    const xLabels = data.length <= 8
      ? data.map((d, i) => ({ i, label: d.date ? new Date(d.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '' }))
      : [
          { i: 0, label: data[0].date ? new Date(data[0].date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '' },
          { i: Math.floor(data.length/2), label: data[Math.floor(data.length/2)].date ? new Date(data[Math.floor(data.length/2)].date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '' },
          { i: data.length-1, label: data[data.length-1].date ? new Date(data[data.length-1].date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '' },
        ]

    const uid = `chart-${Math.random().toString(36).slice(2,8)}`

    const svg = `
<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;display:block;overflow:visible">
  <defs>
    <linearGradient id="${uid}-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
    </linearGradient>
    ${animate ? `<style>
      #${uid}-path { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: ${uid}-draw 1.2s ease forwards; }
      @keyframes ${uid}-draw { to { stroke-dashoffset: 0; } }
    </style>` : ''}
  </defs>

  <!-- Grid lines -->
  ${tickVals.map(v => `<line x1="${pad.l}" y1="${y(v).toFixed(1)}" x2="${W-pad.r}" y2="${y(v).toFixed(1)}" stroke="${P.border}" stroke-width="1"/>`).join('')}

  <!-- Y axis ticks -->
  ${tickVals.map(v => `<text x="${pad.l-6}" y="${(y(v)+4).toFixed(1)}" text-anchor="end" font-size="9" fill="${P.dim}" font-family="DM Sans, sans-serif">${typeof v === 'number' ? Math.round(v*10)/10 : v}</text>`).join('')}

  <!-- Area fill -->
  ${showArea ? `<path d="${areaD}" fill="url(#${uid}-grad)"/>` : ''}

  <!-- Main path -->
  <path id="${uid}-path" d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Dots -->
  ${showDots ? points.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${P.card}" stroke="${color}" stroke-width="2"/>`).join('') : ''}

  <!-- Last value highlight -->
  <circle cx="${points[points.length-1][0].toFixed(1)}" cy="${points[points.length-1][1].toFixed(1)}" r="5" fill="${color}"/>

  <!-- X labels -->
  ${xLabels.map(({i, label}) => `<text x="${x(i).toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="9" fill="${P.sub}" font-family="DM Sans, sans-serif">${label}</text>`).join('')}
</svg>`

    el.innerHTML = svg
    setRendered(true)
  }, [data, color, h, smooth])

  return rendered
}

// ─── Modal historique ─────────────────────────────────────────────────────────
// ─── Périodes disponibles ────────────────────────────────────────────────────
const PERIODS = [
  { key: '2w',  label: '2 sem.',  days: 14  },
  { key: '4w',  label: '4 sem.',  days: 28  },
  { key: '2m',  label: '2 mois',  days: 60  },
  { key: '6m',  label: '6 mois',  days: 180 },
  { key: '1y',  label: '1 an',    days: 365 },
  { key: 'all', label: 'Tout',    days: null },
]

// ─── Modal historique — graphe interactif ─────────────────────────────────────
function ChartModal({ open, onClose, title, data, color, unit = '', series = null }) {
  const chartRef = useRef(null)
  const [period, setPeriod] = useState('all')
  const [hovered, setHovered] = useState(null) // { x, y, value, date, seriesValues? }

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  // Filtrer par période
  const filterByPeriod = (pts) => {
    if (!pts?.length) return pts || []
    const sel = PERIODS.find(p => p.key === period)
    if (!sel?.days) return pts
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - sel.days)
    return pts.filter(d => new Date(d.date+'T00:00:00') >= cutoff)
  }

  const filteredData   = filterByPeriod([...( data || [])].sort((a,b) => a.date.localeCompare(b.date)))
  const filteredSeries = series?.map(s => ({ ...s, data: filterByPeriod([...s.data].sort((a,b) => a.date.localeCompare(b.date))) }))

  // Dessin SVG inline (pas de useEffect — on calcule directement en render)
  const renderChart = () => {
    const W = 520, H = 180
    const pad = { t: 20, r: 20, b: 36, l: 44 }
    const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b

    // Rassembler tous les points
    const allPts = series
      ? filteredSeries.flatMap(s => s.data)
      : filteredData

    if (allPts.length < 2) return (
      <div style={{ height: H, display: 'grid', placeItems: 'center', color: P.dim, fontSize: 13, border: `1px dashed ${P.border}`, borderRadius: 10 }}>
        Pas assez de données sur cette période
      </div>
    )

    const allVals = allPts.map(d => d.value)
    const vMin = Math.min(...allVals), vMax = Math.max(...allVals)
    const vRange = vMax - vMin || 1
    const yMin = vMin - vRange * 0.12, yMax = vMax + vRange * 0.12

    const allDates = [...new Set(allPts.map(d => d.date))].sort()
    const d0 = new Date(allDates[0]+'T00:00:00').getTime()
    const d1 = new Date(allDates[allDates.length-1]+'T00:00:00').getTime()
    const dRange = d1 - d0 || 1

    const xOf = (date) => pad.l + ((new Date(date+'T00:00:00').getTime() - d0) / dRange) * iW
    const yOf = (val)  => pad.t + iH - ((val - yMin) / (yMax - yMin)) * iH

    // Ticks Y
    const yTicks = 4
    const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yMax - yMin) * (i / yTicks))

    // X labels (3 max)
    const xLabelIdxs = allDates.length <= 6
      ? allDates.map((_, i) => i)
      : [0, Math.floor(allDates.length / 2), allDates.length - 1]
    const xLabels = [...new Set(xLabelIdxs)].map(i => allDates[i])

    // Smooth path helper
    const smoothPath = (pts) => {
      if (pts.length < 2) return ''
      let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i-1)], p1 = pts[i], p2 = pts[i+1], p3 = pts[Math.min(pts.length-1, i+2)]
        const cp1x = p1[0] + (p2[0]-p0[0])/6, cp1y = p1[1] + (p2[1]-p0[1])/6
        const cp2x = p2[0] - (p3[0]-p1[0])/6, cp2y = p2[1] - (p3[1]-p1[1])/6
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
      }
      return d
    }

    // Séries à dessiner
    const seriesArr = series
      ? filteredSeries
      : [{ label: title, color, data: filteredData }]

    // Hover handler
    const handleMouseMove = (e) => {
      const svg = e.currentTarget.getBoundingClientRect()
      const mx = e.clientX - svg.left
      // Trouver la date la plus proche
      let closest = null, minDist = Infinity
      allDates.forEach(date => {
        const px = xOf(date)
        const dist = Math.abs(px - mx)
        if (dist < minDist) { minDist = dist; closest = date }
      })
      if (!closest || minDist > 40) { setHovered(null); return }
      const cx = xOf(closest)
      // Valeurs pour ce point
      const vals = seriesArr.map(s => {
        const pt = s.data.find(d => d.date === closest)
        return { label: s.label, color: s.color, value: pt?.value ?? null }
      })
      const mainVal = vals[0]?.value
      const cy = mainVal != null ? yOf(mainVal) : H / 2
      setHovered({ date: closest, cx, cy: Math.max(pad.t, Math.min(pad.t+iH, cy)), vals })
    }

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setHovered(null)}>
        <defs>
          {seriesArr.map((s, i) => (
            <linearGradient key={i} id={`mg-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} y1={yOf(v).toFixed(1)} x2={W-pad.r} y2={yOf(v).toFixed(1)} stroke={P.border} strokeWidth="1" />
            <text x={pad.l-6} y={(yOf(v)+4).toFixed(1)} textAnchor="end" fontSize="9" fill={P.dim} fontFamily="DM Sans, sans-serif">
              {Math.round(v*10)/10}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map((date, i) => (
          <text key={i} x={xOf(date).toFixed(1)} y={H-6} textAnchor={i===0?'start':i===xLabels.length-1?'end':'middle'}
            fontSize="9" fill={P.sub} fontFamily="DM Sans, sans-serif">
            {new Date(date+'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </text>
        ))}

        {/* Area + Line par série */}
        {seriesArr.map((s, si) => {
          const pts = s.data.map(d => [xOf(d.date), yOf(d.value)])
          if (pts.length < 2) return null
          const pathD = smoothPath(pts)
          const areaD = `${pathD} L ${pts[pts.length-1][0].toFixed(1)} ${(pad.t+iH).toFixed(1)} L ${pts[0][0].toFixed(1)} ${(pad.t+iH).toFixed(1)} Z`
          return (
            <g key={si}>
              <path d={areaD} fill={`url(#mg-${si})`} />
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((d, i) => (
                <circle key={i} cx={xOf(d.date).toFixed(1)} cy={yOf(d.value).toFixed(1)} r="3" fill={P.card} stroke={s.color} strokeWidth="2" />
              ))}
            </g>
          )
        })}

        {/* Hover line + tooltip */}
        {hovered && (
          <g>
            <line x1={hovered.cx} y1={pad.t} x2={hovered.cx} y2={pad.t+iH} stroke={P.sub} strokeWidth="1" strokeDasharray="4 3" />
            {hovered.vals.filter(v => v.value != null).map((v, i) => {
              const cy = yOf(v.value)
              return <circle key={i} cx={hovered.cx.toFixed(1)} cy={cy.toFixed(1)} r="5" fill={v.color} stroke={P.card} strokeWidth="2" />
            })}
          </g>
        )}
      </svg>
    )
  }

  // Tooltip box (outside SVG pour éviter les clipping issues)
  const renderTooltip = () => {
    if (!hovered) return null
    const last = hovered.vals.filter(v => v.value != null)
    if (!last.length) return null
    return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: P.bg, borderRadius: 10, border: `1px solid ${P.border}`, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: P.sub, fontWeight: 600 }}>
          {new Date(hovered.date+'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        {last.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
            {series && <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, flexShrink: 0 }} />}
            {series && <span style={{ fontSize: 11, color: P.sub }}>{v.label}</span>}
            <span style={{ fontSize: 18, fontWeight: 700, color: v.color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>
              {v.value}{unit}
            </span>
          </div>
        ))}
        {series && last.length === hovered.vals.length && (
          <div style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: P.text, fontFamily: "'DM Serif Display', serif" }}>
            Σ {last.reduce((a, v) => a + v.value, 0)}{unit}
          </div>
        )}
      </div>
    )
  }

  if (!open) return null

  const allCount = series ? series[0]?.data?.length : data?.length

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center', padding: '20px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: P.card, borderRadius: 20, width: '100%', maxWidth: 620,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{title}</div>
            <div style={{ fontSize: 12, color: P.sub, marginTop: 2 }}>{allCount} mesure{allCount > 1 ? 's' : ''} au total</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${P.border}`, background: P.bg, color: P.sub, fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center', lineHeight: 1 }}>×</button>
        </div>

        {/* Sélecteur de période */}
        <div style={{ padding: '14px 24px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${period === p.key ? color+'60' : P.border}`,
              background: period === p.key ? color+'15' : 'transparent',
              color: period === p.key ? color : P.sub,
              transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Graphe */}
        <div style={{ padding: '16px 24px 0' }}>
          {renderChart()}
          {renderTooltip()}
        </div>

        {/* Légende multi-séries */}
        {series && (
          <div style={{ padding: '12px 24px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {series.map(s => (
              <div key={s.label} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: P.sub }}>
                <div style={{ width: 14, height: 3, borderRadius: 2, background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}


// ─── Chart component ──────────────────────────────────────────────────────────
function D3Chart({ data, color, h = 120, title, lastValue, unit = '', delta = null }) {
  const ref = useRef(null)
  useD3Chart(ref, data, { color, h })

  if (data.length < 2) return (
    <div style={{ height: h, display: 'grid', placeItems: 'center', color: P.dim, fontSize: 12, border: `1px dashed ${P.border}`, borderRadius: 8 }}>
      Pas assez de données (min. 2 mesures)
    </div>
  )

  return (
    <div>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: P.sub }}>{title}</div>
          {lastValue != null && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              {delta != null && (
                <span style={{ fontSize: 11, color: delta > 0 ? P.red : P.green, fontWeight: 600 }}>
                  {delta > 0 ? '+' : ''}{Math.round(delta*10)/10}{unit}
                </span>
              )}
              <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'DM Serif Display', serif" }}>
                {lastValue}{unit}
              </span>
            </div>
          )}
        </div>
      )}
      <div ref={ref} />
    </div>
  )
}

// ─── Chart wrapper cliquable ──────────────────────────────────────────────────
function ClickableChart({ children, data, color, unit, title, series }) {
  const [open, setOpen] = useState(false)
  const hasData = series ? series.some(s => s.data.length > 0) : data?.length >= 1
  if (!hasData) return children
  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer', borderRadius: 8, transition: 'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        {children}
        <div style={{ textAlign: 'right', fontSize: 10, color: P.dim, marginTop: 4, letterSpacing: 0.5 }}>↗ Voir l'historique</div>
      </div>
      <ChartModal open={open} onClose={() => setOpen(false)} title={title} data={data || []} color={color} unit={unit} series={series} />
    </>
  )
}




// ─── Multi-series chart ───────────────────────────────────────────────────────
function MultiD3Chart({ series, h = 120 }) {
  const ref = useRef(null)
  const allData = series.flatMap(s => s.data)

  useEffect(() => {
    if (!ref.current || allData.length < 2) return
    const el = ref.current
    const W = el.clientWidth || 400
    const H = h
    const pad = { t: 16, r: 16, b: 28, l: 48 }
    const innerW = W - pad.l - pad.r
    const innerH = H - pad.t - pad.b

    // Find global domain
    const allVals = allData.map(d => d.value).filter(Boolean)
    if (!allVals.length) return
    const max = Math.max(...allVals), min = Math.min(...allVals)
    const range = max - min || 1
    const yMin = min - range * 0.1, yMax = max + range * 0.1

    // Find global date domain
    const allDates = allData.map(d => d.date).filter(Boolean).sort()
    const d0 = new Date(allDates[0]+'T00:00:00').getTime()
    const d1 = new Date(allDates[allDates.length-1]+'T00:00:00').getTime()
    const dtRange = d1 - d0 || 1

    const xByDate = d => pad.l + ((new Date(d+'T00:00:00').getTime() - d0) / dtRange) * innerW
    const y = v => pad.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH

    const ticks = 3
    const tickVals = Array.from({length: ticks+1}, (_, i) => yMin + (yMax - yMin) * (i / ticks))

    const uid = `mc-${Math.random().toString(36).slice(2,8)}`

    let paths = ''
    for (const s of series) {
      if (s.data.length < 2) continue
      const pts = s.data.map(d => [xByDate(d.date), y(d.value)])
      let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
      for (let i = 0; i < pts.length-1; i++) {
        const p0 = pts[Math.max(0,i-1)], p1 = pts[i], p2 = pts[i+1], p3 = pts[Math.min(pts.length-1,i+2)]
        const cp1x = p1[0]+(p2[0]-p0[0])/6, cp1y = p1[1]+(p2[1]-p0[1])/6
        const cp2x = p2[0]-(p3[0]-p1[0])/6, cp2y = p2[1]-(p3[1]-p1[1])/6
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
      }
      paths += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`
      pts.forEach(p => { paths += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="${P.card}" stroke="${s.color}" stroke-width="1.5"/>` })
    }

    const gridLines = tickVals.map(v => `<line x1="${pad.l}" y1="${y(v).toFixed(1)}" x2="${W-pad.r}" y2="${y(v).toFixed(1)}" stroke="${P.border}" stroke-width="1"/>`).join('')
    const yAxis = tickVals.map(v => `<text x="${pad.l-6}" y="${(y(v)+4).toFixed(1)}" text-anchor="end" font-size="9" fill="${P.dim}" font-family="DM Sans">${Math.round(v*10)/10}</text>`).join('')

    const xLabels = [0, allDates.length-1].map(i => {
      const d = allDates[i]
      if (!d) return ''
      return `<text x="${xByDate(d).toFixed(1)}" y="${H-4}" text-anchor="${i===0?'start':'end'}" font-size="9" fill="${P.sub}" font-family="DM Sans">${new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</text>`
    }).join('')

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;display:block;overflow:visible">${gridLines}${yAxis}${paths}${xLabels}</svg>`
  }, [series, h])

  return <div ref={ref} />
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, color, icon, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: color+'15', border: `1px solid ${color}25`, display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0 }}>{icon}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: P.text, letterSpacing: '-0.2px' }}>{title}</div>
            {badge && <div style={{ fontSize: 11, color: P.sub, marginTop: 2 }}>{badge}</div>}
          </div>
        </div>
        <div style={{ fontSize: 11, color: P.sub, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 18, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>⌄</span>
        </div>
      </div>
      {open && <div style={{ padding: '0 22px 22px', borderTop: `1px solid ${P.border}` }}>{children}</div>}
    </div>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, unit, color, delta, deltaUnit }) {
  return (
    <div style={{ padding: '12px 16px', background: P.bg, borderRadius: 10, border: `1px solid ${P.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: P.sub, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>
        {value}<span style={{ fontSize: 12, fontWeight: 400, color: P.sub, marginLeft: 3 }}>{unit}</span>
      </div>
      {delta != null && (
        <div style={{ fontSize: 11, color: delta > 0 ? P.red : P.green, marginTop: 4, fontWeight: 600 }}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta*10)/10)}{deltaUnit}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekKey(d) {
  const dt = new Date(d+'T00:00:00'), day = dt.getDay() || 7
  dt.setDate(dt.getDate()-day+1); return dt.toISOString().split('T')[0]
}
function scoreColor(s) {
  if (s <= 7) return P.green; if (s <= 13) return '#52b788'
  if (s <= 20) return P.yellow; return P.red
}

function extractKmData(notes) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}

  try {
    const match = notes.match(/km:(\{.*\})/)
    if (match) return JSON.parse(match[1])
  } catch {}

  return null
}


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrepAnalysePage() {
  const { user, profile, isCoach } = useAuth()
  const coachId = profile?.id || user?.id || null
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [data, setData] = useState({ hooper: [], compo: [], topsets: [], charge: [], chargeInterne: [] })
  const [loading, setLoading] = useState(true)
  const [selectedEx, setSelectedEx] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { data: profile },
      { data: hooper },
      { data: compo },
      { data: topsets },
      { data: charge },
      { data: chargeInterne },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', id).single(),
      supabase.from('hooper_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(60),
      supabase.from('body_composition_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(30),
      supabase.from('topset_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(100),
      supabase.from('charge_externe_logs').select('*').eq('user_id', id).order('date',{ascending:true}),
      supabase.from('charge_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(60),
    ])
    setClient(profile)
    setData({ hooper: hooper||[], compo: compo||[], topsets: topsets||[], charge: charge||[], chargeInterne: chargeInterne||[] })
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Calculs ──────────────────────────────────────────────────────────────────
  const hooperScores = useMemo(() => data.hooper.map(h => ({
    value: h.fatigue+h.sommeil+h.stress+h.courbatures, date: h.date
  })), [data.hooper])

  const lastH = data.hooper[data.hooper.length-1]
  const lastScore = lastH ? lastH.fatigue+lastH.sommeil+lastH.stress+lastH.courbatures : null
  const prevScore = data.hooper.length > 1 ? data.hooper[data.hooper.length-2].fatigue+data.hooper[data.hooper.length-2].sommeil+data.hooper[data.hooper.length-2].stress+data.hooper[data.hooper.length-2].courbatures : null

  const compoData = {
    poids:   data.compo.filter(c=>c.weight_kg).map(c=>({value:parseFloat(c.weight_kg),date:c.date})),
    graisse: data.compo.filter(c=>c.body_fat_pct).map(c=>({value:parseFloat(c.body_fat_pct),date:c.date})),
    maigre:  data.compo.filter(c=>c.muscle_mass_kg).map(c=>({value:parseFloat(c.muscle_mass_kg),date:c.date})),
  }
  const lastC = data.compo[data.compo.length-1]
  const prevC = data.compo.length > 1 ? data.compo[data.compo.length-2] : null
  const [selectedBilanIdx, setSelectedBilanIdx] = useState(null)
  const [selectedDomsLog, setSelectedDomsLog] = useState(null)
  const [rtpOpen, setRtpOpen] = useState(false)
  // Auto-sélectionner le dernier bilan quand les données arrivent
  useEffect(() => {
    if (data.compo.length > 0) setSelectedBilanIdx(data.compo.length - 1)
  }, [data.compo.length])
  const selectedC = selectedBilanIdx != null ? data.compo[selectedBilanIdx] : lastC
  const prevSelectedC = selectedBilanIdx != null && selectedBilanIdx > 0 ? data.compo[selectedBilanIdx - 1] : null

  const plioData = useMemo(() => {
    const mg1=[], mg2=[]
    for (const c of data.compo) {
      let n=null; try{n=c.notes?JSON.parse(c.notes):null}catch{}
      if(n?.mg1?.resultat) mg1.push({value:parseFloat(n.mg1.resultat),date:c.date})
      if(n?.mg2?.resultat) mg2.push({value:parseFloat(n.mg2.resultat),date:c.date})
    }
    return {mg1,mg2}
  }, [data.compo])

  const silhoData = useMemo(() => {
    const keys=['epaule','poitrine','hanche','taille','cuisse','genoux']
    const byKey={}
    for (const c of data.compo) {
      let n=null; try{n=c.notes?JSON.parse(c.notes):null}catch{}
      if(!n?.silhouette) continue
      for (const k of keys) {
        if(n.silhouette[k]) {
          if(!byKey[k]) byKey[k]=[]
          byKey[k].push({value:parseFloat(n.silhouette[k]),date:c.date})
        }
      }
    }
    return byKey
  }, [data.compo])

  const exerciseNames = useMemo(()=>[...new Set(data.topsets.map(t=>t.exercise_name))],[data.topsets])
  useEffect(()=>{if(exerciseNames.length&&!selectedEx)setSelectedEx(exerciseNames[0])},[exerciseNames])

  const topsetSeries = useMemo(()=>{
    if(!selectedEx) return []
    return data.topsets.filter(t=>t.exercise_name===selectedEx)
      .map(t=>({value:t.estimated_1rm||Math.round((t.weight_kg||0)*(1+(t.reps||0)/30)*10)/10,date:t.date}))
      .filter(t=>t.value>0)
  },[data.topsets,selectedEx])

  const prs = useMemo(()=>{
    const map={}
    for(const t of data.topsets){
      const rm=t.estimated_1rm||Math.round((t.weight_kg||0)*(1+(t.reps||0)/30)*10)/10
      if(!map[t.exercise_name]||rm>map[t.exercise_name]) map[t.exercise_name]=rm
    }
    return map
  },[data.topsets])

  const weeklyCharge = useMemo(()=>{
    const w={}
    for(const c of data.charge){
      const wk=getWeekKey(c.date); w[wk]=(w[wk]||0)+(c.charge_ua||c.rpe*c.duree_min)
    }
    return w
  },[data.charge])

  const wkKeys = useMemo(()=>Object.keys(weeklyCharge).sort(),[weeklyCharge])
  const curWk = getWeekKey(new Date().toISOString().split('T')[0])
  const idxCur = wkKeys.indexOf(curWk)
  const acute = weeklyCharge[curWk]||0
  const chronic4 = wkKeys.slice(Math.max(0,idxCur-3),idxCur+1).map(k=>weeklyCharge[k])
  const chronAvg = chronic4.length?chronic4.reduce((a,b)=>a+b,0)/chronic4.length:0
  const acwr = chronAvg?Math.round((acute/chronAvg)*100)/100:null
  const chargeSeriesData = wkKeys.slice(-12).map(wk=>({value:weeklyCharge[wk],date:wk}))

  const acwrColor = !acwr?P.sub:acwr<=1.3?P.green:acwr<=1.5?P.yellow:P.red

  const dateLabel = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})

  if (loading) return (
    <div style={{minHeight:'100vh',background:P.bg,display:'grid',placeItems:'center',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:13,color:P.sub}}>Chargement de l'analyse...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:P.bg, fontFamily:"'DM Sans', sans-serif", padding:'clamp(20px,3vw,36px) clamp(16px,3vw,28px)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Navigation */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <button onClick={() => navigate(-1)}
            style={{ background:'none', border:'none', color:P.sub, cursor:'pointer', fontSize:13, fontWeight:500, padding:0, display:'flex', gap:6, alignItems:'center' }}>
            ← Retour
          </button>
          <div style={{ display:'flex', gap:8 }}>
            {isCoach && (
              <button onClick={() => setRtpOpen(true)}
                style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${P.accent}`, background:`${P.accent}10`, color:P.accent, fontSize:12, cursor:'pointer', fontWeight:700 }}>
                🎮 Protocole RTP
              </button>
            )}
            <button onClick={load}
              style={{ padding:'7px 14px', borderRadius:20, border:`1px solid ${P.border}`, background:'transparent', color:P.sub, fontSize:11, cursor:'pointer', fontWeight:600 }}>
              ↻ Actualiser
            </button>
          </div>
        </div>

        {/* Header athlète */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:2, textTransform:'uppercase', color:P.sub, marginBottom:6 }}>
            ProSportConcept · Analyse prépa physique
          </div>
          <h1 style={{ fontFamily:"'DM Serif Display', serif", fontSize:'clamp(24px,4vw,34px)', fontWeight:400, color:P.text, margin:0, lineHeight:1.2 }}>
            {client?.full_name || client?.email}
          </h1>
          <div style={{ fontSize:13, color:P.sub, marginTop:6, textTransform:'capitalize' }}>{dateLabel}</div>
        </div>

        {/* Résumé rapide */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:10, marginBottom:28 }}>
          {lastScore !== null && (
            <StatPill label="HOOPER" value={lastScore} unit="/40" color={scoreColor(lastScore)} delta={prevScore !== null ? lastScore-prevScore : null} deltaUnit="" />
          )}
          {selectedC?.weight_kg && <StatPill label="Poids" value={selectedC.weight_kg} unit="kg" color={P.accent} delta={prevSelectedC?.weight_kg ? parseFloat(selectedC.weight_kg)-parseFloat(prevSelectedC.weight_kg) : null} deltaUnit="kg" />}
          {selectedC?.body_fat_pct && <StatPill label="Masse grasse" value={selectedC.body_fat_pct} unit="%" color={P.red} delta={prevSelectedC?.body_fat_pct ? parseFloat(selectedC.body_fat_pct)-parseFloat(prevSelectedC.body_fat_pct) : null} deltaUnit="%" />}
          {acwr !== null && <StatPill label="ACWR" value={acwr} unit="" color={acwrColor} />}
          {selectedEx && prs[selectedEx] && <StatPill label="1RM" value={`~${prs[selectedEx]}`} unit="kg" color={P.teal} />}
        </div>

        {/* ── HOOPER ── */}
        <Section title="HOOPER — Récupération" icon="🧠" color={P.green}
          badge={lastScore !== null ? `Score actuel : ${lastScore}/40 · ${lastScore<=7?'Très bon':lastScore<=13?'Correct':lastScore<=20?'Vigilance':'⚠️ Fatigue importante'}` : 'Aucune donnée'}
          defaultOpen={true}>
          <div style={{ paddingTop:20, display:'grid', gap:24 }}>
            <ClickableChart data={hooperScores} color={P.green} unit="" title="HOOPER — Score total /40">
              <D3Chart data={hooperScores} color={P.green} h={130} title="Score total /40" lastValue={lastScore} delta={prevScore!==null?lastScore-prevScore:null} />
            </ClickableChart>
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:12 }}>Détail par item</div>
            <ClickableChart title="HOOPER — Détail par item" series={[
                {label:'Fatigue',    color:CHART_COLORS.fatigue,     data:data.hooper.map(h=>({value:h.fatigue,    date:h.date}))},
                {label:'Sommeil',    color:CHART_COLORS.sommeil,     data:data.hooper.map(h=>({value:h.sommeil,    date:h.date}))},
                {label:'Stress',     color:CHART_COLORS.stress,      data:data.hooper.map(h=>({value:h.stress,     date:h.date}))},
                {label:'Courbatures',color:CHART_COLORS.courbatures, data:data.hooper.map(h=>({value:h.courbatures,date:h.date}))},
              ]}>
              <MultiD3Chart h={110} series={[
                {label:'Fatigue',    color:CHART_COLORS.fatigue,     data:data.hooper.map(h=>({value:h.fatigue,    date:h.date}))},
                {label:'Sommeil',    color:CHART_COLORS.sommeil,     data:data.hooper.map(h=>({value:h.sommeil,    date:h.date}))},
                {label:'Stress',     color:CHART_COLORS.stress,      data:data.hooper.map(h=>({value:h.stress,     date:h.date}))},
                {label:'Courbatures',color:CHART_COLORS.courbatures, data:data.hooper.map(h=>({value:h.courbatures,date:h.date}))},
              ]} />
            </ClickableChart>
              <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
                {[['Fatigue',CHART_COLORS.fatigue],['Sommeil',CHART_COLORS.sommeil],['Stress',CHART_COLORS.stress],['Courbatures',CHART_COLORS.courbatures]].map(([l,c])=>(
                  <div key={l} style={{ display:'flex', gap:5, alignItems:'center', fontSize:11, color:P.sub }}>
                    <div style={{ width:14, height:2.5, background:c, borderRadius:2 }} />{l}
                  </div>
                ))}
              </div>
            </div>
            {/* Tableau */}
            {data.hooper.length > 0 && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:`2px solid ${P.border}` }}>
                      {['Date','Score','F','S','St','C','DOMS'].map(h=>(
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600, fontSize:10, letterSpacing:0.8, textTransform:'uppercase', color:P.sub }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.hooper].reverse().slice(0,14).map(h=>{
                      const s=h.fatigue+h.sommeil+h.stress+h.courbatures
                      let dzRow = {}
                      try { const r = h.doms_zones; dzRow = typeof r === 'string' ? JSON.parse(r) : (r || {}) } catch {}
                      const domsN=Object.values(dzRow).filter(z=>z?.level>0).length
                      return (
                        <tr key={h.id} style={{ borderBottom:`1px solid ${P.border}` }}>
                          <td style={{ padding:'8px 10px', color:P.text }}>{new Date(h.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</td>
                          <td style={{ padding:'8px 10px', fontWeight:700, color:scoreColor(s), fontFamily:"'DM Serif Display',serif", fontSize:15 }}>{s}</td>
                          <td style={{ padding:'8px 10px', color:P.red, fontWeight:600 }}>{h.fatigue}</td>
                          <td style={{ padding:'8px 10px', color:P.purple, fontWeight:600 }}>{h.sommeil}</td>
                          <td style={{ padding:'8px 10px', color:P.blue, fontWeight:600 }}>{h.stress}</td>
                          <td style={{ padding:'8px 10px', color:P.yellow, fontWeight:600 }}>{h.courbatures}</td>
                          <td style={{ padding:'8px 10px', color:domsN>0?P.red:P.dim }}>
                            {domsN > 0 ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedDomsLog({...h, doms_zones: dzRow}) }}
                                style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:P.red, fontWeight:700, fontSize:12, textDecoration:'underline' }}
                              >
                                {domsN} zone{domsN>1?'s':''}
                              </button>
                            ) : '–'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Section>

        {/* ── COMPOSITION ── */}
        <Section title="Composition corporelle" icon="⚖️" color={P.blue}
          badge={selectedC ? `${selectedC.weight_kg||'—'}kg · MG ${selectedC.body_fat_pct||'—'}% · MM ${selectedC.muscle_mass_kg||'—'}kg` : 'Aucune mesure'}>
          <div style={{ paddingTop:20, display:'grid', gap:24 }}>

            {/* Graphiques courbes */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:20 }}>
              {[
                {data:compoData.poids,   color:CHART_COLORS.poids,   title:'Poids', unit:' kg',  key:'weight_kg'},
                {data:compoData.graisse, color:CHART_COLORS.graisse, title:'Masse grasse', unit:'%', key:'body_fat_pct'},
                {data:compoData.maigre,  color:CHART_COLORS.maigre,  title:'Masse maigre', unit:' kg', key:'muscle_mass_kg'},
              ].filter(g=>g.data.length>=2).map(({data,color,title,unit,key})=>(
                <ClickableChart key={title} data={data} color={color} unit={unit} title={title}>
                  <D3Chart data={data} color={color} h={110} title={title} unit={unit}
                    lastValue={selectedC?.[key]} delta={prevSelectedC?.[key]?parseFloat(selectedC[key])-parseFloat(prevSelectedC[key]):null} />
                </ClickableChart>
              ))}
            </div>

            {/* Navigateur de bilans */}
            {data.compo.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:P.bg, borderRadius:12, border:`1px solid ${P.border}` }}>
                <button
                  onClick={() => setSelectedBilanIdx(i => Math.max(0, (i ?? data.compo.length-1) - 1))}
                  disabled={selectedBilanIdx === 0}
                  style={{ width:30, height:30, borderRadius:'50%', border:`1px solid ${P.border}`, background:P.card, color:selectedBilanIdx===0?P.dim:P.text, fontSize:16, cursor:selectedBilanIdx===0?'default':'pointer', display:'grid', placeItems:'center' }}>
                  ‹
                </button>
                <div style={{ flex:1, textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:P.text }}>
                    {selectedC ? new Date(selectedC.date+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '—'}
                  </div>
                  <div style={{ fontSize:11, color:P.sub, marginTop:2 }}>
                    Bilan {(selectedBilanIdx??data.compo.length-1)+1} / {data.compo.length}
                    {selectedBilanIdx === data.compo.length-1 && <span style={{ marginLeft:6, color:P.green, fontWeight:600 }}>· Dernier</span>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBilanIdx(i => Math.min(data.compo.length-1, (i ?? data.compo.length-1) + 1))}
                  disabled={selectedBilanIdx === data.compo.length-1}
                  style={{ width:30, height:30, borderRadius:'50%', border:`1px solid ${P.border}`, background:P.card, color:selectedBilanIdx===data.compo.length-1?P.dim:P.text, fontSize:16, cursor:selectedBilanIdx===data.compo.length-1?'default':'pointer', display:'grid', placeItems:'center' }}>
                  ›
                </button>
              </div>
            )}

            {/* Bilan sélectionné — détail */}
            {selectedC && (() => {
              let n = null; try { n = selectedC.notes ? JSON.parse(selectedC.notes) : null } catch {}
              if (!n) return null
              return (
                <div style={{ display:'grid', gap:16, paddingTop:16, borderTop:`1px solid ${P.border}` }}>

                  {/* Conditions mesure */}
                  {n.impedance && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:8 }}>Conditions de mesure</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {n.heure && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>🕐 {n.heure}</span>}
                        {n.modele_balance && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>⚖️ {n.modele_balance}</span>}
                        {n.tenue && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>👕 {n.tenue}</span>}
                        {n.impedance.eau_litres && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>💧 {n.impedance.eau_litres}L</span>}
                        {n.impedance.heure_repas && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>🍽️ Repas {n.impedance.heure_repas}</span>}
                        {n.impedance.activite_veille && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>🏃 {n.impedance.activite_veille}</span>}
                        {n.impedance.cycle_phase && n.impedance.cycle_phase !== 'na' && <span style={{ padding:'4px 10px', background:P.bg, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.text }}>🔄 {n.impedance.cycle_phase}</span>}
                        {n.impedance.alcool_veille && <span style={{ padding:'4px 10px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:20, fontSize:11, color:P.red }}>🍷 Alcool H-24</span>}
                        {n.impedance.cafeine_veille && <span style={{ padding:'4px 10px', background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:20, fontSize:11, color:P.yellow }}>☕ Caféïne</span>}
                        {n.impedance.pacemaker && <span style={{ padding:'4px 10px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:20, fontSize:11, color:P.red }}>⚠️ Pacemaker</span>}
                        {n.impedance.enceinte && <span style={{ padding:'4px 10px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:20, fontSize:11, color:P.red }}>⚠️ Enceinte</span>}
                      </div>
                    </div>
                  )}

                  {/* MG1 + MG2 — dernière mesure + évolution */}
                  {(plioData.mg1.length>0 || plioData.mg2.length>0) && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:10 }}>Pliométrie cutanée</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12, marginBottom: plioData.mg1.length>=2||plioData.mg2.length>=2 ? 16 : 0 }}>
                        {n.mg1 && (
                          <div style={{ padding:'14px 16px', background:P.bg, borderRadius:12, border:`1px solid ${P.border}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:P.text }}>MG1 — 4 plis</span>
                              {n.mg1.resultat && <span style={{ fontSize:20, fontWeight:700, color:P.yellow, fontFamily:"'DM Serif Display',serif" }}>{n.mg1.resultat}%</span>}
                            </div>
                            <div style={{ display:'grid', gap:4 }}>
                              {['sous_scapulaire','tricipital','supra_iliaque','ombilical'].filter(k=>n.mg1[k]).map(k=>(
                                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                                  <span style={{ color:P.sub, textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
                                  <span style={{ fontWeight:600, color:P.text }}>{n.mg1[k]} mm</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {n.mg2 && (
                          <div style={{ padding:'14px 16px', background:P.bg, borderRadius:12, border:`1px solid ${P.border}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:P.text }}>MG2 — 7 plis</span>
                              {n.mg2.resultat && <span style={{ fontSize:20, fontWeight:700, color:P.red, fontFamily:"'DM Serif Display',serif" }}>{n.mg2.resultat}%</span>}
                            </div>
                            <div style={{ display:'grid', gap:4 }}>
                              {['sous_scapulaire','tricipital','supra_iliaque','ombilical','bicipital','sural','quadricipital'].filter(k=>n.mg2[k]).map(k=>(
                                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                                  <span style={{ color:P.sub, textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
                                  <span style={{ fontWeight:600, color:P.text }}>{n.mg2[k]} mm</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Graphes évolution si >= 2 mesures */}
                      {(plioData.mg1.length>=2 || plioData.mg2.length>=2) && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16 }}>
                          {plioData.mg1.length>=2 && <ClickableChart data={plioData.mg1} color={CHART_COLORS.mg1} unit="%" title="Évolution MG1 — 4 plis"><D3Chart data={plioData.mg1} color={CHART_COLORS.mg1} h={90} title="Évolution MG1" unit="%" lastValue={plioData.mg1[plioData.mg1.length-1]?.value} delta={plioData.mg1[plioData.mg1.length-1].value-plioData.mg1[plioData.mg1.length-2].value} /></ClickableChart>}
                          {plioData.mg2.length>=2 && <ClickableChart data={plioData.mg2} color={CHART_COLORS.mg2} unit="%" title="Évolution MG2 — 7 plis"><D3Chart data={plioData.mg2} color={CHART_COLORS.mg2} h={90} title="Évolution MG2" unit="%" lastValue={plioData.mg2[plioData.mg2.length-1]?.value} delta={plioData.mg2[plioData.mg2.length-1].value-plioData.mg2[plioData.mg2.length-2].value} /></ClickableChart>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Silhouette — dernière mesure + évolution */}
                  {n.silhouette && Object.values(n.silhouette).some(v=>v) && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:10 }}>Mesure silhouette (cm)</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(100px,1fr))', gap:8, marginBottom:16 }}>
                        {[['epaule','Épaule'],['poitrine','Poitrine'],['hanche','Hanche'],['taille','Taille'],['cuisse','Cuisse'],['genoux','Genoux']].filter(([k])=>n.silhouette[k]).map(([k,l])=>(
                          <div key={k} style={{ padding:'10px 12px', background:P.bg, borderRadius:10, border:`1px solid ${P.border}`, textAlign:'center' }}>
                            <div style={{ fontSize:10, color:P.sub, marginBottom:4 }}>{l}</div>
                            <div style={{ fontSize:16, fontWeight:700, color:P.text, fontFamily:"'DM Serif Display',serif" }}>{n.silhouette[k]}</div>
                          </div>
                        ))}
                      </div>
                      {/* Graphes évolution si >= 2 mesures */}
                      {Object.values(silhoData).some(d=>d.length>=2) && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:16 }}>
                          {Object.entries({epaule:'Épaule',poitrine:'Poitrine',hanche:'Hanche',taille:'Taille',cuisse:'Cuisse',genoux:'Genoux'})
                            .filter(([k])=>silhoData[k]?.length>=2)
                            .map(([k,l])=>{
                              const colors={epaule:P.blue,poitrine:P.purple,hanche:P.red,taille:P.yellow,cuisse:P.green,genoux:P.teal}
                              const d=silhoData[k]
                              return <ClickableChart key={k} data={d} color={colors[k]||P.accent} unit=" cm" title={`Silhouette — ${l}`}><D3Chart data={d} color={colors[k]||P.accent} h={80} title={`${l}`} lastValue={d[d.length-1]?.value} unit=" cm" delta={d[d.length-1].value-d[d.length-2].value} /></ClickableChart>
                            })
                          }
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )
            })()}
          </div>
        </Section>

        {/* ── TESTS CHARGE INTERNE ── */}
        {data.chargeInterne.length > 0 && (() => {
          const ci = data.chargeInterne
          const last = ci[ci.length-1]
          const prev = ci.length > 1 ? ci[ci.length-2] : null
          const grip  = ci.filter(c=>c.prehension_kg).map(c=>({value:parseFloat(c.prehension_kg),date:c.date}))
          const submax = ci.filter(c=>c.submax_kg).map(c=>({value:parseFloat(c.submax_kg),date:c.date}))
          const cmj   = ci.filter(c=>c.cmj_cm).map(c=>({value:parseFloat(c.cmj_cm),date:c.date}))
          const badge = [
            last.prehension_kg ? `Grip ${last.prehension_kg}kg` : null,
            last.submax_kg     ? `Submax ${last.submax_kg}kg`   : null,
            last.cmj_cm        ? `CMJ ${last.cmj_cm}cm`         : null,
          ].filter(Boolean).join(' · ') || 'Données disponibles'
          return (
            <Section title="Tests — Charge interne" icon="💪" color={P.blue} badge={badge}>
              <div style={{ paddingTop:20, display:'grid', gap:20 }}>

                {/* Dernières valeurs */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:10 }}>
                  {[
                    { key:'prehension_kg', label:'Force préhension', unit:'kg', color:CHART_COLORS.stress,   desc:'GRIP' },
                    { key:'submax_kg',     label:'Submax',           unit:'kg', color:CHART_COLORS.sommeil,  desc:"FC 3' / FC 1'" },
                    { key:'cmj_cm',        label:'CMJ',              unit:'cm', color:CHART_COLORS.hooper,   desc:'Counter Movement Jump' },
                  ].filter(f => last[f.key]).map(({key,label,unit,color,desc}) => {
                    const delta = prev?.[key] ? parseFloat(last[key]) - parseFloat(prev[key]) : null
                    return (
                      <div key={key} style={{ padding:'12px 16px', background:P.bg, borderRadius:10, border:`1px solid ${P.border}` }}>
                        <div style={{ fontSize:10, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>
                          {last[key]}<span style={{ fontSize:12, color:P.sub, marginLeft:3 }}>{unit}</span>
                        </div>
                        {delta !== null && (
                          <div style={{ fontSize:11, color: delta > 0 ? P.green : P.red, marginTop:4, fontWeight:600 }}>
                            {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta*10)/10)}{unit}
                          </div>
                        )}
                        <div style={{ fontSize:10, color:P.dim, marginTop:4 }}>{desc}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Graphes évolution */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16 }}>
                  {grip.length>=2   && <ClickableChart data={grip}   color={CHART_COLORS.stress}  unit=" kg" title="Force de préhension (GRIP)"><D3Chart data={grip}   color={CHART_COLORS.stress}  h={100} title="Préhension (GRIP)" unit=" kg" lastValue={grip[grip.length-1]?.value}     delta={grip.length>1   ? grip[grip.length-1].value   - grip[grip.length-2].value   : null} /></ClickableChart>}
                  {submax.length>=2 && <ClickableChart data={submax} color={CHART_COLORS.sommeil} unit=" kg" title="Submax (FC 3' / FC 1')"><D3Chart data={submax} color={CHART_COLORS.sommeil} h={100} title="Submax" unit=" kg"            lastValue={submax[submax.length-1]?.value} delta={submax.length>1 ? submax[submax.length-1].value - submax[submax.length-2].value : null} /></ClickableChart>}
                  {cmj.length>=2    && <ClickableChart data={cmj}    color={CHART_COLORS.hooper}  unit=" cm" title="CMJ (Counter Movement Jump)"><D3Chart data={cmj}    color={CHART_COLORS.hooper}  h={100} title="CMJ" unit=" cm"              lastValue={cmj[cmj.length-1]?.value}       delta={cmj.length>1    ? cmj[cmj.length-1].value    - cmj[cmj.length-2].value    : null} /></ClickableChart>}
                </div>

                {/* Historique tableau */}
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ borderBottom:`2px solid ${P.border}` }}>
                        {['Date','Préhension','Submax','CMJ','Notes'].map(h=>(
                          <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...ci].reverse().map(log=>(
                        <tr key={log.id} style={{ borderBottom:`1px solid ${P.border}` }}>
                          <td style={{ padding:'8px 10px', color:P.text }}>{new Date(log.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'2-digit'})}</td>
                          <td style={{ padding:'8px 10px', fontWeight:600, color:CHART_COLORS.stress  }}>{log.prehension_kg ? `${log.prehension_kg} kg` : '—'}</td>
                          <td style={{ padding:'8px 10px', fontWeight:600, color:CHART_COLORS.sommeil }}>{log.submax_kg     ? `${log.submax_kg} kg`     : '—'}</td>
                          <td style={{ padding:'8px 10px', fontWeight:600, color:CHART_COLORS.hooper  }}>{log.cmj_cm        ? `${log.cmj_cm} cm`        : '—'}</td>
                          <td style={{ padding:'8px 10px', color:P.dim, fontSize:11 }}>{log.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </Section>
          )
        })()}

        {/* ── TOPSET ── */}
        <Section title="TOPSET — Progression & Volumétrie" icon="🏋️" color={P.teal}
          badge={selectedEx&&prs[selectedEx]?`${selectedEx} · Record : ~${prs[selectedEx]}kg`:exerciseNames.length?`${exerciseNames.length} exercices`:'Aucune donnée'}>
          <div style={{ paddingTop:20, display:'grid', gap:16 }}>
            {exerciseNames.length > 0 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {exerciseNames.map(ex=>(
                  <button key={ex} onClick={e=>{e.stopPropagation();setSelectedEx(ex)}}
                    style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${selectedEx===ex?P.teal:P.border}`, background:selectedEx===ex?P.teal:P.card, color:selectedEx===ex?'#fff':P.text, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {selectedEx && (() => {
              const logs = data.topsets.filter(t => t.exercise_name === selectedEx)
              if (!logs.length) return null

              // Calculs volumétrie
              const calc1RM = (w, r) => { const ww=parseFloat(w),rr=parseInt(r); if(!ww||!rr||rr<=0) return null; return Math.round(ww*(1+rr/30)*10)/10 }

              // Volume par séance (charge × reps par set, groupé par date)
              const volumeByDate = {}
              const tonnageByDate = {}
              const rpeByDate = {}
              const setsCountByDate = {}
              for (const t of logs) {
                if (!volumeByDate[t.date]) { volumeByDate[t.date]=0; tonnageByDate[t.date]=0; rpeByDate[t.date]=[]; setsCountByDate[t.date]=0 }
                const vol = (parseFloat(t.weight_kg)||0) * (parseInt(t.reps)||0)
                volumeByDate[t.date] += vol
                tonnageByDate[t.date] += parseFloat(t.weight_kg)||0
                if (t.rpe) rpeByDate[t.date].push(parseFloat(t.rpe))
                setsCountByDate[t.date] += 1
              }
              const dates = Object.keys(volumeByDate).sort()
              const volumeSeries = dates.map(d => ({ value: Math.round(volumeByDate[d]), date: d }))
              const rpeSeries = dates.filter(d => rpeByDate[d].length).map(d => ({ value: Math.round((rpeByDate[d].reduce((a,b)=>a+b,0)/rpeByDate[d].length)*10)/10, date: d }))

              // Totaux globaux
              const totalTonnage = logs.reduce((s,t) => s+(parseFloat(t.weight_kg)||0)*(parseInt(t.reps)||0),0)
              const totalSets = logs.length
              const avgRpe = logs.filter(t=>t.rpe).length ? Math.round((logs.filter(t=>t.rpe).reduce((s,t)=>s+parseFloat(t.rpe),0)/logs.filter(t=>t.rpe).length)*10)/10 : null

              return (
                <>
                  {/* Stats clés */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px,1fr))', gap:10 }}>
                    {[
                      { label:'Record 1RM', value:`~${prs[selectedEx]}`, unit:'kg', color:P.teal },
                      { label:'Tonnage total', value:Math.round(totalTonnage).toLocaleString('fr-FR'), unit:'kg', color:P.blue },
                      { label:'Sets total', value:totalSets, unit:'sets', color:P.purple },
                      ...(avgRpe ? [{ label:'RPE moyen', value:avgRpe, unit:'/10', color: avgRpe>=8?P.red:avgRpe>=6?P.yellow:P.green }] : []),
                    ].map(({label,value,unit,color}) => (
                      <div key={label} style={{ padding:'12px 14px', background:P.bg, borderRadius:10, border:`1px solid ${P.border}` }}>
                        <div style={{ fontSize:10, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:20, fontWeight:700, color, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>
                          {value}<span style={{ fontSize:11, color:P.sub, marginLeft:3 }}>{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Graphe 1RM */}
                  {topsetSeries.length>=2 && (
                    <ClickableChart data={topsetSeries} color={CHART_COLORS.topset} unit=" kg" title={`1RM — ${selectedEx}`}>
                      <D3Chart data={topsetSeries} color={CHART_COLORS.topset} h={110} title={`1RM estimé — ${selectedEx}`} unit=" kg" lastValue={topsetSeries[topsetSeries.length-1]?.value} delta={topsetSeries.length>1?topsetSeries[topsetSeries.length-1].value-topsetSeries[topsetSeries.length-2].value:null} />
                    </ClickableChart>
                  )}

                  {/* Graphe volume par séance */}
                  {volumeSeries.length>=2 && (
                    <ClickableChart data={volumeSeries} color={P.blue} unit=" kg" title={`Volume par séance — ${selectedEx}`}>
                      <D3Chart data={volumeSeries} color={P.blue} h={90} title="Volume par séance (charge × reps)" unit=" kg" lastValue={volumeSeries[volumeSeries.length-1]?.value} delta={volumeSeries.length>1?volumeSeries[volumeSeries.length-1].value-volumeSeries[volumeSeries.length-2].value:null} />
                    </ClickableChart>
                  )}

                  {/* Graphe RPE */}
                  {rpeSeries.length>=2 && (
                    <ClickableChart data={rpeSeries} color={P.yellow} unit="" title={`RPE moyen — ${selectedEx}`}>
                      <D3Chart data={rpeSeries} color={P.yellow} h={80} title="RPE moyen par séance" unit="" lastValue={rpeSeries[rpeSeries.length-1]?.value} delta={rpeSeries.length>1?rpeSeries[rpeSeries.length-1].value-rpeSeries[rpeSeries.length-2].value:null} />
                    </ClickableChart>
                  )}

                  {/* Historique détaillé par séance */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:10 }}>Détail des séances</div>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                          <tr style={{ borderBottom:`2px solid ${P.border}` }}>
                            {['Date','Charge','Reps','RPE','1RM est.','Volume','Sets'].map(h=>(
                              <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...logs].reverse().slice(0,20).map(log => {
                            const rm = log.estimated_1rm || calc1RM(log.weight_kg, log.reps)
                            const vol = (parseFloat(log.weight_kg)||0)*(parseInt(log.reps)||0)
                            return (
                              <tr key={log.id} style={{ borderBottom:`1px solid ${P.border}` }}>
                                <td style={{ padding:'7px 10px', color:P.text }}>{new Date(log.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'2-digit'})}</td>
                                <td style={{ padding:'7px 10px', fontWeight:700, color:P.teal }}>{log.weight_kg ? `${log.weight_kg} kg` : '—'}</td>
                                <td style={{ padding:'7px 10px', color:P.text }}>{log.reps || '—'}</td>
                                <td style={{ padding:'7px 10px', fontWeight:600, color:log.rpe>=8?P.red:log.rpe>=6?P.yellow:P.green }}>{log.rpe ? `@${log.rpe}` : '—'}</td>
                                <td style={{ padding:'7px 10px', fontWeight:700, color:P.teal, fontFamily:"'DM Serif Display',serif" }}>{rm ? `~${rm}kg` : '—'}</td>
                                <td style={{ padding:'7px 10px', color:P.blue, fontWeight:600 }}>{vol > 0 ? `${Math.round(vol).toLocaleString('fr-FR')} kg` : '—'}</td>
                                <td style={{ padding:'7px 10px', color:P.sub }}>{setsCountByDate[log.date] || '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Records tous exercices */}
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:10 }}>Records par exercice</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:8 }}>
                {Object.entries(prs).sort((a,b)=>b[1]-a[1]).map(([ex,rm])=>(
                  <div key={ex} onClick={()=>setSelectedEx(ex)} style={{ padding:'10px 14px', background: selectedEx===ex?`${P.teal}10`:P.bg, borderRadius:10, border:`1px solid ${selectedEx===ex?P.teal:P.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                    <span style={{ fontSize:12, color:P.text, fontWeight:500 }}>{ex}</span>
                    <span style={{ fontSize:16, fontWeight:700, color:P.teal, fontFamily:"'DM Serif Display',serif" }}>~{rm}kg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── CHARGE EXTERNE ── */}
        <Section title="Charge externe — ACWR" icon="⚡" color={P.purple}
          badge={acwr?`ACWR : ${acwr} · ${acute?Math.round(acute)+' UA cette semaine':''}`:data.charge.length+' séances enregistrées'}>
          <div style={{ paddingTop:20, display:'grid', gap:20 }}>
            {/* Gauge ACWR */}
            <div style={{ padding:'16px 20px', background:P.bg, borderRadius:12, border:`1px solid ${P.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:4 }}>Ratio charge aiguë / chronique</div>
                  <div style={{ fontSize:11, color:P.dim }}>Optimal : 0.8 – 1.3 · Au-delà de 1.5 : risque élevé</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:36, fontWeight:700, color:acwrColor, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>{acwr??'—'}</div>
                  <div style={{ fontSize:11, color:acwrColor, marginTop:4, fontWeight:600 }}>
                    {!acwr?'':acwr<=0.8?'Sous-charge':acwr<=1.3?'Zone optimale':acwr<=1.5?'Vigilance':'Surcharge ⚠️'}
                  </div>
                </div>
              </div>
              <div style={{ position:'relative', height:8, borderRadius:4, overflow:'hidden', background:P.border }}>
                <div style={{ position:'absolute', left:0, width:'40%', height:'100%', background:'#dbeafe' }} />
                <div style={{ position:'absolute', left:'40%', width:'25%', height:'100%', background:'#d1fae5' }} />
                <div style={{ position:'absolute', left:'65%', width:'10%', height:'100%', background:'#fef3c7' }} />
                <div style={{ position:'absolute', left:'75%', width:'25%', height:'100%', background:'#fee2e2' }} />
                {acwr && <div style={{ position:'absolute', top:0, bottom:0, width:3, borderRadius:2, background:acwrColor, left:`${Math.min(97,Math.max(2,(acwr/2)*100))}%`, transition:'left 0.4s', boxShadow:`0 0 4px ${acwrColor}` }} />}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:P.dim, marginTop:4, fontWeight:600 }}>
                <span>0</span><span>0.8</span><span>1.3</span><span>1.5</span><span>2</span>
              </div>
            </div>
            {chargeSeriesData.length>=2 && <ClickableChart data={chargeSeriesData} color={CHART_COLORS.charge} unit=" UA" title="Charge hebdomadaire (UA)"><D3Chart data={chargeSeriesData} color={CHART_COLORS.charge} h={120} title="Charge hebdomadaire (UA)" lastValue={Math.round(acute)} unit=" UA" /></ClickableChart>}

            {/* Kilométrage + bandes de vitesse */}
            {(() => {
              const SPEED_COLORS = { lent: '#3ecf8e', modere: '#fbbf24', rapide: '#ff7043', sprint: '#ff4566' }
              const SPEED_LABELS = { lent: 'Lent <8', modere: 'Modéré 8–12', rapide: 'Rapide 12–18', sprint: 'Sprint >18' }
              const seancesKm = data.charge
                .map(c => ({ ...c, km: extractKmData(c.notes) }))
                .filter(c => c.km && (c.km.km_total || c.km.speed_bands))

              if (!seancesKm.length) return null

              const kmSeries = seancesKm.filter(s => s.km.km_total).map(s => ({ value: parseFloat(s.km.km_total), date: s.date })).sort((a,b) => a.date.localeCompare(b.date))
              const totalKm = kmSeries.reduce((s, d) => s + d.value, 0)

              return (
                <div style={{ display:'grid', gap:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub }}>Kilométrage</div>
                    <div style={{ fontSize:18, fontWeight:700, color:P.blue, fontFamily:"'DM Serif Display',serif" }}>{Math.round(totalKm*10)/10} km total</div>
                  </div>

                  {kmSeries.length >= 2 && (
                    <ClickableChart data={kmSeries} color={P.blue} unit=" km" title="Kilométrage par séance">
                      <D3Chart data={kmSeries} color={P.blue} h={90} title="Kilométrage (km)" unit=" km" lastValue={kmSeries[kmSeries.length-1]?.value} delta={kmSeries.length>1?kmSeries[kmSeries.length-1].value-kmSeries[kmSeries.length-2].value:null} />
                    </ClickableChart>
                  )}

                  {/* Dernières séances avec bandes */}
                  <div style={{ display:'grid', gap:8 }}>
                    {seancesKm.slice(-5).reverse().map(s => {
                      const bands = s.km.speed_bands
                      const bandTotal = bands ? Object.values(bands).reduce((a,b) => a+(parseFloat(b)||0), 0) : 0
                      return (
                        <div key={s.id} style={{ padding:'10px 14px', background:P.bg, borderRadius:10, border:`1px solid ${P.border}` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: bands && bandTotal > 0 ? 8 : 0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:P.text }}>
                              {new Date(s.date+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}
                            </div>
                            <div style={{ display:'flex', gap:12, alignItems:'baseline' }}>
                              {s.km.km_total && <span style={{ fontSize:14, fontWeight:700, color:P.blue, fontFamily:"'DM Serif Display',serif" }}>{s.km.km_total} km</span>}
                              {s.km.vitesse_moy && <span style={{ fontSize:11, color:P.sub }}>{s.km.vitesse_moy} km/h moy.</span>}
                            </div>
                          </div>
                          {bands && bandTotal > 0 && (
                            <>
                              <div style={{ height:8, borderRadius:4, overflow:'hidden', display:'flex', marginBottom:6 }}>
                                {Object.entries(bands).filter(([,v]) => parseFloat(v)>0).map(([key, val]) => (
                                  <div key={key} style={{ width:`${(parseFloat(val)/bandTotal)*100}%`, background:SPEED_COLORS[key] }} title={`${SPEED_LABELS[key]}: ${val}km`} />
                                ))}
                              </div>
                              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                                {Object.entries(bands).filter(([,v]) => parseFloat(v)>0).map(([key, val]) => (
                                  <span key={key} style={{ fontSize:10, color:SPEED_COLORS[key], fontWeight:600 }}>{SPEED_LABELS[key].split(' ')[0]} {val}km</span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </Section>

      </div>

      {/* ── Panel DOMS détail ── */}
      {/* ── RTP Game ── */}
      {rtpOpen && isCoach && (
        <RtpGame
          athleteId={id}
          athleteName={client?.full_name || client?.email || ''}
          coachId={coachId}
          onClose={() => setRtpOpen(false)}
        />
      )}

      {selectedDomsLog && (() => {
        let dz = {}
        try {
          const raw = selectedDomsLog.doms_zones
          dz = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
        } catch { dz = {} }
        const activeZones = DOMS_ZONES.filter(z => (dz[z.key]?.level || 0) > 0)
        const date = new Date(selectedDomsLog.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        const INQUIETUDE_LABELS = ['', 'Pas inquiet', 'Peu inquiet', 'Très inquiet']
        return (
          <div onClick={() => setSelectedDomsLog(null)} style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 16,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: P.card, border: `1px solid ${P.border}`,
              borderRadius: 20, width: '100%', maxWidth: 460,
              maxHeight: '95vh', overflowY: 'auto',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
            }}>
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>🩹 DOMS — {date}</div>
                  <div style={{ fontSize: 12, color: P.sub, marginTop: 3 }}>
                    {activeZones.length} zone{activeZones.length > 1 ? 's' : ''} douloureuse{activeZones.length > 1 ? 's' : ''}
                  </div>
                </div>
                <button onClick={() => setSelectedDomsLog(null)} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${P.border}`, background: P.bg, color: P.sub, fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
              </div>
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 130px', gap: 16, alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  {activeZones.length === 0 ? (
                    <div style={{ fontSize: 13, color: P.green }}>✓ Aucune douleur</div>
                  ) : activeZones.map(zone => {
                    const zd = dz[zone.key]
                    const level = zd?.level || 0
                    const inq = zd?.inquietude || 0
                    const color = level <= 2 ? P.green : level <= 4 ? P.yellow : level <= 6 ? '#e07040' : P.red
                    return (
                      <div key={zone.key} style={{ padding: '10px 12px', borderRadius: 10, background: P.bg, border: `1px solid ${P.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color }}>{zone.label}</div>
                            {inq > 0 && <div style={{ fontSize: 11, color: P.sub }}>{INQUIETUDE_LABELS[inq]}</div>}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "'DM Serif Display',serif" }}>{level}/10</div>
                        </div>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: i < level ? color : `${color}20` }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, textAlign: 'center' }}>Carte</div>
                  <svg viewBox="0 0 120 200" style={{ width: '100%', height: 260, display: 'block' }}>
                    {/* Fond */}
                    <rect x="0" y="0" width="120" height="200" fill="#f0ede8" rx="8"/>
                    {/* Tête */}
                    <ellipse cx="60" cy="14" rx="10" ry="12" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="1"/>
                    {/* Cou */}
                    <path d="M55 24 Q57 28 60 29 Q63 28 65 24 L65 26 Q63 30 60 31 Q57 30 55 26 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Épaules + torse */}
                    <path d="M35 30 C28 30 22 33 20 38 L18 55 C18 57 19 58 21 58 L99 58 C101 58 102 57 102 55 L100 38 C98 33 92 30 85 30 Q74 28 60 28 Q46 28 35 30 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="1"/>
                    {/* Abdomen */}
                    <path d="M28 57 L28 75 Q28 78 30 79 L90 79 Q92 78 92 75 L92 57 Z" fill="#e0ddd6" stroke="#c8c4ba" strokeWidth="0.8"/>
                    {/* Bras gauche haut */}
                    <path d="M20 35 C14 37 10 43 9 51 L8 62 C8 64 10 65 12 64 L18 62 C20 61 20 59 20 57 L21 48 C21 42 20 38 22 35 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.8"/>
                    {/* Avant-bras gauche */}
                    <path d="M8 62 C7 68 7 75 8 81 L10 87 C11 89 13 88 14 86 L16 80 C17 74 17 67 18 62 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Main gauche */}
                    <ellipse cx="11" cy="91" rx="5" ry="6" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Bras droit haut */}
                    <path d="M100 35 C106 37 110 43 111 51 L112 62 C112 64 110 65 108 64 L102 62 C100 61 100 59 100 57 L99 48 C99 42 100 38 98 35 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.8"/>
                    {/* Avant-bras droit */}
                    <path d="M112 62 C113 68 113 75 112 81 L110 87 C109 89 107 88 106 86 L104 80 C103 74 103 67 102 62 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Main droite */}
                    <ellipse cx="109" cy="91" rx="5" ry="6" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Bassin */}
                    <path d="M28 78 C26 82 25 87 28 91 Q38 96 60 96 Q82 96 92 91 C95 87 94 82 92 78 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="1"/>
                    {/* Cuisse gauche */}
                    <path d="M32 92 C29 97 27 105 28 114 L30 122 C31 124 33 124 35 123 L39 122 C41 121 41 119 40 117 L39 109 C38 101 37 95 38 92 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.8"/>
                    {/* Cuisse droite */}
                    <path d="M88 92 C91 97 93 105 92 114 L90 122 C89 124 87 124 85 123 L81 122 C79 121 79 119 80 117 L81 109 C82 101 83 95 82 92 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.8"/>
                    {/* Genou gauche */}
                    <ellipse cx="35" cy="125" rx="7" ry="6" fill="#ddd9d0" stroke="#c8c4ba" strokeWidth="0.8"/>
                    {/* Genou droit */}
                    <ellipse cx="85" cy="125" rx="7" ry="6" fill="#ddd9d0" stroke="#c8c4ba" strokeWidth="0.8"/>
                    {/* Tibia gauche */}
                    <path d="M29 130 C28 138 28 146 30 152 L32 157 C33 158 35 158 36 157 L38 152 C40 146 40 138 41 130 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Tibia droit */}
                    <path d="M79 130 C78 138 78 146 80 152 L82 157 C83 158 85 158 86 157 L88 152 C90 146 90 138 91 130 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Cheville gauche */}
                    <ellipse cx="35" cy="159" rx="6" ry="4" fill="#ddd9d0" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Cheville droite */}
                    <ellipse cx="85" cy="159" rx="6" ry="4" fill="#ddd9d0" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Pied gauche */}
                    <path d="M29 161 Q30 166 35 168 Q41 168 43 164 L42 161 Q38 163 35 163 Q31 162 29 161 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Pied droit */}
                    <path d="M91 161 Q90 166 85 168 Q79 168 77 164 L78 161 Q82 163 85 163 Q89 162 91 161 Z" fill="#e8e4dc" stroke="#c8c4ba" strokeWidth="0.7"/>
                    {/* Points DOMS */}
                    {DOMS_ZONES.map(zone => {
                      const POSITIONS = {
                        nuque:[{x:60,y:27}],
                        epaules:[{x:26,y:35},{x:94,y:35}],
                        coudes:[{x:13,y:64},{x:107,y:64}],
                        poignets:[{x:10,y:83},{x:110,y:83}],
                        tronc:[{x:60,y:45}],
                        lombaires:[{x:60,y:68}],
                        hanches:[{x:36,y:88},{x:84,y:88}],
                        cuisses:[{x:33,y:107},{x:87,y:107}],
                        genoux:[{x:35,y:125},{x:85,y:125}],
                        chevilles:[{x:35,y:155},{x:85,y:155}],
                        pieds:[{x:35,y:166},{x:85,y:166}],
                      }
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
