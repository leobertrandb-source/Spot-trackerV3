import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { T } from '../lib/data'
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Clock,
  Dumbbell, Users, Calendar, MoreHorizontal
} from 'lucide-react'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const STATUS_STYLE = {
  planned: { color: T.accent,   bg: `${T.accent}18`,   label: 'Planifié' },
  done:    { color: '#60a5fa',  bg: 'rgba(96,165,250,0.12)', label: 'Fait' },
  missed:  { color: '#f43f5e',  bg: 'rgba(244,63,94,0.1)',   label: 'Manqué' },
}

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
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

function formatDay(date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── Pill de séance ──────────────────────────────────────────────────────────
function SessionPill({ item, athletes, onDelete, onStatusChange }) {
  const [menu, setMenu] = useState(false)
  const athlete = athletes.find(a => a.id === item.athlete_id)
  const st = STATUS_STYLE[item.status] || STATUS_STYLE.planned
  const color = athlete?.color || T.accent

  return (
    <div
      style={{
        background: `${color}14`,
        border: `1px solid ${color}28`,
        borderRadius: 8,
        padding: '5px 8px',
        marginBottom: 4,
        position: 'relative',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label || 'Séance'}
          </div>
          <div style={{ fontSize: 10, color: T.textMid, marginTop: 1 }}>
            {athlete?.full_name?.split(' ')[0] || '—'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: st.color }} />
          <button
            onClick={() => setMenu(m => !m)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: T.textDim }}
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
      </div>

      {menu && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 50,
          background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: T.shadowMd, padding: '6px 0', minWidth: 140,
        }}>
          {['planned', 'done', 'missed'].map(s => (
            <button key={s} onClick={() => { onStatusChange(item.id, s); setMenu(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: item.status === s ? `${STATUS_STYLE[s].color}12` : 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: item.status === s ? STATUS_STYLE[s].color : T.textMid, fontWeight: item.status === s ? 700 : 500 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_STYLE[s].color }} />
              {STATUS_STYLE[s].label}
            </button>
          ))}
          <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
          <button onClick={() => { onDelete(item.id); setMenu(false) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#f43f5e', fontWeight: 600 }}>
            <X size={12} /> Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Modal ajout séance ──────────────────────────────────────────────────────
function AddModal({ date, athletes, programs, onSave, onClose }) {
  const [athleteId, setAthleteId] = useState(athletes[0]?.id || '')
  const [programId, setProgramId] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!athleteId) return
    setSaving(true)
    await onSave({ athleteId, programId: programId || null, label: label || (programs.find(p => p.id === programId)?.name) || 'Séance', date })
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, width: '100%', maxWidth: 400, boxShadow: T.shadowLg }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Ajouter une séance</div>
            <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
              {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim }}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 18px', display: 'grid', gap: 14 }}>
          {/* Athlète */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Athlète</label>
            <select value={athleteId} onChange={e => setAthleteId(e.target.value)}
              style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 13, outline: 'none', fontFamily: T.fontBody }}>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
            </select>
          </div>

          {/* Programme */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Programme (optionnel)</label>
            <select value={programId} onChange={e => setProgramId(e.target.value)}
              style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 13, outline: 'none', fontFamily: T.fontBody }}>
              <option value="">— Séance libre —</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Label */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Nom de la séance</label>
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="ex: Haut du corps, Force, Cardio..."
              style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: T.fontBody }} />
          </div>

          <button onClick={handleSave} disabled={saving || !athleteId}
            style={{ height: 44, borderRadius: T.radius, background: T.accent, color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: T.fontBody }}>
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CoachPlanningPage() {
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [athletes, setAthletes] = useState([])
  const [programs, setPrograms] = useState([])
  const [planning, setPlanning] = useState([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(null) // date string | null
  const [filterAthlete, setFilterAthlete] = useState('all')

  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )
  const weekEnd = weekDates[6]

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    const { data: links } = await supabase
      .from('coach_clients').select('client_id').eq('coach_id', user.id)
    const ids = (links || []).map(l => l.client_id)

    const [
      { data: profs },
      { data: progs },
      { data: plans },
    ] = await Promise.all([
      ids.length ? supabase.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] },
      supabase.from('programs').select('id, name, color, weeks_count').eq('coach_id', user.id).order('created_at', { ascending: false }),
      supabase.from('coach_planning').select('*')
        .eq('coach_id', user.id)
        .gte('planned_date', toISO(weekStart))
        .lte('planned_date', toISO(weekEnd)),
    ])

    const COLORS = ['#3ecf8e', '#60a5fa', '#a78bfa', '#fb923c', '#f43f5e', '#fbbf24', '#26d4e8']
    setAthletes((profs || []).map((a, i) => ({ ...a, color: COLORS[i % COLORS.length] })))
    setPrograms(progs || [])
    setPlanning(plans || [])
    setLoading(false)
  }, [user?.id, weekStart])

  useEffect(() => { load() }, [load])

  async function handleAddSession({ athleteId, programId, label, date }) {
    const { data } = await supabase.from('coach_planning').insert({
      coach_id: user.id,
      athlete_id: athleteId,
      program_id: programId || null,
      planned_date: date,
      label,
      status: 'planned',
    }).select().single()
    if (data) setPlanning(p => [...p, data])
  }

  async function handleDelete(id) {
    await supabase.from('coach_planning').delete().eq('id', id)
    setPlanning(p => p.filter(x => x.id !== id))
  }

  async function handleStatusChange(id, status) {
    await supabase.from('coach_planning').update({ status }).eq('id', id)
    setPlanning(p => p.map(x => x.id === id ? { ...x, status } : x))
  }

  const filteredPlanning = filterAthlete === 'all'
    ? planning
    : planning.filter(p => p.athlete_id === filterAthlete)

  const stats = {
    total:   planning.length,
    done:    planning.filter(p => p.status === 'done').length,
    planned: planning.filter(p => p.status === 'planned').length,
    missed:  planning.filter(p => p.status === 'missed').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.fontBody, padding: 'clamp(20px,3vw,32px) clamp(16px,3vw,28px) 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 'clamp(22px,4vw,28px)', fontWeight: 900, color: T.text, letterSpacing: -0.5 }}>Planning</div>
            <div style={{ color: T.textMid, fontSize: 14, marginTop: 3 }}>Vue hebdomadaire — séances planifiées</div>
          </div>

          {/* Week nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: '6px 10px' }}>
            <button onClick={() => setWeekStart(d => addDays(d, -7))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMid, display: 'grid', placeItems: 'center', padding: 4 }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, minWidth: 160, textAlign: 'center' }}>
              {formatDay(weekDates[0])} — {formatDay(weekDates[6])}
            </div>
            <button onClick={() => setWeekStart(d => addDays(d, 7))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMid, display: 'grid', placeItems: 'center', padding: 4 }}>
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setWeekStart(getMondayOf(new Date()))}
              style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 8, padding: '4px 10px', color: T.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: T.fontBody }}>
              Auj.
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total', value: stats.total, color: T.accent },
            { label: 'Planifiés', value: stats.planned, color: '#fbbf24' },
            { label: 'Réalisés', value: stats.done, color: '#60a5fa' },
            { label: 'Manqués', value: stats.missed, color: '#f43f5e' },
          ].map(s => (
            <div key={s.label} style={{ background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filtre athlète */}
        {athletes.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <button onClick={() => setFilterAthlete('all')}
              style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${filterAthlete === 'all' ? T.accent + '50' : T.border}`, background: filterAthlete === 'all' ? `${T.accent}15` : 'transparent', color: filterAthlete === 'all' ? T.accent : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Tous
            </button>
            {athletes.map(a => (
              <button key={a.id} onClick={() => setFilterAthlete(a.id)}
                style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${filterAthlete === a.id ? a.color + '50' : T.border}`, background: filterAthlete === a.id ? `${a.color}15` : 'transparent', color: filterAthlete === a.id ? a.color : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {a.full_name?.split(' ')[0] || a.email}
              </button>
            ))}
          </div>
        )}

        {/* Grille semaine */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {weekDates.map((date, i) => {
              const dateStr = toISO(date)
              const today = toISO(new Date())
              const isToday = dateStr === today
              const isPast = dateStr < today
              const dayItems = filteredPlanning.filter(p => p.planned_date === dateStr)

              return (
                <div key={dateStr} style={{
                  background: isToday ? `${T.accent}08` : T.bgAlt,
                  border: `1px solid ${isToday ? T.accent + '30' : T.border}`,
                  borderRadius: 14,
                  padding: '10px 8px',
                  minHeight: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  opacity: isPast && !isToday ? 0.7 : 1,
                }}>
                  {/* En-tête du jour */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isToday ? T.accent : T.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>{DAYS[i]}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: isToday ? T.accent : T.text, lineHeight: 1.1 }}>{date.getDate()}</div>
                    </div>
                    <button onClick={() => setAddModal(dateStr)}
                      style={{ width: 24, height: 24, borderRadius: 7, background: `${T.accent}18`, border: `1px solid ${T.accent}25`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: T.accent }}>
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Séances */}
                  <div style={{ flex: 1 }}>
                    {dayItems.map(item => (
                      <SessionPill
                        key={item.id}
                        item={item}
                        athletes={athletes}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                    {dayItems.length === 0 && (
                      <div style={{ fontSize: 10, color: T.textSub, textAlign: 'center', paddingTop: 8, opacity: 0.5 }}>—</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {athletes.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 40, color: T.textDim, fontSize: 14 }}>
            Aucun client — ajoute des clients pour planifier des séances.
          </div>
        )}
      </div>

      {addModal && (
        <AddModal
          date={addModal}
          athletes={athletes}
          programs={programs}
          onSave={handleAddSession}
          onClose={() => setAddModal(null)}
        />
      )}
    </div>
  )
}
