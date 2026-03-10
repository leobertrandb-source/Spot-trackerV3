import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Input, Btn, StatCard, Badge } from '../components/UI'
import { T } from '../lib/data'

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function clamp(value, min = 0) {
  return Math.max(min, value)
}

function round(value) {
  return Math.round(Number(value || 0))
}

export default function NutritionPage() {
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [calories, setCalories] = useState('')
  const [proteins, setProteins] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')

  const loadNutrition = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('calories_target, protein_target, carbs_target, fats_target')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      setCalories(data?.calories_target != null ? String(data.calories_target) : '')
      setProteins(data?.protein_target != null ? String(data.protein_target) : '')
      setCarbs(data?.carbs_target != null ? String(data.carbs_target) : '')
      setFats(data?.fats_target != null ? String(data.fats_target) : '')
    } catch (error) {
      console.error('Erreur chargement nutrition :', error)
      setErrorMessage("Impossible de charger les objectifs nutrition.")
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadNutrition()
  }, [loadNutrition])

  const computed = useMemo(() => {
    const p = clamp(toNumber(proteins))
    const c = clamp(toNumber(carbs))
    const f = clamp(toNumber(fats))
    const enteredCalories = clamp(toNumber(calories))

    const caloriesFromMacros = p * 4 + c * 4 + f * 9
    const effectiveCalories = enteredCalories || caloriesFromMacros

    const proteinPct = effectiveCalories ? (p * 4 * 100) / effectiveCalories : 0
    const carbsPct = effectiveCalories ? (c * 4 * 100) / effectiveCalories : 0
    const fatsPct = effectiveCalories ? (f * 9 * 100) / effectiveCalories : 0

    return {
      proteins: p,
      carbs: c,
      fats: f,
      enteredCalories,
      caloriesFromMacros,
      effectiveCalories,
      proteinPct,
      carbsPct,
      fatsPct,
      deltaCalories: enteredCalories ? enteredCalories - caloriesFromMacros : 0,
    }
  }, [proteins, carbs, fats, calories])

  const handleSave = useCallback(async () => {
    if (!user?.id) return

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = {
        calories_target: calories ? clamp(toNumber(calories)) : null,
        protein_target: proteins ? clamp(toNumber(proteins)) : null,
        carbs_target: carbs ? clamp(toNumber(carbs)) : null,
        fats_target: fats ? clamp(toNumber(fats)) : null,
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)

      if (error) {
        throw error
      }

      setSuccessMessage('Objectifs nutrition enregistrés.')
    } catch (error) {
      console.error('Erreur sauvegarde nutrition :', error)
      setErrorMessage("Impossible d'enregistrer les objectifs nutrition.")
    } finally {
      setSaving(false)
    }
  }, [user?.id, calories, proteins, carbs, fats])

  const quickPreset = useCallback(
    (type) => {
      const weight = clamp(toNumber(profile?.weight || profile?.poids || 0))
      const goal = String(profile?.goal_type || '').toLowerCase()

      if (!weight) {
        setErrorMessage("Ajoute d'abord ton poids dans ton profil pour utiliser les presets.")
        return
      }

      setErrorMessage('')
      setSuccessMessage('')

      let nextCalories = 0
      let nextProteins = 0
      let nextCarbs = 0
      let nextFats = 0

      if (type === 'maintien') {
        nextCalories = round(weight * 33)
        nextProteins = round(weight * 2)
        nextFats = round(weight * 0.9)
      } else if (type === 'seche') {
        nextCalories = round(weight * 29)
        nextProteins = round(weight * 2.2)
        nextFats = round(weight * 0.8)
      } else {
        nextCalories = round(weight * 37)
        nextProteins = round(weight * 2)
        nextFats = round(weight * 1)
      }

      if (goal.includes('perte')) {
        nextCalories = round(weight * 29)
      } else if (goal.includes('bodybuilding')) {
        nextCalories = round(weight * 37)
      }

      const remainingCalories = nextCalories - nextProteins * 4 - nextFats * 9
      nextCarbs = round(Math.max(0, remainingCalories / 4))

      setCalories(String(nextCalories))
      setProteins(String(nextProteins))
      setCarbs(String(nextCarbs))
      setFats(String(nextFats))
    },
    [profile]
  )

  return (
    <PageWrap>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gap: 18,
        }}
      >
        <Card
          glow
          style={{
            padding: '24px 22px',
            background:
              'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%), linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
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
            }}
          >
            Nutrition
          </div>

          <div
            style={{
              color: T.text,
              fontFamily: T.fontDisplay,
              fontWeight: 900,
              fontSize: 30,
              lineHeight: 1,
            }}
          >
            MES MACROS
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.65,
              marginTop: 10,
            }}
          >
            Gère tes objectifs de calories et de macronutriments.
          </div>
        </Card>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => quickPreset('maintien')}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.03)',
              color: T.text,
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            Preset maintien
          </button>

          <button
            type="button"
            onClick={() => quickPreset('seche')}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.03)',
              color: T.text,
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            Preset sèche
          </button>

          <button
            type="button"
            onClick={() => quickPreset('prise')}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.03)',
              color: T.text,
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            Preset prise de masse
          </button>
        </div>

        {errorMessage ? (
          <Card
            style={{
              padding: 16,
              border: '1px solid rgba(255,120,120,0.22)',
              background: 'rgba(255,90,90,0.06)',
            }}
          >
            <div style={{ color: '#FFB3B3', fontWeight: 800, fontSize: 14 }}>
              {errorMessage}
            </div>
          </Card>
        ) : null}

        {successMessage ? (
          <Card
            style={{
              padding: 16,
              border: `1px solid ${T.accent}22`,
              background: 'rgba(57,224,122,0.07)',
            }}
          >
            <div style={{ color: T.accentLight, fontWeight: 800, fontSize: 14 }}>
              {successMessage}
            </div>
          </Card>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 0.9fr)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <Card style={{ padding: 20 }}>
            {loading ? (
              <div style={{ color: T.textDim, fontSize: 14 }}>
                Chargement des objectifs nutrition...
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <Input
                  label="Calories"
                  value={calories}
                  onChange={setCalories}
                  type="number"
                  min="0"
                  placeholder="2500"
                />

                <Input
                  label="Protéines (g)"
                  value={proteins}
                  onChange={setProteins}
                  type="number"
                  min="0"
                  placeholder="180"
                />

                <Input
                  label="Glucides (g)"
                  value={carbs}
                  onChange={setCarbs}
                  type="number"
                  min="0"
                  placeholder="250"
                />

                <Input
                  label="Lipides (g)"
                  value={fats}
                  onChange={setFats}
                  type="number"
                  min="0"
                  placeholder="70"
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={loadNutrition}
                    disabled={saving}
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                      background: 'rgba(255,255,255,0.03)',
                      color: T.text,
                      padding: '0 16px',
                      cursor: saving ? 'default' : 'pointer',
                      fontWeight: 800,
                      fontSize: 14,
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    Réinitialiser
                  </button>

                  <Btn onClick={handleSave} disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Btn>
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <StatCard
                label="Calories cibles"
                value={computed.effectiveCalories ? `${round(computed.effectiveCalories)} kcal` : '—'}
                accent
              />
              <StatCard
                label="Calories des macros"
                value={computed.caloriesFromMacros ? `${round(computed.caloriesFromMacros)} kcal` : '—'}
              />
            </div>

            <Card style={{ padding: 18 }}>
              <div
                style={{
                  color: T.text,
                  fontWeight: 900,
                  fontSize: 16,
                  marginBottom: 12,
                }}
              >
                Répartition
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: T.text, fontWeight: 800 }}>Protéines</span>
                    <span style={{ color: T.textDim }}>
                      {computed.proteins} g • {round(computed.proteinPct)}%
                    </span>
                  </div>

                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, computed.proteinPct)}%`,
                        background: T.accent,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: T.text, fontWeight: 800 }}>Glucides</span>
                    <span style={{ color: T.textDim }}>
                      {computed.carbs} g • {round(computed.carbsPct)}%
                    </span>
                  </div>

                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, computed.carbsPct)}%`,
                        background: T.blue || '#5BA7FF',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: T.text, fontWeight: 800 }}>Lipides</span>
                    <span style={{ color: T.textDim }}>
                      {computed.fats} g • {round(computed.fatsPct)}%
                    </span>
                  </div>

                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, computed.fatsPct)}%`,
                        background: T.orange || '#FFB454',
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <div
                style={{
                  color: T.text,
                  fontWeight: 900,
                  fontSize: 16,
                  marginBottom: 12,
                }}
              >
                Vérification rapide
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginBottom: 10,
                }}
              >
                <Badge>{computed.proteins} g protéines</Badge>
                <Badge color={T.blue || '#5BA7FF'}>{computed.carbs} g glucides</Badge>
                <Badge color={T.orange || '#FFB454'}>{computed.fats} g lipides</Badge>
              </div>

              <div
                style={{
                  color: T.textMid,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Calories indiquées : {round(computed.enteredCalories)} kcal
                <br />
                Calories calculées depuis les macros : {round(computed.caloriesFromMacros)} kcal
              </div>

              {computed.enteredCalories > 0 ? (
                <div
                  style={{
                    marginTop: 10,
                    color: Math.abs(computed.deltaCalories) <= 50 ? T.accentLight : T.textDim,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Écart : {computed.deltaCalories > 0 ? '+' : ''}
                  {round(computed.deltaCalories)} kcal
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </div>
    </PageWrap>
  )
}
