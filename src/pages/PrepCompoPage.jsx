import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

export default function PrepCompoPage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ weight_kg: '', body_fat_pct: '', muscle_mass_kg: '', water_pct: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [history, setHistory] = useState([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('body_composition_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(10)
    setHistory(data || [])
  }

  async function handleSave() {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('body_composition_logs').insert({
      user_id: user.id, date: today,
      weight_kg: form.weight_kg || null, body_fat_pct: form.body_fat_pct || null,
      muscle_mass_kg: form.muscle_mass_kg || null, water_pct: form.water_pct || null,
      notes: form.notes || null,
    })
    if (error) setMsg('Erreur : ' + error.message)
    else { setMsg('Enregistré ✓'); setForm({ weight_kg: '', body_fat_pct: '', muscle_mass_kg: '', water_pct: '', notes: '' }); loadData() }
    setSaving(false)
  }

  const METRICS = [
    { key: 'weight_kg',      label: 'Poids',          unit: 'kg',  color: '#3ecf8e' },
    { key: 'body_fat_pct',   label: 'Masse grasse',   unit: '%',   color: '#ff7043' },
    { key: 'muscle_mass_kg', label: 'Masse musculaire', unit: 'kg', color: '#4d9fff' },
    { key: 'water_pct',      label: 'Eau',            unit: '%',   color: '#26d4e8' },
  ]

  // Variation vs mesure précédente
  const prev = history[0]
  const getVar = (key) => {
    if (!prev || !form[key] || !prev[key]) return null
    const diff = parseFloat(form[key]) - parseFloat(prev[key])
    return { diff: diff.toFixed(1), positive: diff > 0 }
  }

  return (
    <PageWrap>
      <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Prépa physique</div>
          <div style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>Composition corporelle</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 6 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>

        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {METRICS.map(({ key, label, unit, color }) => {
              const variation = getVar(key)
              return (
                <div key={key}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="—"
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`, borderRadius: 10, padding: '10px 12px', color, fontSize: 20, fontWeight: 900, outline: 'none', textAlign: 'center', fontFamily: T.fontDisplay }} />
                    <div style={{ textAlign: 'center', fontSize: 10, color: T.textDim, marginTop: 4 }}>{unit}</div>
                  </div>
                  {variation && (
                    <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: variation.positive ? '#ff7043' : '#3ecf8e', marginTop: 2 }}>
                      {variation.positive ? '+' : ''}{variation.diff} {unit}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 14 }}>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Conditions de mesure, notes..." rows={2}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
        </Card>

        {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.includes('Erreur') ? '#ff7b7b' : T.accentLight }}>{msg}</div>}
        <Btn onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer la mesure'}</Btn>

        {history.length > 0 && (
          <Card>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 12 }}>Historique</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>{['Date','Poids','Masse grasse','Masse musc.','Eau'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.textDim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {history.map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '8px 10px', color: T.textMid, borderBottom: `1px solid ${T.border}22`, whiteSpace: 'nowrap' }}>{new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                      <td style={{ padding: '8px 10px', color: '#3ecf8e', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.weight_kg ? `${log.weight_kg} kg` : '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#ff7043', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.body_fat_pct ? `${log.body_fat_pct}%` : '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#4d9fff', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.muscle_mass_kg ? `${log.muscle_mass_kg} kg` : '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#26d4e8', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.water_pct ? `${log.water_pct}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </PageWrap>
  )
}
