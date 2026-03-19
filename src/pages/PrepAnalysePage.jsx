import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card } from '../components/UI'
import { T } from '../lib/data'

// ─── Design ───────────────────────────────────────────────────────────────────
const C = {
  hooper:  '#fbbf24',
  compo:   '#3ecf8e',
  silho:   '#9d7dea',
  plio:    '#ff7043',
  topset:  '#4d9fff',
  charge:  '#ff4566',
}

// ─── Graphique ligne SVG ──────────────────────────────────────────────────────
function LineChart({ series, h = 100, showLegend = false }) {
  // series = [{ label, color, data: [{value, date}] }]
  const allVals = series.flatMap(s => s.data.map(d => d.value)).filter(Boolean)
  if (allVals.length < 2) return (
    <div style={{ height: h, display: 'grid', placeItems: 'center', color: T.textDim, fontSize: 12 }}>
      Pas assez de données
    </div>
  )
  const max = Math.max(...allVals), min = Math.min(...allVals), range = max - min || 0.1
  const W = 100, pad = 8

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${h}`} style={{ width: '100%', height: h, display: 'block' }} preserveAspectRatio="none">
        <defs>
          {series.map(s => (
            <linearGradient key={s.color} id={`g${s.color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map(r => (
          <line key={r} x1={0} y1={h * r} x2={W} y2={h * r} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}
        {series.map(s => {
          if (s.data.length < 2) return null
          const coords = s.data.map((d, i) => ({
            x: pad + (i / (s.data.length - 1)) * (W - pad * 2),
            y: h - pad - ((d.value - min) / range) * (h - pad * 2),
          }))
          const path = coords.map((c, i) => `${i===0?'M':'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
          const area = `${path} L ${coords[coords.length-1].x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`
          return (
            <g key={s.label}>
              <path d={area} fill={`url(#g${s.color.replace('#','')})`} />
              <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {coords.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="2.5" fill={s.color} />)}
            </g>
          )
        })}
      </svg>
      {showLegend && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          {series.map(s => (
            <div key={s.label} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11, color: T.textDim }}>
              <div style={{ width: 10, height: 3, background: s.color, borderRadius: 2 }} />
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Carte résumé cliquable ───────────────────────────────────────────────────
function SummaryCard({ title, color, icon, value, sub, alert, onClick, expanded, children }) {
  return (
    <div style={{ border: `1px solid ${alert ? color+'50' : expanded ? color+'30' : T.border}`, borderRadius: 16, overflow: 'hidden', background: alert ? `${color}06` : 'rgba(255,255,255,0.025)', transition: 'all 0.2s' }}>
      <div onClick={onClick} style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}30`, display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{title}</div>
            {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{sub}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {value && <div style={{ fontSize: 22, fontWeight: 900, color: alert ? color : color, fontFamily: T.fontDisplay }}>{value}</div>}
          <div style={{ fontSize: 14, color: expanded ? color : T.textDim, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${color}20` }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekKey(d) {
  const dt = new Date(d + 'T00:00:00'), day = dt.getDay() || 7
  dt.setDate(dt.getDate() - day + 1)
  return dt.toISOString().split('T')[0]
}
function weekLabel(wk) {
  const d = new Date(wk + 'T00:00:00'), e = new Date(d); e.setDate(d.getDate() + 6)
  return `${d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}`
}
function fmtDate(d) { return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'2-digit'}) }

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrepAnalysePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [client, setClient] = useState(null)
  const [data, setData] = useState({ hooper: [], compo: [], topsets: [], charge: [] })
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

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
      supabase.from('hooper_logs').select('*').eq('user_id', id).order('date', { ascending: true }).limit(60),
      supabase.from('body_composition_logs').select('*').eq('user_id', id).order('date', { ascending: true }).limit(30),
      supabase.from('topset_logs').select('*').eq('user_id', id).order('date', { ascending: true }).limit(100),
      supabase.from('charge_externe_logs').select('*').eq('user_id', id).order('date', { ascending: true }),
    ])
    setClient(profile)
    setData({ hooper: hooper||[], compo: compo||[], topsets: topsets||[], charge: charge||[] })
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const toggle = key => setExpanded(prev => prev === key ? null : key)

  // ── HOOPER ──────────────────────────────────────────────────────────────────
  const hooperScores = useMemo(() => data.hooper.map(h => ({
    value: h.fatigue + h.sommeil + h.stress + h.courbatures, date: h.date,
    fatigue: h.fatigue, sommeil: h.sommeil, stress: h.stress, courbatures: h.courbatures,
  })), [data.hooper])

  const lastHooper = hooperScores[hooperScores.length - 1]
  const hooperAlert = lastHooper?.value >= 21

  const hooperSeries = [
    { label: 'Score total', color: C.hooper, data: hooperScores },
    { label: 'Fatigue',     color: '#ff7043', data: data.hooper.map(h => ({ value: h.fatigue, date: h.date })) },
    { label: 'Sommeil',     color: '#9d7dea', data: data.hooper.map(h => ({ value: h.sommeil, date: h.date })) },
    { label: 'Stress',      color: '#4d9fff', data: data.hooper.map(h => ({ value: h.stress, date: h.date })) },
    { label: 'Courbatures', color: '#ff4566', data: data.hooper.map(h => ({ value: h.courbatures, date: h.date })) },
  ]

  // ── COMPOSITION ─────────────────────────────────────────────────────────────
  const compoSeries = {
    poids:   data.compo.filter(c => c.weight_kg).map(c => ({ value: parseFloat(c.weight_kg), date: c.date })),
    graisse: data.compo.filter(c => c.body_fat_pct).map(c => ({ value: parseFloat(c.body_fat_pct), date: c.date })),
    maigre:  data.compo.filter(c => c.muscle_mass_kg).map(c => ({ value: parseFloat(c.muscle_mass_kg), date: c.date })),
  }
  const lastCompo = data.compo[data.compo.length - 1]

  // ── PLIOMÉTRIE ───────────────────────────────────────────────────────────────
  const plioSeries = useMemo(() => {
    const mg1 = [], mg2 = []
    for (const c of data.compo) {
      let n = null; try { n = c.notes ? JSON.parse(c.notes) : null } catch {}
      if (n?.mg1?.resultat) mg1.push({ value: parseFloat(n.mg1.resultat), date: c.date })
      if (n?.mg2?.resultat) mg2.push({ value: parseFloat(n.mg2.resultat), date: c.date })
    }
    return { mg1, mg2 }
  }, [data.compo])

  // ── SILHOUETTE ───────────────────────────────────────────────────────────────
  const silhoKeys = ['epaule','poitrine','hanche','taille','cuisse','genoux']
  const silhoLabels = { epaule:'Épaule', poitrine:'Poitrine', hanche:'Hanche', taille:'Taille', cuisse:'Cuisse', genoux:'Genoux' }
  const silhoColors = { epaule:'#4d9fff', poitrine:'#9d7dea', hanche:'#ff7043', taille:'#fbbf24', cuisse:'#3ecf8e', genoux:'#26d4e8' }

  const silhoSeries = useMemo(() => {
    const byKey = {}
    for (const c of data.compo) {
      let n = null; try { n = c.notes ? JSON.parse(c.notes) : null } catch {}
      if (!n?.silhouette) continue
      for (const k of silhoKeys) {
        if (n.silhouette[k]) {
          if (!byKey[k]) byKey[k] = []
          byKey[k].push({ value: parseFloat(n.silhouette[k]), date: c.date })
        }
      }
    }
    return byKey
  }, [data.compo])

  const hasSilho = Object.values(silhoSeries).some(d => d.length > 0)

  // ── TOPSET ───────────────────────────────────────────────────────────────────
  const exerciseNames = useMemo(() => [...new Set(data.topsets.map(t => t.exercise_name))], [data.topsets])
  const [selectedEx, setSelectedEx] = useState(null)
  useEffect(() => { if (exerciseNames.length && !selectedEx) setSelectedEx(exerciseNames[0]) }, [exerciseNames])

  const topsetSeries = useMemo(() => {
    if (!selectedEx) return []
    return data.topsets.filter(t => t.exercise_name === selectedEx)
      .map(t => ({ value: t.estimated_1rm || Math.round((t.weight_kg||0)*(1+(t.reps||0)/30)*10)/10, date: t.date }))
      .filter(t => t.value > 0)
  }, [data.topsets, selectedEx])

  const prs = useMemo(() => {
    const map = {}
    for (const t of data.topsets) {
      const rm = t.estimated_1rm || Math.round((t.weight_kg||0)*(1+(t.reps||0)/30)*10)/10
      if (!map[t.exercise_name] || rm > map[t.exercise_name]) map[t.exercise_name] = rm
    }
    return map
  }, [data.topsets])

  // ── CHARGE EXTERNE ───────────────────────────────────────────────────────────
  const weeklyCharge = useMemo(() => {
    const weeks = {}
    for (const c of data.charge) {
      const wk = getWeekKey(c.date)
      if (!weeks[wk]) weeks[wk] = 0
      weeks[wk] += c.charge_ua || (c.rpe * c.duree_min)
    }
    return weeks
  }, [data.charge])

  const wkKeys = useMemo(() => Object.keys(weeklyCharge).sort(), [weeklyCharge])
  const curWk = getWeekKey(new Date().toISOString().split('T')[0])
  const idxCur = wkKeys.indexOf(curWk)
  const acute = weeklyCharge[curWk] || 0
  const chronic4 = wkKeys.slice(Math.max(0,idxCur-3), idxCur+1).map(k => weeklyCharge[k])
  const chronAvg = chronic4.length ? chronic4.reduce((a,b)=>a+b,0)/chronic4.length : 0
  const acwr = chronAvg ? Math.round((acute/chronAvg)*100)/100 : null
  const acwrC = !acwr ? T.textDim : acwr<=1.3 ? '#3ecf8e' : acwr<=1.5 ? '#fbbf24' : '#ff4566'

  const chargeSeries = wkKeys.slice(-10).map(wk => ({ value: weeklyCharge[wk], date: wk }))

  if (loading) return <PageWrap><div style={{ textAlign:'center', padding:40, color:T.textDim }}>Chargement...</div></PageWrap>

  return (
    <PageWrap>
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <button onClick={() => navigate(`/coach/clients/${id}`)} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 13, marginBottom: 8, padding: 0 }}>← Retour à la fiche</button>
            <div style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>
              Analyse prépa physique
            </div>
            <div style={{ fontSize: 14, color: T.textMid, marginTop: 4 }}>
              {client?.full_name || client?.email}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'hooper', icon: '🧠', color: C.hooper },
              { key: 'compo',  icon: '⚖️', color: C.compo },
              { key: 'plio',   icon: '📐', color: C.plio },
              { key: 'silho',  icon: '📏', color: C.silho },
              { key: 'topset', icon: '🏋️', color: C.topset },
              { key: 'charge', icon: '⚡', color: C.charge },
            ].map(({ key, icon, color }) => (
              <button key={key} onClick={() => toggle(key)}
                style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${expanded===key ? color+'50' : T.border}`, background: expanded===key ? `${color}15` : 'transparent', fontSize: 16, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── HOOPER ── */}
        <SummaryCard
          title="HOOPER — Récupération"
          icon="🧠" color={C.hooper}
          value={lastHooper ? `${lastHooper.value}/40` : null}
          sub={lastHooper ? `Dernière saisie : ${fmtDate(data.hooper[data.hooper.length-1]?.date)}` : `${data.hooper.length} entrées`}
          alert={hooperAlert}
          expanded={expanded === 'hooper'}
          onClick={() => toggle('hooper')}>
          <div style={{ paddingTop: 16, display: 'grid', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8 }}>Score total — 30 derniers jours</div>
              <LineChart series={[{ label: 'Score', color: C.hooper, data: hooperScores.slice(-30) }]} h={90} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8 }}>Détail par item</div>
              <LineChart series={hooperSeries.slice(1)} h={80} showLegend />
            </div>
            {/* Tableau 14 derniers */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>{['Date','Score','Fatigue','Sommeil','Stress','Courb.'].map(h=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:'left', color:T.textDim, fontSize:10, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[...data.hooper].reverse().slice(0,14).map(h => {
                    const s = h.fatigue+h.sommeil+h.stress+h.courbatures
                    const c = s<=7?'#3ecf8e':s<=13?'#3ecf8e':s<=20?'#fbbf24':'#ff4566'
                    return (
                      <tr key={h.id}>
                        <td style={{ padding:'6px 8px', color:T.textMid, borderBottom:`1px solid ${T.border}22` }}>{fmtDate(h.date)}</td>
                        <td style={{ padding:'6px 8px', color:c, fontWeight:800, borderBottom:`1px solid ${T.border}22` }}>{s}</td>
                        <td style={{ padding:'6px 8px', color:'#ff7043', fontWeight:700, borderBottom:`1px solid ${T.border}22` }}>{h.fatigue}</td>
                        <td style={{ padding:'6px 8px', color:'#9d7dea', fontWeight:700, borderBottom:`1px solid ${T.border}22` }}>{h.sommeil}</td>
                        <td style={{ padding:'6px 8px', color:'#4d9fff', fontWeight:700, borderBottom:`1px solid ${T.border}22` }}>{h.stress}</td>
                        <td style={{ padding:'6px 8px', color:'#ff4566', fontWeight:700, borderBottom:`1px solid ${T.border}22` }}>{h.courbatures}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </SummaryCard>

        {/* ── COMPOSITION ── */}
        <SummaryCard
          title="Composition corporelle"
          icon="⚖️" color={C.compo}
          value={lastCompo?.weight_kg ? `${lastCompo.weight_kg}kg` : null}
          sub={lastCompo ? `MG: ${lastCompo.body_fat_pct||'—'}% · MM: ${lastCompo.muscle_mass_kg||'—'}kg · ${fmtDate(lastCompo.date)}` : 'Aucune mesure'}
          expanded={expanded === 'compo'}
          onClick={() => toggle('compo')}>
          <div style={{ paddingTop: 16, display: 'grid', gap: 16 }}>
            {[
              { label: 'Poids (kg)', series: [{ label:'Poids', color:C.compo, data:compoSeries.poids }] },
              { label: 'Masse grasse (%)', series: [{ label:'MG%', color:'#ff7043', data:compoSeries.graisse }] },
              { label: 'Masse maigre (kg)', series: [{ label:'MM', color:'#4d9fff', data:compoSeries.maigre }] },
            ].filter(g => g.series[0].data.length >= 2).map(({ label, series }) => (
              <div key={label}>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>{label}</div>
                <LineChart series={series} h={80} />
              </div>
            ))}
          </div>
        </SummaryCard>

        {/* ── PLIOMÉTRIE ── */}
        {(plioSeries.mg1.length > 0 || plioSeries.mg2.length > 0) && (
          <SummaryCard
            title="Pliométrie cutanée"
            icon="📐" color={C.plio}
            value={plioSeries.mg1.length ? `MG1: ${plioSeries.mg1[plioSeries.mg1.length-1].value}%` : null}
            sub={`MG2: ${plioSeries.mg2.length ? plioSeries.mg2[plioSeries.mg2.length-1].value+'%' : '—'}`}
            expanded={expanded === 'plio'}
            onClick={() => toggle('plio')}>
            <div style={{ paddingTop: 16, display: 'grid', gap: 16 }}>
              {plioSeries.mg1.length >= 2 && (
                <div>
                  <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>MG1 — 4 plis (%)</div>
                  <LineChart series={[{ label:'MG1', color:C.plio, data:plioSeries.mg1 }]} h={70} />
                </div>
              )}
              {plioSeries.mg2.length >= 2 && (
                <div>
                  <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>MG2 — 7 plis (%)</div>
                  <LineChart series={[{ label:'MG2', color:'#ff7043', data:plioSeries.mg2 }]} h={70} />
                </div>
              )}
            </div>
          </SummaryCard>
        )}

        {/* ── SILHOUETTE ── */}
        {hasSilho && (
          <SummaryCard
            title="Mesure silhouette"
            icon="📏" color={C.silho}
            value={null}
            sub={`${Object.keys(silhoSeries).filter(k => silhoSeries[k]?.length > 0).length} zones suivies`}
            expanded={expanded === 'silho'}
            onClick={() => toggle('silho')}>
            <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {silhoKeys.filter(k => silhoSeries[k]?.length >= 2).map(k => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: silhoColors[k], fontWeight: 700, marginBottom: 6 }}>{silhoLabels[k]} (cm)</div>
                  <LineChart series={[{ label: silhoLabels[k], color: silhoColors[k], data: silhoSeries[k] }]} h={60} />
                </div>
              ))}
            </div>
          </SummaryCard>
        )}

        {/* ── TOPSET ── */}
        <SummaryCard
          title="TOPSET — Progression 1RM"
          icon="🏋️" color={C.topset}
          value={selectedEx && prs[selectedEx] ? `~${prs[selectedEx]}kg` : null}
          sub={selectedEx || 'Aucune donnée'}
          expanded={expanded === 'topset'}
          onClick={() => toggle('topset')}>
          <div style={{ paddingTop: 16, display: 'grid', gap: 14 }}>
            {/* Sélecteur exercice */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {exerciseNames.map(ex => (
                <button key={ex} onClick={e => { e.stopPropagation(); setSelectedEx(ex) }}
                  style={{ padding:'5px 10px', borderRadius:8, border:`1px solid ${selectedEx===ex ? C.topset+'50' : T.border}`, background: selectedEx===ex ? `${C.topset}15` : 'transparent', color: selectedEx===ex ? C.topset : T.textDim, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                  {ex}
                </button>
              ))}
            </div>
            {/* Graphique 1RM */}
            {topsetSeries.length >= 2 && (
              <div>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>1RM estimé — {selectedEx}</div>
                <LineChart series={[{ label:'1RM', color:C.topset, data:topsetSeries }]} h={90} />
              </div>
            )}
            {/* Records */}
            <div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8 }}>Records actuels</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {Object.entries(prs).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([ex, rm]) => (
                  <div key={ex} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', background:'rgba(255,255,255,0.03)', borderRadius:8, border:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:12, color:T.text }}>{ex}</span>
                    <span style={{ fontSize:14, fontWeight:900, color:C.topset, fontFamily:T.fontDisplay }}>~{rm}kg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SummaryCard>

        {/* ── CHARGE EXTERNE ── */}
        <SummaryCard
          title="Charge externe — ACWR"
          icon="⚡" color={C.charge}
          value={acwr ?? '—'}
          sub={`${Math.round(acute)} UA cette semaine · ${data.charge.length} séances`}
          alert={acwr > 1.5}
          expanded={expanded === 'charge'}
          onClick={() => toggle('charge')}>
          <div style={{ paddingTop: 16, display: 'grid', gap: 16 }}>
            {/* Barre ACWR */}
            <div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8 }}>Zone ACWR</div>
              <div style={{ position:'relative', height:10, borderRadius:5, background:'rgba(255,255,255,0.06)', overflow:'hidden', marginBottom:4 }}>
                <div style={{ position:'absolute', left:0, width:'40%', height:'100%', background:'rgba(77,159,255,0.3)' }} />
                <div style={{ position:'absolute', left:'40%', width:'25%', height:'100%', background:'rgba(62,207,142,0.3)' }} />
                <div style={{ position:'absolute', left:'65%', width:'10%', height:'100%', background:'rgba(251,191,36,0.3)' }} />
                <div style={{ position:'absolute', left:'75%', width:'25%', height:'100%', background:'rgba(255,69,102,0.3)' }} />
                {acwr && <div style={{ position:'absolute', top:0, bottom:0, width:4, borderRadius:2, background:acwrC, left:`${Math.min(97,Math.max(2,(acwr/2)*100))}%`, transition:'left 0.4s' }} />}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:T.textDim }}>
                <span>0 Sous</span><span>0.8</span><span>1.3 Optimal</span><span>1.5</span><span>2+ Surcharge</span>
              </div>
            </div>
            {/* Graphique charge hebdo */}
            {chargeSeries.length >= 2 && (
              <div>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Charge hebdomadaire (UA)</div>
                <LineChart series={[{ label:'Charge', color:C.charge, data:chargeSeries }]} h={80} />
              </div>
            )}
            {/* Tableau hebdo */}
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>{['Semaine','Charge UA','Séances','ACWR'].map(h=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:'left', color:T.textDim, fontSize:10, fontWeight:700, textTransform:'uppercase', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {wkKeys.slice(-8).reverse().map(wk => {
                    const idx = wkKeys.indexOf(wk)
                    const ch = chronic4.length ? wkKeys.slice(Math.max(0,idx-3),idx+1).map(k=>weeklyCharge[k]).reduce((a,b)=>a+b,0)/wkKeys.slice(Math.max(0,idx-3),idx+1).length : 0
                    const r = ch ? Math.round((weeklyCharge[wk]/ch)*100)/100 : null
                    const isCur = wk === curWk
                    const seances = data.charge.filter(c => getWeekKey(c.date) === wk).length
                    return (
                      <tr key={wk} style={{ background: isCur ? 'rgba(62,207,142,0.03)' : 'transparent' }}>
                        <td style={{ padding:'6px 8px', color:isCur?T.accentLight:T.textMid, fontWeight:isCur?700:400, borderBottom:`1px solid ${T.border}22`, fontSize:11, whiteSpace:'nowrap' }}>{weekLabel(wk)}{isCur?' ←':''}</td>
                        <td style={{ padding:'6px 8px', color:'#3ecf8e', fontWeight:700, borderBottom:`1px solid ${T.border}22` }}>{Math.round(weeklyCharge[wk])}</td>
                        <td style={{ padding:'6px 8px', color:'#4d9fff', fontWeight:700, borderBottom:`1px solid ${T.border}22` }}>{seances}</td>
                        <td style={{ padding:'6px 8px', color: r<=1.3?'#3ecf8e':r<=1.5?'#fbbf24':'#ff4566', fontWeight:700, borderBottom:`1px solid ${T.border}22` }}>{r??'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </SummaryCard>

      </div>
    </PageWrap>
  )
}
