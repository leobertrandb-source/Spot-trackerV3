import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { T } from '../lib/data'

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: '#07090e', card: 'rgba(12,16,24,0.85)', border: 'rgba(255,255,255,0.07)',
  text: '#edf2f7', sub: '#6b7f94', accent: '#3ecf8e', blue: '#4d9fff',
  purple: '#9d7dea', orange: '#ff7043', red: '#ff4566', yellow: '#fbbf24',
}
const GLASS = { background: C.card, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${C.border}`, borderRadius: 16 }

const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
const DAY_COLORS = ['#4d9fff','#9d7dea','#3ecf8e','#ff7043','#fbbf24','#26d4e8','#f87171']

function extractYoutubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

// ─── Modal sélection exercice ─────────────────────────────────────────────────
function ExPicker({ exercises, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = exercises.filter(e => !search || e.name?.toLowerCase().includes(search.toLowerCase()))
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...GLASS, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un exercice..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none' }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.slice(0, 30).map(ex => {
            const id = extractYoutubeId(ex.youtube_url)
            const thumb = id ? `https://img.youtube.com/vi/${id}/default.jpg` : null
            return (
              <div key={ex.id} onClick={() => onSelect(ex)} style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center' }}>
                  {thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>💪</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                  {ex.muscle_group && <div style={{ fontSize: 11, color: C.sub }}>{ex.muscle_group}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Modal assignation ────────────────────────────────────────────────────────
function AssignModal({ program, clients, onConfirm, onClose }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [weeksCount, setWeeksCount] = useState(program?.weeks_count || 4)

  async function handleConfirm() {
    if (!clientId || !startDate) return
    await onConfirm({ clientId, startDate, weeksCount })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...GLASS, width: '100%', maxWidth: 420 }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Assigner le programme</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{program?.name}</div>
        </div>
        <div style={{ padding: '16px 18px', display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: C.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', appearance: 'none' }}>
              {clients.map(c => <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>{c.full_name || c.email}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Date de début</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Nombre de semaines</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[1, 2, 4, 6, 8, 12].map(w => (
                <button key={w} onClick={() => setWeeksCount(w)} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${weeksCount === w ? C.accent + '60' : C.border}`, background: weeksCount === w ? `${C.accent}15` : 'transparent', color: weeksCount === w ? C.accent : C.sub, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{w} sem.</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleConfirm} disabled={!clientId} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.accent},#2ab377)`, color: '#000', fontWeight: 800, cursor: 'pointer', opacity: !clientId ? 0.5 : 1 }}>
            Assigner {weeksCount} semaine{weeksCount > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Éditeur de programme (Everfit-style) ────────────────────────────────────
function ProgramEditor({ program, exercises, onSave, onClose }) {
  const [name, setName] = useState(program?.name || '')
  const [weeksCount, setWeeksCount] = useState(program?.weeks_count || 1)
  const [days, setDays] = useState([])
  const [activeDay, setActiveDay] = useState(null)
  const [showExPicker, setShowExPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (program?.id) {
      loadDays()
    } else {
      setDays([])
    }
  }, [program?.id])

  async function loadDays() {
    const { data } = await supabase.from('program_days')
      .select('*, program_day_exercises(*)')
      .eq('program_id', program.id)
      .order('week_number').order('day_of_week')
    // Parser les séries stockées en JSON dans le champ reps
    const parsed = (data || []).map(day => ({
      ...day,
      program_day_exercises: (day.program_day_exercises || []).map(ex => {
        let sets = ex.sets
        if (typeof ex.reps === 'string' && ex.reps.trim().startsWith('[')) {
          try { sets = JSON.parse(ex.reps) } catch {}
        }
        if (!Array.isArray(sets)) {
          const n = Number(ex.sets) || 3
          sets = Array.from({ length: n }, () => ({ reps: ex.reps || '8-12', rest: ex.rest_seconds || 90 }))
        }
        return { ...ex, sets, notes: ex.notes || '' }
      })
    }))
    setDays(parsed)
  }

  function getDay(week, dayOfWeek) {
    return days.find(d => d.week_number === week && d.day_of_week === dayOfWeek)
  }

  function addDay(week, dayOfWeek) {
    if (getDay(week, dayOfWeek)) { setActiveDay({ week, dayOfWeek }); return }
    const newDay = { _new: true, week_number: week, day_of_week: dayOfWeek, name: DAYS[dayOfWeek - 1], program_day_exercises: [] }
    setDays(prev => [...prev, newDay])
    setActiveDay({ week, dayOfWeek })
  }

  function removeDay(week, dayOfWeek) {
    setDays(prev => prev.filter(d => !(d.week_number === week && d.day_of_week === dayOfWeek)))
    if (activeDay?.week === week && activeDay?.dayOfWeek === dayOfWeek) setActiveDay(null)
  }

  function addExToDay(week, dayOfWeek, ex) {
    setDays(prev => prev.map(d => {
      if (d.week_number !== week || d.day_of_week !== dayOfWeek) return d
      return { ...d, program_day_exercises: [...(d.program_day_exercises || []), {
        _new: true, exercise_id: ex.id, exercise_name: ex.name,
        sets: [{ reps: '8-12', rest: 90 }, { reps: '8-12', rest: 90 }, { reps: '8-12', rest: 90 }],
        notes: '', position: (d.program_day_exercises || []).length
      }]}
    }))
    setShowExPicker(false)
  }

  function removeExFromDay(week, dayOfWeek, exIdx) {
    setDays(prev => prev.map(d => {
      if (d.week_number !== week || d.day_of_week !== dayOfWeek) return d
      return { ...d, program_day_exercises: d.program_day_exercises.filter((_, i) => i !== exIdx) }
    }))
  }

  function updateExField(week, dayOfWeek, exIdx, field, val) {
    setDays(prev => prev.map(d => {
      if (d.week_number !== week || d.day_of_week !== dayOfWeek) return d
      return { ...d, program_day_exercises: d.program_day_exercises.map((e, i) => i === exIdx ? { ...e, [field]: val } : e) }
    }))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      let progId = program?.id

      // Créer ou mettre à jour le programme
      if (!progId) {
        const { data } = await supabase.from('programs').insert({ coach_id: (await supabase.auth.getUser()).data.user.id, name: name.trim(), weeks_count: weeksCount }).select().single()
        progId = data.id
      } else {
        await supabase.from('programs').update({ name: name.trim(), weeks_count: weeksCount }).eq('id', progId)
        // Supprimer les anciens jours
        await supabase.from('program_days').delete().eq('program_id', progId)
      }

      // Recréer tous les jours + exercices
      for (const day of days) {
        const { data: savedDay } = await supabase.from('program_days').insert({
          program_id: progId, week_number: day.week_number, day_of_week: day.day_of_week, name: day.name
        }).select().single()

        if (savedDay && day.program_day_exercises?.length > 0) {
          await supabase.from('program_day_exercises').insert(
            day.program_day_exercises.map((ex, i) => ({
              day_id: savedDay.id, exercise_id: ex.exercise_id, exercise_name: ex.exercise_name,
              sets: Array.isArray(ex.sets) ? ex.sets.length : (ex.sets || 3),
              reps: Array.isArray(ex.sets) ? JSON.stringify(ex.sets) : (ex.reps || '8-12'),
              rest_seconds: Array.isArray(ex.sets) ? (ex.sets[0]?.rest || 90) : (ex.rest_seconds || 90),
              notes: ex.notes || null, position: i
            }))
          )
        }
      }

      onSave()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const activeDayData = activeDay ? getDay(activeDay.week, activeDay.dayOfWeek) : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700;800&display=swap');
      .prog-set-row { grid-template-columns: 22px 1fr 1fr 64px 1fr 22px; }
      @media (max-width: 700px) { .prog-set-row { grid-template-columns: 22px 1fr 1fr 22px; } .prog-hide-mobile { display: none !important; } }
      .day-cell:hover { opacity: .85; }
      .day-empty:hover { border-color: rgba(255,255,255,0.18) !important; background: rgba(255,255,255,0.03) !important; }
    `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '13px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 6px' }}>←</button>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du programme..."
          style={{ flex: 1, background: 'transparent', border: 'none', color: C.text, fontSize: 18, fontWeight: 800, outline: 'none', fontFamily: "'Syne',sans-serif" }} />
        <button onClick={handleSave} disabled={saving || !name.trim()}
          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.accent},#2ab377)`, color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: saving || !name.trim() ? 0.5 : 1 }}>
          {saving ? 'Sauvegarde...' : 'Enregistrer'}
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left — multi-week grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>

          {Array.from({ length: weeksCount }, (_, wi) => {
            const week = wi + 1
            return (
              <div key={week} style={{ marginBottom: 20 }}>
                {/* Week label row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: 1 }}>Semaine {week}</div>
                  {weeksCount > 1 && wi === weeksCount - 1 && (
                    <button onClick={() => { setWeeksCount(w => w - 1); if (activeDay?.week === week) setActiveDay(null) }}
                      style={{ marginLeft: 'auto', fontSize: 11, color: C.red, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                      Supprimer
                    </button>
                  )}
                </div>

                {/* Day cells grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                  {DAYS.map((dayName, di) => {
                    const dayOfWeek = di + 1
                    const dayData = getDay(week, dayOfWeek)
                    const isActive = activeDay?.week === week && activeDay?.dayOfWeek === dayOfWeek
                    const c = DAY_COLORS[di]
                    const exCount = (dayData?.program_day_exercises || []).length

                    if (dayData) {
                      return (
                        <div key={di} className="day-cell" onClick={() => setActiveDay({ week, dayOfWeek })}
                          style={{ borderRadius: 10, border: `1.5px solid ${isActive ? c : c + '40'}`, background: isActive ? `${c}1e` : `${c}0a`, padding: '8px 7px', cursor: 'pointer', minHeight: 76, display: 'flex', flexDirection: 'column', transition: 'border-color .15s,background .15s', position: 'relative' }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: c, letterSpacing: .5, marginBottom: 4 }}>{dayName.slice(0, 3).toUpperCase()}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, flex: 1, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {dayData.name || dayName}
                          </div>
                          <div style={{ fontSize: 10, color: C.sub, marginTop: 4 }}>{exCount} exo{exCount !== 1 ? 's' : ''}</div>
                          {isActive && <div style={{ position: 'absolute', top: 5, right: 6, width: 6, height: 6, borderRadius: '50%', background: c }} />}
                        </div>
                      )
                    }

                    return (
                      <div key={di} className="day-empty" onClick={() => addDay(week, dayOfWeek)}
                        style={{ borderRadius: 10, border: `1px dashed rgba(255,255,255,0.08)`, background: 'transparent', padding: '8px 7px', cursor: 'pointer', minHeight: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'border-color .15s,background .15s' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: .5 }}>{dayName.slice(0, 3).toUpperCase()}</div>
                        <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.15)', lineHeight: 1 }}>+</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <button onClick={() => setWeeksCount(w => w + 1)}
            style={{ padding: '9px 18px', borderRadius: 10, border: `1px dashed ${C.accent}40`, background: `${C.accent}08`, color: C.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
            + Ajouter une semaine
          </button>
        </div>

        {/* Right — exercise panel */}
        {activeDay && activeDayData && (
          <div style={{ width: 360, flexShrink: 0, borderLeft: `1px solid ${C.border}`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Panel header */}
            <div style={{ padding: '13px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'flex-start', position: 'sticky', top: 0, background: C.bg, zIndex: 2 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: DAY_COLORS[activeDay.dayOfWeek - 1], letterSpacing: .5, textTransform: 'uppercase', marginBottom: 4 }}>
                  Sem. {activeDay.week} — {DAYS[activeDay.dayOfWeek - 1]}
                </div>
                <input value={activeDayData.name || ''} onChange={e => setDays(prev => prev.map(d => d.week_number === activeDay.week && d.day_of_week === activeDay.dayOfWeek ? { ...d, name: e.target.value } : d))}
                  style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 15, fontWeight: 800, outline: 'none', width: '100%' }}
                  placeholder={`Séance ${DAYS[activeDay.dayOfWeek - 1]}`} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => removeDay(activeDay.week, activeDay.dayOfWeek)}
                  style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14, padding: '2px 4px' }} title="Supprimer cette séance">🗑️</button>
                <button onClick={() => setActiveDay(null)} style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
              </div>
            </div>

            {/* Exercises list */}
            <div style={{ flex: 1, padding: '12px 14px', display: 'grid', gap: 8, alignContent: 'start' }}>
              {(activeDayData.program_day_exercises || []).map((ex, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>{ex.exercise_name}</div>
                    <button onClick={() => removeExFromDay(activeDay.week, activeDay.dayOfWeek, i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>

                  {/* Column headers */}
                  <div className="prog-set-row" style={{ display: 'grid', gap: 5, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: C.sub, textAlign: 'center' }}>#</div>
                    <div style={{ fontSize: 10, color: C.sub }}>Reps</div>
                    <div style={{ fontSize: 10, color: C.sub }}>Charge</div>
                    <div style={{ fontSize: 10, color: C.sub }}>Repos</div>
                    <div style={{ fontSize: 10, color: C.sub }}>Note</div>
                    <div />
                  </div>

                  {/* Set rows */}
                  <div style={{ display: 'grid', gap: 4, marginBottom: 6 }}>
                    {(Array.isArray(ex.sets) ? ex.sets : []).map((set, si) => (
                      <div key={si} className="prog-set-row" style={{ display: 'grid', gap: 5, alignItems: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textAlign: 'center' }}>{si + 1}</div>
                        <input value={set.reps || ''} onChange={e => updateExField(activeDay.week, activeDay.dayOfWeek, i, 'sets', ex.sets.map((s, idx) => idx === si ? { ...s, reps: e.target.value } : s))}
                          placeholder="8-12"
                          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 6px', color: C.text, fontSize: 11, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        <input value={set.load || ''} onChange={e => updateExField(activeDay.week, activeDay.dayOfWeek, i, 'sets', ex.sets.map((s, idx) => idx === si ? { ...s, load: e.target.value } : s))}
                          placeholder="80kg"
                          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 6px', color: C.text, fontSize: 11, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        <input type="number" value={set.rest || ''} onChange={e => updateExField(activeDay.week, activeDay.dayOfWeek, i, 'sets', ex.sets.map((s, idx) => idx === si ? { ...s, rest: Number(e.target.value) } : s))}
                          placeholder="90" className="prog-hide-mobile"
                          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 6px', color: C.text, fontSize: 11, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        <input value={set.note || ''} onChange={e => updateExField(activeDay.week, activeDay.dayOfWeek, i, 'sets', ex.sets.map((s, idx) => idx === si ? { ...s, note: e.target.value } : s))}
                          placeholder="tempo..." className="prog-hide-mobile"
                          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 6px', color: C.text, fontSize: 11, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        <button onClick={() => updateExField(activeDay.week, activeDay.dayOfWeek, i, 'sets', ex.sets.filter((_, idx) => idx !== si))}
                          style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 14 }}>×</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => updateExField(activeDay.week, activeDay.dayOfWeek, i, 'sets', [...(Array.isArray(ex.sets) ? ex.sets : []), { reps: '8-12', rest: 90 }])}
                      style={{ padding: '4px 9px', borderRadius: 6, background: `${C.accent}10`, border: `1px dashed ${C.accent}30`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      + Série
                    </button>
                    <textarea value={ex.notes || ''} onChange={e => updateExField(activeDay.week, activeDay.dayOfWeek, i, 'notes', e.target.value)}
                      placeholder="Consignes..." rows={1}
                      style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', color: C.sub, fontSize: 11, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              ))}

              <button onClick={() => setShowExPicker(true)}
                style={{ padding: '10px', borderRadius: 10, background: `${C.accent}10`, border: `1px dashed ${C.accent}40`, color: C.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                + Ajouter un exercice
              </button>
            </div>
          </div>
        )}
      </div>

      {showExPicker && activeDay && (
        <ExPicker exercises={exercises} onSelect={ex => addExToDay(activeDay.week, activeDay.dayOfWeek, ex)} onClose={() => setShowExPicker(false)} />
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ProgramBuilderPage() {
  const { user, profile } = useAuth()
  const coachId = profile?.id || user?.id || null
  const [programs, setPrograms] = useState([])
  const [exercises, setExercises] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProgram, setEditingProgram] = useState(null) // null=liste, false=nouveau, obj=édition
  const [assigningProgram, setAssigningProgram] = useState(null)

  const load = useCallback(async () => {
    if (!coachId) {
      setPrograms([])
      setExercises([])
      setClients([])
      setLoading(false)
      return
    }

    setLoading(true)
    const [{ data: progs }, { data: exs }, { data: links }] = await Promise.all([
      supabase.from('programs').select('*, program_days(*, program_day_exercises(*))').order('created_at', { ascending: false }),
      supabase.from('exercises').select('*').order('name'),
      supabase.from('coach_clients').select('client_id').eq('coach_id', coachId),
    ])
    setPrograms(progs || [])
    setExercises(exs || [])

    if (links?.length > 0) {
      const ids = links.map(l => l.client_id)
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
      setClients(profiles || [])
    }
    setLoading(false)
  }, [coachId])

  useEffect(() => { load() }, [load])

  async function handleAssign({ clientId, startDate, weeksCount }) {
    const prog = assigningProgram
    if (!prog || !coachId) return

    const days = prog.program_days || []
    const start = new Date(startDate)

    // La semaine type est toujours la semaine 1 — on la répète N fois
    const daysThisWeek = days.filter(d => d.week_number === 1)
    for (let w = 0; w < weeksCount; w++) {

      for (const day of daysThisWeek) {
        const assignDate = new Date(start)
        // Lundi de la semaine W + décalage du jour
        const mondayOffset = w * 7
        assignDate.setDate(start.getDate() + mondayOffset + (day.day_of_week - 1))
        const iso = assignDate.toISOString().split('T')[0]
        await supabase.from('assignments').insert({
          coach_id: coachId, client_id: clientId,
          program_id: prog.id, program_day_id: day.id,
          assigned_date: iso, week_offset: w,
        })
      }
    }
    setAssigningProgram(null)
  }

  async function deleteProgram(id) {
    if (!window.confirm('Supprimer ce programme ?')) return
    await supabase.from('programs').delete().eq('id', id)
    setPrograms(prev => prev.filter(p => p.id !== id))
  }

  async function duplicateProgram(prog) {
    if (!coachId) return
    const { data: newProg } = await supabase.from('programs').insert({
      coach_id: coachId, name: `${prog.name} (copie)`, weeks_count: prog.weeks_count
    }).select().single()
    if (!newProg) return

    for (const day of prog.program_days || []) {
      const { data: newDay } = await supabase.from('program_days').insert({
        program_id: newProg.id, week_number: day.week_number, day_of_week: day.day_of_week, name: day.name
      }).select().single()
      if (newDay && day.program_day_exercises?.length > 0) {
        await supabase.from('program_day_exercises').insert(
          day.program_day_exercises.map(ex => ({ ...ex, id: undefined, day_id: newDay.id }))
        )
      }
    }
    load()
  }

  if (editingProgram !== null) {
    return <ProgramEditor program={editingProgram === false ? null : editingProgram} exercises={exercises}
      onSave={() => { setEditingProgram(null); load() }} onClose={() => setEditingProgram(null)} />
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 'clamp(14px,3vw,24px) clamp(12px,3vw,20px)', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700;800&display=swap');
      .prog-set-row { grid-template-columns: 24px 1fr 1fr 70px 1fr 24px; }
      @media (max-width: 600px) { .prog-set-row { grid-template-columns: 24px 1fr 1fr 24px; } .prog-set-row .prog-hide-mobile { display: none !important; } }
    `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.5px' }}>Programmes</h1>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>{programs.length} programme{programs.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={() => setEditingProgram(false)} style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${C.accent},#2ab377)`, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            + Nouveau programme
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.sub }}>Chargement...</div>
        ) : programs.length === 0 ? (
          <div style={{ ...GLASS, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Aucun programme</div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Crée ton premier programme hebdomadaire</div>
            <button onClick={() => setEditingProgram(false)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: `${C.accent}15`, color: C.accent, fontWeight: 700, cursor: 'pointer' }}>Créer un programme</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {programs.map(prog => {
              const totalDays = (prog.program_days || []).length
              const totalExos = (prog.program_days || []).reduce((s, d) => s + (d.program_day_exercises || []).length, 0)
              return (
                <div key={prog.id} style={{ ...GLASS, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: "'Syne',sans-serif" }}>{prog.name}</div>
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>📅 {prog.weeks_count || 1} semaine{(prog.weeks_count || 1) > 1 ? 's' : ''}</span>
                        <span>🏋️ {totalDays} séance{totalDays !== 1 ? 's' : ''} · {totalExos} exercice{totalExos !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Aperçu des jours */}
                      {totalDays > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(prog.program_days || []).sort((a,b) => a.week_number - b.week_number || a.day_of_week - b.day_of_week).map(d => (
                            <div key={d.id} style={{ padding: '3px 8px', borderRadius: 6, background: `${DAY_COLORS[d.day_of_week - 1]}15`, border: `1px solid ${DAY_COLORS[d.day_of_week - 1]}30`, fontSize: 10, color: DAY_COLORS[d.day_of_week - 1], fontWeight: 700 }}>
                              {prog.weeks_count > 1 ? `S${d.week_number} ` : ''}{DAYS[d.day_of_week - 1].slice(0, 3)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                      <button onClick={() => setEditingProgram(prog)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✏️ Éditer</button>
                      <button onClick={() => duplicateProgram(prog)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📋 Dupliquer</button>
                      {clients.length > 0 && (
                        <button onClick={() => setAssigningProgram(prog)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.accent}40`, background: `${C.accent}10`, color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>👤 Assigner</button>
                      )}
                      <button onClick={() => deleteProgram(prog.id)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,69,102,0.2)', background: 'rgba(255,69,102,0.06)', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {assigningProgram && (
        <AssignModal program={assigningProgram} clients={clients} onConfirm={handleAssign} onClose={() => setAssigningProgram(null)} />
      )}
    </div>
  )
}
