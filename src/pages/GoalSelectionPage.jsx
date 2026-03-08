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
    subtitle: 'Développer la masse musculaire, augmenter les charges et soutenir un surplus calorique.',
    icon: '⬢',
  },
  {
    value: 'fat_loss',
    title: 'Perte de poids',
    subtitle: 'Optimiser le déficit calorique, maintenir la masse maigre et améliorer l’adhérence.',
    icon: '◌',
  },
  {
    value: 'athletic',
    title: 'Athlétique',
    subtitle: 'Développer un profil complet : force, condition physique, explosivité et mobilité.',
    icon: '△',
  },
]

export default function GoalSelectionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)

  async function saveGoal() {
    if (!user?.id || !selected) return

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ goal_type: selected })
      .eq('id', user.id)

    if (error) {
      console.error(error)
      alert(error.message)
      setSaving(false)
      return
    }

    navigate('/mon-espace', { replace: true })
  }

  return (
    <PageWrap>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: 2,
              color: T.text,
              lineHeight: 1,
            }}
          >
            CHOISIS TON OBJECTIF
          </div>

          <div style={{ color: T.textMid, marginTop: 8, fontSize: 15 }}>
            Sélectionne le type d’accompagnement qui correspond à ton objectif principal.
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
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
                    minHeight: 220,
                    border: `1px solid ${active ? T.accent + '44' : T.border}`,
                    background: active ? T.accentGlowSm : T.surface,
                    transition: 'all .18s ease',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: active ? T.accent + '18' : T.card,
                      border: `1px solid ${active ? T.accent + '30' : T.border}`,
                      fontSize: 22,
                      marginBottom: 18,
                    }}
                  >
                    {option.icon}
                  </div>

                  <div
                    style={{
                      fontSize: 24,
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
                      lineHeight: 1.5,
                      fontSize: 14,
                    }}
                  >
                    {option.subtitle}
                  </div>
                </Card>
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
          <Btn onClick={saveGoal} disabled={!selected || saving}>
            {saving ? 'Enregistrement…' : 'Continuer'}
          </Btn>
        </div>
      </div>
    </PageWrap>
  )
}