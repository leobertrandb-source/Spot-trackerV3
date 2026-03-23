import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

const P = {
  bg:     '#f5f3ef',
  card:   '#ffffff',
  border: '#e8e4dc',
  text:   '#1a1a1a',
  sub:    '#6b6b6b',
  dim:    '#9e9e9e',
  accent: '#1a3a2a',
  green:  '#2d6a4f',
  yellow: '#b5830a',
  red:    '#c0392b',
  blue:   '#1a3a5c',
}

const BODY_ZONES = [
  { key: 'tete',     label: 'Tête' },
  { key: 'epaule',   label: 'Épaule' },
  { key: 'poignet',  label: 'Poignet / Main' },
  { key: 'dos',      label: 'Dos' },
  { key: 'genou',    label: 'Genou' },
  { key: 'cheville', label: 'Cheville / Pied' },
  { key: 'lma',      label: 'LMA' },
  { key: 'autre',    label: 'Autre' },
]

const APPT_TYPES = [
  { key: 'medecin',    label: 'Médecin' },
  { key: 'chirurgien', label: 'Chirurgien' },
  { key: 'irm',        label: 'IRM' },
  { key: 'scanner',    label: 'Scanner' },
  { key: 'radio',      label: 'Radio' },
  { key: 'kine',       label: 'Kiné' },
  { key: 'autre',      label: 'Autre' },
]

const STATUS_CONFIG = {
  active:       { label: 'Blessure active',   color: P.red,    bg: '#fdecea' },
  surveillance: { label: 'Surveillance',      color: P.yellow, bg: '#fdf6e3' },
  archive:      { label: 'Archivé',           color: P.sub,    bg: '#f0ede8' },
}

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 44, height: 44, borderRadius: '50%', background: P.accent, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1 }}>{children}</div>
      {action}
    </div>
  )
}

function Btn({ children, onClick, variant = 'primary', small = false, disabled = false }) {
  const styles = {
    primary:   { background: P.accent, color: '#fff', border: `1px solid ${P.accent}` },
    secondary: { background: 'transparent', color: P.accent, border: `1px solid ${P.accent}` },
    danger:    { background: 'transparent', color: P.red, border: `1px solid ${P.red}` },
    ghost:     { background: 'transparent', color: P.sub, border: `1px solid ${P.border}` },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: small ? '6px 12px' : '9px 18px',
      borderRadius: 10, fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
      fontFamily: 'inherit', transition: 'opacity 0.15s',
    }}>
      {children}
    </button>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: P.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: P.sub }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: P.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  )
}

