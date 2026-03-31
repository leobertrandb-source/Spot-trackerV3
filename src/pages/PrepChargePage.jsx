import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { LIGHT as T } from '../lib/data'

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: '20px 22px', boxShadow: T.shadowSm }

export default function PrepChargePage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({ prehension_kg: '', submax_kg: '', cmj_cm: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [history, setHistory] = useState([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('charge_logs')
      .select('*').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(10)
    setHistory(data || [])
    const todayLog = (data || []).find(d => d.date === today)
    if (todayLog) setForm({ prehension_kg: todayLog.prehension_kg || '', submax_kg: todayLog.submax_kg || '', cmj_cm: todayLog.cmj_cm || '', notes: todayLog.notes || '' })
  }

  async function handleSave() {
    setSaving(true); setMsg('')
    const payload = { user_id: user.id, date: today, prehension_kg: form.prehension_kg || null, submax_kg: form.submax_kg || null, cmj_cm: form.cmj_cm || null, notes: form.notes || null }
    const { error } = await supabase.from('charge_logs').upsert(payload, { onConflict: 'user_id,date' })
    if (error) setMsg('Erreur : ' + error.message)
    else { setMsg('Enregistré ✓'); loadData() }
    setSaving(false)
  }

  const METRICS = [
    { key: 'prehension_kg', label: 'Force de préhension', unit: 'kg', desc: 'Valeur nominale en kg',       color: T.blue },
    { key: 'submax_kg',     label: 'Submax',              unit: 'kg', desc: "FC 3' FC 1' après récup",     color: T.purple },
    { key: 'cmj_cm',        label: 'CMJ',                 unit: 'cm', desc: 'Counter Movement Jump',       color: T.accent },
  ]

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.fontBody, padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,28px) 48px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');`}</style>
      <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: T.textMid, marginBottom: 8 }}>Prépa physique</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(24px,5vw,32px)', fontWeight: 400, color: T.text }}>Charge interne</div>
          <div style={{ color: T.textMid, fontSize: 13, marginTop: 6 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>

        <div style={card}>
          <div style={{ display: 'grid', gap: 16 }}>
            {METRICS.map(({ key, label, unit, desc, color }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{label}</div>
                    <div style={{ fontSize: 11, color: T.textDim }}>{desc}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color, padding: '3px 10px', background: `${color}12`, border: `1px solid ${color}28`, borderRadius: 20, alignSelf: 'flex-start' }}>{unit}</div>
                </div>
                <input type="number" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={`Valeur en ${unit}`}
                  style={{ width: '100%', boxSizing: 'border-box', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', color: T.text, fontSize: 16, fontWeight: 700, outline: 'none' }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>Notes</div>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Conditions de test, observations..." rows={2}
                style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: T.fontBody }} />
            </div>
          </div>
        </div>

        {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.includes('Erreur') ? T.danger : T.accent }}>{msg}</div>}

        <button onClick={handleSave} disabled={saving}
          style={{ height: 46, borderRadius: T.radius, background: T.accent, color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: T.fontBody }}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>

        {history.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 12 }}>Historique</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Date', 'Préhension', 'Submax', 'CMJ'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.textDim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '8px 10px', color: T.textMid, borderBottom: `1px solid ${T.border}` }}>
                        {new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ padding: '8px 10px', color: T.blue,   fontWeight: 700, borderBottom: `1px solid ${T.border}` }}>{log.prehension_kg ? `${log.prehension_kg} kg` : '—'}</td>
                      <td style={{ padding: '8px 10px', color: T.purple, fontWeight: 700, borderBottom: `1px solid ${T.border}` }}>{log.submax_kg ? `${log.submax_kg} kg` : '—'}</td>
                      <td style={{ padding: '8px 10px', color: T.accent, fontWeight: 700, borderBottom: `1px solid ${T.border}` }}>{log.cmj_cm ? `${log.cmj_cm} cm` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
