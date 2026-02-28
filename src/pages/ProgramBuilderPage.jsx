import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Input, Select, Btn, Badge, PageWrap, Divider } from '../components/UI'
import { SEANCES, ALL_EXERCISES, SEANCE_ICONS, T } from '../lib/data'

// ── Drag source : exercice depuis la bibliothèque ──────────────────
function ExoLibrary({ onAdd }) {
  const [search, setSearch] = useState('')
  const filtered = ALL_EXERCISES.filter(e => e.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Input label="Rechercher" value={search} onChange={setSearch} placeholder="Développé, squat..." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
        {filtered.map(exo => (
          <div
            key={exo}
            draggable
            onDragStart={e => e.dataTransfer.setData('exercise', exo)}
            onClick={() => onAdd(exo)}
            style={{
              padding: '9px 12px',
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: T.radiusSm,
              fontSize: 13, color: T.textMid,
              cursor: 'grab',
              userSelect: 'none',
              transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.text }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMid }}
          >
            <span style={{ color: T.accentDim, fontSize: 10 }}>⠿</span>
            {exo}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ligne exercice dans le programme ──────────────────────────────
function ExoRow({ exo, index, onChange, onRemove }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 0.7fr 0.8fr 0.7fr 32px',
      gap: 8, alignItems: 'end',
      padding: '10px 12px',
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radiusSm,
      transition: 'border-color .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHi}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.text, padding: '10px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: T.accentDim, cursor: 'grab', fontSize: 14 }}>⠿</span>
        {exo.exercise}
      </div>
      <Input label="" value={exo.sets_target || ''} onChange={v => onChange(index, 'sets_target', v)} type="number" placeholder="4" min="1" />
      <Input label="" value={exo.reps_target || ''} onChange={v => onChange(index, 'reps_target', v)} placeholder="8-10" />
      <Input label="" value={exo.rpe_target || ''} onChange={v => onChange(index, 'rpe_target', v)} type="number" placeholder="8" min="1" step="0.5" />
      <button onClick={() => onRemove(index)} style={{
        background: 'transparent', border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
        color: T.textDim, cursor: 'pointer', width: 32, height: 38, fontSize: 16,
        transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.danger; e.currentTarget.style.color = T.danger }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim }}
      >×</button>
    </div>
  )
}

