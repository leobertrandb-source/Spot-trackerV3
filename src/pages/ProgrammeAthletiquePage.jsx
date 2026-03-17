import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

const PHASES = [
  {
    number: '01',
    title: 'Activation Neuromusculaire',
    duration: '10 min',
    summary: 'Préparer le système musculo-squelettique et nerveux aux contraintes mécaniques et métaboliques de la séance.',
    bullets: [
      'L\'élévation de la température intramusculaire améliore la vitesse de contraction des fibres et réduit la viscosité articulaire, limitant le risque de blessure.',
      'L\'échauffement actif augmente la vitesse de conduction nerveuse et amorce la potentiation post-activation (PAP), amplifiant les performances des phases suivantes.',
      'Les exercices poly-articulaires enchaînés créent une demande cardio-respiratoire progressive sans accumuler de fatigue centrale prématurée.',
    ],
    examples: [
      {
        label: 'Exemple — Séance Bas du Corps',
        items: [
          'Bike — 1 min (intensité progressive)',
          'Fentes marchées aller-retour',
          'Jumping Jacks × 20',
          '3 tours · Enchaînement sans pause',
        ],
      },
      {
        label: 'Rationale',
        items: [
          'Activation cardiovasculaire sans pic d\'acidose',
          'Mobilisation dynamique hanche, genou, cheville',
          'Recrutement précoce des unités motrices du bas du corps',
        ],
      },
    ],
  },
  {
    number: '02',
    title: 'Vitesse & Explosivité — PAP',
    duration: '10 min',
    summary: 'Exploiter le phénomène de potentiation post-activation pour maximiser le recrutement des fibres de type II avant le bloc de force.',
    bullets: [
      'Les exercices balistiques et pliométriques augmentent la fréquence de décharge des motoneurones et la vitesse de développement de la force (RFD — Rate of Force Development).',
      'La combinaison d\'une charge sous-maximale explosive avec un effort pliométrique crée une fenêtre de surexcitabilité nerveuse de 3 à 8 minutes, directement exploitable en phase de force.',
      'Le sprint anaérobie terminal complète l\'activation du système phosphagène (ATP-PCr) sans induire de fatigue musculaire locale significative.',
    ],
  },
  {
    number: '03',
    title: 'Force Maximale & Fonctionnelle',
    duration: '15 min',
    summary: 'Développer les adaptations neurales et structurelles maximales via une surcharge mécanique progressive sur les groupes musculaires cibles.',
    bullets: [
      'Les charges supérieures à 80% du 1RM induisent un recrutement quasi-total des unités motrices rapides (type IIx) et optimisent la coordination intramusculaire par synchronisation des motoneurones.',
      'Le repos long (≥ 3 min) permet la resynthèse complète des stocks de phosphocréatine et prévient l\'accumulation d\'ions H⁺, garantissant une qualité d\'effort maximale à chaque série.',
      'La progression vers des intensités sub-maximales répétées (force fonctionnelle) établit un continuum force-hypertrophie en maintenant un volume de travail suffisant pour le signal anabolique.',
    ],
  },
  {
    number: '04',
    title: 'Hypertrophie Fonctionnelle',
    duration: '15 min',
    summary: 'Maximiser le stress mécanique et métabolique pour déclencher la synthèse protéique myofibrillaire et développer la section transversale musculaire.',
    bullets: [
      'La plage 8–12 répétitions à 65–75% 1RM génère une tension mécanique suffisante et un stress métabolique élevé (accumulation de lactate, hypoxie locale), deux des principaux mécanismes d\'hypertrophie identifiés.',
      'Le travail unijambiste (fentes bulgares) crée une demande de stabilisation accrue — recrutement des muscles stabilisateurs de hanche et correction des asymétries bilatérales, facteurs déterminants en prévention des blessures.',
      'Le repos court (60 s) maintient un environnement hormonal favorable (pic de GH et IGF-1) et amplifie la réponse anabolique locale.',
    ],
  },
  {
    number: '05',
    title: 'Cardio-Conditioning & Capacité Aérobie',
    duration: '10 min',
    summary: 'Développer la puissance aérobie maximale (VO₂max) et la capacité à maintenir une intensité élevée en situation de fatigue neuromusculaire cumulée.',
    bullets: [
      'Placé en fin de séance, ce bloc soumet les muscles déjà recrutés à un effort glycolytique intense — condition qui reproduit fidèlement les contraintes des sports collectifs et de compétition.',
      'Le travail intermittent haute intensité (HIIT) est le stimulus le plus efficace pour élever la VO₂max : il augmente le débit cardiaque maximal, la densité mitochondriale et la capillarisation musculaire.',
      'VO₂max : Volume maximal d\'oxygène consommé par unité de temps pendant un effort maximal — indicateur direct de la puissance aérobie et de l\'endurance de performance.',
      'La combinaison d\'exercices poly-articulaires (slade, wall balls) avec un effort cyclique (bike) sollicite simultanément les filières lactique et aérobie, améliorant la tolérance à l\'acidose musculaire.',
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


export default function ProgrammeAthletiquePage() {
  const navigate = useNavigate()
  return (
    <PageWrap>
      <style>{RESPONSIVE_STYLES}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', padding: '8px 12px', borderRadius: 999, border: `1px solid ${T.accent + '28'}`, background: T.accentGlowSm, color: T.accentLight, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
            Programme athlétique
          </div>
          <div className="prog-header-title" style={{ fontSize: 'clamp(22px,5vw,40px)', fontWeight: 900, letterSpacing: 1.4, lineHeight: 1.1, color: T.text }}>
            MÉTHODE SPOT TRAINING — ATHLÉTIQUE
          </div>
          <div style={{ color: T.textMid, fontSize: 15, lineHeight: 1.7, marginTop: 12, maxWidth: 900 }}>
            Développer simultanément vitesse, puissance, force, hypertrophie fonctionnelle et capacité cardio-respiratoire, avec un cadre durable et propre techniquement.
          </div>
        </div>
        <Card glow>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 10 }}>Objectif global</div>
          <div style={{ color: T.textMid, lineHeight: 1.7 }}>
            Développer l'athlète dans sa globalité en préservant la santé articulaire, la qualité du mouvement et la capacité à répéter la performance.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn onClick={() => navigate('/entrainement/aujourdhui')}>Voir ma séance</Btn>
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
