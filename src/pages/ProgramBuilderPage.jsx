import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap } from '../components/UI'
import { SEANCES, ALL_EXERCISES, SEANCE_ICONS, T } from '../lib/data'

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:       '#06080a',
  surface:  '#0d1117',
  card:     '#111820',
  border:   'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.14)',
  text:     '#e8edf2',
  textSub:  '#8899aa',
  textDim:  '#4a5568',
  accent:   '#3ecf8e',
  accentDim:'#2a9467',
  blue:     '#4d9fff',
  orange:   '#ff7043',
  purple:   '#9d7dea',
  yellow:   '#fbbf24',
}

const TYPE_META = {
  'Pectoraux / Triceps': { color: C.blue,   icon: '⚡', label: 'Push' },
  'Dos / Biceps':        { color: C.purple, icon: '🏹', label: 'Pull' },
  'Jambes':              { color: C.accent, icon: '🔥', label: 'Legs' },
  'Épaules':             { color: C.orange, icon: '⚔️', label: 'Shoulders' },
  'Full Body':           { color: '#26d4e8', icon: '💥', label: 'Full' },
  'Cardio':              { color: C.yellow, icon: '🏃', label: 'Cardio' },
}

function typeMeta(type) {
  return TYPE_META[type] || { color: C.accent, icon: '💪', label: type }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const JOURS_COURT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const JOURS_LONG  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

function getMonday(offset = 0) {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISO(date) {
  return date.toISOString().split('T')[0]
}

function isToday(iso) {
  return iso === toISO(new Date())
}

function isPast(iso) {
  return iso < toISO(new Date())
}

function fmtDayNum(iso) {
  return new Date(iso + 'T00:00:00').getDate()
}

function fmtMonth(date) {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function fmtWeekRange(monday) {
  const sunday = addDays(monday, 6)
  const m = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const s = sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${m} – ${s}`
}

// ─── Styles partagés ─────────────────────────────────────────────────────────

const labelStyle = {
  fontSize: 11, fontWeight: 800, color: C.textSub,
  textTransform: 'uppercase', letterSpacing: 0.8,
  marginBottom: 8, display: 'block',
}

const inputBase = {
  width: '100%', borderRadius: 10, padding: '0 12px',
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.04)',
  color: C.text, fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  height: 42,
}

const btnBase = {
  height: 46, borderRadius: 12, border: 'none',
  fontWeight: 800, fontSize: 14, cursor: 'pointer',
  fontFamily: 'inherit',
}

const navBtnStyle = {
  width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
  border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)',
  color: C.textSub, fontSize: 20, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// ─── Cellule calendrier ───────────────────────────────────────────────────────

function CalCell({ iso, assignments, programs, onDrop, onCellClick, onRemove }) {
  const [over, setOver] = useState(false)
  const today = isToday(iso)
  const past  = isPast(iso)
  const cellAssignments = assignments.filter(a => a.assigned_date === iso)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault(); setOver(false)
        const pid = e.dataTransfer.getData('pid')
        if (pid) onDrop(pid, iso)
      }}
      onClick={() => onCellClick(iso)}
      style={{
        minHeight: 88, borderRadius: 10, position: 'relative', overflow: 'hidden',
        border: `1px solid ${over ? C.accent : today ? `${C.accent}50` : C.border}`,
        background: over ? `${C.accent}08` : today ? `${C.accent}04` : past ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
        padding: '6px 5px 5px', cursor: 'pointer',
        transition: 'all 0.12s ease',
      }}
    >
      {today && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: C.accent }} />}

      <div style={{
        fontSize: 11, fontWeight: today ? 900 : 700,
        color: today ? C.accent : past ? C.textDim : C.textSub,
        marginBottom: 5, paddingLeft: 2, lineHeight: 1,
      }}>
        {fmtDayNum(iso)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {cellAssignments.map(a => {
          const prog = programs.find(p => p.id === a.program_id)
          if (!prog) return null
          const meta = typeMeta(prog.seance_type)
          return (
            <div key={a.id} style={{
              borderRadius: 5, padding: '3px 6px',
              background: `${meta.color}18`, border: `1px solid ${meta.color}30`,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span style={{ fontSize: 9, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: meta.color, fontWeight: 700 }}>
                {meta.icon} {prog.name}
              </span>
              <button type="button"
                onClick={e => { e.stopPropagation(); onRemove(a.id) }}
                style={{ background: 'none', border: 'none', color: meta.color, cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1, opacity: 0.7, flexShrink: 0 }}>
                ×
              </button>
            </div>
          )
        })}
      </div>

      {over && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          background: `${C.accent}10`, borderRadius: 10,
          border: `2px dashed ${C.accent}60`,
          fontSize: 22, color: C.accent, pointerEvents: 'none',
        }}>+</div>
      )}
    </div>
  )
}

// ─── Modal : assigner une séance ──────────────────────────────────────────────

function AssignModal({ iso, programs, clients, selectedClientId, onConfirm, onClose }) {
  const [pid, setPid] = useState(null)
  const [cid, setCid] = useState(selectedClientId || (clients[0]?.id) || '')
  const [note, setNote] = useState('')

  const date = new Date(iso + 'T00:00:00')
  const dateLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'grid', placeItems: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 460, background: C.card, borderRadius: 20,
        border: `1px solid ${C.borderHi}`, overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Assigner une séance</div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, textTransform: 'capitalize' }}>{dateLabel}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: C.textSub, fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20, display: 'grid', gap: 16, overflowY: 'auto', flex: 1 }}>
          {clients.length > 1 && (
            <div>
              <div style={labelStyle}>Client</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {clients.map(c => (
                  <button key={c.id} type="button" onClick={() => setCid(c.id)} style={{
                    padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    border: `1px solid ${cid === c.id ? `${C.accent}60` : C.border}`,
                    background: cid === c.id ? `${C.accent}12` : 'rgba(255,255,255,0.03)',
                    color: cid === c.id ? C.accent : C.textSub,
                  }}>
                    {c.full_name || c.email}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={labelStyle}>Choisir un programme</div>
            {programs.length === 0 ? (
              <div style={{ padding: 16, borderRadius: 12, border: `1px dashed ${C.border}`, color: C.textDim, fontSize: 13, textAlign: 'center' }}>
                Aucun programme disponible.<br />Crée-en un depuis le bouton "+ Nouveau programme".
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {programs.map(p => {
                  const meta = typeMeta(p.seance_type)
                  const sel = pid === p.id
                  return (
                    <button key={p.id} type="button" onClick={() => setPid(p.id)} style={{
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${sel ? `${meta.color}60` : C.border}`,
                      background: sel ? `${meta.color}12` : 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 20 }}>{meta.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: sel ? meta.color : C.text }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                          {p.seance_type} · {(p.program_exercises || []).length} exercices
                        </div>
                      </div>
                      {sel && <span style={{ color: meta.color, fontSize: 16, fontWeight: 900 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <div style={labelStyle}>Note (optionnel)</div>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Focalise-toi sur la technique..." rows={2}
              style={{ ...inputBase, height: 'auto', resize: 'none', padding: '10px 12px', lineHeight: 1.5 }} />
          </div>
        </div>

        <div style={{ padding: '12px 20px 20px', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ ...btnBase, flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSub }}>
            Annuler
          </button>
          <button type="button" onClick={() => { if (pid && cid) onConfirm(pid, cid, note) }}
            disabled={!pid || !cid}
            style={{
              ...btnBase, flex: 2,
              background: pid && cid ? C.accent : `${C.accent}25`,
              color: pid && cid ? '#05070a' : C.accentDim,
              cursor: pid && cid ? 'pointer' : 'not-allowed',
            }}>
            Assigner la séance
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel : créer un programme ───────────────────────────────────────────────

function CreatePanel({ onSaved, onClose }) {
  const { user } = useAuth()
  const [name, setName]         = useState('')
  const [type, setType]         = useState(Object.keys(SEANCES)[0])
  const [exercises, setExs]     = useState([])
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [allExercises, setAllEx] = useState([...ALL_EXERCISES])

  useEffect(() => {
    supabase.from('exercises').select('name').order('name')
      .then(({ data }) => {
        const names = (data || []).map(e => e.name).filter(Boolean)
        const merged = [...new Set([...ALL_EXERCISES, ...names])]
        setAllEx(merged)
      })
  }, [])

  const suggestions = useMemo(() => SEANCES[type] || [], [type])
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (q ? allExercises.filter(e => e.toLowerCase().includes(q)) : []).slice(0, 12)
  }, [search, allExercises])

  function addEx(exName) {
    if (exercises.find(e => e.exercise === exName)) return
    setExs(prev => [...prev, { exercise: exName, sets_target: '4', reps_target: '8-10', rpe_target: '8' }])
    setSearch('')
  }

  function updateEx(i, key, val) {
    setExs(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e))
  }

  function removeEx(i) {
    setExs(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    setError('')
    if (!name.trim()) { setError('Donne un nom à ce programme.'); return }
    if (exercises.length === 0) { setError('Ajoute au moins un exercice.'); return }
    setSaving(true)
    try {
      const { data: prog, error: e1 } = await supabase.from('programs')
        .insert({ coach_id: user.id, name: name.trim(), seance_type: type })
        .select().single()
      if (e1) throw e1

      const { error: e2 } = await supabase.from('program_exercises').insert(
        exercises.map((ex, i) => ({
          program_id: prog.id,
          exercise: ex.exercise,
          sets_target: parseInt(ex.sets_target) || null,
          reps_target: ex.reps_target || null,
          rpe_target: parseFloat(ex.rpe_target) || null,
          exercise_order: i,
        }))
      )
      if (e2) throw e2
      onSaved()
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.')
      setSaving(false)
    }
  }

  const meta = typeMeta(type)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, background: C.card,
        borderLeft: `1px solid ${C.borderHi}`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>Nouveau programme</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: C.textSub, fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Contenu scrollable */}
        <div style={{ padding: 20, flex: 1, overflowY: 'auto', display: 'grid', gap: 22, alignContent: 'start' }}>

          {/* Nom */}
          <div>
            <div style={labelStyle}>Nom du programme *</div>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex : Push A, Jambes force, Full Body débutant..."
              autoFocus
              style={{ ...inputBase, height: 48, fontSize: 15, fontWeight: 600 }} />
          </div>

          {/* Type */}
          <div>
            <div style={labelStyle}>Type de séance</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.keys(SEANCES).map(t => {
                const m = typeMeta(t)
                const sel = type === t
                return (
                  <button key={t} type="button" onClick={() => setType(t)} style={{
                    padding: '7px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    border: `1px solid ${sel ? `${m.color}60` : C.border}`,
                    background: sel ? `${m.color}15` : 'rgba(255,255,255,0.03)',
                    color: sel ? m.color : C.textSub,
                    transition: 'all 0.1s ease',
                  }}>
                    {m.icon} {t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Exercices sélectionnés */}
          <div>
            <div style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span>Exercices {exercises.length > 0 ? `(${exercises.length})` : ''}</span>
              {exercises.length > 0 && (
                <button type="button" onClick={() => setExs([])}
                  style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  Tout effacer
                </button>
              )}
            </div>

            {exercises.length === 0 ? (
              <div style={{ padding: '14px 0', color: C.textDim, fontSize: 13 }}>
                Sélectionne des exercices ci-dessous.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {exercises.map((ex, i) => (
                  <div key={i} style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, color: C.textDim, fontWeight: 700 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{ex.exercise}</span>
                      </div>
                      <button type="button" onClick={() => removeEx(i)}
                        style={{ background: 'none', border: 'none', color: C.textSub, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {[
                        { key: 'sets_target', label: 'Séries', ph: '4' },
                        { key: 'reps_target', label: 'Reps', ph: '8-10' },
                        { key: 'rpe_target', label: 'RPE', ph: '8' },
                      ].map(f => (
                        <div key={f.key}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{f.label}</div>
                          <input value={ex[f.key]} onChange={e => updateEx(i, f.key, e.target.value)}
                            placeholder={f.ph}
                            style={{ ...inputBase, height: 34, fontSize: 13, padding: '0 8px', textAlign: 'center' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recherche + suggestions */}
          <div>
            <div style={labelStyle}>Ajouter des exercices</div>

            {/* Suggestions par type */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>
                Exercices {type} :
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {suggestions.map(ex => {
                  const added = !!exercises.find(e => e.exercise === ex)
                  return (
                    <button key={ex} type="button" onClick={() => addEx(ex)} style={{
                      padding: '5px 10px', borderRadius: 16, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      border: `1px solid ${added ? `${meta.color}50` : C.border}`,
                      background: added ? `${meta.color}10` : 'rgba(255,255,255,0.03)',
                      color: added ? meta.color : C.textSub,
                    }}>
                      {added ? '✓' : '+'} {ex}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Recherche libre */}
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Recherche libre (ex: curl, planche...)"
              style={{ ...inputBase, marginBottom: filtered.length > 0 ? 6 : 0 }} />
            {filtered.length > 0 && (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                {filtered.map((ex, i) => {
                  const added = !!exercises.find(e => e.exercise === ex)
                  return (
                    <button key={ex} type="button" onClick={() => addEx(ex)} style={{
                      width: '100%', padding: '9px 14px', border: 'none',
                      borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                      background: added ? `${C.accent}08` : 'rgba(255,255,255,0.025)',
                      color: added ? C.accent : C.textSub,
                      fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                      <span style={{ color: added ? C.accent : C.accentDim, fontWeight: 900, fontSize: 14 }}>
                        {added ? '✓' : '+'}
                      </span>
                      {ex}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080', fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ ...btnBase, flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSub }}>
            Annuler
          </button>
          <button type="button" onClick={save} disabled={saving}
            style={{
              ...btnBase, flex: 2,
              background: name.trim() && exercises.length > 0 ? meta.color : `${meta.color}30`,
              color: name.trim() && exercises.length > 0 ? '#05070a' : `${meta.color}60`,
              cursor: saving ? 'default' : 'pointer',
            }}>
            {saving ? 'Sauvegarde...' : exercises.length > 0 ? `Créer (${exercises.length} ex.)` : 'Créer le programme'}
          </button>
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
  const [loading, setLoading]         = useState(true)

  const [activeClient, setActiveClient] = useState(null)
  const [weekOffset, setWeekOffset]     = useState(0)
  const [assignDate, setAssignDate]     = useState(null)
  const [showCreate, setShowCreate]     = useState(false)

  const PAGE = 2
  const weeks = useMemo(() =>
    Array.from({ length: PAGE }, (_, i) => getMonday(weekOffset + i)), [weekOffset])

  const loadAll = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const { data: progsData } = await supabase
        .from('programs').select('*, program_exercises(*)')
        .eq('coach_id', user.id).order('created_at', { ascending: false })
      setPrograms(progsData || [])

      const { data: links } = await supabase
        .from('coach_clients').select('client_id').eq('coach_id', user.id)
      const ids = (links || []).map(l => l.client_id).filter(Boolean)

      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, full_name, email').in('id', ids)
        const cls = profiles || []
        setClients(cls)
        setActiveClient(prev => prev || cls[0]?.id || null)
      }

      const from = toISO(getMonday(-2))
      const to   = toISO(addDays(getMonday(10), 6))
      const { data: assignData } = await supabase
        .from('assignments').select('*')
        .gte('assigned_date', from).lte('assigned_date', to)
      setAssignments(assignData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadAll() }, [loadAll])

  const visibleAssignments = useMemo(() =>
    activeClient ? assignments.filter(a => a.athlete_id === activeClient) : assignments
  , [assignments, activeClient])

  async function handleAssign(programId, athleteId, iso, note = '') {
    if (!athleteId || !programId) return
    try {
      const { data } = await supabase.from('assignments').insert({
        program_id: programId, athlete_id: athleteId,
        assigned_date: iso, note: note || null,
      }).select().single()
      if (data) setAssignments(prev => [...prev, data])
    } catch (err) { console.error(err) }
  }

  async function handleRemove(id) {
    try {
      await supabase.from('assignments').delete().eq('id', id)
      setAssignments(prev => prev.filter(a => a.id !== id))
    } catch (err) { console.error(err) }
  }

  async function deleteProgram(id) {
    if (!window.confirm('Supprimer ce programme et toutes ses assignations ?')) return
    await supabase.from('programs').delete().eq('id', id)
    setPrograms(prev => prev.filter(p => p.id !== id))
  }

  const thisWeekAssignments = visibleAssignments.filter(a =>
    a.assigned_date >= toISO(getMonday(0)) && a.assigned_date <= toISO(addDays(getMonday(0), 6))
  ).length

  return (
    <PageWrap>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .pb-anim { animation: fadeUp 0.3s ease both; }
        .pb-wrap { display: flex; gap: 0; min-height: calc(100vh - 120px); }
        .pb-sidebar { display: none; width: 250px; flex-shrink: 0; border-right: 1px solid ${C.border}; padding: 16px 12px; flex-direction: column; gap: 6px; }
        .pb-main { flex: 1; min-width: 0; padding: 16px 0 16px 20px; }
        .pb-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .pb-day-h { font-size: 10px; font-weight: 800; color: ${C.textSub}; text-align: center; padding: 3px 0; text-transform: uppercase; letter-spacing: 0.4px; }
        @media (min-width: 900px) { .pb-sidebar { display: flex; } }
        @media (max-width: 640px) { .pb-main { padding: 12px 0; } .pb-grid { gap: 3px; } }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ padding: '20px 0 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>
              Programmation
            </div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
              Crée des programmes et planifie les séances de tes clients
            </div>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} style={{
            ...btnBase, height: 42, padding: '0 20px', fontSize: 13,
            background: C.accent, color: '#05070a',
          }}>
            + Nouveau programme
          </button>
        </div>

        {/* ── Sélecteur client ── */}
        {clients.length > 0 && (
          <div style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 0 }}>
              Afficher pour :
            </span>
            {clients.map(c => {
              const active = activeClient === c.id
              return (
                <button key={c.id} type="button" onClick={() => setActiveClient(c.id)} style={{
                  height: 30, padding: '0 14px', borderRadius: 15, cursor: 'pointer',
                  border: `1px solid ${active ? `${C.accent}50` : C.border}`,
                  background: active ? `${C.accent}12` : 'rgba(255,255,255,0.03)',
                  color: active ? C.accent : C.textSub,
                  fontWeight: 700, fontSize: 12,
                }}>
                  {c.full_name || c.email}
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: C.textSub, fontSize: 14 }}>Chargement...</div>
        ) : (
          <div className="pb-wrap">

            {/* ── Sidebar programmes (desktop) ── */}
            <div className="pb-sidebar">
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                Programmes ({programs.length})
              </div>

              {programs.length === 0 ? (
                <div style={{ padding: 16, borderRadius: 10, border: `1px dashed ${C.border}`, textAlign: 'center', lineHeight: 1.7 }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>📋</div>
                  <div style={{ color: C.textSub, fontSize: 12 }}>Aucun programme</div>
                  <button type="button" onClick={() => setShowCreate(true)} style={{
                    marginTop: 8, background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  }}>Créer →</button>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 5, alignContent: 'start' }}>
                  {programs.map(prog => {
                    const meta = typeMeta(prog.seance_type)
                    return (
                      <div key={prog.id} draggable
                        onDragStart={e => e.dataTransfer.setData('pid', prog.id)}
                        style={{
                          padding: '9px 10px', borderRadius: 9, cursor: 'grab',
                          border: `1px solid ${meta.color}22`,
                          background: `${meta.color}08`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 14 }}>{meta.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {prog.name}
                            </div>
                            <div style={{ fontSize: 10, color: C.textSub }}>
                              {(prog.program_exercises || []).length} ex. · glisse sur calendrier
                            </div>
                          </div>
                          <button type="button" onClick={() => deleteProgram(prog.id)}
                            style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '1px 3px' }}>×</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Mini stats */}
              <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    { label: 'Total planifiées', val: visibleAssignments.length },
                    { label: 'Cette semaine', val: thisWeekAssignments },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: C.textSub }}>{s.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: C.accent }}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Calendrier ── */}
            <div className="pb-main">

              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
                <button type="button" onClick={() => setWeekOffset(0)} style={{
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)',
                  color: C.textSub, fontSize: 11, fontWeight: 700,
                }}>
                  Semaine actuelle
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" onClick={() => setWeekOffset(w => w - PAGE)} style={navBtnStyle}>‹</button>
                  <div style={{ textAlign: 'center', minWidth: 180 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                      {fmtWeekRange(weeks[0])}
                    </div>
                    {weeks.length > 1 && (
                      <div style={{ fontSize: 11, color: C.textSub, marginTop: 1 }}>
                        → {fmtWeekRange(weeks[weeks.length - 1])}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => setWeekOffset(w => w + PAGE)} style={navBtnStyle}>›</button>
                </div>

                <div style={{ fontSize: 11, color: C.textDim, textAlign: 'right' }}>
                  Clic ou glisser pour assigner
                </div>
              </div>

              {/* Semaines */}
              {weeks.map((monday, wi) => (
                <div key={wi} className="pb-anim" style={{ marginBottom: 24, animationDelay: `${wi * 50}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: wi === 0 && weekOffset === 0 ? C.accent : C.textDim }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: wi === 0 && weekOffset === 0 ? C.accent : C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {wi === 0 && weekOffset === 0 ? 'Semaine actuelle' : `Semaine ${weekOffset + wi + 1 > 0 ? '+' : ''}${weekOffset + wi}`}
                    </span>
                    <span style={{ fontSize: 11, color: C.textDim }}>· {fmtMonth(monday)}</span>
                  </div>

                  {/* Jours */}
                  <div className="pb-grid" style={{ marginBottom: 5 }}>
                    {JOURS_LONG.map((j, di) => {
                      const iso = toISO(addDays(monday, di))
                      return (
                        <div key={j} className="pb-day-h" style={{ color: isToday(iso) ? C.accent : C.textDim }}>
                          {j.slice(0, 3)}
                        </div>
                      )
                    })}
                  </div>

                  {/* Cellules */}
                  <div className="pb-grid">
                    {JOURS_LONG.map((_, di) => {
                      const iso = toISO(addDays(monday, di))
                      return (
                        <CalCell
                          key={iso}
                          iso={iso}
                          assignments={visibleAssignments}
                          programs={programs}
                          onDrop={(pid, date) => {
                            if (!activeClient) { alert('Sélectionne un client d\'abord.'); return }
                            handleAssign(pid, activeClient, date)
                          }}
                          onCellClick={setAssignDate}
                          onRemove={handleRemove}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Légende */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                {Object.entries(TYPE_META).map(([type, meta]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: meta.color }} />
                    <span style={{ fontSize: 10, color: C.textDim }}>{type}</span>
                  </div>
                ))}
              </div>

              {/* Programmes mobile */}
              {programs.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                    Mes programmes — appuie pour assigner sur une date
                  </div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                    {programs.map(prog => {
                      const meta = typeMeta(prog.seance_type)
                      return (
                        <div key={prog.id} style={{
                          flexShrink: 0, padding: '10px 14px', borderRadius: 12,
                          border: `1px solid ${meta.color}25`, background: `${meta.color}10`, minWidth: 140,
                        }}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{meta.icon}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{prog.name}</div>
                          <div style={{ fontSize: 10, color: C.textSub, marginTop: 2 }}>{(prog.program_exercises || []).length} exercices</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal assigner ── */}
      {assignDate && (
        <AssignModal
          iso={assignDate}
          programs={programs}
          clients={clients}
          selectedClientId={activeClient}
          onConfirm={(pid, cid, note) => {
            handleAssign(pid, cid, assignDate, note)
            setAssignDate(null)
          }}
          onClose={() => setAssignDate(null)}
        />
      )}

      {/* ── Panel créer ── */}
      {showCreate && (
        <CreatePanel
          onSaved={() => { setShowCreate(false); loadAll() }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </PageWrap>
  )
}
