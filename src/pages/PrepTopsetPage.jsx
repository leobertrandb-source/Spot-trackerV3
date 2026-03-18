import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

function calc1RM(weight, reps) {
  const w = parseFloat(weight), r = parseInt(reps)
  if (!w || !r) return null
  return Math.round(w * (1 + r / 30))
}

export default function PrepTopsetPage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ exercise_name: '', weight_kg: '', reps: '', rpe: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [history, setHistory] = useState([])
  const [exercises, setExercises] = useState([])
  const [showExList, setShowExList] = useState(false)

  useEffect(() => {
    loadData()
    supabase.from('exercises').select('name').order('name').then(({ data }) => setExercises((data || []).map(e => e.name)))
  }, [])

  async function loadData() {
    const { data } = await supabase.from('topset_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30)
    setHistory(data || [])
  }

  async function handleSave() {
    if (!form.exercise_name || !form.weight_kg) return
    setSaving(true); setMsg('')
    const est1rm = calc1RM(form.weight_kg, form.reps)
    const { error } = await supabase.from('topset_logs').insert({
      user_id: user.id, date: today,
      exercise_name: form.exercise_name,
      weight_kg: parseFloat(form.weight_kg),
      reps: parseInt(form.reps) || null,
      rpe: parseFloat(form.rpe) || null,
      estimated_1rm: est1rm,
      notes: form.notes || null,
    })
    if (error) setMsg('Erreur : ' + error.message)
    else { setMsg('TOPSET enregistré ✓'); setForm({ exercise_name: '', weight_kg: '', reps: '', rpe: '', notes: '' }); loadData() }
    setSaving(false)
  }

  const est1rm = calc1RM(form.weight_kg, form.reps)

  // Grouper par exercice pour les PRs
  const prs = history.reduce((acc, log) => {
    if (!acc[log.exercise_name] || (log.estimated_1rm || 0) > (acc[log.exercise_name].estimated_1rm || 0)) {
      acc[log.exercise_name] = log
    }
    return acc
  }, {})

  const filteredEx = exercises.filter(e => !form.exercise_name || e.toLowerCase().includes(form.exercise_name.toLowerCase()))

  return (
    <PageWrap>
      <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Prépa physique</div>
          <div style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>TOPSET</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 6 }}>Charges maximales du jour</div>
        </div>

        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            {/* Exercice */}
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Exercice</div>
              <input value={form.exercise_name} onChange={e => { setForm(p => ({ ...p, exercise_name: e.target.value })); setShowExList(true) }}
                onFocus={() => setShowExList(true)}
                placeholder="Squat, Développé couché..."
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', color: T.text, fontSize: 14, outline: 'none' }} />
              {showExList && filteredEx.length > 0 && form.exercise_name && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1a1f2e', border: `1px solid ${T.border}`, borderRadius: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                  {filteredEx.slice(0, 8).map(ex => (
                    <div key={ex} onClick={() => { setForm(p => ({ ...p, exercise_name: ex })); setShowExList(false) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: T.text, borderBottom: `1px solid ${T.border}22` }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {ex}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Charge + reps + RPE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
              {[
                { key: 'weight_kg', label: 'Charge (kg)', placeholder: '100' },
                { key: 'reps',      label: 'Reps',        placeholder: '3' },
                { key: 'rpe',       label: 'RPE',         placeholder: '9' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                  <input type="number" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 16, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                </div>
              ))}
            </div>

            {/* 1RM estimé */}
            {est1rm && (
              <div style={{ background: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: T.textMid }}>1RM estimé (Epley)</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.accentLight, fontFamily: T.fontDisplay }}>{est1rm} kg</div>
              </div>
            )}

            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Conditions, ressenti..." rows={2}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
        </Card>

        {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.includes('Erreur') ? '#ff7b7b' : T.accentLight }}>{msg}</div>}
        <Btn onClick={handleSave} disabled={saving || !form.exercise_name || !form.weight_kg}>{saving ? 'Enregistrement...' : 'Enregistrer le TOPSET'}</Btn>

        {/* PRs par exercice */}
        {Object.keys(prs).length > 0 && (
          <Card>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 12 }}>Meilleurs records</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.values(prs).sort((a, b) => (b.estimated_1rm || 0) - (a.estimated_1rm || 0)).map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{log.exercise_name}</div>
                    <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                      {new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {log.reps ? ` · ${log.weight_kg}kg × ${log.reps}` : ` · ${log.weight_kg}kg`}
                      {log.rpe ? ` @RPE${log.rpe}` : ''}
                    </div>
                  </div>
                  {log.estimated_1rm && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: T.accentLight, fontFamily: T.fontDisplay }}>{log.estimated_1rm} kg</div>
                      <div style={{ fontSize: 10, color: T.textDim }}>1RM estimé</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Historique récent */}
        {history.length > 0 && (
          <Card>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 12 }}>Historique récent</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {history.slice(0, 10).map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${T.border}22` }}>
                  <div style={{ fontSize: 12, color: T.textMid }}>
                    {new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {log.exercise_name}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.accentLight }}>
                    {log.weight_kg}kg {log.reps ? `×${log.reps}` : ''} {log.estimated_1rm ? `(~${log.estimated_1rm})` : ''}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageWrap>
  )
}
