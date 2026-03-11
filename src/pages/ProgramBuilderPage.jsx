import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap } from '../components/UI'
import { T, SEANCES, ALL_EXERCISES, SEANCE_ICONS } from '../lib/data'

// ─── Constantes ──────────────────────────────────────────────────────────────

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const NB_SEMAINES = 8

const SEANCE_COLORS = {
  'Pectoraux / Triceps': { bg: 'rgba(77,159,255,0.12)', border: 'rgba(77,159,255,0.35)', text: '#4d9fff' },
  'Dos / Biceps':        { bg: 'rgba(157,125,234,0.12)', border: 'rgba(157,125,234,0.35)', text: '#9d7dea' },
  'Jambes':              { bg: 'rgba(57,224,122,0.10)', border: 'rgba(57,224,122,0.35)', text: '#39e07a' },
  'Épaules':             { bg: 'rgba(255,112,67,0.12)', border: 'rgba(255,112,67,0.35)', text: '#ff7043' },
  'Full Body':           { bg: 'rgba(38,212,232,0.10)', border: 'rgba(38,212,232,0.35)', text: '#26d4e8' },
  'Cardio':              { bg: 'rgba(255,165,0,0.10)',  border: 'rgba(255,165,0,0.35)',  text: '#ffa500' },
  'Repos':               { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: '#586579' },
}

function getSeanceColor(type) {
  return SEANCE_COLORS[type] || { bg: 'rgba(57,224,122,0.08)', border: 'rgba(57,224,122,0.25)', text: T.accentLight }
}

// ─── Helpers dates ────────────────────────────────────────────────────────────

function getMondayOfWeek(weekOffset = 0) {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function getDateOfDay(monday, dayIndex) {
  const d = new Date(monday)
  d.setDate(d.getDate() + dayIndex)
  return d.toISOString().split('T')[0]
}

function formatWeekLabel(monday) {
  const end = new Date(monday)
  end.setDate(end.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${monday.toLocaleDateString('fr-FR', opts)} – ${end.toLocaleDateString('fr-FR', opts)}`
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split('T')[0]
}

function isPast(dateStr) {
  return dateStr < new Date().toISOString().split('T')[0]
}

// ─── Composant cellule calendrier ────────────────────────────────────────────

function CalendarCell({ date, assignments, programs, onDrop, onAssign, onRemove, isSelected, onSelect }) {
  const [dragOver, setDragOver] = useState(false)
  const cellAssignments = assignments.filter(a => a.assigned_date === date)
  const today = isToday(date)
  const past = isPast(date)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        const programId = e.dataTransfer.getData('programId')
        const athleteId = e.dataTransfer.getData('athleteId')
        if (programId) onDrop(programId, athleteId, date)
      }}
      onClick={() => onSelect(date)}
      style={{
        minHeight: 90,
        borderRadius: 12,
        border: `1px solid ${dragOver ? T.accent : today ? T.accent + '50' : T.border}`,
        background: dragOver
          ? 'rgba(57,224,122,0.06)'
          : isSelected
          ? 'rgba(57,224,122,0.04)'
          : today
          ? 'rgba(57,224,122,0.03)'
          : 'rgba(255,255,255,0.02)',
        padding: '6px 6px 4px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Numéro du jour */}
      <div style={{
        fontSize: 11, fontWeight: 800,
        color: today ? T.accent : past ? T.textDim : T.textMid,
        marginBottom: 4, paddingLeft: 2,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {today && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />}
        {new Date(date + 'T00:00:00').getDate()}
      </div>

      {/* Séances assignées */}
      <div style={{ display: 'grid', gap: 3 }}>
        {cellAssignments.map(a => {
          const prog = programs.find(p => p.id === a.program_id)
          if (!prog) return null
          const color = getSeanceColor(prog.seance_type)
          return (
            <div
              key={a.id}
              onClick={e => { e.stopPropagation() }}
              style={{
                padding: '3px 6px', borderRadius: 7,
                background: color.bg, border: `1px solid ${color.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: color.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {SEANCE_ICONS?.[prog.seance_type] || '💪'} {prog.name}
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onRemove(a.id) }}
                style={{ background: 'none', border: 'none', color: color.text, cursor: 'pointer', fontSize: 12, padding: 0, opacity: 0.6, lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>
          )
        })}
      </div>

      {/* Zone drop hint */}
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          border: `2px dashed ${T.accent}`,
          display: 'grid', placeItems: 'center',
          background: 'rgba(57,224,122,0.08)',
          fontSize: 18,
        }}>+</div>
      )}
    </div>
  )
}

