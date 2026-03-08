import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

const GOAL_CONFIG = {
  mass_gain: {
    title: 'Prise de masse',
    badge: 'MASS GAIN',
    description:
      'Ton espace est orienté vers le développement musculaire, la progression en charge, le volume d’entraînement et le soutien calorique.',
    cta: '/programme/bodybuilding',
  },
  fat_loss: {
    title: 'Perte de poids',
    badge: 'FAT LOSS',
    description:
      'Ton espace est orienté vers le déficit calorique maîtrisé, l’adhérence, la régularité et la progression de la composition corporelle.',
    cta: '/programme/perte-de-poids',
  },
  athletic: {
    title: 'Athlétique',
    badge: 'ATHLETIC',
    description:
      'Ton espace est orienté vers la performance globale : force, condition physique, mobilité et qualités athlétiques.',
    cta: '/programme/athletique',
  },
}

export default function GoalHomePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const cfg = useMemo(() => {
    return GOAL_CONFIG[profile?.goal_type] || null
  }, [profile?.goal_type])

  if (!cfg) return null

  return (
    <PageWrap>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 999,
              border: `1px solid ${T.accent + '28'}`,
              background: T.accentGlowSm,
              color: T.accentLight,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            {cfg.badge}
          </div>

          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: 1.5,
              color: T.text,
              lineHeight: 1,
            }}
          >
            TON ESPACE PERSONNALISÉ
          </div>

          <div
            style={{
              color: T.textMid,
              marginTop: 10,
              fontSize: 15,
              lineHeight: 1.6,
              maxWidth: 760,
            }}
          >
            {cfg.description}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: 18,
          }}
        >
          <Card glow style={{ minHeight: 280 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: T.text,
                marginBottom: 12,
              }}
            >
              {cfg.title}
            </div>

            <div
              style={{
                color: T.textMid,
                lineHeight: 1.6,
                fontSize: 15,
                marginBottom: 22,
                maxWidth: 620,
              }}
            >
              Retrouve ici ton organisation, tes recommandations nutritionnelles et l’accès à ton programme dédié.
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Btn onClick={() => navigate(cfg.cta)}>
                Voir mon programme
              </Btn>

              <Btn variant="secondary" onClick={() => navigate('/nutrition/macros')}>
                Voir ma nutrition
              </Btn>
            </div>
          </Card>

          <Card style={{ minHeight: 280 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: T.text,
                marginBottom: 16,
              }}
            >
              Raccourcis
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate('/entrainement/aujourdhui')}
                style={shortcutStyle}
              >
                Séance du jour
              </button>

              <button
                type="button"
                onClick={() => navigate('/nutrition/plan')}
                style={shortcutStyle}
              >
                Plan journalier
              </button>

              <button
                type="button"
                onClick={() => navigate('/nutrition/recettes')}
                style={shortcutStyle}
              >
                Recettes
              </button>

              <button
                type="button"
                onClick={() => navigate('/progression')}
                style={shortcutStyle}
              >
                Progression
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageWrap>
  )
}

const shortcutStyle = {
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E9F1EC',
  borderRadius: 14,
  padding: '12px 14px',
  cursor: 'pointer',
  fontWeight: 700,
}
