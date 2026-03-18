import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

const FIELDS = [
  { key: 'fatigue',     label: 'Fatigue',      desc: '1 = pas fatigué · 10 = épuisé',       color: '#ff7043' },
  { key: 'sommeil',     label: 'Sommeil',       desc: '1 = très bien dormi · 10 = très mal',  color: '#9d7dea' },
  { key: 'stress',      label: 'Stress',        desc: '1 = pas stressé · 10 = très stressé',  color: '#4d9fff' },
  { key: 'courbatures', label: 'Courbatures',   desc: '1 = aucune · 10 = très importantes',   color: '#ff4566' },
]

function ScoreGauge({ value, color }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 6, borderRadius: 3,
          background: i < value ? color : 'rgba(255,255,255,0.08)',
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  )
}

function HooperScore({ values }) {
  const total = (values.fatigue || 0) + (values.sommeil || 0) + (values.stress || 0) + (values.courbatures || 0)
  const label = total <= 7 ? { text: 'Très bon', color: '#3ecf8e' }
               : total <= 13 ? { text: 'Correct', color: '#fbbf24' }
               : total <= 20 ? { text: 'Vigilance', color: '#ff7043' }
               : { text: 'Fatigue importante', color: '#ff4566' }
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Score HOOPER</div>
      <div style={{ fontSize: 48, fontWeight: 900, color: label.color, fontFamily: T.fontDisplay, lineHeight: 1 }}>{total}</div>
      <div style={{ fontSize: 12, color: label.color, marginTop: 6, fontWeight: 700 }}>/40 — {label.text}</div>
    </div>
  )
}

export default function PrepHooperPage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const [values, setValues] = useState({ fatigue: 5, sommeil: 5, stress: 5, courbatures: 5 })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [history, setHistory] = useState([])
  const [existingId, setExistingId] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('hooper_logs')
      .select('*').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(14)
    if (data?.length) {
      setHistory(data)
      // Pré-remplir si déjà rempli aujourd'hui
      const todayLog = data.find(d => d.date === today)
      if (todayLog) {
        setValues({ fatigue: todayLog.fatigue, sommeil: todayLog.sommeil, stress: todayLog.stress, courbatures: todayLog.courbatures })
        setNotes(todayLog.notes || '')
        setExistingId(todayLog.id)
        setSaved(true)
      }
    }
  }

  async function handleSave() {
    setSaving(true)
    const payload = { user_id: user.id, date: today, ...values, notes }
    const { error } = existingId
      ? await supabase.from('hooper_logs').update(payload).eq('id', existingId)
      : await supabase.from('hooper_logs').upsert(payload, { onConflict: 'user_id,date' })
    if (!error) { setSaved(true); loadData() }
    setSaving(false)
  }

  const total = Object.values(values).reduce((s, v) => s + (v || 0), 0)

  return (
    <PageWrap>
      <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Prépa physique
          </div>
          <div style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>
            Questionnaire HOOPER
          </div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 6 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* Score */}
        <Card glow>
          <HooperScore values={values} />
          <div style={{ fontSize: 11, color: T.textDim, textAlign: 'center', marginTop: 4 }}>
            0–7 très bon · 8–13 correct · 14–20 vigilance · 21–40 fatigue importante
          </div>
        </Card>

        {/* Sliders */}
        {FIELDS.map(({ key, label, desc, color }) => (
          <Card key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{label}</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{desc}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: T.fontDisplay, minWidth: 32, textAlign: 'right' }}>
                {values[key]}
              </div>
            </div>
            <input type="range" min={1} max={10} value={values[key]}
              onChange={e => setValues(p => ({ ...p, [key]: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: color, cursor: 'pointer', height: 6 }} />
            <ScoreGauge value={values[key]} color={color} />
          </Card>
        ))}

        {/* Notes */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>Notes (optionnel)</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Douleurs spécifiques, commentaires..."
            rows={3}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
        </Card>

        <Btn onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : saved ? '✓ Mettre à jour' : 'Enregistrer'}
        </Btn>

        {/* Historique 14 jours */}
        {history.length > 0 && (
          <Card>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 12 }}>Historique (14 derniers jours)</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {history.map(log => {
                const s = log.fatigue + log.sommeil + log.stress + log.courbatures
                const c = s <= 7 ? '#3ecf8e' : s <= 13 ? '#fbbf24' : s <= 20 ? '#ff7043' : '#ff4566'
                return (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.textMid }}>
                      {new Date(log.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: T.textDim }}>
                        F{log.fatigue} S{log.sommeil} St{log.stress} C{log.courbatures}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: c, fontFamily: T.fontDisplay }}>{s}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </PageWrap>
  )
}