// ─── Modal ajout séance ───────────────────────────────────────────────────────

function AddSessionModal({ date, programs, selectedAthlete, onConfirm, onClose }) {
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [note, setNote] = useState('')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center',
      padding: 16,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: '#0a0e0c', borderRadius: 20,
          border: `1px solid ${T.border}`,
          padding: 24,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, color: T.text, marginBottom: 4 }}>
          Assigner une séance
        </div>
        <div style={{ fontSize: 13, color: T.textDim, marginBottom: 20 }}>
          {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>

        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {programs.map(prog => {
            const color = getSeanceColor(prog.seance_type)
            const isSelected = selectedProgram?.id === prog.id
            return (
              <button
                key={prog.id}
                type="button"
                onClick={() => setSelectedProgram(prog)}
                style={{
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  border: `1px solid ${isSelected ? color.border : T.border}`,
                  background: isSelected ? color.bg : 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 18 }}>{SEANCE_ICONS?.[prog.seance_type] || '💪'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? color.text : T.text }}>
                    {prog.name}
                  </div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>
                    {prog.seance_type} · {(prog.program_exercises || []).length} exercices
                  </div>
                </div>
                {isSelected && <span style={{ color: color.text, fontSize: 16 }}>✓</span>}
              </button>
            )
          })}
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note optionnelle (ex: focus technique)"
          rows={2}
          style={{
            width: '100%', borderRadius: 10, padding: '8px 12px',
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.04)',
            color: T.text, fontSize: 13, resize: 'none',
            outline: 'none', boxSizing: 'border-box',
            fontFamily: 'inherit', marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, height: 44, borderRadius: 12,
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.textMid, fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>Annuler</button>
          <button
            type="button"
            onClick={() => selectedProgram && onConfirm(selectedProgram.id, note)}
            disabled={!selectedProgram}
            style={{
              flex: 2, height: 44, borderRadius: 12, border: 'none',
              background: selectedProgram ? T.accent : 'rgba(57,224,122,0.2)',
              color: '#050607', fontWeight: 800, fontSize: 13,
              cursor: selectedProgram ? 'pointer' : 'default',
            }}
          >
            Assigner
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel création programme ─────────────────────────────────────────────────

function CreateProgramPanel({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [seanceType, setSeanceType] = useState(Object.keys(SEANCES)[0])
  const [exercises, setExercises] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return ALL_EXERCISES.filter(e => e.toLowerCase().includes(q)).slice(0, 12)
  }, [search])

  function addExercise(name) {
    setExercises(prev => [...prev, { exercise: name, sets_target: 4, reps_target: '8-10', rpe_target: 8 }])
  }

  function updateExercise(i, key, val) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [key]: val } : ex))
  }

  function removeExercise(i) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!name.trim() || !user?.id) return
    setSaving(true)
    try {
      const { data: prog, error } = await supabase
        .from('programs')
        .insert({ coach_id: user.id, name: name.trim(), seance_type: seanceType })
        .select().single()
      if (error) throw error

      if (exercises.length > 0) {
        await supabase.from('program_exercises').insert(
          exercises.map((ex, i) => ({
            program_id: prog.id,
            exercise: ex.exercise,
            sets_target: Number(ex.sets_target) || null,
            reps_target: String(ex.reps_target || ''),
            rpe_target: Number(ex.rpe_target) || null,
            exercise_order: i,
          }))
        )
      }
      onSave()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', display: 'flex',
      alignItems: 'stretch', justifyContent: 'flex-end',
      padding: 0,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          background: '#080c0a',
          borderLeft: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#080c0a', zIndex: 1,
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: T.text }}>Nouveau programme</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: T.textDim, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 20, flex: 1, display: 'grid', gap: 20, alignContent: 'start' }}>
          {/* Nom */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>
              Nom du programme
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Push A, Jambes force..."
              style={{
                width: '100%', height: 44, borderRadius: 12, padding: '0 14px',
                border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)',
                color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Type de séance */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>
              Type de séance
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[...Object.keys(SEANCES), 'Full Body', 'Cardio'].map(type => {
                const color = getSeanceColor(type)
                const active = seanceType === type
                return (
                  <button key={type} type="button" onClick={() => setSeanceType(type)} style={{
                    padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    border: `1px solid ${active ? color.border : T.border}`,
                    background: active ? color.bg : 'rgba(255,255,255,0.03)',
                    color: active ? color.text : T.textMid,
                  }}>
                    {SEANCE_ICONS?.[type] || '💪'} {type}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Exercices */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>
              Exercices ({exercises.length})
            </label>

            {exercises.length > 0 && (
              <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                {exercises.map((ex, i) => (
                  <div key={i} style={{
                    padding: '10px 12px', borderRadius: 12,
                    border: `1px solid ${T.border}`,
                    background: 'rgba(255,255,255,0.03)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{ex.exercise}</span>
                      <button type="button" onClick={() => removeExercise(i)} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      {[
                        { key: 'sets_target', label: 'Séries', placeholder: '4' },
                        { key: 'reps_target', label: 'Reps', placeholder: '8-10' },
                        { key: 'rpe_target', label: 'RPE', placeholder: '8' },
                      ].map(field => (
                        <div key={field.key}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: T.textDim, textTransform: 'uppercase', marginBottom: 3 }}>{field.label}</div>
                          <input
                            value={ex[field.key] ?? ''}
                            onChange={e => updateExercise(i, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            style={{
                              width: '100%', height: 34, borderRadius: 8, padding: '0 8px',
                              border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)',
                              color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recherche exercices */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un exercice..."
              style={{
                width: '100%', height: 40, borderRadius: 10, padding: '0 12px',
                border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)',
                color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8,
              }}
            />
            <div style={{ display: 'grid', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {filtered.map(ex => (
                <button key={ex} type="button" onClick={() => addExercise(ex)} style={{
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.025)',
                  color: T.textMid, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: T.accent, fontWeight: 900, fontSize: 14 }}>+</span>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 20, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, height: 48, borderRadius: 12,
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.textMid, fontWeight: 700, cursor: 'pointer',
          }}>Annuler</button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim()} style={{
            flex: 2, height: 48, borderRadius: 12, border: 'none',
            background: name.trim() ? T.accent : 'rgba(57,224,122,0.2)',
            color: '#050607', fontWeight: 800, fontSize: 14,
            cursor: name.trim() && !saving ? 'pointer' : 'default',
          }}>
            {saving ? 'Sauvegarde...' : 'Créer le programme'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ProgramBuilderPage() {
  const { user } = useAuth()

  const [programs, setPrograms] = useState([])
  const [assignments, setAssignments] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedAthlete, setSelectedAthlete] = useState('all')
  const [selectedDate, setSelectedDate] = useState(null)
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)

  const monday = useMemo(() => getMondayOfWeek(currentWeekOffset), [currentWeekOffset])

  // Grille des semaines visibles (2 semaines à la fois sur mobile, sinon toute la grille)
  const weeksVisible = 2
  const weeks = useMemo(() =>
    Array.from({ length: weeksVisible }, (_, i) => {
      const m = new Date(monday)
      m.setDate(m.getDate() + i * 7)
      return m
    }), [monday])

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      // Programmes du coach
      const { data: progsData } = await supabase
        .from('programs')
        .select('*, program_exercises(*)')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
      setPrograms(progsData || [])

      // Clients
      const { data: links } = await supabase
        .from('coach_clients').select('client_id').eq('coach_id', user.id)
      const ids = (links || []).map(l => l.client_id).filter(Boolean)
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, full_name, email').in('id', ids)
        setClients(profiles || [])
        if (!selectedAthlete || selectedAthlete === 'all') {
          setSelectedAthlete(ids[0])
        }
      }

      // Assignations sur la période visible
      const start = getDateOfDay(getMondayOfWeek(0), 0)
      const end = getDateOfDay(getMondayOfWeek(NB_SEMAINES), 6)
      const { data: assignData } = await supabase
        .from('assignments')
        .select('*')
        .gte('assigned_date', start)
        .lte('assigned_date', end)
      setAssignments(assignData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  async function handleAssign(programId, athleteId, date, note = '') {
    const aid = athleteId || selectedAthlete
    if (!aid || aid === 'all') return
    try {
      const { data } = await supabase.from('assignments').insert({
        program_id: programId,
        athlete_id: aid,
        assigned_date: date,
        note: note || null,
      }).select().single()
      if (data) setAssignments(prev => [...prev, data])
    } catch (err) { console.error(err) }
  }

  async function handleRemoveAssignment(assignmentId) {
    try {
      await supabase.from('assignments').delete().eq('id', assignmentId)
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    } catch (err) { console.error(err) }
  }

  const filteredAssignments = useMemo(() => {
    if (!selectedAthlete || selectedAthlete === 'all') return assignments
    return assignments.filter(a => a.athlete_id === selectedAthlete)
  }, [assignments, selectedAthlete])

  const selectedClient = clients.find(c => c.id === selectedAthlete)

  return (
    <PageWrap>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&display=swap');
        .prog-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .prog-list { display: none; }
        @media (min-width: 900px) {
          .prog-grid { grid-template-columns: 260px minmax(0,1fr); }
          .prog-list { display: block; }
        }
        @media (max-width: 640px) {
          .cal-grid { grid-template-columns: repeat(7, 1fr); gap: 3px; }
        }
      `}</style>

      <div style={{ maxWidth: 1300, margin: '0 auto', display: 'grid', gap: 18 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900, color: T.text, letterSpacing: '-1px' }}>
              Programmation
            </div>
            <div style={{ fontSize: 13, color: T.textDim, marginTop: 2 }}>
              Planifie les séances de tes clients sur le calendrier
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreatePanel(true)}
            style={{
              height: 44, padding: '0 20px', borderRadius: 14, border: 'none',
              background: T.accent, color: '#050607',
              fontWeight: 800, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            + Nouveau programme
          </button>
        </div>

        {/* ── Sélecteur client ── */}
        {clients.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.textDim }}>Client :</span>
            {clients.map(c => (
              <button key={c.id} type="button" onClick={() => setSelectedAthlete(c.id)} style={{
                height: 34, padding: '0 14px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${selectedAthlete === c.id ? T.accent + '50' : T.border}`,
                background: selectedAthlete === c.id ? 'rgba(57,224,122,0.10)' : 'rgba(255,255,255,0.03)',
                color: selectedAthlete === c.id ? T.accentLight : T.textMid,
                fontWeight: 700, fontSize: 12,
              }}>
                {c.full_name || c.email || 'Client'}
              </button>
            ))}
          </div>
        )}

        <div className="prog-grid">

          {/* ── Sidebar programmes (desktop) ── */}
          <div className="prog-list">
            <div style={{
              borderRadius: 18, border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.02)',
              overflow: 'hidden',
              position: 'sticky', top: 16,
            }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>
                  Mes programmes
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                  Glisse sur le calendrier →
                </div>
              </div>
              <div style={{ padding: 10, display: 'grid', gap: 6, maxHeight: 500, overflowY: 'auto' }}>
                {programs.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: T.textDim, fontSize: 13 }}>
                    Aucun programme.<br />Crée-en un !
                  </div>
                ) : programs.map(prog => {
                  const color = getSeanceColor(prog.seance_type)
                  return (
                    <div
                      key={prog.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('programId', prog.id)
                        e.dataTransfer.setData('athleteId', selectedAthlete || '')
                      }}
                      style={{
                        padding: '10px 12px', borderRadius: 12, cursor: 'grab',
                        border: `1px solid ${color.border}`,
                        background: color.bg,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{SEANCE_ICONS?.[prog.seance_type] || '💪'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: color.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {prog.name}
                          </div>
                          <div style={{ fontSize: 10, color: T.textDim, marginTop: 1 }}>
                            {(prog.program_exercises || []).length} exercices
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Calendrier ── */}
          <div style={{ display: 'grid', gap: 16 }}>

            {/* Navigation semaines */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <button type="button" onClick={() => setCurrentWeekOffset(o => o - weeksVisible)} style={{
                width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.03)',
                color: T.textMid, fontSize: 16,
              }}>‹</button>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                  {formatWeekLabel(weeks[0])}
                </div>
                {weeks.length > 1 && (
                  <div style={{ fontSize: 11, color: T.textDim }}>
                    → {formatWeekLabel(weeks[weeks.length - 1])}
                  </div>
                )}
              </div>

              <button type="button" onClick={() => setCurrentWeekOffset(o => o + weeksVisible)} style={{
                width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.03)',
                color: T.textMid, fontSize: 16,
              }}>›</button>
            </div>

            {/* Semaines */}
            {weeks.map((weekMonday, wi) => (
              <div key={wi}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Sem. {Math.abs(currentWeekOffset + wi) + 1} · {weekMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>

                {/* Jours header */}
                <div className="cal-grid" style={{ marginBottom: 4 }}>
                  {JOURS.map(j => (
                    <div key={j} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {j}
                    </div>
                  ))}
                </div>

                {/* Cellules */}
                <div className="cal-grid">
                  {JOURS.map((_, di) => {
                    const date = getDateOfDay(weekMonday, di)
                    return (
                      <CalendarCell
                        key={date}
                        date={date}
                        assignments={filteredAssignments}
                        programs={programs}
                        onDrop={handleAssign}
                        onAssign={handleAssign}
                        onRemove={handleRemoveAssignment}
                        isSelected={selectedDate === date}
                        onSelect={setSelectedDate}
                      />
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Légende */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              {Object.entries(SEANCE_COLORS).filter(([k]) => k !== 'Repos').map(([type, color]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color.text }} />
                  <span style={{ fontSize: 10, color: T.textDim }}>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Programmes (mobile) ── */}
        <div style={{ display: 'block' }} className="prog-list-mobile">
          <div style={{ fontWeight: 800, fontSize: 14, color: T.text, marginBottom: 10 }}>
            Mes programmes
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {programs.map(prog => {
              const color = getSeanceColor(prog.seance_type)
              return (
                <div key={prog.id} style={{
                  padding: '10px 14px', borderRadius: 12, flexShrink: 0,
                  border: `1px solid ${color.border}`, background: color.bg,
                  minWidth: 140,
                }}>
                  <div style={{ fontSize: 16 }}>{SEANCE_ICONS?.[prog.seance_type] || '💪'}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: color.text, marginTop: 4 }}>{prog.name}</div>
                  <div style={{ fontSize: 10, color: T.textDim }}>{(prog.program_exercises || []).length} exercices</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Modal assigner ── */}
      {selectedDate && (
        <AddSessionModal
          date={selectedDate}
          programs={programs}
          selectedAthlete={selectedAthlete}
          onConfirm={(programId, note) => {
            handleAssign(programId, selectedAthlete, selectedDate, note)
            setSelectedDate(null)
          }}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* ── Panel création ── */}
      {showCreatePanel && (
        <CreateProgramPanel
          onSave={() => { setShowCreatePanel(false); loadData() }}
          onClose={() => setShowCreatePanel(false)}
        />
      )}
    </PageWrap>
  )
}
