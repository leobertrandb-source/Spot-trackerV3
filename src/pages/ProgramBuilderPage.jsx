import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap } from '../components/UI'
import { SEANCES, ALL_EXERCISES, SEANCE_ICONS, T } from '../lib/data'

// ─── Tokens ──────────────────────────────────────────────────────────────────

const C = {
  bg:       '#06080a',
  card:     '#0e1318',
  cardHi:   '#141c24',
  border:   'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.13)',
  text:     '#edf2f7',
  textSub:  '#7a8fa6',
  textDim:  '#3d4f61',
  accent:   '#3ecf8e',
  accentLo: 'rgba(62,207,142,0.12)',
  blue:     '#4d9fff',
  orange:   '#ff7043',
  purple:   '#9d7dea',
  yellow:   '#fbbf24',
  danger:   '#f56565',
}

const TYPE_META = {
  'Pectoraux / Triceps': { color: C.blue,    icon: '⚡' },
  'Dos / Biceps':        { color: C.purple,  icon: '🏹' },
  'Jambes':              { color: C.accent,  icon: '🔥' },
  'Épaules':             { color: C.orange,  icon: '⚔️' },
  'Full Body':           { color: '#26d4e8', icon: '💥' },
  'Cardio':              { color: C.yellow,  icon: '🏃' },
}
function tmeta(type) { return TYPE_META[type] || { color: C.accent, icon: '💪' } }

// ─── Dates ───────────────────────────────────────────────────────────────────

