import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Select, StatCard, PageWrap, Btn, Input } from '../components/UI'
import { ALL_EXERCISES, T } from '../lib/data'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'

function formatDateFR(d) {
  if (!d) return ''
  if (typeof d === 'string' && d.includes('-')) {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }
  return String(d)
}

function numberOrNull(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function extFromFile(file) {
  const n = (file?.name || '').toLowerCase()
  if (n.endsWith('.png')) return 'png'
  if (n.endsWith('.webp')) return 'webp'
  if (n.endsWith('.jpeg')) return 'jpg'
  if (n.endsWith('.jpg')) return 'jpg'
  return 'jpg'
}

function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        padding: '10px 14px',
        boxShadow: T.shadowCard,
      }}
    >
      <div
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 800,
          fontSize: 11,
          color: T.accent,
          letterSpacing: 1,
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {formatDateFR(label)}
      </div>

      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 900,
            fontSize: 18,
            color: p.color || T.text,
          }}
        >
          {p.value}
          <span style={{ fontSize: 11, fontWeight: 650, color: T.textMid, marginLeft: 6 }}>
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ProgressionPage() {
  const { user, profile } = useAuth()
  const isCoach = profile?.role === 'coach'

  const [tab, setTab] = useState('charges') // charges | mesures | prs | photos
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ---------- Charges ----------
  const [allSessions, setAllSessions] = useState([])
  const [usedExercises, setUsedExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [chargeMetric, setChargeMetric] = useState('weight') // weight | reps

  // ---------- Mesures ----------
  const [metrics, setMetrics] = useState([])
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [weight, setWeight] = useState('')
  const [bodyfat, setBodyfat] = useState('')
  const [waist, setWaist] = useState('')
  const [note, setNote] = useState('')

  // ---------- PR ----------
  const [prs, setPrs] = useState([])
  const [prDate, setPrDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [exercise, setExercise] = useState('')
  const [prType, setPrType] = useState('1RM')
  const [prValue, setPrValue] = useState('')
  const [prUnit, setPrUnit] = useState('kg')
  const [prNote, setPrNote] = useState('')

  // ---------- Photos ----------
  const [photos, setPhotos] = useState([])
  const [photoUrls, setPhotoUrls] = useState({})
  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [photoTag, setPhotoTag] = useState('front')
  const [photoNote, setPhotoNote] = useState('')
  const [uploading, setUploading] = useState(false)

  async function refreshSignedUrls(list) {
    const entries = await Promise.all(
      (list || []).map(async (ph) => {
        const { data, error } = await supabase.storage
          .from('progress-photos')
          .createSignedUrl(ph.storage_path, 60 * 60)

        if (error) {
          console.error('signed url error', ph.storage_path, error)
          return [ph.storage_path, null]
        }
        return [ph.storage_path, data?.signedUrl || null]
      })
    )

    const map = {}
    for (const [path, url] of entries) map[path] = url
    setPhotoUrls(map)
  }

  async function loadAll() {
    if (!user?.id) return
    setLoading(true)

    const { data: sessions, error: sErr } = await supabase
      .from('sessions')
      .select('id, date, seance_type')
      .eq('user_id', user.id)
      .order('date')

    if (sErr) console.error('sessions load error', sErr)

    let merged = []
    if (sessions?.length) {
      const ids = sessions.map((s) => s.id)
      const { data: sets, error: setsErr } = await supabase.from('sets').select('*').in('session_id', ids)
      if (setsErr) console.error('sets load error', setsErr)

      merged = (sessions || []).map((s) => ({
        ...s,
        sets: (sets || []).filter((st) => st.session_id === s.id),
      }))

      const exos = [...new Set((sets || []).map((st) => st.exercise).filter(Boolean))]
      setUsedExercises(exos)
      if (!selectedExercise && exos.length) setSelectedExercise(exos[0])
    } else {
      setUsedExercises([])
      setSelectedExercise('')
    }
    setAllSessions(merged)

    const [
      { data: mData, error: mErr },
      { data: prData, error: prErr },
      { data: phData, error: phErr },
    ] = await Promise.all([
      supabase.from('body_metrics').select('*').order('metric_date', { ascending: true }).limit(240),
      supabase.from('exercise_prs').select('*').order('pr_date', { ascending: false }).limit(80),
      supabase.from('progress_photos').select('*').order('photo_date', { ascending: false }).limit(48),
    ])

    if (mErr) console.error('body_metrics load error', mErr)
    if (prErr) console.error('exercise_prs load error', prErr)
    if (phErr) console.error('progress_photos load error', phErr)

    setMetrics(mData || [])
    setPrs(prData || [])
    setPhotos(phData || [])
    await refreshSignedUrls(phData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [user?.id])

  const chargesChartData = useMemo(() => {
    if (!selectedExercise) return []
    const points = []
    allSessions.forEach((session) => {
      const matching = (session.sets || []).filter(
        (s) => s.exercise === selectedExercise && s[chargeMetric]
      )
      if (!matching.length) return

      const best = matching.reduce((acc, s) => {
        const a = parseFloat(acc?.[chargeMetric]) || 0
        const b = parseFloat(s?.[chargeMetric]) || 0
        return b > a ? s : acc
      }, matching[0])

      const val = parseFloat(best?.[chargeMetric]) || 0
      if (val > 0) points.push({ date: session.date, [chargeMetric]: val })
    })
    return points
  }, [allSessions, selectedExercise, chargeMetric])

  const chargesStats = useMemo(() => {
    if (!chargesChartData.length) return null
    const vals = chargesChartData.map((d) => d[chargeMetric])
    const first = vals[0]
    const last = vals[vals.length - 1]
    const max = Math.max(...vals)
    const progressPct = vals.length > 1 && first ? ((last - first) / first) * 100 : 0
    return { max, last, first, progressPct, sessions: chargesChartData.length }
  }, [chargesChartData, chargeMetric])

  const weightSeries = useMemo(() => {
    return (metrics || [])
      .filter((m) => m.weight_kg !== null && m.weight_kg !== undefined)
      .map((m) => ({ date: m.metric_date, weight: Number(m.weight_kg) }))
  }, [metrics])

  const weightStats = useMemo(() => {
    if (!weightSeries.length) return null
    const first = weightSeries[0].weight
    const last = weightSeries[weightSeries.length - 1].weight
    const min = Math.min(...weightSeries.map((d) => d.weight))
    const max = Math.max(...weightSeries.map((d) => d.weight))
    const delta = last - first
    const deltaPct = first ? (delta / first) * 100 : 0
    return { first, last, min, max, delta, deltaPct }
  }, [weightSeries])

  async function addMetric() {
    if (!user?.id) return
    const w = numberOrNull(weight)
    const bf = numberOrNull(bodyfat)
    const wc = numberOrNull(waist)
    if (w === null && bf === null && wc === null) return

    setSaving(true)
    const { error } = await supabase.from('body_metrics').insert({
      user_id: user.id,
      metric_date: mDate,
      weight_kg: w,
      bodyfat_pct: bf,
      waist_cm: wc,
      note: note || null,
    })

    if (error) {
      console.error('addMetric error', error)
      alert(error.message)
      setSaving(false)
      return
    }

    setWeight('')
    setBodyfat('')
    setWaist('')
    setNote('')
    await loadAll()
    setSaving(false)
  }

  async function addPr() {
    if (!user?.id) return
    if (!exercise.trim() || prValue === '') return

    setSaving(true)
    const { error } = await supabase.from('exercise_prs').insert({
      user_id: user.id,
      exercise_name: exercise.trim(),
      pr_type: prType,
      value: Number(prValue),
      unit: prUnit,
      pr_date: prDate,
      note: prNote || null,
    })

    if (error) {
      console.error('addPr error', error)
      alert(error.message)
      setSaving(false)
      return
    }

    setExercise('')
    setPrValue('')
    setPrNote('')
    await loadAll()
    setSaving(false)
  }

  async function uploadProgressPhoto(file) {
    if (!user?.id) return
    if (!file) return

    setUploading(true)
    try {
      const ext = extFromFile(file)
      const safeTag = String(photoTag || 'front').toLowerCase().trim() || 'front'
      const path = `${user.id}/${photoDate}/${safeTag}-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, {
          upsert: false,
          contentType: file.type || `image/${ext}`,
        })

      if (upErr) {
        console.error('upload error', upErr)
        alert(upErr.message)
        return
      }

      const { error: insErr } = await supabase.from('progress_photos').insert({
        user_id: user.id,
        photo_date: photoDate,
        tag: safeTag,
        storage_path: path,
        note: photoNote || null,
      })

      if (insErr) {
        console.error('insert progress_photos error', insErr)
        alert(insErr.message)
        return
      }

      setPhotoNote('')
      await loadAll()
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 300,
          color: T.textDim,
          fontFamily: T.fontDisplay,
          letterSpacing: 2,
          fontSize: 12,
          textTransform: 'uppercase',
        }}
      >
        Chargement...
      </div>
    )
  }

  return (
    <PageWrap>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 36, letterSpacing: 2, color: T.text, lineHeight: 1 }}>
          PROGRESSION
        </div>
        <div style={{ fontSize: 14, color: T.textMid, marginTop: 6 }}>
          Charges, mesures, PR et photos — {isCoach ? 'mode coach' : 'mode athlète'}
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant={tab === 'charges' ? 'primary' : 'secondary'} onClick={() => setTab('charges')}>Charges</Btn>
          <Btn variant={tab === 'mesures' ? 'primary' : 'secondary'} onClick={() => setTab('mesures')}>Mesures</Btn>
          <Btn variant={tab === 'prs' ? 'primary' : 'secondary'} onClick={() => setTab('prs')}>Records (PR)</Btn>
          <Btn variant={tab === 'photos' ? 'primary' : 'secondary'} onClick={() => setTab('photos')}>Photos</Btn>
        </div>
      </Card>

      {/* CHARGES */}
      {tab === 'charges' ? (
        !allSessions.length ? (
          <Card style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 60, color: T.border, marginBottom: 16 }}>◎</div>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 20, color: T.text, letterSpacing: 1, marginBottom: 8 }}>
              AUCUNE DONNÉE
            </div>
            <div style={{ fontSize: 14, color: T.textMid }}>
              Enregistre ta première séance pour voir ta progression de charge.
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <Select label="Exercice" value={selectedExercise} onChange={setSelectedExercise} options={usedExercises.length ? usedExercises : ALL_EXERCISES} />
                <Select
                  label="Métrique"
                  value={chargeMetric}
                  onChange={setChargeMetric}
                  options={[
                    { value: 'weight', label: 'Charge (kg)' },
                    { value: 'reps', label: 'Répétitions' },
                  ]}
                />
              </div>
            </Card>

            {chargesStats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                <StatCard label="Record" value={`${chargesStats.max}`} sub={chargeMetric === 'weight' ? 'kg' : 'rép.'} accent />
                <StatCard label="Dernière" value={`${chargesStats.last}`} sub={chargeMetric === 'weight' ? 'kg' : 'rép.'} />
                <StatCard label="Départ" value={`${chargesStats.first}`} sub={chargeMetric === 'weight' ? 'kg' : 'rép.'} />
                <StatCard label="Progression" value={`${chargesStats.progressPct >= 0 ? '+' : ''}${chargesStats.progressPct.toFixed(1)}%`} sub="depuis le début" accent={chargesStats.progressPct > 0} />
                <StatCard label="Séances" value={chargesStats.sessions} sub="avec cet exo" />
              </div>
            ) : null}

            <Card glow>
              <Label>{selectedExercise || 'Exercice'} — {chargeMetric === 'weight' ? 'Charge (kg)' : 'Répétitions'}</Label>

              {chargesChartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chargesChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradCharges" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T.accent} stopOpacity={0.16} />
                        <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.fontBody }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.fontBody }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip unit={chargeMetric === 'weight' ? 'kg' : 'rép.'} />} />
                    {chargesStats && <ReferenceLine y={chargesStats.max} stroke={T.accent + '33'} strokeDasharray="4 4" />}
                    <Area type="monotone" dataKey={chargeMetric} stroke={T.accent} strokeWidth={2.5} fill="url(#areaGradCharges)" dot={{ fill: T.accent, r: 4, strokeWidth: 0 }} activeDot={{ r: 7, fill: T.accent, strokeWidth: 2, stroke: T.bg }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 50, color: T.textDim, fontFamily: T.fontDisplay, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
                  {chargesChartData.length === 1 ? 'Continue — une séance de plus pour voir la courbe' : 'Pas de données pour cet exercice'}
                </div>
              )}
            </Card>
          </>
        )
      ) : null}

      {/* MESURES */}
      {tab === 'mesures' ? (
        <>
          <Card>
            <Label>Ajouter une mesure</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <Input label="Date" type="date" value={mDate} onChange={setMDate} />
              <Input label="Poids (kg)" type="number" step="0.1" value={weight} onChange={setWeight} />
              <Input label="Bodyfat (%)" type="number" step="0.1" value={bodyfat} onChange={setBodyfat} />
              <Input label="Taille (cm)" type="number" step="0.1" value={waist} onChange={setWaist} />
              <Input label="Note" value={note} onChange={setNote} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Btn onClick={addMetric} disabled={saving}>{saving ? 'Enregistrement…' : 'Ajouter'}</Btn>
            </div>
          </Card>

          {weightStats ? (
            <Card glow>
              <Label>Poids (kg)</Label>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weightSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.accent} stopOpacity={0.16} />
                      <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.fontBody }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.fontBody }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip content={<ChartTooltip unit="kg" />} />
                  <Area type="monotone" dataKey="weight" stroke={T.accent} strokeWidth={2.5} fill="url(#areaGradWeight)" dot={{ fill: T.accent, r: 3, strokeWidth: 0 }} activeDot={{ r: 6, fill: T.accent, strokeWidth: 2, stroke: T.bg }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          ) : null}
        </>
      ) : null}

      {/* PR */}
      {tab === 'prs' ? (
        <Card>
          <Label>Ajouter un record (PR)</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <Input label="Date" type="date" value={prDate} onChange={setPrDate} />
            <Input label="Exercice" value={exercise} onChange={setExercise} />
            <Input label="Type" value={prType} onChange={setPrType} />
            <Input label="Valeur" type="number" step="0.5" value={prValue} onChange={setPrValue} />
            <Input label="Unité" value={prUnit} onChange={setPrUnit} />
            <Input label="Note" value={prNote} onChange={setPrNote} />
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={addPr} disabled={saving}>{saving ? 'Enregistrement…' : 'Ajouter'}</Btn>
          </div>
        </Card>
      ) : null}

      {/* PHOTOS */}
      {tab === 'photos' ? (
        <Card>
          <Label>Photos de progression</Label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 10 }}>
            <Input label="Date" type="date" value={photoDate} onChange={setPhotoDate} />
            <Input label="Tag" value={photoTag} onChange={setPhotoTag} placeholder="front / side / back" />
            <Input label="Note" value={photoNote} onChange={setPhotoNote} placeholder="optionnel" />

            <div style={{ alignSelf: 'end' }}>
              <div style={{ color: T.textDim, fontSize: 12, marginBottom: 6 }}>Fichier</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadProgressPhoto(e.target.files?.[0])}
                disabled={uploading}
                style={{
                  width: '100%',
                  color: T.textMid,
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius,
                  padding: 10,
                }}
              />
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <Btn disabled={uploading}>{uploading ? 'Upload…' : 'Sélectionner une photo'}</Btn>
              </div>
            </div>
          </div>

          <div style={{ height: 16 }} />

          {photos.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {photos.map((ph) => {
                const url = photoUrls[ph.storage_path]
                return (
                  <div key={ph.id} style={{ border: `1px solid ${T.border}`, borderRadius: T.radius, background: T.surface, overflow: 'hidden' }}>
                    <div style={{ aspectRatio: '1 / 1', background: T.card }}>
                      {url ? (
                        <img src={url} alt={ph.tag || 'photo'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, fontSize: 12 }}>
                          (URL…)
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontFamily: T.fontBody, fontWeight: 900, color: T.text }}>
                          {String(ph.tag || 'photo').toUpperCase()}
                        </div>
                        <div style={{ color: T.textSub, fontSize: 12 }}>{formatDateFR(ph.photo_date)}</div>
                      </div>
                      {ph.note ? <div style={{ marginTop: 6, color: T.textMid, fontSize: 12 }}>{ph.note}</div> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ color: T.textMid }}>Aucune photo enregistrée.</div>
          )}
        </Card>
      ) : null}
    </PageWrap>
  )
}