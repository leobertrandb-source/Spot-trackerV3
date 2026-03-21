import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap } from '../components/UI'
import { T } from '../lib/data'
import RtpGame from '../components/RtpGame'

// ─── Config zones corporelles ─────────────────────────────────────────────────
const ZONES = [
  { key: 'nuque',      label: 'Nuque / Cou',          emoji: '🔺', region: 'haut' },
  { key: 'epaules',   label: 'Épaules',               emoji: '💠', region: 'haut' },
  { key: 'coudes',    label: 'Coudes',                emoji: '💠', region: 'haut' },
  { key: 'poignets',  label: 'Poignets',              emoji: '💠', region: 'haut' },
  { key: 'tronc',     label: 'Tronc / Abdominaux',   emoji: '🔷', region: 'milieu' },
  { key: 'lombaires', label: 'Bas du dos / Lombaires',emoji: '🔷', region: 'milieu' },
  { key: 'hanches',   label: 'Hanches',               emoji: '💠', region: 'bas' },
  { key: 'cuisses',   label: 'Cuisses',               emoji: '🔷', region: 'bas' },
  { key: 'genoux',    label: 'Genoux',                emoji: '💠', region: 'bas' },
  { key: 'chevilles', label: 'Chevilles',             emoji: '💠', region: 'bas' },
  { key: 'pieds',     label: 'Pieds',                 emoji: '🔷', region: 'bas' },
]

const INQUIETUDE_LABELS = ['', 'Pas inquiet', 'Peu inquiet', 'Très inquiet']

// ─── Protocole retour au jeu Rugby (5 étapes) ────────────────────────────────
const RTP_STEPS = [
  {
    step: 1,
    label: 'Rehab Étape 1',
    icon: '🛌',
    domsMax: 10,
    domaines: {
      muscu:   'Aucun travail musculaire',
      appuis:  'Éducatifs simples (marche, appuis statiques)',
      course:  '—',
      contact: '—',
    },
    criteres: 'Douleur < 2/10 · Pas d\'œdème · Mobilité complète',
  },
  {
    step: 2,
    label: 'Rehab Étape 2',
    icon: '🚴',
    domsMax: 6,
    domaines: {
      muscu:   'Pas de travail sur le pattern lésé · Travail compensatoire',
      appuis:  'Éducatifs COD 45° < 60 % Vmax',
      course:  '40 % distance · 40 % fitness · 60 % Vmax',
      contact: '—',
    },
    criteres: 'Force > 80 % côté sain · Pas de douleur à l\'effort',
  },
  {
    step: 3,
    label: 'Réathlé Étape 3',
    icon: '🏃',
    domsMax: 4,
    domaines: {
      muscu:   'Chaîne cinétique ouverte · Renforcement isométrique + concentrique',
      appuis:  'Stop & Go 90° < 70 % Vmax',
      course:  '60 % distance · 80 % fitness · 70 % Vmax',
      contact: 'Bouclier + boudin 50 % intensité (pas de plaquage)',
    },
    criteres: 'Test isocinétique > 85 % · Proprioception OK · RPE contrôlé',
  },
  {
    step: 4,
    label: 'Réathlé Étape 4',
    icon: '⚽',
    domsMax: 2,
    domaines: {
      muscu:   'Chaîne cinétique fermée Max · RPE 6-7 · Plyométrie légère',
      appuis:  'RHIE 90° + COD 90° > 70 % Vmax',
      course:  '80 % distance · 120 % fitness · 80 % Vmax',
      contact: '1 contre 1 · 70 % intensité · Plaquage au sol autorisé',
    },
    criteres: 'Force > 90-95 % · Agilité OK · Confiance subjective > 8/10',
  },
  {
    step: 5,
    label: 'Retour Au Jeu',
    icon: '✅',
    domsMax: 1,
    domaines: {
      muscu:   'Travail > RPE 8 · Puissance + explosivité rugby-specific',
      appuis:  '90° + 180° + courses courbes > 80 % Vmax',
      course:  '100 % distance · 120 % fitness · 90-100 % Vmax',
      contact: '100 % contact (mêlée légère, ruck, plaquage haut)',
    },
    criteres: 'Test terrain rugby (Yo-Yo, sprint, plaquage) validé · Confiance 9-10/10',
  },
]

