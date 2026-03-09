import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'
import { UI_ASSETS } from '../config/ui-assets.generated'

const GOAL_CONFIG = {
  mass_gain: {
    title: 'Prise de masse',
    badge: 'MASS GAIN',
    description:
      'Ton espace est orienté vers le développement musculaire, la progression en charge, le volume d’entraînement et le soutien calorique.',
    cta: '/programme/bodybuilding',
    highlights: [
      'Progression en charge',
      'Surplus calorique maîtrisé',
      'Volume d’entraînement structuré',
    ],
    gradient:
      'linear-gradient(135deg, rgba(32,44,38,0.94), rgba(10,14,12,0.96))',
    accentGlow:
      'radial-gradient(circle at 15% 20%, rgba(45,255,155,0.18), transparent 35%)',
  },
  fat_loss: {
    title: 'Perte de poids',
    badge: 'FAT LOSS',
    description:
      'Ton espace est orienté vers le déficit calorique maîtrisé, l’adhérence, la régularité et la progression de la composition corporelle.',
    cta: '/programme/perte-de-poids',
    highlights: [
      'Déficit calorique durable',
      'Maintien de la masse maigre',
      'Suivi de progression simplifié',
    ],
    gradient:
      'linear-gradient(135deg, rgba(28,34,32,0.94), rgba(10,14,12,0.96))',
    accentGlow:
      'radial-gradient(circle at 15% 20%, rgba(35,210,140,0.14), transparent 35%)',
  },
  athletic: {
    title: 'Athlétique',
    badge: 'ATHLETIC',
    description:
      'Ton espace est orienté vers la performance globale : force, condition physique, mobilité et qualités athlétiques.',
    cta: '/programme/athletique',
    highlights: [
      'Force & explosivité',
      'Condition physique',
      'Mobilité & qualité de mouvement',
    ],
    gradient:
      'linear-gradient(135deg, rgba(26,34,37,0.94), rgba(10,14,12,0.96))',
    accentGlow:
      'radial-gradient(circle at 15% 20%, rgba(60,255,170,0.16), transparent 35%)',
  },
}

function HighlightPill({ children }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: T.text,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.4,
        backdropFilter: 'blur(8px)',
      }}
    >
      {children}
    </div>
  )
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div
      style={{
        padding: '16px 16px',
        borderRadius: 20,
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          color: T.textSub,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: T.text,
          fontSize: 26,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: T.textMid,
          fontSize: 13,
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </div>
    </div>
  )
}

