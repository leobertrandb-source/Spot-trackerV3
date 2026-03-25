import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

// ─── Config ───────────────────────────────────────────────────────────────────
const CYCLE_PHASES = [
  { key: 'menstruation', label: 'Menstruation (J1–J5)',       color: '#ff4566' },
  { key: 'folliculaire', label: 'Phase folliculaire (J6–J13)', color: '#fbbf24' },
  { key: 'ovulation',    label: 'Ovulation (J14)',             color: '#3ecf8e' },
  { key: 'luteale',      label: 'Phase lutéale (J15–J28)',     color: '#9d7dea' },
  { key: 'na',           label: 'Non applicable',              color: '#6b7f94' },
]

const MG1_PLIS = ['sous_scapulaire', 'tricipital', 'supra_iliaque', 'ombilical']
const MG2_PLIS = ['sous_scapulaire', 'tricipital', 'supra_iliaque', 'ombilical', 'bicipital', 'sural', 'quadricipital']
const PLI_LABELS = { sous_scapulaire: 'Sous-scapulaire', tricipital: 'Tricipital', supra_iliaque: 'Supra-iliaque', ombilical: 'Ombilical', bicipital: 'Bicipital', sural: 'Sural', quadricipital: 'Quadricipital' }

const SILHOUETTE_ZONES = [
  { key: 'epaule',   label: 'Épaule',    color: '#4d9fff' },
  { key: 'poitrine', label: 'Poitrine',  color: '#9d7dea' },
  { key: 'hanche',   label: 'Hanche',    color: '#ff7043' },
  { key: 'taille',   label: 'Taille',    color: '#fbbf24' },
  { key: 'cuisse',   label: 'Cuisse',    color: '#3ecf8e' },
  { key: 'genoux',   label: 'Genoux 10cm', color: '#26d4e8' },
]

