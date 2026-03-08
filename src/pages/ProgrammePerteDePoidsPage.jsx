import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

const PHASES = [
  {
    number: '01',
    title: 'Activation neuromusculaire & mobilité',
    duration: '10 min',
    summary:
      'Préparer le corps à produire de l’effort avec une montée progressive de l’intensité.',
    bullets: [
      'Mobilité hanches / chevilles / thoracique',
      'Activation bas du corps et tronc',
      'Échauffement actif avec faible fatigue',
      'Mise en route cardio légère',
    ],
  },
  {
    number: '02',
    title: 'Bloc force / maintien musculaire',
    duration: '15 min',
    summary:
      'Préserver la masse maigre avec du travail de base suffisamment qualitatif.',
    bullets: [
      'Mouvements structurants : squat, presse, soulevé de terre léger, tirages, développés',
      '3 à 4 séries sur plage 5–8 reps',
      'Exécution propre, charge contrôlée, repos modéré',
      'Objectif : garder le muscle pendant le déficit',
    ],
  },
  {
    number: '03',
    title: 'Densification musculaire',
    duration: '12 à 15 min',
    summary:
      'Augmenter la dépense énergétique via un travail plus dense mais toujours productif.',
    bullets: [
      'Circuits ou supersets intelligents',
      'Alternance haut / bas ou agoniste / antagoniste',
      'Repos plus courts',
      'Volume utile sans sacrifier la qualité',
    ],
  },
  {
    number: '04',
    title: 'Conditioning / dépense calorique',
    duration: '10 à 15 min',
    summary:
      'Créer une demande métabolique complémentaire pour soutenir la perte de poids.',
    bullets: [
      'Ski erg, rameur, bike, marche inclinée ou circuits simples',
      'Intervalles modérés à soutenus',
      'RPE contrôlé pour préserver l’adhérence',
      'Objectif : brûler plus sans exploser la récupération',
    ],
  },
  {
    number: '05',
    title: 'Retour au calme / adhérence',
    duration: '5 min',
    summary:
      'Stabiliser la récupération et maintenir une routine durable au quotidien.',
    bullets: [
      'Respiration et redescente cardiaque',
      'Hydratation',
      'Validation du suivi nutritionnel',
      'Rappel : la régularité gagne contre l’intensité ponctuelle',
    ],
  },
]

function PhaseCard({ phase }) {
  const [open, setOpen] = useState(true)

  return (
    <Card glow={open}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          color: T.text,
          padding: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ color: T.accentLight, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
              {phase.number} — {phase.duration}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
              {phase.title}
            </div>
          </div>

          <div style={{ color: T.textDim, fontSize: 18 }}>
            {open ? '−' : '+'}
          </div>
        </div>

        <div style={{ color: T.textMid, marginTop: 10, lineHeight: 1.6 }}>
          {phase.summary}
        </div>
      </button>

      {open ? (
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {phase.bullets.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                background: T.surface,
                border: `1px solid ${T.border}`,
                color: T.text,
                lineHeight: 1.5,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}

export default function ProgrammePerteDePoidsPage() {
  const navigate = useNavigate()

  return (
    <PageWrap>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '8px 12px',
              borderRadius: 999,
              border: `1px solid ${T.accent + '28'}`,
              background: T.accentGlowSm,
              color: T.accentLight,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Programme perte de poids
          </div>

          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 1.4, lineHeight: 1, color: T.text }}>
            MÉTHODE SPOT TRAINING — PERTE DE POIDS
          </div>

          <div style={{ color: T.textMid, fontSize: 15, lineHeight: 1.7, marginTop: 12, maxWidth: 900 }}>
            Réduire la masse grasse tout en préservant le capital musculaire, avec une structure
            d’entraînement qui améliore la dépense énergétique sans casser la récupération.
          </div>
        </div>

        <Card glow>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 10 }}>
            Objectif global
          </div>
          <div style={{ color: T.textMid, lineHeight: 1.7 }}>
            Créer un déficit énergétique durable via la densification du travail musculaire et
            l’optimisation de la dépense calorique totale, sans sacrifier la force ni la masse maigre.
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