// ─── Calcul étape RTP automatique ────────────────────────────────────────────
function calcRtpStep(domsZones, hooperScore) {
  if (!domsZones) return null
  const activeZones = Object.values(domsZones).filter(z => z?.level > 0)
  if (!activeZones.length) return 5 // Retour complet

  const maxLevel = Math.max(...activeZones.map(z => z.level || 0))
  const maxInquietude = Math.max(...activeZones.map(z => z.inquietude || 0))
  const nbZones = activeZones.length

  // Score DOMS composite
  let score = maxLevel * 2 + maxInquietude + nbZones
  if (hooperScore >= 21) score += 3

  if (score >= 14) return 1
  if (score >= 10) return 2
  if (score >= 7)  return 3
  if (score >= 4)  return 4
  return 5
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreLabel(total) {
  if (!total) return { text: '—', color: T.textDim, bg: 'transparent' }
  if (total <= 7)  return { text: 'Très bon',          color: '#3ecf8e', bg: 'rgba(62,207,142,0.08)' }
  if (total <= 13) return { text: 'Correct',           color: '#3ecf8e', bg: 'rgba(62,207,142,0.06)' }
  if (total <= 20) return { text: 'Vigilance',         color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' }
  return               { text: 'Fatigue importante', color: '#ff4566', bg: 'rgba(255,69,102,0.10)' }
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(`${dateStr}T00:00:00`).getTime()) / 86400000)
}

function domsLevelColor(level) {
  if (!level) return T.textDim
  if (level <= 2) return '#3ecf8e'
  if (level <= 4) return '#fbbf24'
  if (level <= 6) return '#ff7043'
  return '#ff4566'
}

function domsLevelBg(level) {
  if (!level) return 'transparent'
  if (level <= 2) return 'rgba(62,207,142,0.1)'
  if (level <= 4) return 'rgba(251,191,36,0.1)'
  if (level <= 6) return 'rgba(255,112,67,0.1)'
  return 'rgba(255,69,102,0.1)'
}

function rtpStepColor(step) {
  if (step >= 5) return '#3ecf8e'
  if (step === 4) return '#4d9fff'
  if (step === 3) return '#fbbf24'
  if (step === 2) return '#ff7043'
  return '#ff4566'
}

