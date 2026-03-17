import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

const PHASES = [
  {
    number: '01',
    title: 'Activation & Mobilisation',
    duration: '10 min',
    summary: 'Préparer les muscles, articulations et système nerveux avant la charge lourde.',
    bullets: [
      'Augmenter la température intramusculaire → meilleure qualité de contraction.',
      'Activer les fibres rapides et stimuler le système nerveux central.',
      'Réduire le risque de blessure articulaire et musculaire.',
      'Amorcer la potentiation post-activation (PAP).',
    ],
    examples: [
      {
        label: 'Séance Pectoraux / Triceps',
        items: [
          'Mobilité dynamique épaules & poignets — 2 min',
          'Pompes explosives : descente contrôlée, montée explosive — 2 × 10 rép.',
          'Ski Erg 30\'\' × 2 (intensité progressive)',
        ],
      },
      {
        label: 'Séance Dos / Biceps',
        items: [
          'Rotations thoraciques & mobilité scapulaire — 2 min',
          'Tractions australiennes lentes — 2 × 10 rép.',
          'Rameur 30\'\' × 2 (intensité progressive)',
        ],
      },
      {
        label: 'Séance Jambes',
        items: [
          'Mobilité hanche & cheville — 2 min',
          'Squats à vide lents — 2 × 10 rép.',
          'Vélo 30\'\' × 2 (intensité progressive)',
        ],
      },
    ],
  },
  {
    number: '02',
    title: 'Force Fonctionnelle',
    duration: '15 min',
    summary: 'Stimuler les fibres de type II (rapides) via des charges lourdes (80–90% 1RM) pour maximiser la production de force.',
    bullets: [
      'Recrutement maximal des unités motrices rapides.',
      'Amélioration de la coordination intermusculaire.',
      'Développement de la densité musculaire et préparation au travail volumique.',
      'Repos long entre les séries pour récupération complète du SNC.',
    ],
    examples: [
      {
        label: 'Séance Pectoraux / Triceps',
        items: [
          'Développé couché barre — 5 séries × 3–5 rép.',
          'Repos : 1\'30–2\' · Tempo : 2 sec descente contrôlée',
        ],
      },
      {
        label: 'Séance Dos / Biceps',
        items: [
          'Soulevé de terre — 5 séries × 3–5 rép.',
          'Repos : 2\'–2\'30 · Tempo : 2 sec montée contrôlée',
        ],
      },
      {
        label: 'Séance Jambes',
        items: [
          'Squat barre — 5 séries × 3–5 rép.',
          'Repos : 2\'–2\'30 · Tempo : 3 sec descente contrôlée',
        ],
      },
    ],
  },
  {
    number: '03',
    title: 'Hypertrophie',
    duration: '25 min',
    summary: 'Créer le stress mécanique et métabolique nécessaire à la croissance musculaire : tension élevée, congestion et dommages musculaires contrôlés.',
    bullets: [],
    tables: [
      {
        caption: 'Exemple — Séance Pectoraux',
        rows: [
          { exercise: 'Développé incliné haltères', series: '4', reps: '8 à 10', rest: '1\'15', goal: 'Travailler sur l\'amplitude' },
          { exercise: 'Écarté poulies', series: '3', reps: '10 à 12', rest: '1\'', goal: 'Maintien de la tension musculaire et contraction maximale' },
          { exercise: 'Dips lestés', series: '4', reps: '8 à 10', rest: '1\'15', goal: 'Finition pecs + transition triceps' },
        ],
      },
      {
        caption: 'Variante — Séance Épaules',
        rows: [
          { exercise: 'Développé militaire haltères', series: '4', reps: '8–10', rest: '1\'15', goal: 'Force & volume deltoïde antérieur' },
          { exercise: 'Élévations latérales câbles', series: '3', reps: '12–15', rest: '1\'', goal: 'Tension continue deltoïde latéral' },
          { exercise: 'Oiseau (poulie basse)', series: '3', reps: '12–15', rest: '1\'', goal: 'Finition deltoïde postérieur' },
        ],
      },
      {
        caption: 'Variante — Séance Dos',
        rows: [
          { exercise: 'Tirage horizontal barre', series: '4', reps: '8–10', rest: '1\'15', goal: 'Épaisseur dorsale — grand dorsal' },
          { exercise: 'Tirage vertical prise large', series: '3', reps: '10–12', rest: '1\'', goal: 'Largeur — étirement complet' },
          { exercise: 'Rowing haltère unilatéral', series: '4', reps: '8–10', rest: '1\'15', goal: 'Densité & symétrie musculaire' },
        ],
      },
    ],
  },
  {
    number: '04',
    title: 'Isolation',
    duration: '',
    summary: 'Finir la séance en isolant les triceps après pré-fatigue : augmentation du temps sous tension, accumulation métabolique et congestion maximale.',
    bullets: [
      'Les triceps participent à tous les mouvements de poussée.',
      'Les isoler après pré-fatigue garantit un recrutement total des fibres.',
      'Phase d\'épuisement final pour optimiser le signal hypertrophique.',
    ],
    tables: [
      {
        caption: 'Exemple — Séance Triceps',
        rows: [
          { exercise: 'Barre au front (EZ)', series: '3', reps: '10', rest: '75 s', goal: 'Descente lente, extension complète' },
          { exercise: 'Extension corde poulie', series: '3', reps: '12–15', rest: '45 s', goal: 'Contraction maximale' },
          { exercise: 'Pompes serrées ou dips poids du corps', series: '2', reps: 'échec', rest: '60 s', goal: 'Congestion finale' },
        ],
      },
      {
        caption: 'Variante — Isolation Biceps',
        rows: [
          { exercise: 'Curl barre EZ', series: '3', reps: '10', rest: '75 s', goal: 'Descente lente, supination complète' },
          { exercise: 'Curl marteau câble', series: '3', reps: '12–15', rest: '45 s', goal: 'Contraction max — brachial & long supinateur' },
          { exercise: 'Curl concentration haltère', series: '2', reps: 'Échec', rest: '60 s', goal: 'Congestion finale — pic biceps' },
        ],
      },
      {
        caption: 'Variante — Isolation Mollets',
        rows: [
          { exercise: 'Extensions mollets debout', series: '4', reps: '12–15', rest: '60 s', goal: 'Amplitude max — soléaire & gastrocnémien' },
          { exercise: 'Extensions mollets assis', series: '3', reps: '15–20', rest: '45 s', goal: 'Stress métabolique — soléaire profond' },
          { exercise: 'Sauts de corde', series: '2', reps: '30 s', rest: '60 s', goal: 'Congestion finale & coordination' },
        ],
      },
    ],
  },
  {
    number: '05',
    title: 'Retour au Calme — Récupération Active',
    duration: '5–10 min',
    summary: 'Activer le système parasympathique, accélérer l\'élimination des lactates et optimiser la récupération sans traumatiser les fibres.',
    bullets: [
      'Ramener le corps à un état de repos : fréquence cardiaque & tension artérielle.',
      'Accélérer l\'élimination des déchets métaboliques (lactates, ions H⁺).',
      'Favoriser la récupération nerveuse et réduire le cortisol post-effort.',
    ],
    examples: [
      {
        label: 'Séance Pectoraux / Triceps',
        items: [
          'Airbike basse intensité — 3 min',
          'Foam roller pecs & triceps — 1 à 2 min',
          'Respiration contrôlée 4-7-8 — 1 min (optionnel)',
        ],
      },
      {
        label: 'Séance Dos / Biceps',
        items: [
          'Rameur basse intensité — 3 min',
          'Foam roller dorsaux & biceps — 1 à 2 min',
          'Étirements passifs grand dorsal — 1 min',
        ],
      },
      {
        label: 'Séance Jambes',
        items: [
          'Vélo elliptique basse intensité — 3 min',
          'Foam roller quadriceps, ischio, mollets — 2 min',
          'Étirements passifs fléchisseurs hanche — 1 min',
        ],
      },
    ],
  },
]


