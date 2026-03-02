import { useState } from 'react'
import { useDirty } from '../components/DirtyContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, PageHeader, Input, Select, Btn, Badge, PageWrap } from '../components/UI'
import { SEANCES, SEANCE_ICONS, T } from '../lib/data'

export default function SaisiePage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const seanceKeys = Object.keys(SEANCES)

  const [date, setDate] = useState(today)
  const [seance, setSeance] = useState(seanceKeys[0])
  const [notes, setNotes] = useState('')
  const [sets, setSets] = useState([{ exercise: SEANCES[seanceKeys[0]][0], reps: '', weight: '', rpe: '' }])
  const [status, setStatus] = useState(null)
  const { markDirty, markClean } = useDirty()

  const exos = SEANCES[seance] || []

  const addSet = () => setSets(p => [...p, { exercise: exos[0], reps: '', weight: '', rpe: '' }])
  const removeSet = i => setSets(p => p.filter((_, idx) => idx !== i))
  const updateSet = (i, f, v) => setSets(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s))

  async function handleSave() {
    const valid = sets.filter(s => s.reps || s.weight)
    if (!valid.length) { alert('Ajoute au moins une série.'); return }
    setStatus('saving')

    const { data: session, error: e1 } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, date, seance_type: seance, notes })
      .select().single()

    if (e1) { setStatus('error'); return }

    const { error: e2 } = await supabase.from('sets').insert(
      valid.map((s, i) => ({
        session_id: session.id, exercise: s.exercise,
        reps: s.reps ? parseInt(s.reps) : null,
        weight: s.weight ? parseFloat(s.weight) : null,
        rpe: s.rpe ? parseFloat(s.rpe) : null,
        set_order: i,
      }))
    )
    if (e2) { setStatus('error'); return }

    setStatus('saved')
    markClean()
    setSets([{ exercise: exos[0], reps: '', weight: '', rpe: '' }])
    setNotes('')
    setTimeout(() => setStatus(null), 3500)
  }

  return (
    <PageWrap>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 36, letterSpacing: 2, color: T.text, lineHeight: 1 }}>
          NOUVELLE SÉANCE
        </div>
        <div style={{ fontFamily: T.fontBody, fontSize: 14, color: T.textMid, marginTop: 6 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Séance type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {seanceKeys.map(key => (
          <button key={key} onClick={() => { setSeance(key); setSets([{ exercise: SEANCES[key][0], reps: '', weight: '', rpe: '' }]) }}
            style={{
              background: seance === key ? T.accentGlow : T.card,
              border: `1px solid ${seance === key ? T.accent + '55' : T.border}`,
              borderRadius: T.radiusLg, padding: '14px 16px', cursor: 'pointer',
              textAlign: 'left', transition: 'all .2s',
            }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{SEANCE_ICONS[key] || '💪'}</div>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 12, color: seance === key ? T.accent : T.text, letterSpacing: 0.5 }}>{key}</div>
          </button>
        ))}
      </div>

      {/* Date + Notes */}
      <Card>
        <Label>Détails</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <Input label="Date" value={date} onChange={setDate} type="date" />
          <Input label="Notes" value={notes} onChange={setNotes} placeholder="Ressenti, douleurs, contexte..." />
        </div>
      </Card>

      {/* Sets */}
      <Card>
        <Label>Séries effectuées</Label>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 0.8fr 1fr 0.8fr 32px', gap: 8, marginBottom: 10, padding: '0 2px' }}>
          {['Exercice', 'Rép.', 'Charge kg', 'RPE'].map(h => (
            <div key={h} style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase' }}>{h}</div>
          ))}
          <div />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sets.map((s, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2.2fr 0.8fr 1fr 0.8fr 32px',
              gap: 8, alignItems: 'end',
              padding: '10px 12px',
              background: T.surface,
              borderRadius: T.radiusSm,
              border: `1px solid ${T.border}`,
              transition: 'border-color .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHi}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
            >
              <Select label="" value={s.exercise} onChange={v => updateSet(i, 'exercise', v)} options={exos} />
              <Input label="" value={s.reps} onChange={v => updateSet(i, 'reps', v)} type="number" placeholder="10" min="0" />
              <Input label="" value={s.weight} onChange={v => updateSet(i, 'weight', v)} type="number" placeholder="60" min="0" step="0.5" />
              <Input label="" value={s.rpe} onChange={v => updateSet(i, 'rpe', v)} type="number" placeholder="8" min="1" step="0.5" />
              <button onClick={() => removeSet(i)} style={{
                background: 'transparent', border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                color: T.textDim, cursor: 'pointer', width: 32, height: 38, fontSize: 16,
                transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.danger; e.currentTarget.style.color = T.danger }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim }}
              >×</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={addSet} style={{
            background: 'transparent', border: `1px dashed ${T.accent}44`,
            borderRadius: T.radiusSm, color: T.accent, padding: '9px 18px',
            fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 12, letterSpacing: 1,
            textTransform: 'uppercase', cursor: 'pointer', transition: 'all .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.accent + '44'}
          >
            + Ajouter
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            {status === 'saved' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: T.accent, fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
                <span style={{ fontSize: 16 }}>✓</span> Séance enregistrée
              </div>
            )}
            {status === 'error' && (
              <div style={{ color: T.danger, fontFamily: T.fontDisplay, fontSize: 12 }}>Erreur — vérifie ta connexion</div>
            )}
            <Btn
              onClick={handleSave}
              disabled={status === 'saving'}
              size="md"
              style={status === 'saved' ? { background: T.accentGlow, color: T.accent, border: `1px solid ${T.accent}44` } : {}}
            >
              {status === 'saving' ? 'Enregistrement...' : 'Enregistrer'}
            </Btn>
          </div>
        </div>
      </Card>
    </PageWrap>
  )
}
