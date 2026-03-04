import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Btn, Card, Input, Label, PageWrap, StatCard } from '../components/UI'
import { T } from '../lib/data'
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
  // d is YYYY-MM-DD
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function numberOrNull(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: T.radiusSm,
      padding: '10px 14px',
      boxShadow: T.shadowCard,
    }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 11, color: T.accent, letterSpacing: 1, marginBottom: 6 }}>
        {formatDateFR(label)}
      </div>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 18, color: T.text }}>
        {p?.value} <span style={{ fontSize: 11, fontWeight: 650, color: T.textMid }}>{p?.name}</span>
      </div>
    </div>
  )
}

export default function ProgressionPage() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('mesures') // mesures | prs | photos

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [metrics, setMetrics] = useState([])
  const [prs, setPrs] = useState([])
  const [photos, setPhotos] = useState([])

  // forms
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [weight, setWeight] = useState('')
  const [bodyfat, setBodyfat] = useState('')
  const [waist, setWaist] = useState('')
  const [note, setNote] = useState('')

  const [prDate, setPrDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [exercise, setExercise] = useState('')
  const [prType, setPrType] = useState('1RM')
  const [prValue, setPrValue] = useState('')
  const [prUnit, setPrUnit] = useState('kg')
  const [prNote, setPrNote] = useState('')

  const isCoach = profile?.role === 'coach'

  async function loadAll() {
    if (!user?.id) return
    setLoading(true)

    const [
      { data: mData, error: mErr },
      { data: pData, error: pErr },
      { data: phData, error: phErr },
    ] = await Promise.all([
      supabase.from('body_metrics').select('*').order('metric_date', { ascending: true }).limit(200),
      supabase.from('exercise_prs').select('*').order('pr_date', { ascending: false }).limit(50),
      supabase.from('progress_photos').select('*').order('photo_date', { ascending: false }).limit(24),
    ])

    if (mErr) console.error('body_metrics load error', mErr)
    if (pErr) console.error('exercise_prs load error', pErr)
    if (phErr) console.error('progress_photos load error', phErr)

    setMetrics(mData || [])
    setPrs(pData || [])
    setPhotos(phData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [user?.id])

  const weightSeries = useMemo(() => {
    return (metrics || [])
      .filter(m => m.weight_kg !== null && m.weight_kg !== undefined)
      .map(m => ({ date: m.metric_date, weight: Number(m.weight_kg) }))
  }, [metrics])

  const stats = useMemo(() => {
    if (!weightSeries.length) return null
    const first = weightSeries[0].weight
    const last = weightSeries[weightSeries.length - 1].weight
    const min = Math.min(...weightSeries.map(d => d.weight))
    const max = Math.max(...weightSeries.map(d => d.weight))
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: T.textDim, fontFamily: T.fontDisplay, letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' }}>
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
          Mesures, records et photos — {isCoach ? 'mode coach' : 'mode athlète'}
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant={tab === 'mesures' ? 'primary' : 'secondary'} onClick={() => setTab('mesures')}>Mesures</Btn>
          <Btn variant={tab === 'prs' ? 'primary' : 'secondary'} onClick={() => setTab('prs')}>Records (PR)</Btn>
          <Btn variant={tab === 'photos' ? 'primary' : 'secondary'} onClick={() => setTab('photos')}>Photos</Btn>
        </div>
      </Card>

      {tab === 'mesures' ? (
        <>
          {/* Stats */}
          {stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <StatCard label="Actuel" value={stats.last.toFixed(1)} sub="kg" accent />
              <StatCard label="Départ" value={stats.first.toFixed(1)} sub="kg" />
              <StatCard label="Min" value={stats.min.toFixed(1)} sub="kg" />
              <StatCard label="Max" value={stats.max.toFixed(1)} sub="kg" />
              <StatCard
                label="Évolution"
                value={`${stats.delta >= 0 ? '+' : ''}${stats.delta.toFixed(1)}`}
                sub={`kg (${stats.deltaPct >= 0 ? '+' : ''}${stats.deltaPct.toFixed(1)}%)`}
                accent={stats.delta < 0}
              />
            </div>
          ) : (
            <Card>
              <div style={{ color: T.textMid }}>Ajoute ta première mesure (poids/bodyfat/taille) pour voir tes courbes.</div>
            </Card>
          )}

          {/* Chart */}
          <Card glow>
            <Label>Poids (kg)</Label>
            {weightSeries.length >= 2 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weightSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.accent} stopOpacity={0.16} />
                      <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.fontBody }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.fontBody }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip content={<CustomTooltip />} />
                  {stats && <ReferenceLine y={stats.first} stroke={T.border} strokeDasharray="4 4" />}
                  <Area type="monotone" dataKey="weight" name="kg" stroke={T.accent} strokeWidth={2.5} fill="url(#wGrad)" dot={{ fill: T.accent, r: 3, strokeWidth: 0 }} activeDot={{ r: 6, fill: T.accent, strokeWidth: 2, stroke: T.bg }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 50, color: T.textDim, fontFamily: T.fontDisplay, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
                {weightSeries.length === 1 ? 'Ajoute une 2e mesure pour voir la courbe' : 'Pas encore de données'}
              </div>
            )}
          </Card>

          {/* Add metric */}
          <Card>
            <Label>Ajouter une mesure</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <Input label="Date" type="date" value={mDate} onChange={setMDate} />
              <Input label="Poids (kg)" type="number" step="0.1" value={weight} onChange={setWeight} placeholder="ex: 78.4" />
              <Input label="Bodyfat (%)" type="number" step="0.1" value={bodyfat} onChange={setBodyfat} placeholder="ex: 14.5" />
              <Input label="Taille (cm)" type="number" step="0.1" value={waist} onChange={setWaist} placeholder="tour de taille" />
              <Input label="Note" value={note} onChange={setNote} placeholder="optionnel" />
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Btn onClick={addMetric} disabled={saving}>{saving ? 'Enregistrement…' : 'Ajouter'}</Btn>
            </div>
          </Card>

          {/* History */}
          <Card>
            <Label>Historique</Label>
            {metrics.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {[...metrics].slice().reverse().slice(0, 20).map(m => (
                  <div key={m.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius,
                    background: T.surface,
                  }}>
                    <div style={{ color: T.textMid, fontSize: 13 }}>{formatDateFR(m.metric_date)}</div>
                    <div style={{ display: 'flex', gap: 12, color: T.text, fontFamily: T.fontBody, fontWeight: 700 }}>
                      {m.weight_kg != null ? <span>{Number(m.weight_kg).toFixed(1)} kg</span> : null}
                      {m.bodyfat_pct != null ? <span>{Number(m.bodyfat_pct).toFixed(1)}%</span> : null}
                      {m.waist_cm != null ? <span>{Number(m.waist_cm).toFixed(1)} cm</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: T.textMid }}>Aucune mesure enregistrée.</div>
            )}
          </Card>
        </>
      ) : null}

      {tab === 'prs' ? (
        <>
          <Card>
            <Label>Ajouter un record (PR)</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <Input label="Date" type="date" value={prDate} onChange={setPrDate} />
              <Input label="Exercice" value={exercise} onChange={setExercise} placeholder="ex: Squat" />
              <Input label="Type" value={prType} onChange={setPrType} placeholder="1RM / 5RM / reps" />
              <Input label="Valeur" type="number" step="0.5" value={prValue} onChange={setPrValue} placeholder="ex: 120" />
              <Input label="Unité" value={prUnit} onChange={setPrUnit} placeholder="kg / reps / sec" />
              <Input label="Note" value={prNote} onChange={setPrNote} placeholder="optionnel" />
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Btn onClick={addPr} disabled={saving}>{saving ? 'Enregistrement…' : 'Ajouter'}</Btn>
            </div>
          </Card>

          <Card>
            <Label>Derniers PR</Label>
            {prs.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {prs.map(pr => (
                  <div key={pr.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius,
                    background: T.surface,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: T.fontBody, fontWeight: 800, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pr.exercise_name}
                      </div>
                      <div style={{ color: T.textSub, fontSize: 12, marginTop: 2 }}>
                        {formatDateFR(pr.pr_date)} · {pr.pr_type}
                        {pr.note ? ` · ${pr.note}` : ''}
                      </div>
                    </div>
                    <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, color: T.accent, fontSize: 18 }}>
                      {pr.value} <span style={{ fontSize: 11, fontWeight: 650, color: T.textMid }}>{pr.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: T.textMid }}>Aucun PR enregistré.</div>
            )}
          </Card>
        </>
      ) : null}

      {tab === 'photos' ? (
        <Card>
          <Label>Photos de progression</Label>
          <div style={{ color: T.textMid, marginBottom: 10 }}>
            Les photos sont stockées dans Supabase Storage (bucket <span style={{ color: T.text }}>progress-photos</span>).
            Cette page affiche les entrées enregistrées dans <span style={{ color: T.text }}>progress_photos</span>.
          </div>

          {photos.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {photos.map(ph => (
                <div key={ph.id} style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius,
                  background: T.surface,
                  padding: 10,
                }}>
                  <div style={{ fontFamily: T.fontBody, fontWeight: 800, color: T.text, marginBottom: 6 }}>
                    {ph.tag || 'photo'}
                  </div>
                  <div style={{ fontSize: 12, color: T.textSub }}>{formatDateFR(ph.photo_date)}</div>
                  <div style={{ fontSize: 12, color: T.textDim, marginTop: 6, wordBreak: 'break-all' }}>
                    {ph.storage_path}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: T.textMid }}>Aucune photo enregistrée.</div>
          )}

          <div style={{ marginTop: 12, color: T.textDim, fontSize: 12 }}>
            (Option) Je peux te fournir le composant d’upload (file picker + upload Supabase + signed URLs) quand tu veux.
          </div>
        </Card>
      ) : null}
    </PageWrap>
  )
}