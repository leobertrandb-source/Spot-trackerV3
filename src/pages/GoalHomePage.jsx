import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn } from '../components/UI'
import { T } from '../lib/data'

const OPTIONS = [
  {
    value: 'mass_gain',
    title: 'Prise de masse',
    subtitle:
      'Développer la masse musculaire, augmenter les charges et soutenir un surplus calorique structuré.',
    icon: '⬢',
    points: ['Volume musculaire', 'Progression en charge', 'Apport énergétique adapté'],
  },
  {
    value: 'fat_loss',
    title: 'Perte de poids',
    subtitle:
      'Réduire la masse grasse tout en conservant la masse musculaire et une bonne adhérence au plan.',
    icon: '◌',
    points: ['Déficit maîtrisé', 'Adhérence long terme', 'Suivi simple et efficace'],
  },
  {
    value: 'athletic',
    title: 'Athlétique',
    subtitle:
      'Développer un profil global : force, explosivité, mobilité, condition physique et qualité de mouvement.',
    icon: '△',
    points: ['Performance globale', 'Explosivité', 'Condition physique'],
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
        background: active ? T.accent + '14' : T.card,
        border: `1px solid ${active ? T.accent + '28' : T.border}`,
        color: active ? T.accentLight : T.textMid,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.3,
      }}
    >
      {children}
    </div>
  )
}

export default function GoalSelectionPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

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

    navigate('/mon-espace', { replace: true })
  }

  return (
    <PageWrap>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ marginBottom: 26 }}>
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
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: 1.5,
              color: T.text,
              lineHeight: 1,
            }}
          >
            CHOISIS TON OBJECTIF
          </div>

          <div
            style={{
              color: T.textMid,
              marginTop: 10,
              fontSize: 15,
              lineHeight: 1.6,
              maxWidth: 820,
            }}
          >
            Cette sélection permet d’adapter ton espace, ton programme et les priorités mises en avant dans l’application.
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
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
                <Card
                  glow={active}
                  style={{
                    minHeight: 280,
                    border: `1px solid ${active ? T.accent + '44' : T.border}`,
                    background: active ? T.accentGlowSm : T.surface,
                    transition: 'all .18s ease',
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: active ? T.accent + '18' : T.card,
                      border: `1px solid ${active ? T.accent + '30' : T.border}`,
                      fontSize: 22,
                      marginBottom: 18,
                      color: T.text,
                    }}
                  >
                    {option.icon}
                  </div>

                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      letterSpacing: 0.4,
                      color: T.text,
                      marginBottom: 10,
                    }}
                  >
                    {option.title}
                  </div>

                  <div
                    style={{
                      color: T.textMid,
                      lineHeight: 1.6,
                      fontSize: 14,
                      marginBottom: 18,
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
                        marginTop: 18,
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
                </Card>
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
            Tu pourras revenir ici plus tard pour consulter les explications ou modifier ton choix.
          </div>

          <Btn onClick={saveGoal} disabled={!selected || saving}>
            {saving ? 'Enregistrement…' : 'Continuer'}
          </Btn>
        </div>
      </div>
    </PageWrap>
  )
}