function VisualActionCard({
  title,
  subtitle,
  buttonLabel,
  onClick,
  imageUrl,
  glow = false,
}) {
  const fallback =
    'linear-gradient(135deg, rgba(24,30,27,0.96), rgba(10,14,12,0.98))'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        padding: 0,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          position: 'relative',
          minHeight: 250,
          overflow: 'hidden',
          borderRadius: 26,
          border: `1px solid ${glow ? T.accent + '30' : 'rgba(255,255,255,0.08)'}`,
          background: imageUrl
            ? `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.82)), url("${imageUrl}") center/cover no-repeat`
            : fallback,
          boxShadow: glow
            ? '0 0 40px rgba(45,255,155,0.10)'
            : '0 18px 40px rgba(0,0,0,0.22)',
          transition:
            'transform .22s ease, box-shadow .22s ease, border-color .22s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = glow
            ? '0 0 50px rgba(45,255,155,0.16)'
            : '0 22px 46px rgba(0,0,0,0.28)'
          e.currentTarget.style.borderColor = 'rgba(45,255,155,0.22)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)'
          e.currentTarget.style.boxShadow = glow
            ? '0 0 40px rgba(45,255,155,0.10)'
            : '0 18px 40px rgba(0,0,0,0.22)'
          e.currentTarget.style.borderColor = glow
            ? T.accent + '30'
            : 'rgba(255,255,255,0.08)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: imageUrl
              ? 'linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.82))'
              : 'radial-gradient(circle at 15% 10%, rgba(45,255,155,0.14), transparent 35%)',
          }}
        />

        {!imageUrl ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.08,
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.7) 0.6px, transparent 0.6px)',
              backgroundSize: '14px 14px',
            }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#fff',
              marginBottom: 8,
              letterSpacing: 0.4,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: 'rgba(255,255,255,0.78)',
              fontSize: 14,
              lineHeight: 1.55,
              maxWidth: 360,
              marginBottom: 14,
            }}
          >
            {subtitle}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              width: 'fit-content',
              padding: '9px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              backdropFilter: 'blur(10px)',
            }}
          >
            {buttonLabel}
          </div>
        </div>
      </div>
    </button>
  )
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
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-60px -30px auto -30px',
            height: 420,
            background: cfg.accentGlow,
            pointerEvents: 'none',
            filter: 'blur(8px)',
          }}
        />

        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 30,
            padding: '26px 26px 28px',
            background: UI_ASSETS?.goalHome?.workout
              ? `${cfg.gradient}, linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.65)), url("${UI_ASSETS.goalHome.workout}") center/cover no-repeat`
              : `${cfg.gradient}, radial-gradient(circle at 85% 10%, rgba(255,255,255,0.06), transparent 30%)`,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.26)',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.62))',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.07,
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.7) 0.6px, transparent 0.6px)',
              backgroundSize: '14px 14px',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                border: `1px solid ${T.accent + '28'}`,
                background: 'rgba(45,255,155,0.10)',
                color: T.accentLight,
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 14,
                backdropFilter: 'blur(10px)',
              }}
            >
              {cfg.badge}
            </div>

            <div
              style={{
                fontSize: 46,
                fontWeight: 900,
                letterSpacing: 1.6,
                color: '#fff',
                lineHeight: 0.95,
                maxWidth: 700,
              }}
            >
              TON ESPACE
              <br />
              AUJOURD’HUI
            </div>

            <div
              style={{
                color: 'rgba(255,255,255,0.74)',
                marginTop: 14,
                fontSize: 15,
                lineHeight: 1.65,
                maxWidth: 760,
              }}
            >
              {cfg.description}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                marginTop: 18,
              }}
            >
              {cfg.highlights.map((item) => (
                <HighlightPill key={item}>{item}</HighlightPill>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
                gap: 14,
                marginTop: 24,
              }}
            >
              <MetricCard
                title="Objectif"
                value={cfg.title}
                subtitle="Profil actif pour ton accompagnement"
              />
              <MetricCard
                title="Programme"
                value="Prêt"
                subtitle="Accès direct à ton parcours"
              />
              <MetricCard
                title="Nutrition"
                value="Suivi"
                subtitle="Macros, plan journalier et recettes"
              />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
              <Btn onClick={() => navigate(cfg.cta)}>Voir mon programme</Btn>

              <Btn variant="secondary" onClick={() => navigate('/objectif')}>
                Revoir les explications
              </Btn>

              <Btn variant="secondary" onClick={() => navigate('/objectif')}>
                Changer d’objectif
              </Btn>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr',
            gap: 18,
            marginBottom: 18,
          }}
        >
          <VisualActionCard
            title="Séance du jour"
            subtitle="Accède rapidement à ton entraînement prévu et démarre sans perdre de temps."
            buttonLabel="Commencer"
            onClick={() => navigate('/entrainement/aujourdhui')}
            imageUrl={UI_ASSETS?.goalHome?.workout || null}
            glow
          />

          <VisualActionCard
            title="Nutrition"
            subtitle="Suis tes macros, ton plan journalier et adapte tes repas à ton objectif."
            buttonLabel="Ouvrir"
            onClick={() => navigate('/nutrition/macros')}
            imageUrl={UI_ASSETS?.goalHome?.nutrition || null}
          />

          <VisualActionCard
            title="Progression"
            subtitle="Retrouve tes performances, ton évolution physique et tes indicateurs clés."
            buttonLabel="Consulter"
            onClick={() => navigate('/progression')}
            imageUrl={UI_ASSETS?.goalHome?.progress || null}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.45fr 1fr',
            gap: 18,
          }}
        >
          <Card
            glow
            style={{
              overflow: 'hidden',
              borderRadius: 26,
              background:
                'linear-gradient(135deg, rgba(22,26,24,0.95), rgba(10,14,12,0.98))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.1fr 1fr',
                gap: 18,
                alignItems: 'stretch',
              }}
            >
              <div
                style={{
                  minHeight: 280,
                  borderRadius: 22,
                  overflow: 'hidden',
                  background: UI_ASSETS?.goalHome?.nutrition
                    ? `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.55)), url("${UI_ASSETS.goalHome.nutrition}") center/cover no-repeat`
                    : 'linear-gradient(135deg, rgba(30,40,34,0.96), rgba(10,14,12,0.98))',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div
                  style={{
                    color: T.accentLight,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  Mise en avant
                </div>

                <div
                  style={{
                    color: T.text,
                    fontSize: 30,
                    fontWeight: 900,
                    lineHeight: 1.05,
                    marginBottom: 10,
                  }}
                >
                  Nutrition premium
                </div>

                <div
                  style={{
                    color: T.textMid,
                    lineHeight: 1.65,
                    fontSize: 14,
                    marginBottom: 16,
                  }}
                >
                  Accède à ton suivi nutritionnel, ajuste tes macros, consulte ton plan
                  journalier et garde une vue claire sur ton objectif.
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Btn onClick={() => navigate('/nutrition/macros')}>
                    Ouvrir la nutrition
                  </Btn>

                  <Btn variant="secondary" onClick={() => navigate('/nutrition/recettes')}>
                    Voir les recettes
                  </Btn>
                </div>
              </div>
            </div>
          </Card>

          <Card
            style={{
              borderRadius: 26,
              background:
                'linear-gradient(135deg, rgba(17,20,19,0.96), rgba(9,12,10,0.98))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: T.text,
                marginBottom: 16,
              }}
            >
              Raccourcis rapides
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
                onClick={() => navigate('/nutrition/macros')}
                style={shortcutStyle}
              >
                Suivi macros
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
  background:
    'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E9F1EC',
  borderRadius: 16,
  padding: '13px 14px',
  cursor: 'pointer',
  fontWeight: 700,
  transition: 'all .18s ease',
}