// ─── Silhouette corporelle SVG ────────────────────────────────────────────────
function BodySilhouette({ domsZones }) {
  const ZONE_POSITIONS = {
    nuque:      { x: 50, y: 12 },
    epaules:    { x: 50, y: 22 },
    coudes:     { x: 50, y: 35 },
    poignets:   { x: 50, y: 47 },
    tronc:      { x: 50, y: 30 },
    lombaires:  { x: 50, y: 40 },
    hanches:    { x: 50, y: 52 },
    cuisses:    { x: 50, y: 62 },
    genoux:     { x: 50, y: 72 },
    chevilles:  { x: 50, y: 82 },
    pieds:      { x: 50, y: 90 },
  }

  const ZONE_SPLIT = {
    nuque:      [{ x: 50, y: 12 }],
    epaules:    [{ x: 30, y: 23 }, { x: 70, y: 23 }],
    coudes:     [{ x: 22, y: 38 }, { x: 78, y: 38 }],
    poignets:   [{ x: 17, y: 52 }, { x: 83, y: 52 }],
    tronc:      [{ x: 50, y: 33 }],
    lombaires:  [{ x: 50, y: 43 }],
    hanches:    [{ x: 38, y: 53 }, { x: 62, y: 53 }],
    cuisses:    [{ x: 38, y: 63 }, { x: 62, y: 63 }],
    genoux:     [{ x: 38, y: 74 }, { x: 62, y: 74 }],
    chevilles:  [{ x: 38, y: 84 }, { x: 62, y: 84 }],
    pieds:      [{ x: 38, y: 92 }, { x: 62, y: 92 }],
  }

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: 220, display: 'block' }}>
      {/* Silhouette simplifiée */}
      {/* Tête */}
      <ellipse cx="50" cy="7" rx="7" ry="7" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      {/* Cou */}
      <rect x="46" y="13" width="8" height="5" rx="2" fill="rgba(255,255,255,0.06)" />
      {/* Torse */}
      <path d="M32 20 L32 48 Q32 50 34 50 L66 50 Q68 50 68 48 L68 20 Q68 18 66 17 L34 17 Q32 18 32 20Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Bras gauche */}
      <path d="M32 20 Q22 25 20 40 L18 52 Q17 54 18 55 L22 55 Q23 54 23 52 L25 40 Q27 30 34 26" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      {/* Bras droit */}
      <path d="M68 20 Q78 25 80 40 L82 52 Q83 54 82 55 L78 55 Q77 54 77 52 L75 40 Q73 30 66 26" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      {/* Bassin */}
      <path d="M32 48 Q32 55 50 56 Q68 55 68 48" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      {/* Jambe gauche */}
      <path d="M38 55 L36 72 L35 84 Q35 87 37 88 L41 88 Q43 87 43 84 L42 72 L42 55" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      {/* Jambe droite */}
      <path d="M62 55 L64 72 L65 84 Q65 87 63 88 L59 88 Q57 87 57 84 L58 72 L58 55" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      {/* Pieds */}
      <ellipse cx="38" cy="92" rx="5" ry="3" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="62" cy="92" rx="5" ry="3" fill="rgba(255,255,255,0.06)" />

      {/* Points de douleur */}
      {ZONES.map(zone => {
        const zoneData = domsZones?.[zone.key]
        const level = zoneData?.level || 0
        if (!level) return null
        const positions = ZONE_SPLIT[zone.key] || [{ x: 50, y: 50 }]
        const color = domsLevelColor(level)
        const r = 2.5 + level * 0.3

        return positions.map((pos, i) => (
          <g key={`${zone.key}-${i}`}>
            <circle cx={pos.x} cy={pos.y} r={r + 2} fill={color} opacity="0.2" />
            <circle cx={pos.x} cy={pos.y} r={r} fill={color} opacity="0.85" />
            <text x={pos.x} y={pos.y + 0.5} textAnchor="middle" dominantBaseline="middle"
              fontSize="3" fill="#fff" fontWeight="bold">{level}</text>
          </g>
        ))
      })}
    </svg>
  )
}

