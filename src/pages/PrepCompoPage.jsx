import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import RtpGame from '../components/RtpGame'
import DomsPanelClickable from '../components/DomsPanelClickable'

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
function Section({ title, color, icon, badge, children, defaultOpen = false, action = null }) {
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
        <div style={{ fontSize: 11, color: P.sub, display: 'flex', gap: 10, alignItems: 'center' }}>
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
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
  const { user, profile, isCoach, gym } = useAuth()
  const gymName = gym?.name || 'Atlyo'
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
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanSuccess, setScanSuccess] = useState('')
  const inbodyInputRef = useRef(null)
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

  async function handleInbodyFile(file) {
    if (!file) return
    setScanLoading(true)
    setScanError('')
    setScanSuccess('')

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const { data: scanData, error: scanErr } = await supabase.functions.invoke('inbody-scan', {
        body: { image: base64 },
      })
      if (scanErr) throw scanErr

      const parsed = typeof scanData?.data === 'string'
        ? JSON.parse(scanData.data)
        : (scanData?.data || scanData || {})

      const notes = JSON.stringify({
        tenue: null,
        modele_balance: 'InBody',
        heure: null,
        impedance: {},
        mg1: {},
        mg2: {},
        silhouette: {},
        inbody_scan: parsed,
      })

      const measureDate = (() => {
        const raw = parsed?.date
        if (!raw) return new Date().toISOString().slice(0, 10)
        const d = new Date(raw)
        return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
      })()

      const payload = {
        user_id: id,
        date: measureDate,
        weight_kg: parsed?.weight != null ? parseFloat(parsed.weight) : null,
        body_fat_pct: parsed?.body_fat_percentage != null ? parseFloat(parsed.body_fat_percentage) : null,
        muscle_mass_kg: parsed?.skeletal_muscle_mass != null ? parseFloat(parsed.skeletal_muscle_mass) : null,
        notes,
      }

      const { error: insertErr } = await supabase.from('body_composition_logs').insert(payload)
      if (insertErr) throw insertErr

      setScanSuccess('Import InBody enregistré.')
      await load()
    } catch (e) {
      console.error(e)
      setScanError(e?.message || "Impossible d'importer la photo InBody")
    } finally {
      setScanLoading(false)
      if (inbodyInputRef.current) inbodyInputRef.current.value = ''
    }
  }

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
            {gymName} · Analyse prépa physique
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
                      const domsN=DOMS_ZONES.filter(zone => (dzRow?.[zone.key]?.level || 0) > 0).length
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
          badge={selectedC ? `${selectedC.weight_kg||'—'}kg · MG ${selectedC.body_fat_pct||'—'}% · MM ${selectedC.muscle_mass_kg||'—'}kg` : 'Aucune mesure'}
          action={isCoach ? (
            <>
              <input
                ref={inbodyInputRef}
                type="file"
                accept="image/*"
                style={{ display:'none' }}
                onChange={(e) => handleInbodyFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => inbodyInputRef.current?.click()}
                disabled={scanLoading}
                style={{
                  border:`1px solid ${P.border}`,
                  background: scanLoading ? P.bg : P.card,
                  color:P.text,
                  borderRadius:999,
                  height:36,
                  padding:'0 14px',
                  fontSize:12,
                  fontWeight:700,
                  cursor:scanLoading?'default':'pointer',
                  display:'inline-flex',
                  alignItems:'center',
                  gap:8,
                  whiteSpace:'nowrap'
                }}
              >
                {scanLoading ? 'Import en cours...' : '📸 Importer InBody'}
              </button>
            </>
          ) : null}>
          <div style={{ paddingTop:20, display:'grid', gap:24 }}>

            {(scanError || scanSuccess) && (
              <div style={{
                marginTop:-4,
                padding:'10px 12px',
                borderRadius:10,
                border:`1px solid ${scanError ? '#f5c2c7' : '#cfe8d8'}`,
                background: scanError ? '#fff5f5' : '#f3fbf5',
                color: scanError ? P.red : P.green,
                fontSize:12,
                fontWeight:600,
              }}>
                {scanError || scanSuccess}
              </div>
            )}

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
              <div style={{ padding: '16px 20px' }}>
                <DomsPanelClickable
                  zones={DOMS_ZONES}
                  doms={dz}
                  title="Panel DOMS cliquable"
                  emptyLabel="✓ Aucune douleur"
                />
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
