import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Input } from '../components/UI'
import { T } from '../lib/data'

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
    { key: 'prehension_kg', label: 'Force de préhension', unit: 'kg', desc: 'Valeur nominale en kg', color: '#4d9fff' },
    { key: 'submax_kg',     label: 'Submax',              unit: 'kg', desc: 'FC 3\' FC 1\' après récup',  color: '#9d7dea' },
    { key: 'cmj_cm',        label: 'CMJ',                 unit: 'cm', desc: 'Counter Movement Jump',      color: '#3ecf8e' },
  ]

  return (
    <PageWrap>
      <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Prépa physique</div>
          <div style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>Charge interne</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 6 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>

        <Card>
          <div style={{ display: 'grid', gap: 14 }}>
            {METRICS.map(({ key, label, unit, desc, color }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{label}</div>
                    <div style={{ fontSize: 11, color: T.textDim }}>{desc}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color, padding: '3px 10px', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, alignSelf: 'flex-start' }}>{unit}</div>
                </div>
                <input type="number" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={`Valeur en ${unit}`}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', color: T.text, fontSize: 16, fontWeight: 700, outline: 'none' }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>Notes</div>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Conditions de test, observations..." rows={2}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        </Card>

        {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.includes('Erreur') ? '#ff7b7b' : T.accentLight }}>{msg}</div>}
        <Btn onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>

        {history.length > 0 && (
          <Card>
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
                      <td style={{ padding: '8px 10px', color: T.textMid, borderBottom: `1px solid ${T.border}22` }}>
                        {new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#4d9fff', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.prehension_kg ? `${log.prehension_kg} kg` : '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#9d7dea', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.submax_kg ? `${log.submax_kg} kg` : '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#3ecf8e', fontWeight: 700, borderBottom: `1px solid ${T.border}22` }}>{log.cmj_cm ? `${log.cmj_cm} cm` : '—'}</td>
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