// ─── Composants partagés ────────────────────────────────────────────────────

function ExamplesGrid({ examples }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
      {examples.map((ex, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: 'rgba(62,207,142,0.08)', borderBottom: `1px solid ${T.border}`, padding: '7px 12px', fontSize: 10.5, fontWeight: 700, color: T.accentLight, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {ex.label}
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ex.items.map((item, j) => (
              <div key={j} style={{ fontSize: 12, color: T.textMid, lineHeight: 1.45, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <span style={{ color: T.accent, fontSize: 18, lineHeight: 0.8, flexShrink: 0 }}>·</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ExerciseTable({ caption, rows }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {caption && (
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.accentLight, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
          {caption}
        </div>
      )}
      {/* Mobile: cards instead of table */}
      <div className="prog-table-desktop" style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${T.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Exercices', 'Séries', 'Reps', 'Repos', 'Objectif'].map(h => (
                <th key={h} style={{ padding: '9px 12px', borderBottom: `1px solid ${T.border}`, textAlign: 'left', color: T.textDim, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid rgba(30,45,64,0.5)` : 'none' }}>
                <td style={{ padding: '10px 12px', color: T.text, lineHeight: 1.4 }}>{row.exercise}</td>
                <td style={{ padding: '10px 12px', color: T.accentLight, fontWeight: 700 }}>{row.series}</td>
                <td style={{ padding: '10px 12px', color: T.accentLight, fontWeight: 700 }}>{row.reps}</td>
                <td style={{ padding: '10px 12px', color: T.accentLight, fontWeight: 700, whiteSpace: 'nowrap' }}>{row.rest}</td>
                <td style={{ padding: '10px 12px', color: T.text, lineHeight: 1.4 }}>{row.goal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="prog-table-mobile" style={{ display: 'none', flexDirection: 'column', gap: 8 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>{row.exercise}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[['Séries', row.series], ['Reps', row.reps], ['Repos', row.rest]].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 9, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.accentLight }}>{val}</div>
                </div>
              ))}
            </div>
            {row.goal && <div style={{ fontSize: 11, color: T.textMid, marginTop: 8, lineHeight: 1.5 }}>{row.goal}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function PhaseCard({ phase }) {
  const [open, setOpen] = useState(true)
  return (
    <Card glow={open}>
      <button type="button" onClick={() => setOpen(!open)} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: T.text, padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: T.accentLight, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
              {phase.number}{phase.duration ? ` — ${phase.duration}` : ''}
            </div>
            <div style={{ fontSize: 'clamp(16px,3vw,22px)', fontWeight: 900, marginTop: 6, lineHeight: 1.2 }}>{phase.title}</div>
          </div>
          <div style={{ color: T.textDim, fontSize: 18, flexShrink: 0 }}>{open ? '−' : '+'}</div>
        </div>
        <div style={{ color: T.textMid, marginTop: 10, lineHeight: 1.6, fontSize: 14 }}>{phase.summary}</div>
      </button>
      {open && (
        <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
          {phase.bullets && phase.bullets.length > 0 && (
            <div style={{ borderLeft: '2px solid rgba(62,207,142,0.3)', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {phase.bullets.map((item, i) => (
                <div key={i} style={{ fontSize: 13, color: T.text, lineHeight: 1.6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: T.accent, fontSize: 9, marginTop: 5, flexShrink: 0 }}>▸</span>
                  {item}
                </div>
              ))}
            </div>
          )}
          {phase.examples && phase.examples.length > 0 && <ExamplesGrid examples={phase.examples} />}
          {phase.tables && phase.tables.map((table, i) => (
            <ExerciseTable key={i} caption={table.caption} rows={table.rows} />
          ))}
        </div>
      )}
    </Card>
  )
}

const RESPONSIVE_STYLES = `
  @media (max-width: 640px) {
    .prog-table-desktop { display: none !important; }
    .prog-table-mobile { display: flex !important; }
    .prog-header-title { font-size: 26px !important; letter-spacing: 0 !important; }
  }
`


export default function ProgrammeBodybuildingPage() {
  const navigate = useNavigate()
  return (
    <PageWrap>
      <style>{RESPONSIVE_STYLES}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', padding: '8px 12px', borderRadius: 999, border: `1px solid ${T.accent + '28'}`, background: T.accentGlowSm, color: T.accentLight, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
            Programme bodybuilding
          </div>
          <div className="prog-header-title" style={{ fontSize: 'clamp(22px,5vw,40px)', fontWeight: 900, letterSpacing: 1.4, lineHeight: 1.1, color: T.text }}>
            MÉTHODE SPOT TRAINING — PRISE DE MASSE
          </div>
          <div style={{ color: T.textMid, fontSize: 15, lineHeight: 1.7, marginTop: 12, maxWidth: 900 }}>
            Séance structurée en 5 phases de progression neuro-musculaire. Exemple type : Pectoraux / Triceps.
          </div>
        </div>
        <Card glow>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 10 }}>Objectif global</div>
          <div style={{ color: T.textMid, lineHeight: 1.7 }}>
            Optimiser le recrutement musculaire, maximiser l'hypertrophie et organiser la progression autour de séances lisibles, intenses et mesurables.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn onClick={() => navigate('/entrainement/aujourdhui')}>Voir ma séance</Btn>
            <Btn variant="secondary" onClick={() => navigate('/nutrition/macros')}>Voir mes macros</Btn>
          </div>
        </Card>
        <div style={{ height: 18 }} />
        <div style={{ display: 'grid', gap: 16 }}>
          {PHASES.map((phase) => (
            <PhaseCard key={phase.number} phase={phase} />
          ))}
        </div>
      </div>
    </PageWrap>
  )
}
