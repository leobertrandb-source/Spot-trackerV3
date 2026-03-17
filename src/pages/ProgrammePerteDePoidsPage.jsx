import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

const PHASES = [
  {
    number: '01',
    title: 'Activation Neuromusculaire & Mobilisation Articulaire',
    duration: '10 min',
    summary: 'Élever progressivement la température intramusculaire, mobiliser les chaînes postérieure et antérieure du bas du corps, et amorcer le recrutement des groupes musculaires cibles (fessiers, quadriceps, ischio-jambiers).',
    bullets: [
      'L\'échauffement actif augmente la vitesse de contraction musculaire et réduit la viscosité synoviale, diminuant le risque lésionnel sur les structures tendino-ligamentaires sollicitées dans les phases suivantes.',
      'Les exercices de mobilité de hanche (cercles, ouvertures) améliorent l\'amplitude de mouvement disponible au niveau coxo-fémoral — déterminante pour la profondeur et la sécurité du squat et des fentes.',
      'Le pont fessier activé en amont inhibe le schéma de dominance des fléchisseurs de hanche (souvent raccourcis chez les sédentaires) et favorise une contraction optimale des fessiers pendant les exercices de force.',
      'L\'enchaînement sans pause maintient une fréquence cardiaque modérément élevée (60–70% FCmax), initiant la mobilisation des acides gras sans accumuler de fatigue centrale.',
    ],
    examples: [
      {
        label: 'Exemple — Séance Bas du Corps',
        items: [
          'Mobilité hanches — cercles & ouvertures',
          'Pont fessier 2 × 15 reps',
          'Squat poids de corps 2 × 15 reps',
          'Fentes marchées 2 × 10 reps',
          'Bike 1 min (cadence progressive)',
        ],
      },
      {
        label: 'Rationale',
        items: [
          'Activation isolée du grand fessier avant mise en charge',
          'Répétitions élevées → recrutement neuromusculaire sans fatigue',
          'Pattern de fente → préparation proprioceptive et stabilité unijambiste',
          'Cardio cyclique → élévation FC sans acidose lactique',
        ],
      },
    ],
  },
  {
    number: '02',
    title: 'Force — Protection du Métabolisme de Repos',
    duration: '15 min',
    summary: 'Maintenir — et idéalement développer — la masse musculaire malgré le déficit calorique, afin de préserver le métabolisme de base et éviter l\'adaptation métabolique à la baisse.',
    bullets: [
      'En restriction calorique, le corps puise prioritairement dans les réserves adipeuses et musculaires. Un stimulus de force à haute intensité (≥ 80% 1RM) envoie un signal anabolique suffisant pour maintenir la synthèse protéique myofibrillaire et limiter la protéolyse musculaire.',
      'Le muscle squelettique est le principal tissu métaboliquement actif au repos. Chaque kilogramme de masse maigre préservé représente une dépense énergétique supplémentaire de l\'ordre de 13 kcal/jour au repos — un effet cumulatif déterminant sur plusieurs semaines.',
      'Le travail en tempo contrôlé (phase excentrique 3 s) augmente le temps sous tension mécanique, amplifiant la dégradation protéique locale et donc le signal de remodelage musculaire — à dépense énergétique par séance identique.',
      'Le repos long (2\'–2\'30) garantit une resynthèse quasi-complète de phosphocréatine, permettant de maintenir la qualité de recrutement neuromusculaire sur l\'ensemble des séries sans dériver vers un travail métabolique glycolytique involontaire.',
    ],
  },
  {
    number: '03',
    title: 'Hypertrophie Métabolique — Densification Calorique',
    duration: '20 min',
    summary: 'Maximiser la dépense énergétique intra-séance par un volume de travail élevé en mode circuit, tout en maintenant un stimulus d\'hypertrophie fonctionnelle sur les muscles cibles.',
    bullets: [
      'La plage 10–15 répétitions à tempo lent (3-0-1) génère une accumulation significative de métabolites (lactate, ions H⁺, Pi) — un des trois mécanismes primaires d\'hypertrophie — et élève la dépense calorique post-exercice (EPOC) jusqu\'à 24–48 h après la séance.',
      'L\'EPOC (Excess Post-exercise Oxygen Consumption) représente la surconsommation d\'oxygène en phase de récupération pour restaurer l\'homéostasie : resynthèse de phosphocréatine, réoxydation du lactate, régulation thermique. Plus le volume et l\'intensité métabolique sont élevés, plus l\'EPOC est prolongé.',
      'Le circuit multi-exercices (fentes bulgares + step-up + planche dynamique) sollicite simultanément les quadriceps, les ischio-jambiers, les fessiers et les stabilisateurs du tronc, maximisant le recrutement musculaire total et donc la dépense glycolytique par unité de temps.',
      'Le repos court (60 s) maintient un environnement métabolique stressant entre les séries, favorisant la lipolyse hormonale (pic de catécholamines et GH) sans compromettre la qualité technique.',
    ],
  },
  {
    number: '04',
    title: 'Cardio Stratégique — NEAT & Dépense Totale',
    duration: '15 min',
    summary: 'Augmenter la dépense énergétique totale journalière en ciblant le facteur n°1 de la perte de poids durable : l\'activité physique non structurée (NEAT).',
    bullets: [
      'Placé en fin de séance, ce bloc s\'effectue sur un système neuromusculaire partiellement épuisé — condition qui optimise l\'utilisation des acides gras libres comme substrat énergétique, la glycolyse étant limitée par les réserves déjà sollicitées.',
      'L\'intensité modérée soutenue (65–75% FCmax) correspond à la zone d\'oxydation lipidique maximale : le rapport lipides/glucides oxydés est le plus favorable à cette intensité, comparé aux efforts très intenses (>85% FCmax) où la filière glycolytique domine.',
      'La combinaison Sled push / traîneau lestage + marche active + poussée concentrique répétée crée une dépense musculaire significative sur les membres inférieurs sans surcharge articulaire — idéal en fin de séance sur des articulations déjà sollicitées.',
      'L\'objectif pédagogique de ce bloc est également de conditionner le comportement : chaque séance renforce l\'habitude de maintenir un niveau d\'activité physique élevé au-delà du temps d\'entraînement formel.',
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


export default function ProgrammePerteDePoidsPage() {
  const navigate = useNavigate()
  return (
    <PageWrap>
      <style>{RESPONSIVE_STYLES}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', padding: '8px 12px', borderRadius: 999, border: `1px solid ${T.accent + '28'}`, background: T.accentGlowSm, color: T.accentLight, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
            Programme perte de poids
          </div>
          <div className="prog-header-title" style={{ fontSize: 'clamp(22px,5vw,40px)', fontWeight: 900, letterSpacing: 1.4, lineHeight: 1.1, color: T.text }}>
            MÉTHODE SPOT TRAINING — PERTE DE POIDS
          </div>
          <div style={{ color: T.textMid, fontSize: 15, lineHeight: 1.7, marginTop: 12, maxWidth: 900 }}>
            Réduire la masse grasse tout en préservant le capital musculaire, avec une structure d'entraînement qui améliore la dépense énergétique sans casser la récupération.
          </div>
        </div>
        <Card glow>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 10 }}>Objectif global</div>
          <div style={{ color: T.textMid, lineHeight: 1.7 }}>
            Créer un déficit énergétique durable via la densification du travail musculaire et l'optimisation de la dépense calorique totale, sans sacrifier la force ni la masse maigre.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn onClick={() => navigate('/nutrition/macros')}>Voir mes macros</Btn>
            <Btn variant="secondary" onClick={() => navigate('/progression')}>Voir ma progression</Btn>
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
