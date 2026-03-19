import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrepAnalysePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [data, setData] = useState({ hooper: [], compo: [], topsets: [], charge: [] })
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
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', id).single(),
      supabase.from('hooper_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(60),
      supabase.from('body_composition_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(30),
      supabase.from('topset_logs').select('*').eq('user_id', id).order('date',{ascending:true}).limit(100),
      supabase.from('charge_externe_logs').select('*').eq('user_id', id).order('date',{ascending:true}),
    ])
    setClient(profile)
    setData({ hooper: hooper||[], compo: compo||[], topsets: topsets||[], charge: charge||[] })
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
          <button onClick={load}
            style={{ padding:'7px 14px', borderRadius:20, border:`1px solid ${P.border}`, background:'transparent', color:P.sub, fontSize:11, cursor:'pointer', fontWeight:600 }}>
            ↻ Actualiser
          </button>
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
          {lastC?.weight_kg && <StatPill label="Poids" value={lastC.weight_kg} unit="kg" color={P.accent} delta={prevC?.weight_kg ? parseFloat(lastC.weight_kg)-parseFloat(prevC.weight_kg) : null} deltaUnit="kg" />}
          {lastC?.body_fat_pct && <StatPill label="Masse grasse" value={lastC.body_fat_pct} unit="%" color={P.red} delta={prevC?.body_fat_pct ? parseFloat(lastC.body_fat_pct)-parseFloat(prevC.body_fat_pct) : null} deltaUnit="%" />}
          {acwr !== null && <StatPill label="ACWR" value={acwr} unit="" color={acwrColor} />}
          {selectedEx && prs[selectedEx] && <StatPill label="1RM" value={`~${prs[selectedEx]}`} unit="kg" color={P.teal} />}
        </div>

        {/* ── HOOPER ── */}
        <Section title="HOOPER — Récupération" icon="🧠" color={P.green}
          badge={lastScore !== null ? `Score actuel : ${lastScore}/40 · ${lastScore<=7?'Très bon':lastScore<=13?'Correct':lastScore<=20?'Vigilance':'⚠️ Fatigue importante'}` : 'Aucune donnée'}
          defaultOpen={true}>
          <div style={{ paddingTop:20, display:'grid', gap:24 }}>
            <D3Chart data={hooperScores} color={P.green} h={130} title="Score total /40" lastValue={lastScore} delta={prevScore!==null?lastScore-prevScore:null} />
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:12 }}>Détail par item</div>
              <MultiD3Chart h={110} series={[
                {label:'Fatigue',    color:CHART_COLORS.fatigue,     data:data.hooper.map(h=>({value:h.fatigue,    date:h.date}))},
                {label:'Sommeil',    color:CHART_COLORS.sommeil,     data:data.hooper.map(h=>({value:h.sommeil,    date:h.date}))},
                {label:'Stress',     color:CHART_COLORS.stress,      data:data.hooper.map(h=>({value:h.stress,     date:h.date}))},
                {label:'Courbatures',color:CHART_COLORS.courbatures, data:data.hooper.map(h=>({value:h.courbatures,date:h.date}))},
              ]} />
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
                      const domsN=Object.values(h.doms_zones||{}).filter(z=>z.level>0).length
                      return (
                        <tr key={h.id} style={{ borderBottom:`1px solid ${P.border}` }}>
                          <td style={{ padding:'8px 10px', color:P.text }}>{new Date(h.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</td>
                          <td style={{ padding:'8px 10px', fontWeight:700, color:scoreColor(s), fontFamily:"'DM Serif Display',serif", fontSize:15 }}>{s}</td>
                          <td style={{ padding:'8px 10px', color:P.red, fontWeight:600 }}>{h.fatigue}</td>
                          <td style={{ padding:'8px 10px', color:P.purple, fontWeight:600 }}>{h.sommeil}</td>
                          <td style={{ padding:'8px 10px', color:P.blue, fontWeight:600 }}>{h.stress}</td>
                          <td style={{ padding:'8px 10px', color:P.yellow, fontWeight:600 }}>{h.courbatures}</td>
                          <td style={{ padding:'8px 10px', color:domsN>0?P.red:P.dim }}>{domsN>0?`${domsN} zone${domsN>1?'s':''}`:'-'}</td>
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
          badge={lastC ? `${lastC.weight_kg||'—'}kg · MG ${lastC.body_fat_pct||'—'}% · MM ${lastC.muscle_mass_kg||'—'}kg` : 'Aucune mesure'}>
          <div style={{ paddingTop:20, display:'grid', gap:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:20 }}>
              {[
                {data:compoData.poids,   color:CHART_COLORS.poids,   title:'Poids', unit:' kg',  key:'weight_kg'},
                {data:compoData.graisse, color:CHART_COLORS.graisse, title:'Masse grasse', unit:'%', key:'body_fat_pct'},
                {data:compoData.maigre,  color:CHART_COLORS.maigre,  title:'Masse maigre', unit:' kg', key:'muscle_mass_kg'},
              ].filter(g=>g.data.length>=2).map(({data,color,title,unit,key})=>(
                <D3Chart key={title} data={data} color={color} h={110} title={title} unit={unit}
                  lastValue={lastC?.[key]} delta={prevC?.[key]?parseFloat(lastC[key])-parseFloat(prevC[key]):null} />
              ))}
            </div>
          </div>
        </Section>

        {/* ── PLIOMÉTRIE ── */}
        {(plioData.mg1.length>0||plioData.mg2.length>0) && (
          <Section title="Pliométrie cutanée" icon="📐" color={P.yellow}
            badge={`MG1: ${plioData.mg1.length?plioData.mg1[plioData.mg1.length-1].value+'%':'—'} · MG2: ${plioData.mg2.length?plioData.mg2[plioData.mg2.length-1].value+'%':'—'}`}>
            <div style={{ paddingTop:20, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:20 }}>
              {plioData.mg1.length>=2 && <D3Chart data={plioData.mg1} color={CHART_COLORS.mg1} h={100} title="MG1 — 4 plis" unit="%" lastValue={plioData.mg1[plioData.mg1.length-1]?.value} delta={plioData.mg1.length>1?plioData.mg1[plioData.mg1.length-1].value-plioData.mg1[plioData.mg1.length-2].value:null} />}
              {plioData.mg2.length>=2 && <D3Chart data={plioData.mg2} color={CHART_COLORS.mg2} h={100} title="MG2 — 7 plis" unit="%" lastValue={plioData.mg2[plioData.mg2.length-1]?.value} delta={plioData.mg2.length>1?plioData.mg2[plioData.mg2.length-1].value-plioData.mg2[plioData.mg2.length-2].value:null} />}
            </div>
          </Section>
        )}

        {/* ── SILHOUETTE ── */}
        {Object.values(silhoData).some(d=>d.length>=2) && (
          <Section title="Mesure silhouette" icon="📏" color={P.purple}
            badge={`${Object.keys(silhoData).filter(k=>silhoData[k]?.length>0).length} zones suivies`}>
            <div style={{ paddingTop:20, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:16 }}>
              {Object.entries({epaule:'Épaule',poitrine:'Poitrine',hanche:'Hanche',taille:'Taille',cuisse:'Cuisse',genoux:'Genoux'})
                .filter(([k])=>silhoData[k]?.length>=2)
                .map(([k,l])=>{
                  const colors={epaule:P.blue,poitrine:P.purple,hanche:P.red,taille:P.yellow,cuisse:P.green,genoux:P.teal}
                  const d=silhoData[k]
                  return <D3Chart key={k} data={d} color={colors[k]||P.accent} h={90} title={`${l} (cm)`} lastValue={d[d.length-1]?.value} unit=" cm" delta={d.length>1?d[d.length-1].value-d[d.length-2].value:null} />
                })
              }
            </div>
          </Section>
        )}

        {/* ── TOPSET ── */}
        <Section title="TOPSET — Progression 1RM" icon="🏋️" color={P.teal}
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
            {topsetSeries.length>=2 && <D3Chart data={topsetSeries} color={CHART_COLORS.topset} h={130} title={`1RM estimé — ${selectedEx}`} unit=" kg" lastValue={topsetSeries[topsetSeries.length-1]?.value} delta={topsetSeries.length>1?topsetSeries[topsetSeries.length-1].value-topsetSeries[topsetSeries.length-2].value:null} />}
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:'uppercase', color:P.sub, marginBottom:10 }}>Records par exercice</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:8 }}>
                {Object.entries(prs).sort((a,b)=>b[1]-a[1]).map(([ex,rm])=>(
                  <div key={ex} style={{ padding:'10px 14px', background:P.bg, borderRadius:10, border:`1px solid ${P.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
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
            {chargeSeriesData.length>=2 && <D3Chart data={chargeSeriesData} color={CHART_COLORS.charge} h={120} title="Charge hebdomadaire (UA)" lastValue={Math.round(acute)} unit=" UA" />}
          </div>
        </Section>

      </div>
    </div>
  )
}