export default function ProgramBuilderPage() {
  const { user } = useAuth()
  const [athletes, setAthletes] = useState([])
  const [programs, setPrograms] = useState([])

  // Form nouveau programme
  const [progName, setProgName] = useState('')
  const [progType, setProgType] = useState(Object.keys(SEANCES)[0])
  const [exercises, setExercises] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form assignation
  const [assignProgram, setAssignProgram] = useState('')
  const [assignAthlete, setAssignAthlete] = useState('')
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0])
  const [assignNote, setAssignNote] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignments, setAssignments] = useState([])

  // Drop zone
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [{ data: aths }, { data: progs }, { data: assigns }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('role', 'athlete').order('full_name'),
      supabase.from('programs').select('*, program_exercises(*)').eq('coach_id', user.id).order('created_at', { ascending: false }),
      supabase.from('assignments').select('*, programs(name, seance_type), profiles(full_name, email)').order('assigned_date', { ascending: false }).limit(20),
    ])
    setAthletes(aths || [])
    setPrograms(progs || [])
    setAssignments(assigns || [])
    if (progs?.length) setAssignProgram(progs[0].id)
    if (aths?.length) setAssignAthlete(aths[0].id)
  }

  function addExercise(name) {
    setExercises(p => [...p, { exercise: name, sets_target: '', reps_target: '', rpe_target: '', exercise_order: p.length }])
  }

  function updateExercise(i, field, val) {
    setExercises(p => p.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  }

  function removeExercise(i) {
    setExercises(p => p.filter((_, idx) => idx !== i))
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragOver(false)
    const name = e.dataTransfer.getData('exercise')
    if (name) addExercise(name)
  }

  async function saveProgram() {
    if (!progName.trim() || !exercises.length) return alert('Nomme le programme et ajoute au moins un exercice.')
    setSaving(true)

    const { data: prog, error } = await supabase
      .from('programs')
      .insert({ coach_id: user.id, name: progName, seance_type: progType })
      .select().single()

    if (error) { setSaving(false); return }

    await supabase.from('program_exercises').insert(
      exercises.map((e, i) => ({
        program_id: prog.id,
        exercise: e.exercise,
        sets_target: e.sets_target ? parseInt(e.sets_target) : null,
        reps_target: e.reps_target || null,
        rpe_target: e.rpe_target ? parseFloat(e.rpe_target) : null,
        exercise_order: i,
      }))
    )

    setSaving(false)
    setSaved(true)
    setProgName('')
    setExercises([])
    setTimeout(() => setSaved(false), 3000)
    loadAll()
  }

  async function saveAssignment() {
    if (!assignProgram || !assignAthlete || !assignDate) return
    setAssigning(true)
    await supabase.from('assignments').insert({
      program_id: assignProgram,
      athlete_id: assignAthlete,
      assigned_date: assignDate,
      note: assignNote || null,
    })
    setAssigning(false)
    setAssignNote('')
    loadAll()
  }

  async function deleteProgram(id) {
    if (!window.confirm('Supprimer ce programme ?')) return
    await supabase.from('programs').delete().eq('id', id)
    loadAll()
  }

  async function deleteAssignment(id) {
    await supabase.from('assignments').delete().eq('id', id)
    loadAll()
  }

  return (
    <PageWrap>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 36, letterSpacing: 2, color: T.text, lineHeight: 1 }}>PROGRAMMES</div>
        <div style={{ fontSize: 14, color: T.textMid, marginTop: 6 }}>Crée des programmes et assigne-les à tes athlètes</div>
      </div>

      {/* ── Créer un programme ── */}
      <Card>
        <Label>Nouveau programme</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
          <Input label="Nom du programme" value={progName} onChange={setProgName} placeholder="Ex : Pecs Force S1" required />
          <Select label="Type de séance" value={progType} onChange={setProgType} options={Object.keys(SEANCES)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

          {/* Drop zone / liste exercices */}
          <div>
            {/* Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.8fr 0.7fr 32px', gap: 8, marginBottom: 8, padding: '0 2px' }}>
              {['Exercice', 'Séries', 'Rép. cibles', 'RPE'].map(h => (
                <div key={h} style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase' }}>{h}</div>
              ))}
              <div />
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                minHeight: 120,
                border: `2px dashed ${isDragOver ? T.accent : T.border}`,
                borderRadius: T.radiusSm,
                padding: exercises.length ? 0 : '28px 20px',
                transition: 'border-color .2s, background .2s',
                background: isDragOver ? T.accentGlow : 'transparent',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              {exercises.length === 0 ? (
                <div style={{ textAlign: 'center', color: T.textDim, fontFamily: T.fontDisplay, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
                  {isDragOver ? '↓ Relâche ici' : 'Glisse des exercices ici ou clique dans la liste →'}
                </div>
              ) : (
                exercises.map((exo, i) => (
                  <ExoRow key={i} exo={exo} index={i} onChange={updateExercise} onRemove={removeExercise} />
                ))
              )}
            </div>
          </div>

          {/* Bibliothèque */}
          <div>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 8 }}>Bibliothèque d'exercices</div>
            <ExoLibrary onAdd={addExercise} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, gap: 12, alignItems: 'center' }}>
          {saved && <div style={{ color: T.accent, fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>✓ Programme enregistré</div>}
          <Btn onClick={saveProgram} disabled={saving}>{saving ? 'Enregistrement...' : 'Créer le programme'}</Btn>
        </div>
      </Card>

      {/* ── Assigner à un athlète ── */}
      {programs.length > 0 && athletes.length > 0 && (
        <Card>
          <Label>Assigner une séance</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            <Select
              label="Programme"
              value={assignProgram}
              onChange={setAssignProgram}
              options={programs.map(p => ({ value: p.id, label: p.name }))}
            />
            <Select
              label="Athlète"
              value={assignAthlete}
              onChange={setAssignAthlete}
              options={athletes.map(a => ({ value: a.id, label: a.full_name || a.email }))}
            />
            <Input label="Date" value={assignDate} onChange={setAssignDate} type="date" />
            <Input label="Note (optionnel)" value={assignNote} onChange={setAssignNote} placeholder="Consigne, objectif..." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn onClick={saveAssignment} disabled={assigning}>{assigning ? '...' : 'Assigner'}</Btn>
          </div>
        </Card>
      )}

      {/* ── Assignations récentes ── */}
      {assignments.length > 0 && (
        <Card>
          <Label>Assignations récentes</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assignments.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: T.surface, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 18 }}>{SEANCE_ICONS[a.programs?.seance_type] || '💪'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: T.text }}>{a.programs?.name}</div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                    {a.profiles?.full_name || a.profiles?.email} · {a.assigned_date}
                    {a.note && <span style={{ marginLeft: 8, fontStyle: 'italic' }}>{a.note}</span>}
                  </div>
                </div>
                <button onClick={() => deleteAssignment(a.id)} style={{ background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 16, padding: '4px 8px' }}
                  onMouseEnter={e => e.currentTarget.style.color = T.danger}
                  onMouseLeave={e => e.currentTarget.style.color = T.textDim}
                >×</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Programmes existants ── */}
      {programs.length > 0 && (
        <Card>
          <Label>Mes programmes ({programs.length})</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {programs.map(p => (
              <div key={p.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 14, color: T.text }}>{p.name}</div>
                    <Badge color={T.accent}>{p.seance_type}</Badge>
                  </div>
                  <button onClick={() => deleteProgram(p.id)} style={{ background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 16 }}
                    onMouseEnter={e => e.currentTarget.style.color = T.danger}
                    onMouseLeave={e => e.currentTarget.style.color = T.textDim}
                  >×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(p.program_exercises || []).sort((a, b) => a.exercise_order - b.exercise_order).map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.textMid }}>
                      <span style={{ color: T.accentDim, fontSize: 9 }}>▸</span>
                      <span style={{ flex: 1 }}>{e.exercise}</span>
                      {e.sets_target && <span style={{ color: T.accent, fontFamily: T.fontDisplay, fontWeight: 700 }}>{e.sets_target}×{e.reps_target || '?'}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageWrap>
  )
}
