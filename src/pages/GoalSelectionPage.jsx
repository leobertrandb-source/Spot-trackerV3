import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Btn } from '../components/UI'
import { T } from '../lib/data'
import { UI_ASSETS } from '../config/ui-assets.generated'

const OPTIONS = [
  {
    value: 'mass_gain',
    title: 'Prise de masse',
    subtitle:
      'Développer la masse musculaire, augmenter les charges et soutenir un surplus calorique structuré.',
    icon: '⬢',
    points: ['Volume musculaire', 'Progression en charge', 'Apport énergétique adapté'],
    gradient: 'linear-gradient(135deg, rgba(31,42,36,0.94), rgba(10,14,12,0.96))',
    imageUrl: UI_ASSETS?.goalSelection?.strength || null,
  },
  {
    value: 'fat_loss',
    title: 'Perte de poids',
    subtitle:
      'Réduire la masse grasse tout en conservant la masse musculaire et une bonne adhérence au plan.',
    icon: '◌',
    points: ['Déficit maîtrisé', 'Adhérence long terme', 'Suivi simple et efficace'],
    gradient: 'linear-gradient(135deg, rgba(26,32,30,0.94), rgba(10,14,12,0.96))',
    imageUrl: UI_ASSETS?.goalSelection?.weightLoss || null,
  },
  {
    value: 'athletic',
    title: 'Athlétique',
    subtitle:
      'Développer un profil global : force, explosivité, mobilité, condition physique et qualité de mouvement.',
    icon: '△',
    points: ['Performance globale', 'Explosivité', 'Condition physique'],
    gradient: 'linear-gradient(135deg, rgba(25,34,36,0.94), rgba(10,14,12,0.96))',
    imageUrl: UI_ASSETS?.goalSelection?.mobility || null,
  },
]

function PointPill({ children, active }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '7px 10px',
        borderRadius: 999,
        background: active ? T.accent + '14' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? T.accent + '28' : 'rgba(255,255,255,0.08)'}`,
        color: active ? T.accentLight : T.textMid,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.3,
        backdropFilter: 'blur(8px)',
      }}
    >
      {children}
    </div>
  )
}

export default function GoalSelectionPage() {
  const navigate = useNavigate()
  const { user, profile, fetchProfile } = useAuth()

  const [selected, setSelected] = useState(profile?.goal_type || '')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function saveGoal() {
    setErrorMsg('')

    if (!selected) {
      setErrorMsg("Choisis d'abord un objectif.")
      return
    }

    if (!user?.id) {
      setErrorMsg('Utilisateur non connecté.')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ goal_type: selected })
      .eq('id', user.id)

    if (error) {
      console.error('Erreur update goal_type:', error)
      setErrorMsg(error.message || "Impossible d'enregistrer l'objectif.")
      setSaving(false)
      return
    }

    await fetchProfile(user.id)

    setSaving(false)
    navigate('/mon-espace', { replace: true })
  }

  return (
    <PageWrap>
      <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: '-40px -20px auto -20px',
            height: 280,
            background:
              'radial-gradient(circle at 20% 20%, rgba(45,255,155,0.14), transparent 30%), radial-gradient(circle at 80% 0%, rgba(45,255,155,0.08), transparent 28%)',
            pointerEvents: 'none',
            filter: 'blur(10px)',
          }}
        />

        <div style={{ position: 'relative', marginBottom: 26 }}>
          <div
            style={{
              display: 'inline-flex',
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
            Personnalisation
          </div>

          <div
            style={{
              fontSize: 42,
              fontWeight: 900,
              letterSpacing: 1.5,
              color: T.text,
              lineHeight: 1,
              maxWidth: 760,
            }}
          >
            CHOISIS LE PARCOURS
            <br />
            QUI TE CORRESPOND
          </div>

          <div
            style={{
              color: T.textMid,
              marginTop: 12,
              fontSize: 15,
              lineHeight: 1.7,
              maxWidth: 860,
            }}
          >
            Cette sélection personnalise ton espace, ton programme et les priorités affichées dans
            l’application. Tu pourras toujours revenir ici pour consulter les explications ou
            modifier ton choix.
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
            gap: 18,
          }}
        >
          {OPTIONS.map((option) => {
            const active = selected === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    minHeight: 320,
                    borderRadius: 26,
                    padding: 22,
                    overflow: 'hidden',
                    border: `1px solid ${active ? T.accent + '44' : 'rgba(255,255,255,0.08)'}`,
                    background: option.imageUrl
                      ? `linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.82)), url("${option.imageUrl}") center/cover no-repeat`
                      : option.gradient,
                    boxShadow: active
                      ? '0 0 40px rgba(45,255,155,0.12)'
                      : '0 18px 40px rgba(0,0,0,0.22)',
                    transform: active ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'all .2s ease',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: option.imageUrl
                        ? 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.78))'
                        : 'transparent',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: option.imageUrl ? 0.04 : 0.08,
                      backgroundImage:
                        'radial-gradient(rgba(255,255,255,0.7) 0.6px, transparent 0.6px)',
                      backgroundSize: '14px 14px',
                      pointerEvents: 'none',
                    }}
                  />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: active ? T.accent + '18' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? T.accent + '30' : 'rgba(255,255,255,0.08)'}`,
                        fontSize: 22,
                        marginBottom: 18,
                        color: T.text,
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      {option.icon}
                    </div>

                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        letterSpacing: 0.4,
                        color: '#fff',
                        marginBottom: 10,
                      }}
                    >
                      {option.title}
                    </div>

                    <div
                      style={{
                        color: 'rgba(255,255,255,0.78)',
                        lineHeight: 1.65,
                        fontSize: 14,
                        marginBottom: 20,
                        maxWidth: 340,
                      }}
                    >
                      {option.subtitle}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {option.points.map((point) => (
                        <PointPill key={point} active={active}>
                          {point}
                        </PointPill>
                      ))}
                    </div>

                    {active ? (
                      <div
                        style={{
                          marginTop: 20,
                          display: 'inline-flex',
                          padding: '6px 10px',
                          borderRadius: 999,
                          background: T.accent + '18',
                          border: `1px solid ${T.accent + '28'}`,
                          color: T.accentLight,
                          fontWeight: 800,
                          fontSize: 12,
                          letterSpacing: 0.6,
                          textTransform: 'uppercase',
                        }}
                      >
                        Sélectionné
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {errorMsg ? (
          <div
            style={{
              marginTop: 16,
              color: '#ff7b7b',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              color: T.textDim,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Ton choix détermine l’organisation de ton espace et l’accès à ton programme dédié.
          </div>

          <Btn onClick={saveGoal} disabled={!selected || saving}>
            {saving ? 'Enregistrement…' : 'Continuer'}
          </Btn>
        </div>
      </div>
    </PageWrap>
  )
}