// ─── Panel DOMS détail ────────────────────────────────────────────────────────
function DomsDetailPanel({ athlete, hooperHistory, onClose }) {
  const h = athlete.hooper
  const domsZones = h?.doms_zones || {}
  const hooperScore = h ? h.fatigue + h.sommeil + h.stress + h.courbatures : null
  const activeZones = ZONES.filter(z => (domsZones[z.key]?.level || 0) > 0)
  const rtpStep = calcRtpStep(domsZones, hooperScore)
  const rtpInfo = RTP_STEPS.find(s => s.step === rtpStep)

  // Historique DOMS sur 14 jours
  const domsHistory = (hooperHistory || [])
    .filter(h => h.doms_zones && Object.values(h.doms_zones).some(z => z?.level > 0))
    .slice(0, 14)
    .reverse()

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111a16', border: `1px solid ${T.border}`,
        borderRadius: 20, width: '100%', maxWidth: 480,
        maxHeight: '95vh', overflowY: 'auto',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>{athlete.full_name || athlete.email}</div>
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 3 }}>
              {h?.date ? `HOOPER du ${new Date(h.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : 'Pas de HOOPER récent'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${T.border}`, background: 'transparent', color: T.textMid, fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
        </div>

        {/* Protocole retour au jeu */}
        {rtpStep && (
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Protocole Retour au Jeu — Rugby
            </div>

            {/* Barre étapes */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {RTP_STEPS.map(s => {
                const isActive = s.step === rtpStep
                const isDone = s.step > rtpStep
                const color = rtpStepColor(s.step)
                return (
                  <div key={s.step} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', margin: '0 auto 4px',
                      display: 'grid', placeItems: 'center', fontSize: 14,
                      background: isActive ? color : isDone ? `${color}20` : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${isActive ? color : isDone ? `${color}40` : T.border}`,
                      boxShadow: isActive ? `0 0 12px ${color}40` : 'none',
                    }}>
                      {isDone ? '✓' : s.icon}
                    </div>
                    <div style={{ fontSize: 8, color: isActive ? color : T.textDim, fontWeight: isActive ? 700 : 400, lineHeight: 1.2 }}>
                      {s.label}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tableau domaines de l'étape active */}
            {rtpInfo && (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${rtpStepColor(rtpStep)}30` }}>
                <div style={{ padding: '10px 14px', background: `${rtpStepColor(rtpStep)}15`, borderBottom: `1px solid ${rtpStepColor(rtpStep)}20` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: rtpStepColor(rtpStep) }}>
                    {rtpInfo.icon} {rtpInfo.label}
                  </div>
                </div>
                {[
                  { key: 'muscu',   label: '💪 Muscu',        icon: '💪' },
                  { key: 'appuis',  label: '🦵 Appuis / CDD', icon: '🦵' },
                  { key: 'course',  label: '🏃 Course',        icon: '🏃' },
                  { key: 'contact', label: '🏉 Contact',       icon: '🏉' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', borderBottom: `1px solid ${T.border}22` }}>
                    <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: T.textDim, borderRight: `1px solid ${T.border}22`, background: 'rgba(255,255,255,0.02)' }}>
                      {label}
                    </div>
                    <div style={{ padding: '8px 10px', fontSize: 12, color: rtpInfo.domaines[key] === '—' ? T.textDim : T.text, fontStyle: rtpInfo.domaines[key] === '—' ? 'italic' : 'normal', lineHeight: 1.4 }}>
                      {rtpInfo.domaines[key]}
                    </div>
                  </div>
                ))}
                {/* Critères de passage */}
                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                    Critères de passage
                  </div>
                  <div style={{ fontSize: 12, color: T.accentLight, fontWeight: 600, lineHeight: 1.4 }}>
                    {rtpInfo.criteres}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Zones actives + silhouette */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: '1fr 140px', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              Zones douloureuses ({activeZones.length})
            </div>
            {activeZones.length === 0 ? (
              <div style={{ fontSize: 13, color: '#3ecf8e', fontWeight: 600 }}>✓ Aucune douleur déclarée</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {activeZones.map(zone => {
                  const zd = domsZones[zone.key]
                  const level = zd?.level || 0
                  const inq = zd?.inquietude || 0
                  return (
                    <div key={zone.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: domsLevelBg(level), border: `1px solid ${domsLevelColor(level)}25` }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: domsLevelColor(level) }}>{zone.label}</div>
                        {inq > 0 && <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{INQUIETUDE_LABELS[inq]}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {Array.from({ length: 10 }, (_, i) => (
                          <div key={i} style={{ width: 5, height: 14, borderRadius: 2, background: i < level ? domsLevelColor(level) : 'rgba(255,255,255,0.08)' }} />
                        ))}
                        <div style={{ fontSize: 11, fontWeight: 700, color: domsLevelColor(level), marginLeft: 4, minWidth: 20, textAlign: 'right' }}>{level}/10</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Silhouette */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, textAlign: 'center' }}>Carte</div>
            <BodySilhouette domsZones={domsZones} />
          </div>
        </div>

        {/* Historique DOMS */}
        {domsHistory.length > 0 && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Historique DOMS ({domsHistory.length} jours)
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {domsHistory.map((hLog, i) => {
                const dz = hLog.doms_zones || {}
                const activeDz = ZONES.filter(z => (dz[z.key]?.level || 0) > 0)
                const maxLevel = Math.max(...activeDz.map(z => dz[z.key]?.level || 0), 0)
                const rtpH = calcRtpStep(dz, hLog.fatigue + hLog.sommeil + hLog.stress + hLog.courbatures)
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                        {new Date(hLog.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                        {activeDz.length} zone{activeDz.length > 1 ? 's' : ''} — {activeDz.map(z => z.label).join(', ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: domsLevelColor(maxLevel) }}>Niv. {maxLevel}/10</div>
                      {rtpH && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: rtpStepColor(rtpH), padding: '2px 7px', borderRadius: 20, background: `${rtpStepColor(rtpH)}15`, border: `1px solid ${rtpStepColor(rtpH)}30` }}>
                          Étape {rtpH}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PrepDashboardPage() {
  const { user, profile } = useAuth()
  const coachId = profile?.id || user?.id || null
  const navigate = useNavigate()

  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [rtpAthlete, setRtpAthlete] = useState(null)
  const [hooperHistory, setHooperHistory] = useState([])

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    if (!coachId) { setAthletes([]); setLoading(false); return }
    setLoading(true)
    try {
      const { data: links } = await supabase.from('coach_clients').select('client_id').eq('coach_id', coachId)
      const ids = (links || []).map(l => l.client_id).filter(Boolean)
      if (!ids.length) { setAthletes([]); setLoading(false); return }

      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString().split('T')[0]

      const [
        { data: profiles },
        { data: hoopers },
        { data: compos },
        { data: charges },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', ids),
        supabase.from('hooper_logs').select('*').in('user_id', ids).order('date', { ascending: false }),
        supabase.from('body_composition_logs').select('*').in('user_id', ids).order('date', { ascending: false }),
        supabase.from('charge_externe_logs').select('*').in('user_id', ids).gte('date', weekAgoStr),
      ])

      const hooperByUser = {}
      for (const h of hoopers || []) { if (!hooperByUser[h.user_id]) hooperByUser[h.user_id] = h }

      const compoByUser = {}
      for (const c of compos || []) { if (!compoByUser[c.user_id]) compoByUser[c.user_id] = c }

      const chargeByUser = {}
      for (const c of charges || []) {
        if (!chargeByUser[c.user_id]) chargeByUser[c.user_id] = { total: 0, sessions: 0 }
        chargeByUser[c.user_id].total += c.charge_ua || ((c.rpe || 0) * (c.duree_min || 0))
        chargeByUser[c.user_id].sessions += 1
      }

      setAthletes((profiles || []).map(p => ({
        ...p,
        hooper: hooperByUser[p.id] || null,
        compo: compoByUser[p.id] || null,
        charge: chargeByUser[p.id] || null,
        allHoopers: (hoopers || []).filter(h => h.user_id === p.id),
      })))
    } catch (err) {
      console.error(err)
      setAthletes([])
    } finally {
      setLoading(false)
    }
  }, [coachId])

  useEffect(() => { load() }, [load])

  // Ouvrir panel DOMS avec historique
  function openDoms(e, athlete) {
    e.stopPropagation()
    setSelectedAthlete(athlete)
  }

  function openRtp(e, athlete) {
    e.stopPropagation()
    setRtpAthlete(athlete)
  }

  const sorted = [...athletes].sort((a, b) => {
    const sa = a.hooper ? a.hooper.fatigue + a.hooper.sommeil + a.hooper.stress + a.hooper.courbatures : -1
    const sb = b.hooper ? b.hooper.fatigue + b.hooper.sommeil + b.hooper.stress + b.hooper.courbatures : -1
    return sb - sa
  })

  const filtered = sorted.filter(a => {
    if (filter === 'all') return true
    if (filter === 'doms') return a.hooper?.doms_zones && Object.values(a.hooper.doms_zones).some(z => z?.level > 0)
    const score = a.hooper ? a.hooper.fatigue + a.hooper.sommeil + a.hooper.stress + a.hooper.courbatures : 0
    if (filter === 'alert') return score >= 21
    if (filter === 'ok') return score < 21 && score > 0
    return true
  })

  const alerts = sorted.filter(a => {
    const score = a.hooper ? a.hooper.fatigue + a.hooper.sommeil + a.hooper.stress + a.hooper.courbatures : 0
    return score >= 21
  })
  const domsAlerts = sorted.filter(a => a.hooper?.doms_zones && Object.values(a.hooper.doms_zones).some(z => z?.level > 0))
  const hooperToday = sorted.filter(a => a.hooper?.date === today).length
  const hooperMissing = sorted.filter(a => !a.hooper || a.hooper.date !== today).length

  return (
    <PageWrap>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* Header */}
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Prépa physique
          </div>
          <div style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>
            Dashboard athlètes
          </div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 4 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' '}· {athletes.length} athlète{athletes.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {[
            { label: 'HOOPER rempli',  value: hooperToday,     unit: `/ ${athletes.length}`, color: '#3ecf8e' },
            { label: 'Non rempli',     value: hooperMissing,   unit: 'athlètes',             color: hooperMissing > 0 ? '#fbbf24' : T.textDim },
            { label: '🚨 Alertes',     value: alerts.length,   unit: 'fatigue imp.',          color: alerts.length > 0 ? '#ff4566' : T.textDim,  glow: alerts.length > 0 },
            { label: '🩹 DOMS actifs', value: domsAlerts.length, unit: 'athlètes',            color: domsAlerts.length > 0 ? '#ff7043' : T.textDim },
          ].map(({ label, value, unit, color, glow }) => (
            <div key={label} style={{ padding: 14, background: glow ? 'rgba(255,69,102,0.06)' : 'rgba(255,255,255,0.03)', borderRadius: 14, border: `1px solid ${glow ? 'rgba(255,69,102,0.2)' : T.border}` }}>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: T.fontDisplay, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{unit}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all',   label: `Tous (${athletes.length})` },
            { key: 'alert', label: `🚨 Alertes (${alerts.length})` },
            { key: 'doms',  label: `🩹 DOMS (${domsAlerts.length})` },
            { key: 'ok',    label: 'OK' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '7px 14px', borderRadius: 10,
              border: `1px solid ${filter === f.key ? T.accent + '40' : T.border}`,
              background: filter === f.key ? `${T.accent}12` : 'transparent',
              color: filter === f.key ? T.accentLight : T.textDim,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>{f.label}</button>
          ))}
          <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontSize: 12, cursor: 'pointer' }}>
            ↻ Actualiser
          </button>
        </div>

        {/* Liste athlètes */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>Aucun athlète</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map(athlete => {
              const h = athlete.hooper
              const score = h ? h.fatigue + h.sommeil + h.stress + h.courbatures : null
              const si = scoreLabel(score)
              const isAlert = score >= 21
              const daysH = h ? daysAgo(h.date) : null
              const c = athlete.compo
              const ch = athlete.charge

              const domsZones = h?.doms_zones || {}
              const activeDomsZones = Object.values(domsZones).filter(z => z?.level > 0)
              const nbDomsZones = activeDomsZones.length
              const maxDomsLevel = nbDomsZones ? Math.max(...activeDomsZones.map(z => z.level || 0)) : 0
              const rtpStep = nbDomsZones > 0 ? calcRtpStep(domsZones, score) : null

              return (
                <div
                  key={athlete.id}
                  onClick={() => navigate(`/prep/analyse/${athlete.id}`)}
                  style={{
                    background: isAlert ? 'rgba(255,69,102,0.04)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${isAlert ? 'rgba(255,69,102,0.25)' : T.border}`,
                    borderRadius: 16, padding: '14px 16px',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isAlert ? 'rgba(255,69,102,0.07)' : 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = isAlert ? 'rgba(255,69,102,0.04)' : 'rgba(255,255,255,0.025)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Nom */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        {isAlert && <span style={{ fontSize: 14 }}>🚨</span>}
                        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {athlete.full_name || athlete.email}
                        </div>
                      </div>

                      {/* HOOPER */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: nbDomsZones > 0 ? 8 : 0 }}>
                        {score !== null ? (
                          <>
                            <div style={{ padding: '4px 10px', borderRadius: 20, background: si.bg, border: `1px solid ${si.color}30`, fontSize: 12, fontWeight: 700, color: si.color }}>
                              HOOPER {score}/40 — {si.text}
                            </div>
                            {daysH !== null && daysH > 0 && <div style={{ fontSize: 11, color: T.textDim }}>il y a {daysH}j</div>}
                            {daysH === 0 && <div style={{ fontSize: 11, color: T.accentLight }}>✓ Aujourd'hui</div>}
                          </>
                        ) : (
                          <div style={{ fontSize: 12, color: T.textDim, fontStyle: 'italic' }}>HOOPER non rempli</div>
                        )}
                      </div>

                      {/* DOMS — bouton cliquable */}
                      {nbDomsZones > 0 && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                          <button
                            onClick={e => openDoms(e, athlete)}
                            style={{
                              padding: '5px 12px', borderRadius: 20, border: `1px solid ${domsLevelColor(maxDomsLevel)}40`,
                              background: domsLevelBg(maxDomsLevel), color: domsLevelColor(maxDomsLevel),
                              fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', gap: 5, alignItems: 'center',
                            }}
                          >
                            🩹 {nbDomsZones} zone{nbDomsZones > 1 ? 's' : ''} · Niv. max {maxDomsLevel}/10
                          </button>
                          {rtpStep && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: rtpStepColor(rtpStep), padding: '3px 9px', borderRadius: 20, background: `${rtpStepColor(rtpStep)}12`, border: `1px solid ${rtpStepColor(rtpStep)}30` }}>
                              {RTP_STEPS[rtpStep - 1]?.icon} Étape {rtpStep}/5
                            </div>
                          )}
                        </div>
                      )}

                      {/* Protocole RTP — toujours visible */}
                      <button
                        onClick={e => openRtp(e, athlete)}
                        style={{
                          padding: '5px 12px', borderRadius: 20,
                          border: `1px solid ${T.accent}40`,
                          background: `${T.accent}10`, color: T.accentLight,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        🎮 Protocole RTP
                      </button>
                    </div>

                    {/* Métriques droite */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                      {c?.weight_kg && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#3ecf8e', fontFamily: T.fontDisplay }}>{c.weight_kg}<span style={{ fontSize: 10 }}>kg</span></div>
                          <div style={{ fontSize: 9, color: T.textDim }}>Poids</div>
                        </div>
                      )}
                      {c?.body_fat_pct && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#ff7043', fontFamily: T.fontDisplay }}>{c.body_fat_pct}<span style={{ fontSize: 10 }}>%</span></div>
                          <div style={{ fontSize: 9, color: T.textDim }}>M. grasse</div>
                        </div>
                      )}
                      {ch && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#4d9fff', fontFamily: T.fontDisplay }}>{Math.round(ch.total)}</div>
                          <div style={{ fontSize: 9, color: T.textDim }}>UA / sem.</div>
                        </div>
                      )}
                      <div style={{ color: T.textDim, fontSize: 16 }}>→</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Panel DOMS */}
      {selectedAthlete && (
        <DomsDetailPanel
          athlete={selectedAthlete}
          hooperHistory={selectedAthlete.allHoopers || []}
          onClose={() => setSelectedAthlete(null)}
        />
      )}

      {/* Panel RTP */}
      {rtpAthlete && (
        <RtpGame
          athleteId={rtpAthlete.id}
          athleteName={rtpAthlete.full_name || rtpAthlete.email}
          coachId={coachId}
          onClose={() => setRtpAthlete(null)}
        />
      )}
    </PageWrap>
  )
}