// ─── Graphique ligne ──────────────────────────────────────────────────────────
function LineGraph({ data, color = '#3ecf8e', h = 80, unit = '' }) {
  if (data.length < 2) return (
    <div style={{ height: h, display: 'grid', placeItems: 'center', color: T.textDim, fontSize: 12 }}>Pas assez de données (min. 2)</div>
  )
  const vals = data.map(d => d.value)
  const max = Math.max(...vals), min = Math.min(...vals), range = max - min || 0.1
  const W = 100, pad = 8
  const coords = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: h - pad - ((d.value - min) / range) * (h - pad * 2),
    ...d,
  }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const area = `${path} L ${coords[coords.length-1].x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`
  const diff = data[data.length-1].value - data[0].value
  return (
    <div>
      <svg viewBox={`0 0 100 ${h}`} style={{ width: '100%', display: 'block' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(r => <line key={r} x1={0} y1={h*r} x2={100} y2={h*r} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />)}
        <path d={area} fill={`url(#g${color.replace('#','')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="2.5" fill={color} />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textDim, marginTop: 4 }}>
        <span>{data[0]?.date ? new Date(data[0].date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : ''}</span>
        <span style={{ color, fontWeight: 700 }}>
          {data[data.length-1]?.value}{unit}
          <span style={{ color: diff > 0 ? '#ff7043' : '#3ecf8e', marginLeft: 6 }}>({diff > 0 ? '+' : ''}{Math.round(diff*10)/10}{unit})</span>
        </span>
        <span>{data[data.length-1]?.date ? new Date(data[data.length-1].date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : ''}</span>
      </div>
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 800, color: T.accentLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 4 }}>{children}</div>
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrepCompoPage({ athleteId = null }) {
  const { user, profile, isCoach } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const targetId = athleteId || user.id  // coach saisit pour un athlète, sinon soi-même

  const [tab, setTab] = useState('saisie')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [measureDate, setMeasureDate] = useState(today)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanPreview, setScanPreview] = useState(null)

  // Pesée & conditions générales
  const [pesee, setPesee] = useState({ weight_kg: '', tenue: '', modele_balance: '', heure: '' })

  // Questionnaire impédance
  const [impedance, setImpedance] = useState({
    pacemaker: false, dispositif_implante: false, enceinte: false,
    cycle_phase: '', eau_litres: '', alcool_veille: false,
    cafeine_veille: false, activite_veille: '', heure_repas: '',
  })

  // Mesures impédancemétrie
  const [mesures, setMesures] = useState({ weight_kg: '', muscle_mass_kg: '', body_fat_pct: '' })

  // Pliométrie
  const [mg1, setMg1] = useState({ sous_scapulaire: '', tricipital: '', supra_iliaque: '', ombilical: '', resultat: '' })
  const [mg2, setMg2] = useState({ sous_scapulaire: '', tricipital: '', supra_iliaque: '', ombilical: '', bicipital: '', sural: '', quadricipital: '', resultat: '' })

  // Silhouette
  const [silhouette, setSilhouette] = useState({ epaule: '', poitrine: '', hanche: '', taille: '', cuisse: '', genoux: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('body_composition_logs').select('*').eq('user_id', targetId).order('date', { ascending: false }).limit(30)
    setHistory(data || [])
    setLoading(false)
  }, [targetId])

  useEffect(() => { load() }, [load])

  function normalizeScanDate(value) {
    if (!value) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value)
    const m = String(value).match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/)
    if (m) {
      const [, dd, mm, yyyy] = m
      return `${yyyy}-${mm}-${dd}`
    }
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }

  function applyScanPreview(parsed) {
    if (!parsed) return
    setScanPreview(parsed)
    const normalizedDate = normalizeScanDate(parsed.date)
    if (normalizedDate) setMeasureDate(normalizedDate)

    setPesee(prev => ({
      ...prev,
      weight_kg: parsed.weight != null ? String(parsed.weight) : prev.weight_kg,
      modele_balance: prev.modele_balance || 'InBody',
    }))

    setMesures(prev => ({
      ...prev,
      weight_kg: parsed.weight != null ? String(parsed.weight) : prev.weight_kg,
      muscle_mass_kg: parsed.skeletal_muscle_mass != null ? String(parsed.skeletal_muscle_mass) : prev.muscle_mass_kg,
      body_fat_pct: parsed.body_fat_percentage != null ? String(parsed.body_fat_percentage) : prev.body_fat_pct,
    }))
  }

  async function handleInBodyScan(file) {
    if (!file) return
    setScanLoading(true)
    setScanError('')

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const { data, error } = await supabase.functions.invoke('inbody-scan', {
        body: { image: base64 },
      })

      if (error) throw error

      const parsed = typeof data?.data === 'string' ? JSON.parse(data.data) : (data?.data || data)
      applyScanPreview(parsed)
    } catch (e) {
      console.error(e)
      setScanError(e?.message || "Impossible d'analyser la photo InBody")
    } finally {
      setScanLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true); setMsg('')
    const notes = JSON.stringify({
      tenue: pesee.tenue || null,
      modele_balance: pesee.modele_balance || null,
      heure: pesee.heure || null,
      impedance: { ...impedance },
      mg1: { ...mg1 },
      mg2: { ...mg2 },
      silhouette: { ...silhouette },
      inbody_scan: scanPreview || null,
    })
    const { error } = await supabase.from('body_composition_logs').insert({
      user_id: targetId, date: measureDate || today,
      weight_kg:       parseFloat(mesures.weight_kg || pesee.weight_kg) || null,
      body_fat_pct:    parseFloat(mesures.body_fat_pct) || null,
      muscle_mass_kg:  parseFloat(mesures.muscle_mass_kg) || null,
      notes,
    })
    if (error) setMsg('Erreur : ' + error.message)
    else {
      setMsg('Bilan enregistré ✓')
      setPesee({ weight_kg: '', tenue: '', modele_balance: '', heure: '' })
      setMeasureDate(today)
      setScanPreview(null)
      setScanError('')
      setMesures({ weight_kg: '', muscle_mass_kg: '', body_fat_pct: '' })
      setMg1({ sous_scapulaire: '', tricipital: '', supra_iliaque: '', ombilical: '', resultat: '' })
      setMg2({ sous_scapulaire: '', tricipital: '', supra_iliaque: '', ombilical: '', bicipital: '', sural: '', quadricipital: '', resultat: '' })
      setSilhouette({ epaule: '', poitrine: '', hanche: '', taille: '', cuisse: '', genoux: '' })
      load()
    }
    setSaving(false)
  }

  // Données graphiques
  const chartData = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))

    // Extraire MG1/MG2 depuis notes JSON
    const mg1Series = []
    const mg2Series = []
    for (const h of sorted) {
      try {
        const n = h.notes ? JSON.parse(h.notes) : null
        if (n?.mg1?.resultat) mg1Series.push({ value: parseFloat(n.mg1.resultat), date: h.date })
        if (n?.mg2?.resultat) mg2Series.push({ value: parseFloat(n.mg2.resultat), date: h.date })
      } catch {}
    }

    // Extraire silhouette par zone
    const silhoKeys = ['epaule', 'poitrine', 'hanche', 'taille', 'cuisse', 'genoux']
    const silhoByKey = {}
    for (const h of sorted) {
      try {
        const n = h.notes ? JSON.parse(h.notes) : null
        if (!n?.silhouette) continue
        for (const k of silhoKeys) {
          if (n.silhouette[k]) {
            if (!silhoByKey[k]) silhoByKey[k] = []
            silhoByKey[k].push({ value: parseFloat(n.silhouette[k]), date: h.date })
          }
        }
      } catch {}
    }

    return {
      poids:   sorted.filter(h => h.weight_kg).map(h => ({ value: parseFloat(h.weight_kg), date: h.date })),
      graisse: sorted.filter(h => h.body_fat_pct).map(h => ({ value: parseFloat(h.body_fat_pct), date: h.date })),
      maigre:  sorted.filter(h => h.muscle_mass_kg).map(h => ({ value: parseFloat(h.muscle_mass_kg), date: h.date })),
      mg1: mg1Series,
      mg2: mg2Series,
      silhouette: silhoByKey,
    }
  }, [history])

  const last = history[0]
  const prev = history[1]

  const lastNotes = useMemo(() => {
    if (!last?.notes) return null
    try { return JSON.parse(last.notes) } catch { return null }
  }, [last])

  function diffVal(key) {
    if (!last?.[key] || !prev?.[key]) return null
    const d = parseFloat(last[key]) - parseFloat(prev[key])
    return { d: Math.round(d*10)/10, positive: d > 0 }
  }

  const inp = (val, onChange, placeholder, type='number') => (
    <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', color: T.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
  )

  const boolBtn = (val, onChange, labelOn, labelOff, color='#ff7043') => (
    <button onClick={() => onChange(!val)}
      style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${val ? color+'50' : T.border}`, background: val ? `${color}15` : 'rgba(255,255,255,0.02)', color: val ? color : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
      {val ? labelOn : labelOff}
    </button>
  )

  const TABS = [
    { key: 'saisie',  label: 'Saisir' },
    ...(isCoach ? [{ key: 'analyse', label: 'Analyse' }] : []),
  ]

  return (
    <PageWrap>
      <div style={{ maxWidth: 750, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* Header */}
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Prépa physique</div>
          <div style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>Bilan morphologique</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 4 }}>{history.length} bilan{history.length > 1 ? 's' : ''} enregistré{history.length > 1 ? 's' : ''}</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${tab === t.key ? T.accent+'40' : T.border}`, background: tab === t.key ? `${T.accent}12` : 'transparent', color: tab === t.key ? T.accentLight : T.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SAISIE ── */}
        {tab === 'saisie' && (
          <>
            {/* Pesée générale */}
            <Card>
              <SectionTitle>Pesée</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: 5 }}>Date de mesure</div>
                  <input type="date" value={measureDate} onChange={e => setMeasureDate(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', color: T.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: 5 }}>Poids (kg)</div>
                  {inp(pesee.weight_kg, v => setPesee(p => ({...p, weight_kg: v})), '75.0')}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: 5 }}>Heure</div>
                  <input type="time" value={pesee.heure} onChange={e => setPesee(p => ({...p, heure: e.target.value}))}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', color: T.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                {isCoach && (<>
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: 5 }}>Tenue</div>
                  {inp(pesee.tenue, v => setPesee(p => ({...p, tenue: v})), 'ex: sous-vêtements', 'text')}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: 5 }}>Modèle balance</div>
                  {inp(pesee.modele_balance, v => setPesee(p => ({...p, modele_balance: v})), 'ex: InBody 270', 'text')}
                </div>
                </>)}
              </div>

              {isCoach && (
                <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: `1px dashed ${T.accent}55`, background: 'rgba(62,207,142,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Importer une photo InBody</div>
                      <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>La photo remplit automatiquement le poids, la masse maigre et la masse grasse.</div>
                    </div>
                    <label style={{ cursor: 'pointer' }}>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleInBodyScan(e.target.files?.[0])} />
                      <div style={{ padding: '10px 14px', borderRadius: 10, background: `${T.accent}16`, color: T.accentLight, fontSize: 13, fontWeight: 800, border: `1px solid ${T.accent}35` }}>
                        {scanLoading ? 'Analyse en cours…' : 'Scanner InBody'}
                      </div>
                    </label>
                  </div>

                  {scanError && <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#ff7b7b' }}>{scanError}</div>}

                  {scanPreview && (
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                      {[
                        { label: 'Date', value: normalizeScanDate(scanPreview.date) || '—' },
                        { label: 'Poids', value: scanPreview.weight != null ? `${scanPreview.weight} kg` : '—' },
                        { label: 'Masse maigre', value: scanPreview.skeletal_muscle_mass != null ? `${scanPreview.skeletal_muscle_mass} kg` : '—' },
                        { label: 'Masse grasse', value: scanPreview.body_fat_percentage != null ? `${scanPreview.body_fat_percentage} %` : '—' },
                        { label: 'Masse grasse (kg)', value: scanPreview.body_fat_mass != null ? `${scanPreview.body_fat_mass} kg` : '—' },
                        { label: 'IMC', value: scanPreview.bmi != null ? scanPreview.bmi : '—' },
                      ].map(item => (
                        <div key={item.label} style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>{item.label}</div>
                          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 800, color: T.text }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Sections coach uniquement */}
            {isCoach && (<>

            {/* Questionnaire impédancemétrie */}
            <Card>
              <SectionTitle>Questionnaire impédancemétrie</SectionTitle>
              <div style={{ display: 'grid', gap: 12 }}>

                {/* Questions médicales */}
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, marginBottom: 8 }}>⚠️ Questions médicales</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                    {boolBtn(impedance.pacemaker, v => setImpedance(p=>({...p, pacemaker: v})), '🫀 Pacemaker : OUI', '🫀 Pacemaker : NON', '#ff4566')}
                    {boolBtn(impedance.dispositif_implante, v => setImpedance(p=>({...p, dispositif_implante: v})), '🔩 Dispositif implanté : OUI', '🔩 Dispositif implanté : NON', '#ff4566')}
                    {boolBtn(impedance.enceinte, v => setImpedance(p=>({...p, enceinte: v})), '🤰 Enceinte : OUI', '🤰 Enceinte : NON', '#ff4566')}
                  </div>
                  {(impedance.pacemaker || impedance.dispositif_implante || impedance.enceinte) && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,69,102,0.08)', borderRadius: 8, fontSize: 12, color: '#ff4566', fontWeight: 700 }}>
                      ⚠️ Contre-indication à l'impédancemétrie — consulter un médecin avant la mesure
                    </div>
                  )}
                </div>

                {/* Heure dernier repas */}
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: 5 }}>Heure du dernier repas</div>
                  <input type="time" value={impedance.heure_repas} onChange={e => setImpedance(p=>({...p, heure_repas: e.target.value}))}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', color: T.text, fontSize: 13, outline: 'none' }} />
                </div>

                {/* Eau */}
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6 }}>Consommation d'eau H-1 (litres)</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[0, 0.25, 0.5, 1].map(v => (
                      <button key={v} onClick={() => setImpedance(p=>({...p, eau_litres: String(v)}))}
                        style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${impedance.eau_litres === String(v) ? '#26d4e8'+'50' : T.border}`, background: impedance.eau_litres === String(v) ? 'rgba(38,212,232,0.12)' : 'transparent', color: impedance.eau_litres === String(v) ? '#26d4e8' : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {v}L
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activité, alcool, caféine, cycle */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                  {boolBtn(impedance.alcool_veille, v => setImpedance(p=>({...p, alcool_veille: v})), '🍷 Alcool H-24 : OUI', '🍷 Alcool H-24 : NON', '#ff7043')}
                  {boolBtn(impedance.cafeine_veille, v => setImpedance(p=>({...p, cafeine_veille: v})), '☕ Caféïne : OUI', '☕ Caféïne : NON', '#fbbf24')}
                </div>

                <div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6 }}>Activités sportives H-12</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[{k:'non',l:'Aucune'},{k:'leger',l:'Légère'},{k:'modere',l:'Modérée'},{k:'intense',l:'Intense'}].map(({k,l}) => (
                      <button key={k} onClick={() => setImpedance(p=>({...p, activite_veille: k}))}
                        style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${impedance.activite_veille === k ? T.accent+'50' : T.border}`, background: impedance.activite_veille === k ? `${T.accent}15` : 'transparent', color: impedance.activite_veille === k ? T.accentLight : T.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8 }}>Cycle menstruel</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CYCLE_PHASES.map(p => (
                      <button key={p.key} onClick={() => setImpedance(prev => ({...prev, cycle_phase: prev.cycle_phase === p.key ? '' : p.key}))}
                        style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${impedance.cycle_phase === p.key ? p.color+'50' : T.border}`, background: impedance.cycle_phase === p.key ? `${p.color}15` : 'transparent', color: impedance.cycle_phase === p.key ? p.color : T.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Impédancemétrie — mesures */}
            <Card>
              <SectionTitle>Impédancemétrie — Mesures</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {[
                  { key: 'weight_kg',     label: 'Poids (kg)',       color: '#3ecf8e' },
                  { key: 'muscle_mass_kg', label: 'Masse maigre (kg)', color: '#4d9fff' },
                  { key: 'body_fat_pct',  label: 'Masse grasse (%)', color: '#ff7043' },
                ].map(({ key, label, color }) => {
                  const v = diffVal(key)
                  return (
                    <div key={key}>
                      <div style={{ fontSize: 11, color: T.textDim, marginBottom: 5 }}>{label}</div>
                      <input type="number" step="0.1" value={mesures[key]} onChange={e => setMesures(p=>({...p, [key]: e.target.value}))}
                        placeholder={last?.[key] ? String(last[key]) : '—'}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`, borderRadius: 10, padding: '10px', color, fontSize: 20, fontWeight: 900, outline: 'none', textAlign: 'center', fontFamily: T.fontDisplay }} />
                      {v && <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: v.positive ? '#ff7043' : '#3ecf8e', marginTop: 2 }}>{v.positive?'+':''}{v.d} vs dernière</div>}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* MG1 — Pliométrie 4 plis */}
            <Card>
              <SectionTitle>MG1 — Pliométrie cutanée (4 plis)</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
                {MG1_PLIS.map(pli => (
                  <div key={pli}>
                    <div style={{ fontSize: 11, color: T.textDim, marginBottom: 5 }}>{PLI_LABELS[pli]}</div>
                    {inp(mg1[pli], v => setMg1(p=>({...p, [pli]: v})), 'mm')}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: T.textDim }}>Résultat MG1 :</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {inp(mg1.resultat, v => setMg1(p=>({...p, resultat: v})), '—')}
                  <span style={{ fontSize: 13, color: T.textDim }}>%</span>
                </div>
              </div>
            </Card>

            {/* MG2 — Pliométrie 7 plis */}
            <Card>
              <SectionTitle>MG2 — Pliométrie cutanée (7 plis)</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 12 }}>
                {MG2_PLIS.map(pli => (
                  <div key={pli}>
                    <div style={{ fontSize: 11, color: T.textDim, marginBottom: 5 }}>{PLI_LABELS[pli]}</div>
                    {inp(mg2[pli], v => setMg2(p=>({...p, [pli]: v})), 'mm')}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: T.textDim }}>Résultat MG2 :</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {inp(mg2.resultat, v => setMg2(p=>({...p, resultat: v})), '—')}
                  <span style={{ fontSize: 13, color: T.textDim }}>%</span>
                </div>
              </div>
            </Card>

            </>)} {/* fin sections coach */}

            {/* Mesure silhouette */}
            <Card>
              <SectionTitle>Mesure silhouette (cm)</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                {SILHOUETTE_ZONES.map(({ key, label, color }) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, color, marginBottom: 5, fontWeight: 700 }}>{label}</div>
                    <input type="number" step="0.5" value={silhouette[key]} onChange={e => setSilhouette(p=>({...p, [key]: e.target.value}))}
                      placeholder="cm"
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`, borderRadius: 8, padding: '8px', color, fontSize: 16, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                  </div>
                ))}
              </div>
            </Card>

            {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.includes('Erreur') ? '#ff7b7b' : T.accentLight }}>{msg}</div>}
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer le bilan'}
            </Btn>
          </>
        )}

        {/* ── ANALYSE (coach only) ── */}
        {tab === 'analyse' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 30, color: T.textDim }}>Chargement...</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: T.textDim }}>Aucun bilan enregistré</div>
            ) : (
              <>
                {/* Dernière mesure */}
                {last && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                    {[
                      { key: 'weight_kg',     label: 'Poids',        unit: 'kg', color: '#3ecf8e' },
                      { key: 'body_fat_pct',   label: 'Masse grasse', unit: '%',  color: '#ff7043' },
                      { key: 'muscle_mass_kg', label: 'Masse maigre', unit: 'kg', color: '#4d9fff' },
                    ].map(({ key, label, unit, color }) => {
                      const v = diffVal(key)
                      return last[key] ? (
                        <div key={key} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: `1px solid ${T.border}`, textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: T.fontDisplay }}>{last[key]}<span style={{ fontSize: 12, marginLeft: 2 }}>{unit}</span></div>
                          {v && <div style={{ fontSize: 11, fontWeight: 700, color: v.positive ? '#ff7043' : '#3ecf8e', marginTop: 4 }}>{v.positive?'+':''}{v.d}{unit}</div>}
                        </div>
                      ) : null
                    })}
                  </div>
                )}

                {/* Graphiques impédancemétrie */}
                {[
                  { data: chartData.poids,   label: 'Poids',        unit: ' kg', color: '#3ecf8e' },
                  { data: chartData.graisse, label: 'Masse grasse (impédance)',  unit: '%',  color: '#ff7043' },
                  { data: chartData.maigre,  label: 'Masse maigre',  unit: ' kg', color: '#4d9fff' },
                ].filter(c => c.data.length >= 2).map(({ data, label, unit, color }) => (
                  <Card key={label}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Évolution — {label}</div>
                    <LineGraph data={data} color={color} h={90} unit={unit} />
                  </Card>
                ))}

                {/* Graphiques pliométrie MG1 / MG2 */}
                {(chartData.mg1.length >= 1 || chartData.mg2.length >= 1) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                    {chartData.mg1.length >= 1 && (
                      <Card>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>MG1 — 4 plis</div>
                          <div style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.8 }}>Pliométrie</div>
                          {chartData.mg1.length >= 1 && (
                            <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 900, color: '#fbbf24', fontFamily: T.fontDisplay }}>
                              {chartData.mg1[chartData.mg1.length - 1].value}%
                            </div>
                          )}
                        </div>
                        {chartData.mg1.length >= 2
                          ? <LineGraph data={chartData.mg1} color="#fbbf24" h={90} unit="%" />
                          : <div style={{ padding: '10px 0', fontSize: 13, color: T.textDim }}>
                              1 mesure enregistrée — dernière valeur : <strong style={{ color: '#fbbf24' }}>{chartData.mg1[0].value}%</strong>
                              <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>Ajoutez un 2ème bilan pour voir l'évolution</div>
                            </div>
                        }
                      </Card>
                    )}
                    {chartData.mg2.length >= 1 && (
                      <Card>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>MG2 — 7 plis</div>
                          <div style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(157,125,234,0.12)', border: '1px solid rgba(157,125,234,0.25)', fontSize: 10, fontWeight: 700, color: '#9d7dea', textTransform: 'uppercase', letterSpacing: 0.8 }}>Pliométrie</div>
                          {chartData.mg2.length >= 1 && (
                            <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 900, color: '#9d7dea', fontFamily: T.fontDisplay }}>
                              {chartData.mg2[chartData.mg2.length - 1].value}%
                            </div>
                          )}
                        </div>
                        {chartData.mg2.length >= 2
                          ? <LineGraph data={chartData.mg2} color="#9d7dea" h={90} unit="%" />
                          : <div style={{ padding: '10px 0', fontSize: 13, color: T.textDim }}>
                              1 mesure enregistrée — dernière valeur : <strong style={{ color: '#9d7dea' }}>{chartData.mg2[0].value}%</strong>
                              <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>Ajoutez un 2ème bilan pour voir l'évolution</div>
                            </div>
                        }
                      </Card>
                    )}
                  </div>
                )}

                {/* ── Dernière mesure — détail complet ── */}
                {lastNotes && (
                  <>
                    {/* Conditions de mesure */}
                    {lastNotes.impedance && (
                      <Card>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Conditions — dernière mesure</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {lastNotes.heure && <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 12, color: T.textMid }}>🕐 {lastNotes.heure}</span>}
                          {lastNotes.modele_balance && <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 12, color: T.textMid }}>⚖️ {lastNotes.modele_balance}</span>}
                          {lastNotes.tenue && <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 12, color: T.textMid }}>👕 {lastNotes.tenue}</span>}
                          {lastNotes.impedance.eau_litres && <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 12, color: T.textMid }}>💧 {lastNotes.impedance.eau_litres}L</span>}
                          {lastNotes.impedance.heure_repas && <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 12, color: T.textMid }}>🍽️ Repas {lastNotes.impedance.heure_repas}</span>}
                          {lastNotes.impedance.activite_veille && lastNotes.impedance.activite_veille !== 'non' && <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 12, color: T.textMid }}>🏃 Activité H-12 : {lastNotes.impedance.activite_veille}</span>}
                          {lastNotes.impedance.cycle_phase && lastNotes.impedance.cycle_phase !== 'na' && (() => { const ph = CYCLE_PHASES.find(p => p.key === lastNotes.impedance.cycle_phase); return ph ? <span style={{ padding: '4px 10px', background: `${ph.color}15`, border: `1px solid ${ph.color}40`, borderRadius: 20, fontSize: 12, color: ph.color }}>🔄 {ph.label}</span> : null })()}
                          {lastNotes.impedance.alcool_veille && <span style={{ padding: '4px 10px', background: 'rgba(255,69,102,0.1)', border: '1px solid rgba(255,69,102,0.3)', borderRadius: 20, fontSize: 12, color: '#ff4566' }}>🍷 Alcool H-24</span>}
                          {lastNotes.impedance.cafeine_veille && <span style={{ padding: '4px 10px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 20, fontSize: 12, color: '#fbbf24' }}>☕ Caféïne</span>}
                          {lastNotes.impedance.pacemaker && <span style={{ padding: '4px 10px', background: 'rgba(255,69,102,0.1)', border: '1px solid rgba(255,69,102,0.3)', borderRadius: 20, fontSize: 12, color: '#ff4566' }}>⚠️ Pacemaker</span>}
                          {lastNotes.impedance.enceinte && <span style={{ padding: '4px 10px', background: 'rgba(255,69,102,0.1)', border: '1px solid rgba(255,69,102,0.3)', borderRadius: 20, fontSize: 12, color: '#ff4566' }}>⚠️ Enceinte</span>}
                        </div>
                      </Card>
                    )}

                    {/* Pliométrie — détail plis */}
                    {(lastNotes.mg1 || lastNotes.mg2) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                        {lastNotes.mg1 && (
                          <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>MG1 — 4 plis</div>
                                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Dernière mesure</div>
                              </div>
                              {lastNotes.mg1.resultat && <div style={{ fontSize: 26, fontWeight: 900, color: '#fbbf24', fontFamily: T.fontDisplay }}>{lastNotes.mg1.resultat}<span style={{ fontSize: 13 }}>%</span></div>}
                            </div>
                            <div style={{ display: 'grid', gap: 6 }}>
                              {MG1_PLIS.filter(k => lastNotes.mg1[k]).map(k => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(251,191,36,0.05)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.12)' }}>
                                  <span style={{ fontSize: 12, color: T.textMid }}>{PLI_LABELS[k]}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{lastNotes.mg1[k]} mm</span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                        {lastNotes.mg2 && (
                          <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>MG2 — 7 plis</div>
                                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Dernière mesure</div>
                              </div>
                              {lastNotes.mg2.resultat && <div style={{ fontSize: 26, fontWeight: 900, color: '#9d7dea', fontFamily: T.fontDisplay }}>{lastNotes.mg2.resultat}<span style={{ fontSize: 13 }}>%</span></div>}
                            </div>
                            <div style={{ display: 'grid', gap: 6 }}>
                              {MG2_PLIS.filter(k => lastNotes.mg2[k]).map(k => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(157,125,234,0.05)', borderRadius: 8, border: '1px solid rgba(157,125,234,0.12)' }}>
                                  <span style={{ fontSize: 12, color: T.textMid }}>{PLI_LABELS[k]}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#9d7dea' }}>{lastNotes.mg2[k]} mm</span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Silhouette — dernière mesure */}
                    {lastNotes.silhouette && Object.values(lastNotes.silhouette).some(v => v) && (
                      <Card>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Mesure silhouette — dernière mesure</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                          {SILHOUETTE_ZONES.filter(z => lastNotes.silhouette[z.key]).map(({ key, label, color }) => (
                            <div key={key} style={{ padding: '10px 12px', background: `${color}08`, borderRadius: 10, border: `1px solid ${color}25`, textAlign: 'center' }}>
                              <div style={{ fontSize: 10, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: T.fontDisplay }}>{lastNotes.silhouette[key]}</div>
                              <div style={{ fontSize: 10, color: T.textDim }}>cm</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </>
                )}

                {/* Évolution silhouette par zone */}
                {Object.values(chartData.silhouette || {}).some(d => d?.length >= 2) && (
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 14 }}>Évolution silhouette (cm)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                      {SILHOUETTE_ZONES.filter(z => chartData.silhouette[z.key]?.length >= 2).map(({ key, label, color }) => {
                        const d = chartData.silhouette[key]
                        const delta = d[d.length-1].value - d[d.length-2].value
                        return (
                          <div key={key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                                <span style={{ fontSize: 11, color: delta > 0 ? '#ff7043' : '#3ecf8e', fontWeight: 700 }}>{delta > 0 ? '+' : ''}{Math.round(delta*10)/10} cm</span>
                                <span style={{ fontSize: 15, fontWeight: 900, color, fontFamily: T.fontDisplay }}>{d[d.length-1].value} cm</span>
                              </div>
                            </div>
                            <LineGraph data={d} color={color} h={70} unit=" cm" />
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* Historique bilans */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Historique des bilans</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>{['Date','Poids','M. grasse','M. maigre','Conditions'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.textDim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {history.map(log => {
                          let n = null
                          try { n = log.notes ? JSON.parse(log.notes) : null } catch {}
                          const flags = []
                          if (n?.impedance?.alcool_veille) flags.push('🍷')
                          if (n?.impedance?.cafeine_veille) flags.push('☕')
                          if (n?.impedance?.pacemaker) flags.push('🫀')
                          if (n?.impedance?.cycle_phase && n.impedance.cycle_phase !== 'na') {
                            const ph = CYCLE_PHASES.find(p => p.key === n.impedance.cycle_phase)
                            if (ph) flags.push(ph.label.split(' ')[0])
                          }
                          const mg1r = n?.mg1?.resultat
                          const mg2r = n?.mg2?.resultat
                          return (
                            <tr key={log.id}>
                              <td style={{ padding: '8px 10px', color: T.textMid, borderBottom: `1px solid ${T.border}22`, whiteSpace: 'nowrap', fontSize: 12 }}>
                                {new Date(log.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'2-digit'})}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#3ecf8e', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.weight_kg ? `${log.weight_kg}kg` : '—'}</td>
                              <td style={{ padding: '8px 10px', color: '#ff7043', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.body_fat_pct ? `${log.body_fat_pct}%` : '—'}{mg1r ? ` / MG1:${mg1r}%` : ''}</td>
                              <td style={{ padding: '8px 10px', color: '#4d9fff', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.muscle_mass_kg ? `${log.muscle_mass_kg}kg` : '—'}</td>
                              <td style={{ padding: '8px 10px', color: T.textDim, borderBottom: `1px solid ${T.border}22`, fontSize: 12 }}>
                                {n?.heure && <span style={{ marginRight: 6 }}>🕐{n.heure}</span>}
                                {n?.impedance?.eau_litres && <span style={{ marginRight: 6 }}>💧{n.impedance.eau_litres}L</span>}
                                {flags.join(' ')}
                                {n?.tenue && <span style={{ marginLeft: 6, color: T.textDim }}>· {n.tenue}</span>}
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