function getMonday(offset = 0) {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d) { return d.toISOString().split('T')[0] }
function isToday(iso) { return iso === toISO(new Date()) }
function fmtDay(iso) { return new Date(iso + 'T00:00:00').getDate() }
function fmtWeek(m) {
  const e = addDays(m, 6)
  return `${m.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}
function fmtRest(sec) {
  if (!sec) return null
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.text, fontFamily: 'inherit',
  fontSize: 13, outline: 'none', padding: '0 10px', height: 36,
  width: '100%', boxSizing: 'border-box',
}
const lbl = {
  fontSize: 10, fontWeight: 800, color: C.textSub,
  textTransform: 'uppercase', letterSpacing: 0.7,
  display: 'block', marginBottom: 4,
}
const btn = { border: 'none', fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer', borderRadius: 10 }

// ─── Programme dans une case calendrier ──────────────────────────────────────

function CalProgram({ program, assignment, onRemove }) {
  const [open, setOpen] = useState(false)
  const meta = tmeta(program.seance_type)
  const exos = program.program_exercises || []

  return (
    <div style={{ marginBottom: 4 }}>
      <div onClick={() => setOpen(v => !v)} style={{
        borderRadius: 8, padding: '5px 7px',
        background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta.icon} {program.name}
          </span>
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(assignment.id) }}
            style={{ ...btn, background: 'none', color: meta.color, fontSize: 13, padding: '0 2px', opacity: 0.6, lineHeight: 1 }}>×</button>
        </div>
        {exos.slice(0, 3).map((ex, i) => (
          <div key={i} style={{ fontSize: 9, color: C.textSub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ex.sets_target}× {ex.exercise}{ex.reps_target ? ` · ${ex.reps_target}` : ''}
          </div>
        ))}
        {exos.length > 3 && <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>+{exos.length - 3} ex.</div>}
      </div>

      {open && (
        <div style={{ marginTop: 4, borderRadius: 8, border: `1px solid ${meta.color}25`, background: C.card, padding: 10 }}>
          {assignment.note && (
            <div style={{ fontSize: 11, color: C.textSub, fontStyle: 'italic', marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
              📝 {assignment.note}
            </div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            {exos.map((ex, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{i + 1}. {ex.exercise}</div>
                <div style={{ fontSize: 10, color: C.textSub, marginTop: 2 }}>
                  {[
                    ex.sets_target && `${ex.sets_target} séries`,
                    ex.reps_target && `${ex.reps_target} reps`,
                    ex.rpe_target  && `RPE ${ex.rpe_target}`,
                    ex.tempo       && `Tempo ${ex.tempo}`,
                    ex.rest_seconds && `Repos ${fmtRest(ex.rest_seconds)}`,
                  ].filter(Boolean).join(' · ')}
                </div>
                {ex.notes && <div style={{ fontSize: 10, color: C.textDim, fontStyle: 'italic', marginTop: 1 }}>{ex.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cellule calendrier ───────────────────────────────────────────────────────

function CalCell({ iso, assignments, programs, onDrop, onClick, onRemove }) {
  const [over, setOver] = useState(false)
  const today = isToday(iso)
  const cellA = assignments.filter(a => a.assigned_date === iso)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const pid = e.dataTransfer.getData('pid'); if (pid) onDrop(pid, iso) }}
      onClick={() => onClick(iso)}
      style={{
        minHeight: 96, borderRadius: 10, padding: '6px 6px 4px', cursor: 'pointer',
        border: `1px solid ${over ? C.accent : today ? `${C.accent}50` : C.border}`,
        background: over ? `${C.accent}08` : today ? `${C.accent}04` : C.card,
        transition: 'all 0.12s ease', position: 'relative', overflow: 'hidden',
      }}
    >
      {today && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: C.accent }} />}
      <div style={{ fontSize: 11, fontWeight: today ? 900 : 600, color: today ? C.accent : C.textSub, marginBottom: 5, paddingLeft: 2 }}>
        {fmtDay(iso)}
      </div>
      <div onClick={e => e.stopPropagation()}>
        {cellA.map(a => {
          const prog = programs.find(p => p.id === a.program_id)
          if (!prog) return null
          return <CalProgram key={a.id} program={prog} assignment={a} onRemove={onRemove} />
        })}
      </div>
      {over && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `${C.accent}10`, border: `2px dashed ${C.accent}60`, borderRadius: 10, fontSize: 24, color: C.accent, pointerEvents: 'none' }}>+</div>
      )}
    </div>
  )
}

// ─── Ligne exercice dans le builder ──────────────────────────────────────────

function ExRow({ ex, index, total, onChange, onRemove, onMoveUp, onMoveDown, ytThumb }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.cardHi, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'grid', placeItems: 'center' }}>
          {ytThumb ? <img src={ytThumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>💪</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.exercise}</div>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          <button type="button" onClick={() => onMoveUp(index)} disabled={index === 0}
            style={{ ...btn, background: 'rgba(255,255,255,0.05)', color: index === 0 ? C.textDim : C.textSub, width: 26, height: 26, fontSize: 13, display: 'grid', placeItems: 'center' }}>↑</button>
          <button type="button" onClick={() => onMoveDown(index)} disabled={index === total - 1}
            style={{ ...btn, background: 'rgba(255,255,255,0.05)', color: index === total - 1 ? C.textDim : C.textSub, width: 26, height: 26, fontSize: 13, display: 'grid', placeItems: 'center' }}>↓</button>
        </div>
        <button type="button" onClick={() => setExpanded(v => !v)}
          style={{ ...btn, background: 'none', color: C.textSub, fontSize: 14, width: 28, height: 28, display: 'grid', placeItems: 'center' }}>
          {expanded ? '▲' : '▼'}
        </button>
        <button type="button" onClick={() => onRemove(index)}
          style={{ ...btn, background: 'rgba(255,80,80,0.08)', color: C.danger, width: 28, height: 28, fontSize: 16, display: 'grid', placeItems: 'center' }}>×</button>
      </div>

      {expanded && (
        <div style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { key: 'sets_target', label: 'Séries',     ph: '4' },
              { key: 'reps_target', label: 'Répétitions', ph: '8-10' },
              { key: 'rpe_target',  label: 'RPE cible',   ph: '8' },
            ].map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.label}</label>
                <input value={ex[f.key] ?? ''} onChange={e => onChange(index, f.key, e.target.value)}
                  placeholder={f.ph} style={{ ...inp, textAlign: 'center' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={lbl}>Tempo (ex: 3-1-2-0)</label>
              <input value={ex.tempo ?? ''} onChange={e => onChange(index, 'tempo', e.target.value)}
                placeholder="3-1-2-0" style={inp} />
            </div>
            <div>
              <label style={lbl}>Repos (secondes)</label>
              <input value={ex.rest_seconds ?? ''} onChange={e => onChange(index, 'rest_seconds', e.target.value)}
                type="number" placeholder="90" style={{ ...inp, textAlign: 'center' }} />
            </div>
          </div>
          <div>
            <label style={lbl}>Consignes coach</label>
            <textarea value={ex.notes ?? ''} onChange={e => onChange(index, 'notes', e.target.value)}
              placeholder="Contrôle la descente, coudes serrés..."
              rows={2}
              style={{ ...inp, height: 'auto', padding: '8px 10px', resize: 'none', lineHeight: 1.5 }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal assignation avec preview ──────────────────────────────────────────

function AssignModal({ iso, programs, clients, defaultClientId, onConfirm, onClose }) {
  const [pid, setPid] = useState(null)
  const [cid, setCid] = useState(defaultClientId || clients[0]?.id || '')
  const [note, setNote] = useState('')
  const preview = useMemo(() => programs.find(p => p.id === pid) || null, [pid, programs])
  const dateLabel = new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', borderRadius: 20, overflow: 'hidden', border: `1px solid ${C.borderHi}` }}>

        {/* Gauche */}
        <div style={{ width: 300, flexShrink: 0, background: C.card, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Assigner une séance</div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, textTransform: 'capitalize' }}>{dateLabel}</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'grid', gap: 14 }}>
            {clients.length > 1 && (
              <div>
                <div style={lbl}>Client</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {clients.map(c => (
                    <button key={c.id} type="button" onClick={() => setCid(c.id)} style={{
                      ...btn, padding: '5px 10px', fontSize: 11,
                      border: `1px solid ${cid === c.id ? `${C.accent}60` : C.border}`,
                      background: cid === c.id ? C.accentLo : 'rgba(255,255,255,0.03)',
                      color: cid === c.id ? C.accent : C.textSub,
                    }}>{c.full_name || c.email}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div style={lbl}>Programme</div>
              {programs.length === 0 ? (
                <div style={{ fontSize: 12, color: C.textDim, padding: '10px 0' }}>Aucun programme disponible.</div>
              ) : (
                <div style={{ display: 'grid', gap: 5 }}>
                  {programs.map(p => {
                    const m = tmeta(p.seance_type); const sel = pid === p.id
                    return (
                      <button key={p.id} type="button" onClick={() => setPid(p.id)} style={{
                        ...btn, padding: '10px 12px', textAlign: 'left',
                        border: `1px solid ${sel ? `${m.color}60` : C.border}`,
                        background: sel ? `${m.color}12` : 'rgba(255,255,255,0.03)',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ fontSize: 18 }}>{m.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: sel ? m.color : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: C.textSub }}>{(p.program_exercises || []).length} exercices</div>
                        </div>
                        {sel && <span style={{ color: m.color, fontSize: 14 }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <div style={lbl}>Note (optionnel)</div>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Focus sur la technique..." rows={2}
                style={{ ...inp, height: 'auto', padding: '8px 10px', resize: 'none', lineHeight: 1.5 }} />
            </div>
          </div>
          <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ ...btn, flex: 1, height: 42, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSub, fontSize: 13 }}>Annuler</button>
            <button type="button" onClick={() => pid && cid && onConfirm(pid, cid, note)}
              disabled={!pid || !cid}
              style={{ ...btn, flex: 2, height: 42, fontSize: 13, background: pid && cid ? C.accent : `${C.accent}25`, color: pid && cid ? '#050a07' : `${C.accent}50` }}>
              Assigner
            </button>
          </div>
        </div>

        {/* Droite : preview */}
        <div style={{ flex: 1, background: C.bg, overflowY: 'auto' }}>
          {!preview ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20 }}>
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👈</div>
                <div style={{ fontSize: 13, color: C.textDim }}>Sélectionne un programme<br />pour le prévisualiser</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>{preview.name}</div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{preview.seance_type} · {(preview.program_exercises || []).length} exercices</div>
                {preview.description && <div style={{ fontSize: 12, color: C.textSub, marginTop: 6, lineHeight: 1.6, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>{preview.description}</div>}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(preview.program_exercises || []).map((ex, i) => (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 8 }}>{i + 1}. {ex.exercise}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: ex.notes ? 8 : 0 }}>
                      {[
                        ex.sets_target  && { l: 'Séries', v: ex.sets_target,       c: C.blue },
                        ex.reps_target  && { l: 'Reps',   v: ex.reps_target,       c: C.accent },
                        ex.rpe_target   && { l: 'RPE',    v: ex.rpe_target,        c: C.orange },
                        ex.tempo        && { l: 'Tempo',  v: ex.tempo,             c: C.purple },
                        ex.rest_seconds && { l: 'Repos',  v: fmtRest(ex.rest_seconds), c: C.yellow },
                      ].filter(Boolean).map(chip => (
                        <span key={chip.l} style={{ fontSize: 10, fontWeight: 700, color: chip.c, background: `${chip.c}15`, border: `1px solid ${chip.c}30`, padding: '2px 8px', borderRadius: 20 }}>
                          {chip.l} : {chip.v}
                        </span>
                      ))}
                    </div>
                    {ex.notes && <div style={{ fontSize: 11, color: C.textSub, fontStyle: 'italic' }}>💬 {ex.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Panel builder ────────────────────────────────────────────────────────────

function BuilderPanel({ program, allExercises, exerciseMeta, onSaved, onClose }) {
  const { user } = useAuth()
  const isNew = !program?.id

  const [name, setName]     = useState(program?.name || '')
  const [type, setType]     = useState(program?.seance_type || Object.keys(SEANCES)[0])
  const [desc, setDesc]     = useState(program?.description || '')
  const [exos, setExos]     = useState((program?.program_exercises || []).map(e => ({ ...e })))
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? allExercises.filter(e => e.toLowerCase().includes(q)).slice(0, 15) : []
  }, [search, allExercises])

  const suggestions = useMemo(() => SEANCES[type] || [], [type])

  function addEx(exName) {
    if (exos.find(e => e.exercise === exName)) return
    setExos(prev => [...prev, { exercise: exName, sets_target: '4', reps_target: '8-10', rpe_target: '', tempo: '', rest_seconds: '90', notes: '' }])
    setSearch('')
  }
  function updateEx(i, key, val) { setExos(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e)) }
  function removeEx(i) { setExos(prev => prev.filter((_, idx) => idx !== i)) }
  function moveUp(i) { if (i === 0) return; setExos(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a }) }
  function moveDown(i) { if (i === exos.length - 1) return; setExos(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a }) }

  async function save() {
    setError('')
    if (!name.trim()) { setError('Donne un nom au programme.'); return }
    if (exos.length === 0) { setError('Ajoute au moins un exercice.'); return }
    setSaving(true)
    try {
      let progId = program?.id
      if (isNew) {
        const { data, error: e } = await supabase.from('programs')
          .insert({ coach_id: user.id, name: name.trim(), seance_type: type, description: desc.trim() || null })
          .select().single()
        if (e) throw e
        progId = data.id
      } else {
        const { error: e } = await supabase.from('programs')
          .update({ name: name.trim(), seance_type: type, description: desc.trim() || null })
          .eq('id', progId)
        if (e) throw e
        await supabase.from('program_exercises').delete().eq('program_id', progId)
      }
      const { error: e2 } = await supabase.from('program_exercises').insert(
        exos.map((ex, i) => ({
          program_id: progId,
          exercise: ex.exercise,
          sets_target: parseInt(ex.sets_target) || null,
          reps_target: ex.reps_target || null,
          rpe_target: parseFloat(ex.rpe_target) || null,
          tempo: ex.tempo || null,
          rest_seconds: parseInt(ex.rest_seconds) || null,
          notes: ex.notes || null,
          exercise_order: i,
        }))
      )
      if (e2) throw e2
      onSaved()
    } catch (err) {
      setError(err.message || 'Erreur.')
      setSaving(false)
    }
  }

  const meta = tmeta(type)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', width: '100%', maxWidth: 1120, height: '94vh', borderRadius: 20, overflow: 'hidden', border: `1px solid ${C.borderHi}` }}>

        {/* Col 1 : bibliothèque */}
        <div style={{ width: 270, flexShrink: 0, background: C.card, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>Exercices</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inp }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {!search && (
              <>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', padding: '4px 4px 8px' }}>
                  {type}
                </div>
                {suggestions.map(ex => {
                  const added = !!exos.find(e => e.exercise === ex)
                  const em = exerciseMeta[ex]
                  return (
                    <button key={ex} type="button" onClick={() => addEx(ex)} draggable
                      onDragStart={e => e.dataTransfer.setData('exname', ex)}
                      style={{ ...btn, width: '100%', padding: '7px 10px', textAlign: 'left', marginBottom: 3, border: `1px solid ${added ? `${C.accent}40` : C.border}`, background: added ? C.accentLo : 'rgba(255,255,255,0.025)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'grid', placeItems: 'center' }}>
                        {em?.thumb ? <img src={em.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12 }}>💪</span>}
                      </div>
                      <span style={{ fontSize: 12, color: added ? C.accent : C.textSub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex}</span>
                      {added && <span style={{ color: C.accent, fontSize: 11 }}>✓</span>}
                    </button>
                  )
                })}
              </>
            )}
            {search && filtered.map(ex => {
              const added = !!exos.find(e => e.exercise === ex)
              return (
                <button key={ex} type="button" onClick={() => addEx(ex)} style={{ ...btn, width: '100%', padding: '8px 10px', textAlign: 'left', marginBottom: 3, border: `1px solid ${added ? `${C.accent}40` : C.border}`, background: added ? C.accentLo : 'rgba(255,255,255,0.025)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: added ? C.accent : C.accentLo, fontWeight: 900 }}>{added ? '✓' : '+'}</span>
                  <span style={{ fontSize: 12, color: added ? C.accent : C.textSub }}>{ex}</span>
                </button>
              )
            })}
            {search && filtered.length === 0 && <div style={{ fontSize: 12, color: C.textDim, padding: 10 }}>Aucun résultat</div>}
          </div>
        </div>

        {/* Col 2 : builder */}
        <div style={{ flex: 1, background: C.bg, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du programme..."
              style={{ ...inp, flex: 1, height: 42, fontSize: 16, fontWeight: 800, background: 'transparent', border: 'none', padding: 0 }} />
            <button type="button" onClick={onClose} style={{ ...btn, height: 38, padding: '0 14px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSub, fontSize: 13 }}>Annuler</button>
            <button type="button" onClick={save} disabled={saving} style={{ ...btn, height: 38, padding: '0 18px', background: C.accent, color: '#050a07', fontSize: 13 }}>
              {saving ? '...' : isNew ? 'Créer' : 'Enregistrer'}
            </button>
          </div>

          {/* Meta */}
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            {Object.keys(SEANCES).map(t => {
              const m = tmeta(t); const sel = type === t
              return (
                <button key={t} type="button" onClick={() => setType(t)} style={{
                  ...btn, padding: '5px 10px', fontSize: 11,
                  border: `1px solid ${sel ? `${m.color}60` : C.border}`,
                  background: sel ? `${m.color}15` : 'rgba(255,255,255,0.03)',
                  color: sel ? m.color : C.textSub,
                }}>{m.icon} {t}</button>
              )
            })}
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optionnel)..."
              style={{ ...inp, flex: 1, minWidth: 160 }} />
          </div>

          {/* Zone exercices */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const n = e.dataTransfer.getData('exname'); if (n) addEx(n) }}>
            {exos.length === 0 ? (
              <div style={{ height: 180, display: 'grid', placeItems: 'center', border: `2px dashed ${C.border}`, borderRadius: 14, color: C.textDim, fontSize: 13, textAlign: 'center', lineHeight: 1.8 }}>
                ← Clique ou glisse des exercices depuis la liste
              </div>
            ) : exos.map((ex, i) => (
              <ExRow key={i} ex={ex} index={i} total={exos.length}
                onChange={updateEx} onRemove={removeEx}
                onMoveUp={moveUp} onMoveDown={moveDown}
                ytThumb={exerciseMeta[ex.exercise]?.thumb} />
            ))}
          </div>

          {error && (
            <div style={{ margin: '0 18px 12px', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080', fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Col 3 : ordre */}
        <div style={{ width: 190, flexShrink: 0, background: C.card, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              Ordre ({exos.length})
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {exos.length === 0 ? (
              <div style={{ fontSize: 11, color: C.textDim, padding: '8px 4px' }}>Aucun exercice</div>
            ) : exos.map((ex, i) => (
              <div key={i} style={{ padding: '7px 10px', borderRadius: 8, marginBottom: 4, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: C.textDim, width: 16, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 11, color: C.textSub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.exercise}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ProgramBuilderPage() {
  const { user } = useAuth()

  const [programs, setPrograms]       = useState([])
  const [clients, setClients]         = useState([])
  const [assignments, setAssignments] = useState([])
  const [allExercises, setAllEx]      = useState([...ALL_EXERCISES])
  const [exerciseMeta, setExMeta]     = useState({})
  const [loading, setLoading]         = useState(true)

  const [activeClient, setActiveClient] = useState(null)
  const [weekOffset, setWeekOffset]     = useState(0)
  const [assignDate, setAssignDate]     = useState(null)
  const [builderProgram, setBuilder]    = useState(undefined)

  const PAGE = 2
  const weeks = useMemo(() => Array.from({ length: PAGE }, (_, i) => getMonday(weekOffset + i)), [weekOffset])

  const loadAll = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const { data: progs } = await supabase
        .from('programs').select('*, program_exercises(*)')
        .eq('coach_id', user.id).order('created_at', { ascending: false })
      setPrograms(progs || [])

      const { data: links } = await supabase.from('coach_clients').select('client_id').eq('coach_id', user.id)
      const ids = (links || []).map(l => l.client_id).filter(Boolean)
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
        const cls = profiles || []
        setClients(cls)
        setActiveClient(prev => prev || cls[0]?.id || null)
      }

      const from = toISO(getMonday(-2)), to = toISO(addDays(getMonday(10), 6))
      const { data: assignData } = await supabase.from('assignments').select('*').gte('assigned_date', from).lte('assigned_date', to)
      setAssignments(assignData || [])

      const { data: exData } = await supabase.from('exercises').select('name, youtube_url').order('name')
      if (exData) {
        const names = exData.map(e => e.name).filter(Boolean)
        setAllEx([...new Set([...ALL_EXERCISES, ...names])])
        const meta = {}
        exData.forEach(e => {
          if (e.youtube_url) {
            const id = e.youtube_url.match(/(?:youtu\.be\/|watch\?v=|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1]
            if (id) meta[e.name] = { thumb: `https://img.youtube.com/vi/${id}/default.jpg` }
          }
        })
        setExMeta(meta)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { loadAll() }, [loadAll])

  const visibleAssignments = useMemo(() =>
    activeClient ? assignments.filter(a => a.athlete_id === activeClient) : assignments
  , [assignments, activeClient])

  async function handleAssign(programId, athleteId, iso, note = '') {
    if (!athleteId || !programId) return
    try {
      const { data } = await supabase.from('assignments').insert({
        program_id: programId, athlete_id: athleteId, assigned_date: iso, note: note || null,
      }).select().single()
      if (data) setAssignments(prev => [...prev, data])
    } catch (err) { console.error(err) }
  }

  async function handleRemove(id) {
    await supabase.from('assignments').delete().eq('id', id)
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  async function deleteProgram(id) {
    if (!window.confirm('Supprimer ce programme ?')) return
    await supabase.from('programs').delete().eq('id', id)
    setPrograms(prev => prev.filter(p => p.id !== id))
  }

  const thisWeek = visibleAssignments.filter(a =>
    a.assigned_date >= toISO(getMonday(0)) && a.assigned_date <= toISO(addDays(getMonday(0), 6))
  ).length

  return (
    <PageWrap>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .pb-anim { animation: fadeUp 0.28s ease both; }
        .pb-wrap { display: flex; min-height: calc(100vh - 120px); }
        .pb-sidebar { display: none; width: 240px; flex-shrink: 0; }
        .pb-main { flex: 1; min-width: 0; }
        .pb-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        @media (min-width: 860px) { .pb-sidebar { display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.07); padding: 14px 12px; } }
        @media (max-width: 600px) { .pb-grid { gap: 3px; } }
      `}</style>

      <div style={{ maxWidth: 1300, margin: '0 auto' }}>

        <div style={{ padding: '18px 0 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>Programmation</div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Crée et planifie les séances de tes clients</div>
          </div>
          <button type="button" onClick={() => setBuilder(null)} style={{ ...btn, height: 40, padding: '0 18px', background: C.accent, color: '#050a07', fontSize: 13 }}>
            + Nouveau programme
          </button>
        </div>

        {clients.length > 0 && (
          <div style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.6 }}>Afficher pour :</span>
            {clients.map(c => {
              const active = activeClient === c.id
              return (
                <button key={c.id} type="button" onClick={() => setActiveClient(c.id)} style={{
                  ...btn, height: 30, padding: '0 12px', fontSize: 12,
                  border: `1px solid ${active ? `${C.accent}50` : C.border}`,
                  background: active ? C.accentLo : 'rgba(255,255,255,0.03)',
                  color: active ? C.accent : C.textSub,
                }}>{c.full_name || c.email}</button>
              )
            })}
          </div>
        )}

        {loading ? <div style={{ padding: 60, textAlign: 'center', color: C.textSub }}>Chargement...</div> : (
          <div className="pb-wrap">

            <div className="pb-sidebar">
              <div style={{ fontSize: 10, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                Programmes ({programs.length})
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 5, alignContent: 'start' }}>
                {programs.length === 0 ? (
                  <div style={{ padding: 14, borderRadius: 10, border: `1px dashed ${C.border}`, textAlign: 'center', color: C.textDim, fontSize: 12, lineHeight: 1.7 }}>
                    Aucun programme<br />
                    <span style={{ color: C.accent, cursor: 'pointer', fontWeight: 700 }} onClick={() => setBuilder(null)}>Créer →</span>
                  </div>
                ) : programs.map(prog => {
                  const m = tmeta(prog.seance_type)
                  return (
                    <div key={prog.id} draggable onDragStart={e => e.dataTransfer.setData('pid', prog.id)}
                      style={{ padding: '8px 10px', borderRadius: 9, cursor: 'grab', border: `1px solid ${m.color}20`, background: `${m.color}08` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>{m.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prog.name}</div>
                          <div style={{ fontSize: 9, color: C.textSub }}>{(prog.program_exercises || []).length} ex.</div>
                        </div>
                        <button type="button" onClick={() => setBuilder(prog)}
                          style={{ ...btn, background: 'rgba(255,255,255,0.06)', color: C.textSub, width: 22, height: 22, fontSize: 11, display: 'grid', placeItems: 'center' }}>✎</button>
                        <button type="button" onClick={() => deleteProgram(prog.id)}
                          style={{ ...btn, background: 'none', color: C.textDim, width: 20, height: 20, fontSize: 15, display: 'grid', placeItems: 'center' }}>×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'grid', gap: 6 }}>
                {[{ l: 'Total planifiées', v: visibleAssignments.length }, { l: 'Cette semaine', v: thisWeek }].map(s => (
                  <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: C.textSub }}>{s.l}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: C.accent }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pb-main" style={{ padding: '14px 0 14px 16px', display: 'grid', gap: 20, alignContent: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <button type="button" onClick={() => setWeekOffset(0)} style={{ ...btn, padding: '6px 12px', fontSize: 11, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSub }}>
                  Aujourd'hui
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" onClick={() => setWeekOffset(w => w - PAGE)} style={{ ...btn, width: 34, height: 34, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: C.textSub, fontSize: 20, display: 'grid', placeItems: 'center' }}>‹</button>
                  <div style={{ textAlign: 'center', minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{fmtWeek(weeks[0])}</div>
                    {weeks.length > 1 && <div style={{ fontSize: 11, color: C.textSub }}>→ {fmtWeek(weeks[weeks.length - 1])}</div>}
                  </div>
                  <button type="button" onClick={() => setWeekOffset(w => w + PAGE)} style={{ ...btn, width: 34, height: 34, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: C.textSub, fontSize: 20, display: 'grid', placeItems: 'center' }}>›</button>
                </div>
                <span style={{ fontSize: 11, color: C.textDim }}>Clic ou glisser pour assigner</span>
              </div>

              {weeks.map((monday, wi) => (
                <div key={wi} className="pb-anim" style={{ animationDelay: `${wi * 40}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 3, height: 12, borderRadius: 2, background: wi === 0 && weekOffset === 0 ? C.accent : C.textDim }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: wi === 0 && weekOffset === 0 ? C.accent : C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {wi === 0 && weekOffset === 0 ? 'Semaine actuelle' : `S${weekOffset + wi > 0 ? '+' : ''}${weekOffset + wi}`}
                    </span>
                    <span style={{ fontSize: 10, color: C.textDim }}>· {monday.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="pb-grid" style={{ marginBottom: 5 }}>
                    {JOURS.map((j, di) => (
                      <div key={j} style={{ fontSize: 10, fontWeight: 700, color: isToday(toISO(addDays(monday, di))) ? C.accent : C.textDim, textAlign: 'center', padding: '2px 0', textTransform: 'uppercase', letterSpacing: 0.3 }}>{j}</div>
                    ))}
                  </div>
                  <div className="pb-grid">
                    {JOURS.map((_, di) => {
                      const iso = toISO(addDays(monday, di))
                      return (
                        <CalCell key={iso} iso={iso}
                          assignments={visibleAssignments} programs={programs}
                          onDrop={(pid, date) => { if (!activeClient) { alert('Sélectionne un client.'); return }; handleAssign(pid, activeClient, date) }}
                          onClick={setAssignDate}
                          onRemove={handleRemove}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                {Object.entries(TYPE_META).map(([t, m]) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                    <span style={{ fontSize: 10, color: C.textDim }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {assignDate && (
        <AssignModal
          iso={assignDate} programs={programs} clients={clients} defaultClientId={activeClient}
          onConfirm={(pid, cid, note) => { handleAssign(pid, cid, assignDate, note); setAssignDate(null) }}
          onClose={() => setAssignDate(null)}
        />
      )}

      {builderProgram !== undefined && (
        <BuilderPanel
          program={builderProgram}
          allExercises={allExercises}
          exerciseMeta={exerciseMeta}
          onSaved={() => { setBuilder(undefined); loadAll() }}
          onClose={() => setBuilder(undefined)}
        />
      )}
    </PageWrap>
  )
}
