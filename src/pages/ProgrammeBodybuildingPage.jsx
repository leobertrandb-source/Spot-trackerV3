import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

const PHASES = [
  {
    number: '01',
    title: 'Activation & Mobilisation',
    duration: '10 min',
    summary:
      'Préparer les muscles, les articulations et le système nerveux avant la charge lourde.',
    bullets: [
      'Mobilité dynamique épaules / poignets / thoracique',
      'Pompes explosives ou activation spécifique du groupe ciblé',
      'Montée progressive de la température musculaire',
      'Pré-activation pour améliorer la qualité de contraction',
    ],
  },
  {
    number: '02',
    title: 'Force mécanique',
    duration: '15 à 20 min',
    summary:
      'Créer la base de tension mécanique avec les mouvements les plus productifs.',
    bullets: [
      'Développé couché, incliné, rowing ou tractions lestées selon la séance',
      '4 à 5 séries lourdes sur plage 4–8 reps',
      'Repos long pour garder un haut niveau de performance',
      'Recherche de progression contrôlée de semaine en semaine',
    ],
  },
  {
    number: '03',
    title: 'Tension d’hypertrophie',
    duration: '15 min',
    summary:
      'Conserver une forte tension musculaire sur des séries plus longues et très propres.',
    bullets: [
      'Inclure des angles complémentaires et du contrôle excentrique',
      'Plage de 8–12 reps',
      'Accent sur l’amplitude, le tempo et la connexion muscle-esprit',
      'Limiter les compensations et garder la cible sous tension',
    ],
  },
  {
    number: '04',
    title: 'Stress métabolique / congestion',
    duration: '10 à 15 min',
    summary:
      'Augmenter le recrutement local avec des formats plus denses et moins de repos.',
    bullets: [
      'Supersets, dropsets ou séries guidées',
      'Travail local pectoraux / triceps, dos / biceps, jambes, épaules selon le split',
      'Temps de repos courts',
      'Objectif : congestion, brûlure locale, volume utile',
    ],
  },
  {
    number: '05',
    title: 'Retour au calme / récupération',
    duration: '5 à 10 min',
    summary:
      'Faire redescendre le système nerveux et optimiser la récupération entre séances.',
    bullets: [
      'Respiration contrôlée',
      'Mobilité légère sur les segments sollicités',
      'Hydratation et apport post-training adaptés',
      'Suivi des charges et des ressentis dans l’application',
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

export default function ProgrammeBodybuildingPage() {
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
            Programme bodybuilding
          </div>

          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 1.4, lineHeight: 1, color: T.text }}>
            MÉTHODE SPOT TRAINING — PRISE DE MASSE
          </div>

          <div style={{ color: T.textMid, fontSize: 15, lineHeight: 1.7, marginTop: 12, maxWidth: 900 }}>
            Séance structurée en 5 phases pour maximiser le recrutement musculaire, l’hypertrophie
            et la progression en charge, tout en limitant la fatigue systémique inutile.
          </div>
        </div>

        <Card glow>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 10 }}>
            Objectif global
          </div>
          <div style={{ color: T.textMid, lineHeight: 1.7 }}>
            Optimiser le recrutement musculaire, maximiser l’hypertrophie et organiser la progression
            autour de séances lisibles, intenses et mesurables.
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn onClick={() => navigate('/entrainement/aujourdhui')}>Voir ma séance</Btn>
            <Btn variant="secondary" onClick={() => navigate('/nutrition/plan')}>Voir mon plan nutrition</Btn>
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