// src/components/RtpGame.jsx
// Protocole Retour au Jeu — expérience premium gamifiée
// Usage côté coach : <RtpGame athleteId={id} athleteName={name} coachId={coachId} domsZones={zones} />

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getProtocol, ZONE_OPTIONS } from '../lib/rtpProtocols'
import { T } from '../lib/data'

// ─── Animations CSS ───────────────────────────────────────────────────────────
const ANIM = `
@keyframes rtpPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@keyframes rtpUnlock {
  0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes rtpConfetti {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-60px) rotate(360deg); opacity: 0; }
}
@keyframes rtpGlow {
  0%, 100% { box-shadow: 0 0 12px rgba(62,207,142,0.3); }
  50% { box-shadow: 0 0 28px rgba(62,207,142,0.7); }
}
@keyframes rtpSlideIn {
  from { transform: translateX(20px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
`

function stepColor(step) {
  if (step >= 5) return '#3ecf8e'
  if (step === 4) return '#4d9fff'
  if (step === 3) return '#fbbf24'
  if (step === 2) return '#ff7043'
  return '#ff4566'
}

// ─── Confetti burst ───────────────────────────────────────────────────────────
function ConfettiBurst({ active }) {
  if (!active) return null
  const items = ['🎉', '⭐', '✨', '🏆', '💥', '🎊']
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {items.map((em, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${15 + i * 14}%`,
          top: '40%',
          fontSize: 22,
          animation: `rtpConfetti 0.9s ease-out ${i * 0.08}s forwards`,
        }}>{em}</div>
      ))}
    </div>
  )
}

// ─── Critère checkbox ─────────────────────────────────────────────────────────
function CritereRow({ critere, checked, onChange, readOnly }) {
  return (
    <div
      onClick={() => !readOnly && onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        borderRadius: 10, cursor: readOnly ? 'default' : 'pointer',
        background: checked ? 'rgba(62,207,142,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${checked ? '#3ecf8e40' : T.border}`,
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: `2px solid ${checked ? '#3ecf8e' : T.border}`,
        background: checked ? '#3ecf8e' : 'transparent',
        display: 'grid', placeItems: 'center',
        transition: 'all 0.2s',
      }}>
        {checked && <span style={{ color: '#000', fontSize: 13, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13, color: checked ? '#3ecf8e' : T.textMid, fontWeight: checked ? 600 : 400, transition: 'color 0.2s' }}>
        {critere.label}
      </span>
    </div>
  )
}

// ─── Barre de progression XP ──────────────────────────────────────────────────
function XpBar({ step, totalSteps = 5 }) {
  const pct = ((step - 1) / (totalSteps - 1)) * 100
  const color = stepColor(step)
  return (
    <div>
      <div style={{ height: 10, background: 'rgba(255,255,255,0.07)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', borderRadius: 5,
          background: `linear-gradient(90deg, ${stepColor(1)}, ${color})`,
          width: `${pct}%`,
          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 0 8px ${color}60`,
        }} />
        {/* Jalons */}
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} style={{
            position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
            left: `${((s - 1) / 4) * 100}%`,
            width: 14, height: 14, borderRadius: '50%',
            background: s <= step ? stepColor(s) : 'rgba(255,255,255,0.12)',
            border: `2px solid ${s <= step ? stepColor(s) : T.border}`,
            boxShadow: s === step ? `0 0 10px ${stepColor(s)}80` : 'none',
            transition: 'all 0.4s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} style={{ fontSize: 9, color: s <= step ? stepColor(s) : T.textDim, fontWeight: s === step ? 700 : 400, textAlign: 'center', flex: 1 }}>
            {s <= step ? '●' : '○'}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Badge étape débloquée ────────────────────────────────────────────────────
function StepBadge({ protocol, step, unlocked, active }) {
  const info = protocol.steps[step - 1]
  const color = stepColor(step)
  return (
    <div style={{
      textAlign: 'center',
      animation: unlocked ? 'rtpUnlock 0.5s ease-out' : 'none',
      opacity: !unlocked && !active ? 0.4 : 1,
      transition: 'opacity 0.3s',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', margin: '0 auto 6px',
        display: 'grid', placeItems: 'center', fontSize: 22,
        background: unlocked ? `linear-gradient(135deg, ${color}30, ${color}10)`
          : active ? `${color}15`
          : 'rgba(255,255,255,0.04)',
        border: `2px solid ${unlocked || active ? color : T.border}`,
        boxShadow: active ? `0 0 14px ${color}50, inset 0 0 8px ${color}20` : 'none',
        animation: active ? 'rtpPulse 2s ease-in-out infinite' : 'none',
        cursor: 'default',
      }}>
        {unlocked ? '🏅' : info?.icon || '○'}
      </div>
      <div style={{ fontSize: 9, color: active ? color : T.textDim, fontWeight: active ? 700 : 400, lineHeight: 1.2, maxWidth: 54, margin: '0 auto' }}>
        {unlocked ? info?.badge : `Étape ${step}`}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function RtpGame({ athleteId, athleteName, coachId, onClose }) {
  const [progressions, setProgressions] = useState([])
  const [selected, setSelected] = useState(null)       // progression active
  const [validations, setValidations] = useState([])   // validations de la progression
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newZone, setNewZone] = useState('generique')
  const [criteriaState, setCriteriaState] = useState({})
  const [coachNote, setCoachNote] = useState('')
  const [unlockAnim, setUnlockAnim] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [view, setView] = useState('main') // 'main' | 'detail'

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('rtp_progressions')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
    setProgressions(data || [])
    if (data?.length && !selected) setSelected(data[0])
    setLoading(false)
  }, [athleteId])

  const loadValidations = useCallback(async (progressionId) => {
    const { data } = await supabase
      .from('rtp_step_validations')
      .select('*')
      .eq('progression_id', progressionId)
      .order('step', { ascending: true })
    setValidations(data || [])
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (selected?.id) loadValidations(selected.id)
  }, [selected?.id, loadValidations])

  // Init critères à false — validation manuelle uniquement par le coach
  useEffect(() => {
    if (!selected) return
    const protocol = getProtocol(selected.zone)
    const stepInfo = protocol.steps[selected.current_step - 1]
    if (!stepInfo) return
    const init = {}
    for (const c of stepInfo.criteres) {
      init[c.key] = false
    }
    setCriteriaState(init)
    setCoachNote('')
  }, [selected?.id, selected?.current_step])

  async function createProgression() {
    setSaving(true)
    const { data } = await supabase.from('rtp_progressions').insert({
      athlete_id: athleteId,
      coach_id: coachId,
      zone: newZone,
      current_step: 1,
      status: 'active',
      started_at: new Date().toISOString().split('T')[0],
    }).select().single()
    await load()
    if (data) setSelected(data)
    setShowCreate(false)
    setView('detail')
    setSaving(false)
  }

  async function validateStep() {
    if (!selected) return
    setSaving(true)

    const allMet = Object.values(criteriaState).every(Boolean)
    const nextStep = selected.current_step + 1
    const isComplete = nextStep > 5

    // Enregistrer la validation
    await supabase.from('rtp_step_validations').insert({
      progression_id: selected.id,
      step: selected.current_step,
      validated_by: coachId,
      validated_at: new Date().toISOString().split('T')[0],
      auto_suggested: false,
      coach_note: coachNote || null,
      criteria_met: criteriaState,
    })

    // Avancer l'étape
    const updates = isComplete
      ? { current_step: 5, status: 'completed', completed_at: new Date().toISOString().split('T')[0] }
      : { current_step: nextStep }

    await supabase.from('rtp_progressions').update(updates).eq('id', selected.id)

    // Animation
    setUnlockAnim(true)
    if (isComplete) setConfetti(true)
    setTimeout(() => { setUnlockAnim(false); setConfetti(false) }, 2000)

    await load()
    const updated = { ...selected, ...updates }
    setSelected(updated)
    await loadValidations(selected.id)
    setSaving(false)
  }

  async function regressStep() {
    if (!selected || selected.current_step <= 1) return
    setSaving(true)
    const prevStep = selected.current_step - 1
    await supabase.from('rtp_progressions').update({ current_step: prevStep, status: 'active' }).eq('id', selected.id)
    await load()
    setSelected({ ...selected, current_step: prevStep, status: 'active' })
    setSaving(false)
  }

  const protocol = selected ? getProtocol(selected.zone) : null
  const currentStepInfo = protocol?.steps[(selected?.current_step || 1) - 1]
  const allCriteriaMet = Object.values(criteriaState).every(Boolean)
  const isCompleted = selected?.status === 'completed'

  return (
    <>
      <style>{ANIM}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'linear-gradient(160deg, #0d1410, #0a0f0d)',
          border: `1px solid ${T.border}`,
          borderRadius: 24, width: '100%', maxWidth: 560,
          maxHeight: '92vh', overflowY: 'auto',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
          position: 'relative', animation: 'rtpSlideIn 0.3s ease-out',
        }}>
          <ConfettiBurst active={confetti} />

          {/* ── Header ── */}
          <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                  Protocole Retour au Jeu
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>
                  {athleteName}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {view === 'detail' && progressions.length > 0 && (
                  <button onClick={() => setView('main')} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${T.border}`, background: 'transparent', color: T.textMid, fontSize: 12, cursor: 'pointer' }}>
                    ← Protocoles
                  </button>
                )}
                <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${T.border}`, background: 'transparent', color: T.textMid, fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.textDim }}>Chargement...</div>
          ) : (

            /* ── VUE LISTE DES PROTOCOLES ── */
            view === 'main' ? (
              <div style={{ padding: '16px 22px', display: 'grid', gap: 12 }}>
                {progressions.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: T.textDim, fontSize: 14 }}>
                    Aucun protocole actif.<br />
                    <span style={{ fontSize: 12 }}>Crée un protocole pour commencer le suivi.</span>
                  </div>
                )}
                {progressions.map(prog => {
                  const prot = getProtocol(prog.zone)
                  const zoneInfo = ZONE_OPTIONS.find(z => z.key === prog.zone)
                  const color = prot ? stepColor(prog.current_step) : T.textDim
                  const isActive = prog.status === 'active'
                  const isDone = prog.status === 'completed'
                  return (
                    <div key={prog.id}
                      onClick={() => { setSelected(prog); setView('detail') }}
                      style={{
                        padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                        background: isActive ? `${color}08` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? color + '30' : T.border}`,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = `${color}12`}
                      onMouseLeave={e => e.currentTarget.style.background = isActive ? `${color}08` : 'rgba(255,255,255,0.03)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ fontSize: 26 }}>{zoneInfo?.emoji}</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{zoneInfo?.label}</div>
                            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                              {isDone ? '🏆 Terminé' : `Étape ${prog.current_step}/5 — ${prot?.steps[prog.current_step - 1]?.label}`}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color, padding: '3px 9px', borderRadius: 20, background: `${color}15`, border: `1px solid ${color}30` }}>
                            {isDone ? 'Complet ✅' : isActive ? 'Actif' : 'Pausé'}
                          </div>
                          {prog.started_at && (
                            <div style={{ fontSize: 10, color: T.textDim, marginTop: 4 }}>
                              Depuis le {new Date(prog.started_at + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Mini barre */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${stepColor(1)}, ${color})`, width: `${((prog.current_step - 1) / 4) * 100}%`, transition: 'width 0.6s', boxShadow: `0 0 6px ${color}50` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Bouton créer */}
                {!showCreate ? (
                  <button onClick={() => setShowCreate(true)} style={{
                    padding: '12px', borderRadius: 14, border: `2px dashed ${T.border}`,
                    background: 'transparent', color: T.textDim, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accentLight }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim }}
                  >
                    + Nouveau protocole RTP
                  </button>
                ) : (
                  <div style={{ padding: '16px', borderRadius: 14, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.03)', display: 'grid', gap: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Zone lésée</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {ZONE_OPTIONS.map(z => (
                        <button key={z.key} onClick={() => setNewZone(z.key)} style={{
                          padding: '10px 6px', borderRadius: 10, border: `1px solid ${newZone === z.key ? z.color : T.border}`,
                          background: newZone === z.key ? `${z.color}15` : 'transparent',
                          color: newZone === z.key ? z.color : T.textMid,
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 20, marginBottom: 4 }}>{z.emoji}</div>
                          {z.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.textMid, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                      <button onClick={createProgression} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {saving ? 'Création...' : '🚀 Démarrer le protocole'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (

              /* ── VUE DÉTAIL PROTOCOLE ── */
              selected && protocol && (
                <div style={{ padding: '16px 22px', display: 'grid', gap: 16 }}>

                  {/* Zone + statut */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 36 }}>{ZONE_OPTIONS.find(z => z.key === selected.zone)?.emoji}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{protocol.label} — Protocole RTP</div>
                      <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>
                        Démarré le {selected.started_at ? new Date(selected.started_at + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '—'}
                        {selected.completed_at && ` · Terminé le ${new Date(selected.completed_at + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                      </div>
                    </div>
                  </div>

                  {/* Barre XP */}
                  <XpBar step={selected.current_step} />

                  {/* Badges étapes */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <StepBadge
                        key={s}
                        protocol={protocol}
                        step={s}
                        unlocked={s < selected.current_step || isCompleted}
                        active={s === selected.current_step && !isCompleted}
                      />
                    ))}
                  </div>

                  {isCompleted ? (
                    /* ── PROTOCOLE TERMINÉ ── */
                    <div style={{
                      textAlign: 'center', padding: '28px 20px',
                      background: 'rgba(62,207,142,0.08)', borderRadius: 16,
                      border: '1px solid rgba(62,207,142,0.3)',
                      animation: 'rtpGlow 2s ease-in-out infinite',
                    }}>
                      <div style={{ fontSize: 48, marginBottom: 10 }}>🏆</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#3ecf8e', fontFamily: T.fontDisplay }}>Protocole complété !</div>
                      <div style={{ fontSize: 13, color: T.textMid, marginTop: 8 }}>{athleteName} est prêt pour le retour au jeu complet.</div>
                    </div>
                  ) : (
                    <>
                      {/* ── ÉTAPE ACTIVE ── */}
                      <div style={{
                        borderRadius: 16, overflow: 'hidden',
                        border: `1px solid ${stepColor(selected.current_step)}40`,
                        background: `linear-gradient(135deg, ${stepColor(selected.current_step)}08, transparent)`,
                      }}>
                        {/* Header étape */}
                        <div style={{ padding: '12px 16px', background: `${stepColor(selected.current_step)}15`, borderBottom: `1px solid ${stepColor(selected.current_step)}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: stepColor(selected.current_step) }}>
                              {currentStepInfo?.icon} {currentStepInfo?.label}
                            </div>
                            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Étape {selected.current_step} / 5</div>
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: stepColor(selected.current_step), padding: '3px 9px', borderRadius: 20, background: `${stepColor(selected.current_step)}20`, border: `1px solid ${stepColor(selected.current_step)}30` }}>
                            {currentStepInfo?.badge}
                          </div>
                        </div>

                        {/* Domaines */}
                        {[
                          { key: 'muscu',   label: '💪 Muscu' },
                          { key: 'appuis',  label: '🦵 Appuis / CDD' },
                          { key: 'course',  label: '🏃 Course' },
                          { key: 'contact', label: '🏉 Contact' },
                        ].map(({ key, label }) => (
                          <div key={key} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', borderBottom: `1px solid ${T.border}22` }}>
                            <div style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: T.textDim, borderRight: `1px solid ${T.border}22`, background: 'rgba(255,255,255,0.02)' }}>{label}</div>
                            <div style={{ padding: '9px 12px', fontSize: 12, color: currentStepInfo?.domaines[key] === '—' ? T.textDim : T.text, fontStyle: currentStepInfo?.domaines[key] === '—' ? 'italic' : 'normal', lineHeight: 1.4 }}>
                              {currentStepInfo?.domaines[key]}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ── CRITÈRES DE PASSAGE ── */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                          ✅ Critères de passage
                        </div>
                        <div style={{ display: 'grid', gap: 7 }}>
                          {currentStepInfo?.criteres.map(c => (
                            <CritereRow
                              key={c.key}
                              critere={c}
                              checked={criteriaState[c.key] || false}
                              onChange={v => setCriteriaState(prev => ({ ...prev, [c.key]: v }))}
                            />
                          ))}
                        </div>
                        {!allCriteriaMet && (
                          <div style={{ marginTop: 8, fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>
                            ⚠️ Tous les critères doivent être validés avant de passer à l'étape suivante
                          </div>
                        )}
                      </div>

                      {/* Note coach */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Note du préparateur (optionnel)</div>
                        <textarea
                          value={coachNote}
                          onChange={e => setCoachNote(e.target.value)}
                          placeholder="Observations, conditions de validation, commentaires..."
                          rows={2}
                          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                        />
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {selected.current_step > 1 && (
                          <button onClick={regressStep} disabled={saving} style={{
                            padding: '11px 16px', borderRadius: 12, border: `1px solid ${T.border}`,
                            background: 'transparent', color: T.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}>
                            ← Étape précédente
                          </button>
                        )}
                        <button
                          onClick={validateStep}
                          disabled={saving || !allCriteriaMet}
                          style={{
                            flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                            background: allCriteriaMet
                              ? `linear-gradient(135deg, ${stepColor(selected.current_step)}, ${stepColor(Math.min(selected.current_step + 1, 5))})`
                              : 'rgba(255,255,255,0.07)',
                            color: allCriteriaMet ? '#fff' : T.textDim,
                            fontSize: 14, fontWeight: 900, cursor: allCriteriaMet ? 'pointer' : 'default',
                            boxShadow: allCriteriaMet ? `0 4px 20px ${stepColor(selected.current_step)}40` : 'none',
                            transition: 'all 0.3s',
                            animation: allCriteriaMet ? 'rtpGlow 2s ease-in-out infinite' : 'none',
                          }}
                        >
                          {saving ? 'Validation...'
                            : selected.current_step === 5 ? '🏆 Valider le retour complet'
                            : `✓ Valider → Étape ${selected.current_step + 1}`}
                        </button>
                      </div>

                      {/* Historique validations */}
                      {validations.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                            Historique des validations
                          </div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {validations.map((v, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: stepColor(v.step) }}>
                                    {protocol.steps[v.step - 1]?.icon} Étape {v.step} — {protocol.steps[v.step - 1]?.label}
                                  </div>
                                  {v.coach_note && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>"{v.coach_note}"</div>}
                                </div>
                                <div style={{ fontSize: 11, color: T.textDim, textAlign: 'right' }}>
                                  {v.validated_at ? new Date(v.validated_at + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            )
          )}
        </div>
      </div>
    </>
  )
}