const inp = {
  width: '100%', padding: '10px 12px', background: P.bg,
  border: `1px solid ${P.border}`, borderRadius: 10,
  color: P.text, fontSize: 14, outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export default function MedicalPage() {
  const { id: athleteId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [athlete, setAthlete]         = useState(null)
  const [injuries, setInjuries]       = useState([])
  const [appointments, setAppointments] = useState([])
  const [notes, setNotes]             = useState([])
  const [matches, setMatches]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState('injuries')

  // Modals
  const [showInjuryModal, setShowInjuryModal]   = useState(false)
  const [showApptModal, setShowApptModal]       = useState(false)
  const [showNoteModal, setShowNoteModal]       = useState(false)
  const [editingInjury, setEditingInjury]       = useState(null)

  // Forms
  const [injuryForm, setInjuryForm] = useState({ body_zone: 'genou', description: '', date_injury: new Date().toISOString().split('T')[0], date_return: '', status: 'active', match_id: '' })
  const [apptForm, setApptForm]     = useState({ type: 'kine', date_appointment: '', location: '', notes: '', injury_id: '' })
  const [noteForm, setNoteForm]     = useState({ content: '', injury_id: '', is_pinned: false })
  const [saving, setSaving]         = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { data: profile },
      { data: inj },
      { data: appts },
      { data: nts },
      { data: mtch },
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('id', athleteId).single(),
      supabase.from('medical_injuries').select('*').eq('athlete_id', athleteId).order('date_injury', { ascending: false }),
      supabase.from('medical_appointments').select('*').eq('athlete_id', athleteId).order('date_appointment', { ascending: true }),
      supabase.from('medical_notes').select('*').eq('athlete_id', athleteId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('match_history').select('id, label, match_date, opponent').eq('coach_id', user.id).order('match_date', { ascending: false }),
    ])
    setAthlete(profile)
    setInjuries(inj || [])
    setAppointments(appts || [])
    setNotes(nts || [])
    setMatches(mtch || [])
    setLoading(false)
  }, [athleteId, user.id])

  useEffect(() => { load() }, [load])

  // ── Sauvegarder une blessure ──────────────────────────────────────────────
  async function saveInjury() {
    setSaving(true)
    const { match_id, ...restForm } = injuryForm
    const payload = { ...restForm, athlete_id: athleteId, coach_id: user.id }

    let injuryId = editingInjury?.id
    if (editingInjury) {
      await supabase.from('medical_injuries').update(payload).eq('id', editingInjury.id)
    } else {
      const { data } = await supabase.from('medical_injuries').insert(payload).select().single()
      injuryId = data?.id
    }

    // Si un match est lié, créer l'entrée dans match_injuries
    if (match_id && injuryId) {
      await supabase.from('match_injuries').upsert({
        match_id,
        athlete_id: athleteId,
        injury_id: injuryId,
        body_zone: injuryForm.body_zone,
        description: injuryForm.description,
      }, { onConflict: 'match_id,athlete_id,injury_id' })
    }

    setSaving(false)
    setShowInjuryModal(false)
    setEditingInjury(null)
    setInjuryForm({ body_zone: 'genou', description: '', date_injury: new Date().toISOString().split('T')[0], date_return: '', status: 'active', match_id: '' })
    load()
  }

  // ── Sauvegarder un RDV ───────────────────────────────────────────────────
  async function saveAppt() {
    setSaving(true)
    await supabase.from('medical_appointments').insert({
      ...apptForm,
      athlete_id: athleteId,
      coach_id: user.id,
      injury_id: apptForm.injury_id || null,
    })
    setSaving(false)
    setShowApptModal(false)
    setApptForm({ type: 'kine', date_appointment: '', location: '', notes: '', injury_id: '' })
    load()
  }

  // ── Sauvegarder une note ─────────────────────────────────────────────────
  async function saveNote() {
    if (!noteForm.content.trim()) return
    setSaving(true)
    await supabase.from('medical_notes').insert({
      ...noteForm,
      athlete_id: athleteId,
      author_id: user.id,
      injury_id: noteForm.injury_id || null,
    })
    setSaving(false)
    setShowNoteModal(false)
    setNoteForm({ content: '', injury_id: '', is_pinned: false })
    load()
  }

  // ── Toggle pin note ───────────────────────────────────────────────────────
  async function togglePin(note) {
    await supabase.from('medical_notes').update({ is_pinned: !note.is_pinned }).eq('id', note.id)
    load()
  }

  // ── Archiver une blessure ─────────────────────────────────────────────────
  async function archiveInjury(injury) {
    await supabase.from('medical_injuries').update({ status: 'archive' }).eq('id', injury.id)
    load()
  }

  const activeInjuries      = injuries.filter(i => i.status === 'active')
  const surveillanceInjuries = injuries.filter(i => i.status === 'surveillance')
  const archivedInjuries    = injuries.filter(i => i.status === 'archive')
  const upcomingAppts       = appointments.filter(a => new Date(a.date_appointment) >= new Date())
  const pinnedNotes         = notes.filter(n => n.is_pinned)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: P.sub, fontFamily: 'inherit' }}>Chargement...</div>

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", padding: 'clamp(20px,3vw,36px)' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.sub, fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0, fontFamily: 'inherit' }}>
            ← Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={athlete?.full_name || athlete?.email} />
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px,3vw,30px)', fontWeight: 400, color: P.text, margin: 0 }}>
                {athlete?.full_name || athlete?.email}
              </h1>
              <div style={{ fontSize: 13, color: P.sub, marginTop: 4 }}>Fiche médicale</div>
            </div>
          </div>
        </div>

        {/* ── KPIs rapides ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Blessures actives', value: activeInjuries.length, color: activeInjuries.length > 0 ? P.red : P.green },
            { label: 'Surveillance',      value: surveillanceInjuries.length, color: surveillanceInjuries.length > 0 ? P.yellow : P.sub },
            { label: 'RDV à venir',       value: upcomingAppts.length, color: upcomingAppts.length > 0 ? P.blue : P.sub },
            { label: 'Notes épinglées',   value: pinnedNotes.length, color: pinnedNotes.length > 0 ? P.accent : P.sub },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'injuries',     label: `🩹 Blessures (${injuries.length})` },
            { key: 'appointments', label: `📅 RDV (${appointments.length})` },
            { key: 'notes',        label: `📝 Notes (${notes.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${activeTab === t.key ? P.accent : P.border}`,
              background: activeTab === t.key ? P.accent : P.card,
              color: activeTab === t.key ? '#fff' : P.text,
              transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── TAB BLESSURES ── */}
        {activeTab === 'injuries' && (
          <div>
            <SectionTitle action={<Btn small onClick={() => { setEditingInjury(null); setShowInjuryModal(true) }}>+ Nouvelle blessure</Btn>}>
              Blessures
            </SectionTitle>

            {injuries.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 14, border: `1px solid ${P.border}` }}>
                Aucune blessure enregistrée
              </div>
            )}

            {/* Actives */}
            {activeInjuries.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: P.red, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>🔴 Actives</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {activeInjuries.map(inj => <InjuryCard key={inj.id} injury={inj} onEdit={() => { setEditingInjury(inj); setInjuryForm({ body_zone: inj.body_zone, description: inj.description || '', date_injury: inj.date_injury, date_return: inj.date_return || '', status: inj.status }); setShowInjuryModal(true) }} onArchive={() => archiveInjury(inj)} />)}
                </div>
              </div>
            )}

            {/* Surveillance */}
            {surveillanceInjuries.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: P.yellow, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>🟡 Surveillance</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {surveillanceInjuries.map(inj => <InjuryCard key={inj.id} injury={inj} onEdit={() => { setEditingInjury(inj); setInjuryForm({ body_zone: inj.body_zone, description: inj.description || '', date_injury: inj.date_injury, date_return: inj.date_return || '', status: inj.status }); setShowInjuryModal(true) }} onArchive={() => archiveInjury(inj)} />)}
                </div>
              </div>
            )}

            {/* Archivées */}
            {archivedInjuries.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>⬜ Antécédents</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {archivedInjuries.map(inj => <InjuryCard key={inj.id} injury={inj} archived />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB RDV ── */}
        {activeTab === 'appointments' && (
          <div>
            <SectionTitle action={<Btn small onClick={() => setShowApptModal(true)}>+ Nouveau RDV</Btn>}>
              Rendez-vous médicaux
            </SectionTitle>

            {appointments.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 14, border: `1px solid ${P.border}` }}>
                Aucun RDV enregistré
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              {appointments.map(appt => {
                const isPast = new Date(appt.date_appointment) < new Date()
                const d = new Date(appt.date_appointment)
                return (
                  <div key={appt.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', opacity: isPast ? 0.6 : 1 }}>
                    <div style={{ background: isPast ? P.bg : '#e8f5ee', border: `1px solid ${isPast ? P.border : '#b7dfc8'}`, borderRadius: 10, padding: '8px 12px', textAlign: 'center', flexShrink: 0, minWidth: 52 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: isPast ? P.sub : P.green, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, color: isPast ? P.sub : P.green, fontWeight: 600, textTransform: 'uppercase' }}>{d.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{APPT_TYPES.find(t => t.key === appt.type)?.label || appt.type}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: isPast ? P.bg : '#e8f5ee', color: isPast ? P.sub : P.green }}>{isPast ? 'Passé' : 'À venir'}</span>
                      </div>
                      {appt.location && <div style={{ fontSize: 13, color: P.sub }}>📍 {appt.location}</div>}
                      {appt.notes && <div style={{ fontSize: 13, color: P.text, marginTop: 4 }}>{appt.notes}</div>}
                      <div style={{ fontSize: 11, color: P.dim, marginTop: 4 }}>{d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TAB NOTES ── */}
        {activeTab === 'notes' && (
          <div>
            <SectionTitle action={<Btn small onClick={() => setShowNoteModal(true)}>+ Nouvelle note</Btn>}>
              Notes paramédicaux
            </SectionTitle>

            {notes.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: P.sub, background: P.card, borderRadius: 14, border: `1px solid ${P.border}` }}>
                Aucune note enregistrée
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              {notes.map(note => (
                <div key={note.id} style={{ background: P.card, border: `1px solid ${note.is_pinned ? P.accent : P.border}`, borderRadius: 14, padding: '16px 20px', borderLeft: note.is_pinned ? `4px solid ${P.accent}` : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      {note.is_pinned && <div style={{ fontSize: 11, fontWeight: 700, color: P.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>📌 Note épinglée</div>}
                      <div style={{ fontSize: 14, color: P.text, lineHeight: 1.6 }}>{note.content}</div>
                      <div style={{ fontSize: 11, color: P.dim, marginTop: 8 }}>{new Date(note.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <button onClick={() => togglePin(note)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, color: note.is_pinned ? P.accent : P.dim }}>
                      📌
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL BLESSURE ── */}
      {showInjuryModal && (
        <Modal title={editingInjury ? 'Modifier la blessure' : 'Nouvelle blessure'} onClose={() => { setShowInjuryModal(false); setEditingInjury(null) }}>
          <Field label="Zone corporelle">
            <select value={injuryForm.body_zone} onChange={e => setInjuryForm(p => ({ ...p, body_zone: e.target.value }))} style={{ ...inp }}>
              {BODY_ZONES.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea value={injuryForm.description} onChange={e => setInjuryForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Décris la blessure, le mécanisme, les symptômes..." />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Date de blessure">
              <input type="date" value={injuryForm.date_injury} onChange={e => setInjuryForm(p => ({ ...p, date_injury: e.target.value }))} style={inp} />
            </Field>
            <Field label="Date de retour (estimée)">
              <input type="date" value={injuryForm.date_return} onChange={e => setInjuryForm(p => ({ ...p, date_return: e.target.value }))} style={inp} />
            </Field>
          </div>
          <Field label="Statut">
            <select value={injuryForm.status} onChange={e => setInjuryForm(p => ({ ...p, status: e.target.value }))} style={inp}>
              <option value="active">Blessure active</option>
              <option value="surveillance">Surveillance</option>
              <option value="archive">Archiver</option>
            </select>
          </Field>
          {matches.length > 0 && (
            <Field label="Survenue lors d'un match (optionnel)">
              <select value={injuryForm.match_id} onChange={e => setInjuryForm(p => ({ ...p, match_id: e.target.value }))} style={inp}>
                <option value="">Aucun match</option>
                {matches.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label || `Match du ${new Date(m.match_date + 'T00:00:00').toLocaleDateString('fr-FR')}`}
                    {m.opponent ? ` vs ${m.opponent}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => { setShowInjuryModal(false); setEditingInjury(null) }}>Annuler</Btn>
            <Btn onClick={saveInjury} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
          </div>
        </Modal>
      )}

      {/* ── MODAL RDV ── */}
      {showApptModal && (
        <Modal title="Nouveau rendez-vous" onClose={() => setShowApptModal(false)}>
          <Field label="Type de RDV">
            <select value={apptForm.type} onChange={e => setApptForm(p => ({ ...p, type: e.target.value }))} style={inp}>
              {APPT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Date et heure">
            <input type="datetime-local" value={apptForm.date_appointment} onChange={e => setApptForm(p => ({ ...p, date_appointment: e.target.value }))} style={inp} />
          </Field>
          <Field label="Lieu">
            <input type="text" value={apptForm.location} onChange={e => setApptForm(p => ({ ...p, location: e.target.value }))} placeholder="Cabinet, clinique..." style={inp} />
          </Field>
          <Field label="Notes">
            <textarea value={apptForm.notes} onChange={e => setApptForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Informations complémentaires..." />
          </Field>
          {injuries.filter(i => i.status !== 'archive').length > 0 && (
            <Field label="Blessure liée (optionnel)">
              <select value={apptForm.injury_id} onChange={e => setApptForm(p => ({ ...p, injury_id: e.target.value }))} style={inp}>
                <option value="">Aucune</option>
                {injuries.filter(i => i.status !== 'archive').map(inj => (
                  <option key={inj.id} value={inj.id}>{BODY_ZONES.find(z => z.key === inj.body_zone)?.label} — {new Date(inj.date_injury).toLocaleDateString('fr-FR')}</option>
                ))}
              </select>
            </Field>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setShowApptModal(false)}>Annuler</Btn>
            <Btn onClick={saveAppt} disabled={saving || !apptForm.date_appointment}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
          </div>
        </Modal>
      )}

      {/* ── MODAL NOTE ── */}
      {showNoteModal && (
        <Modal title="Nouvelle note" onClose={() => setShowNoteModal(false)}>
          <Field label="Note">
            <textarea value={noteForm.content} onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="Observations, diagnostics, traitements en cours..." />
          </Field>
          {injuries.filter(i => i.status !== 'archive').length > 0 && (
            <Field label="Blessure liée (optionnel)">
              <select value={noteForm.injury_id} onChange={e => setNoteForm(p => ({ ...p, injury_id: e.target.value }))} style={inp}>
                <option value="">Aucune</option>
                {injuries.filter(i => i.status !== 'archive').map(inj => (
                  <option key={inj.id} value={inj.id}>{BODY_ZONES.find(z => z.key === inj.body_zone)?.label} — {new Date(inj.date_injury).toLocaleDateString('fr-FR')}</option>
                ))}
              </select>
            </Field>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: P.text, marginTop: 4 }}>
            <input type="checkbox" checked={noteForm.is_pinned} onChange={e => setNoteForm(p => ({ ...p, is_pinned: e.target.checked }))} style={{ accentColor: P.accent }} />
            Épingler cette note
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setShowNoteModal(false)}>Annuler</Btn>
            <Btn onClick={saveNote} disabled={saving || !noteForm.content.trim()}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Composant carte blessure ──────────────────────────────────────────────────
function InjuryCard({ injury, onEdit, onArchive, archived = false }) {
  const status = STATUS_CONFIG[injury.status] || STATUS_CONFIG.active
  const zone   = BODY_ZONES.find(z => z.key === injury.body_zone)?.label || injury.body_zone
  const daysInj = Math.floor((Date.now() - new Date(injury.date_injury).getTime()) / 86400000)

  return (
    <div style={{ background: '#fff', border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 20px', borderLeft: archived ? undefined : `4px solid ${status.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{zone}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: status.bg, color: status.color }}>{status.label}</span>
          </div>
          {injury.description && <div style={{ fontSize: 13, color: P.sub, lineHeight: 1.5, marginBottom: 8 }}>{injury.description}</div>}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: P.dim }}>Depuis {daysInj}j · {new Date(injury.date_injury).toLocaleDateString('fr-FR')}</div>
            {injury.date_return && <div style={{ fontSize: 12, color: P.green, fontWeight: 600 }}>Retour estimé : {new Date(injury.date_return).toLocaleDateString('fr-FR')}</div>}
          </div>
        </div>
        {!archived && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={onEdit} style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: P.sub, fontFamily: 'inherit' }}>Modifier</button>
            <button onClick={onArchive} style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: P.sub, fontFamily: 'inherit' }}>Archiver</button>
          </div>
        )}
      </div>
    </div>
  )
}
