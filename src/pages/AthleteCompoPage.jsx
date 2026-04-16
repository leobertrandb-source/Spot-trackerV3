import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { LIGHT as T } from '../lib/data'

const EMPTY = { date: '', weight_kg: '', body_fat_pct: '', muscle_mass_kg: '', notes: '' }

function Sparkline({ data, color, height = 36 }) {
  if (data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const w = 100 / (data.length - 1)
  const pts = data.map((v, i) => `${i * w},${height - ((v - min) / range) * height}`).join(' ')
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => i === data.length - 1 && (
        <circle key={i} cx={i * w} cy={height - ((v - min) / range) * height} r="3" fill={color} />
      ))}
    </svg>
  )
}

export default function AthleteCompoPage() {
  const { user, club } = useAuth()
  const accent = club?.color || T.accent

  const [logs, setLogs]     = useState([])
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading]   = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('body_composition_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(20)
    setLogs(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.weight_kg && !form.body_fat_pct && !form.muscle_mass_kg) {
      setMsg('Renseignez au moins une valeur.')
      return
    }
    setSaving(true)
    setMsg('')
    const { error } = await supabase.from('body_composition_logs').upsert({
      user_id:         user.id,
      date:            form.date || today,
      weight_kg:       form.weight_kg       ? parseFloat(form.weight_kg)       : null,
      body_fat_pct:    form.body_fat_pct    ? parseFloat(form.body_fat_pct)    : null,
      muscle_mass_kg:  form.muscle_mass_kg  ? parseFloat(form.muscle_mass_kg)  : null,
      notes:           form.notes || null,
    }, { onConflict: 'user_id,date' })
    setSaving(false)
    if (!error) {
      setMsg('✓ Mesure enregistrée')
      setForm(EMPTY)
      setShowForm(false)
      load()
      setTimeout(() => setMsg(''), 3000)
    } else {
      setMsg('Erreur : ' + error.message)
    }
  }

  const latest = logs[0]
  const weights       = logs.filter(l => l.weight_kg).reverse().map(l => parseFloat(l.weight_kg))
  const fats          = logs.filter(l => l.body_fat_pct).reverse().map(l => parseFloat(l.body_fat_pct))
  const muscles       = logs.filter(l => l.muscle_mass_kg).reverse().map(l => parseFloat(l.muscle_mass_kg))

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const inp = {
    padding: '10px 14px', borderRadius: T.radius,
    border: `1px solid ${T.border}`, background: T.bg,
    color: T.text, fontSize: 14, outline: 'none',
    fontFamily: T.fontBody, width: '100%', boxSizing: 'border-box',
  }
  const lbl = { fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.fontBody, padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,28px)' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');`}</style>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accent, marginBottom: 8 }}>
            Composition corporelle
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(26px,4vw,34px)', fontWeight: 400, color: T.text, margin: '0 0 4px', lineHeight: 1.2 }}>
            Mes mesures
          </h1>
          <div style={{ fontSize: 13, color: T.textMid, textTransform: 'capitalize' }}>{dateLabel}</div>
        </div>

        {/* Cartes dernière mesure */}
        {latest && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Poids',        value: latest.weight_kg,      unit: 'kg',  data: weights,  color: T.blue },
              { label: 'Masse grasse', value: latest.body_fat_pct,   unit: '%',   data: fats,     color: T.warn },
              { label: 'Masse maigre', value: latest.muscle_mass_kg, unit: 'kg',  data: muscles,  color: T.success },
            ].map(({ label, value, unit, data, color }) => (
              <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: '18px 20px', boxShadow: T.shadowSm }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>{label}</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400, color: value != null ? color : T.textSub, lineHeight: 1 }}>
                  {value ?? '—'}
                  {value != null && <span style={{ fontSize: 13, color: T.textMid, fontWeight: 400, fontFamily: T.fontBody }}> {unit}</span>}
                </div>
                {data.length >= 2 && (
                  <div style={{ marginTop: 12 }}>
                    <Sparkline data={data} color={color} height={36} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!latest && !loading && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: '32px', textAlign: 'center', marginBottom: 20, boxShadow: T.shadowSm }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>Aucune mesure enregistrée</div>
            <div style={{ fontSize: 13, color: T.textMid }}>Ajoutez votre première pesée ci-dessous.</div>
          </div>
        )}

        {/* Bouton + formulaire */}
        <div style={{ marginBottom: 20 }}>
          {!showForm ? (
            <button onClick={() => { setShowForm(true); setForm({ ...EMPTY, date: today }) }} style={{
              width: '100%', padding: '13px', borderRadius: T.radius,
              border: `1px solid ${accent}40`, background: `${accent}10`,
              color: accent, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: T.fontBody,
            }}>
              + Ajouter une mesure
            </button>
          ) : (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: '22px 24px', boxShadow: T.shadowSm }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 18 }}>Nouvelle mesure</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <span style={lbl}>Date</span>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <span style={lbl}>Poids (kg)</span>
                  <input type="number" step="0.1" placeholder="ex: 85.5" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} style={inp} />
                </div>
                <div>
                  <span style={lbl}>Masse grasse (%)</span>
                  <input type="number" step="0.1" placeholder="ex: 14.2" value={form.body_fat_pct} onChange={e => setForm(f => ({ ...f, body_fat_pct: e.target.value }))} style={inp} />
                </div>
                <div>
                  <span style={lbl}>Masse musculaire (kg)</span>
                  <input type="number" step="0.1" placeholder="ex: 42.0" value={form.muscle_mass_kg} onChange={e => setForm(f => ({ ...f, muscle_mass_kg: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <span style={lbl}>Notes (optionnel)</span>
                <input type="text" placeholder="Conditions, heure, tenue..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inp} />
              </div>
              {msg && <div style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith('✓') ? T.success : T.danger, marginBottom: 12 }}>{msg}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: T.radius, border: `1px solid ${T.border}`, background: 'transparent', color: T.textMid, fontWeight: 600, cursor: 'pointer', fontFamily: T.fontBody }}>Annuler</button>
                <button onClick={save} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: T.radius, border: 'none', background: accent, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: T.fontBody, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Enregistrement...' : '✓ Enregistrer'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Historique */}
        {logs.length > 0 && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, overflow: 'hidden', boxShadow: T.shadowSm }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1 }}>
              Historique
            </div>
            {logs.map((log, i) => (
              <div key={log.id} style={{
                display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr',
                padding: '13px 20px', borderBottom: i < logs.length - 1 ? `1px solid ${T.border}` : 'none',
                alignItems: 'center',
              }}>
                <div style={{ fontSize: 12, color: T.textMid, fontWeight: 600 }}>
                  {new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.blue }}>
                  {log.weight_kg != null ? `${log.weight_kg} kg` : '—'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.warn }}>
                  {log.body_fat_pct != null ? `${log.body_fat_pct} %` : '—'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.success }}>
                  {log.muscle_mass_kg != null ? `${log.muscle_mass_kg} kg` : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
