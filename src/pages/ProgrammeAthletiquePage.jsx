import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

const PHASES = [
  {
    number: '01',
    title: 'Activation neuromusculaire',
    duration: '10 min',
    summary:
      'Préparer le système nerveux, la coordination et la qualité du mouvement avant les blocs performants.',
    bullets: [
      'Mobilité dynamique et mise en tension active',
      'Exercices de coordination et d’appuis',
      'Montée progressive de l’intensité',
      'Préparation spécifique au pattern du jour',
    ],
  },
  {
    number: '02',
    title: 'Vitesse / puissance',
    duration: '10 à 15 min',
    summary:
      'Développer l’explosivité et la capacité à produire de la force rapidement.',
    bullets: [
      'Sauts, lancers, poussées explosives, sprint technique ou travail dynamique',
      'Faible volume, haute qualité',
      'Repos suffisants pour garder de la vitesse',
      'Objectif : fraîcheur nerveuse et intention maximale',
    ],
  },
  {
    number: '03',
    title: 'Force structurante',
    duration: '15 à 20 min',
    summary:
      'Ancrer le socle de force qui soutient la performance athlétique globale.',
    bullets: [
      'Squat, trap bar, split squat, tirages, développés, hinges',
      '3 à 5 séries qualitatives',
      'Travail technique, stable et mesurable',
      'Accent sur le transfert et la solidité articulaire',
    ],
  },
  {
    number: '04',
    title: 'Hypertrophie fonctionnelle',
    duration: '12 à 15 min',
    summary:
      'Renforcer les zones utiles à la performance et à la prévention des blessures.',
    bullets: [
      'Chaîne postérieure, tronc, adducteurs, épaules, ischios, mollets selon besoin',
      'Formats contrôlés, unilatéraux ou correctifs',
      'Objectif : robustesse + équilibre musculaire',
      'Volume ciblé sans dériver vers du bodybuilding pur',
    ],
  },
  {
    number: '05',
    title: 'Conditioning / récupération',
    duration: '8 à 12 min',
    summary:
      'Améliorer la capacité de travail et terminer avec une récupération maîtrisée.',
    bullets: [
      'Intervalles, carry, circuits simples ou cardio spécifique',
      'Maintien de la qualité posturale sous fatigue',
      'Respiration / retour au calme',
      'Suivi de l’état de forme et de la charge globale',
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

export default function ProgrammeAthletiquePage() {
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
            Programme athlétique
          </div>

          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 1.4, lineHeight: 1, color: T.text }}>
            MÉTHODE SPOT TRAINING — ATHLÉTIQUE
          </div>

          <div style={{ color: T.textMid, fontSize: 15, lineHeight: 1.7, marginTop: 12, maxWidth: 900 }}>
            Développer simultanément vitesse, puissance, force, hypertrophie fonctionnelle et capacité
            cardio-respiratoire, avec un cadre durable et propre techniquement.
          </div>
        </div>

        <Card glow>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 10 }}>
            Objectif global
          </div>
          <div style={{ color: T.textMid, lineHeight: 1.7 }}>
            Développer l’athlète dans sa globalité en préservant la santé articulaire, la qualité
            du mouvement et la capacité à répéter la performance.
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
