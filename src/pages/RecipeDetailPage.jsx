import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { resolveImageUrl } from '../lib/media'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Input, Badge } from '../components/UI'
import { T } from '../lib/data'

const today = new Date().toISOString().split('T')[0]
const MEAL_SLOTS = ['Petit-déjeuner', 'Déjeuner', 'Snack', 'Dîner']

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function roundSmart(value) {
  if (!Number.isFinite(value)) return 0
  if (value >= 100) return Math.round(value)
  if (value >= 10) return Math.round(value * 10) / 10
  return Math.round(value * 100) / 100
}

function normalizeLines(value) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.map((line) => String(line).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((line) => String(line).trim()).filter(Boolean)
      }
    } catch {}

    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }

  return []
}

function scaleIngredientLine(line, ratio) {
  if (!line || !Number.isFinite(ratio) || ratio <= 0 || ratio === 1) {
    return String(line || '')
  }

  return String(line).replace(/\d+([.,]\d+)?/g, (match) => {
    const numeric = Number(match.replace(',', '.'))
    if (!Number.isFinite(numeric)) return match
    return String(roundSmart(numeric * ratio)).replace('.', ',')
  })
}

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingPlan, setSavingPlan] = useState(false)
  const [savingNutrition, setSavingNutrition] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [portionMode, setPortionMode] = useState('portions')
  const [portions, setPortions] = useState('1')
  const [targetCalories, setTargetCalories] = useState('')
  const [mealSlot, setMealSlot] = useState(MEAL_SLOTS[1])

  useEffect(() => {
    let active = true

    async function loadRecipe() {
      setLoading(true)
      setErrorMessage('')
      setSuccessMessage('')

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!active) return

      if (error) {
        console.error(error)
        setRecipe(null)
        setErrorMessage("Impossible de charger cette recette.")
      } else {
        setRecipe(data || null)
      }

      setLoading(false)
    }

    if (id) {
      loadRecipe()
    } else {
      setLoading(false)
    }

    return () => {
      active = false
    }
  }, [id])

  const baseCalories = useMemo(() => {
    return toNumber(recipe?.calories)
  }, [recipe])

  const ratio = useMemo(() => {
    if (!recipe) return 1

    if (portionMode === 'calories') {
      const target = toNumber(targetCalories)
      if (!target || !baseCalories) return 1
      return target / baseCalories
    }

    const p = toNumber(portions)
    return p > 0 ? p : 1
  }, [recipe, portionMode, portions, targetCalories, baseCalories])

  const scaled = useMemo(() => {
    if (!recipe) {
      return { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    }

    return {
      calories: roundSmart(toNumber(recipe.calories) * ratio),
      proteins: roundSmart(toNumber(recipe.proteins || recipe.protein) * ratio),
      carbs: roundSmart(toNumber(recipe.carbs) * ratio),
      fats: roundSmart(toNumber(recipe.fats || recipe.fat) * ratio),
    }
  }, [recipe, ratio])

  const displayPortions = useMemo(() => {
    return roundSmart(ratio)
  }, [ratio])

  const heroImage = useMemo(() => {
    return resolveImageUrl({
      imageUrl: recipe?.image_url,
      imagePath: recipe?.image_path,
      imageBucket: recipe?.image_bucket || 'recipe-images',
    })
  }, [recipe])

  const ingredients = useMemo(() => {
    const lines = normalizeLines(recipe?.ingredients)
    return lines.map((line) => scaleIngredientLine(line, ratio))
  }, [recipe, ratio])

  const instructions = useMemo(() => {
    return normalizeLines(recipe?.instructions || recipe?.steps)
  }, [recipe])

  async function addToMealPlan() {
    if (!user?.id || !recipe?.id) return

    setSavingPlan(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error } = await supabase.from('meal_plan').insert({
        user_id: user.id,
        recipe_id: recipe.id,
        plan_date: today,
        meal_slot: mealSlot,
      })

      if (error) throw error

      setSuccessMessage('Recette ajoutée au plan repas.')
    } catch (error) {
      console.error(error)
      setErrorMessage("Impossible d'ajouter la recette au plan repas.")
    } finally {
      setSavingPlan(false)
    }
  }

  async function addToTodayNutrition() {
    if (!user?.id || !recipe) return

    setSavingNutrition(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error } = await supabase.from('nutrition_logs').insert({
        user_id: user.id,
        log_date: today,
        meal_name:
          recipe.title || recipe.name || `Recette x${displayPortions}`,
        calories: roundSmart(scaled.calories),
        proteins: roundSmart(scaled.proteins),
        carbs: roundSmart(scaled.carbs),
        fats: roundSmart(scaled.fats),
        water: 0,
      })

      if (error) throw error

      setSuccessMessage("Recette ajoutée à la nutrition du jour.")
    } catch (error) {
      console.error(error)
      setErrorMessage("Impossible d'ajouter la recette à la nutrition.")
    } finally {
      setSavingNutrition(false)
    }
  }

  if (loading) {
    return (
      <PageWrap>
        <Card style={{ padding: 20 }}>
          <div style={{ color: T.textDim, fontSize: 14 }}>
            Chargement de la recette...
          </div>
        </Card>
      </PageWrap>
    )
  }

  if (!recipe) {
    return (
      <PageWrap>
        <Card style={{ padding: 20 }}>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>
            Recette introuvable
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn onClick={() => navigate('/nutrition/recettes')}>
              Retour aux recettes
            </Btn>
          </div>
        </Card>
      </PageWrap>
    )
  }

  return (
    <PageWrap>
      <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gap: 18 }}>
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

        <Card
          glow
          style={{
            padding: 0,
            overflow: 'hidden',
            minHeight: 340,
            background: heroImage
              ? `linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.78)), url("${heroImage}") center/cover no-repeat`
              : 'linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
          }}
        >
          <div
            style={{
              minHeight: 340,
              padding: '24px 24px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: heroImage
                ? 'linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.80))'
                : 'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <Btn variant="secondary" onClick={() => navigate('/nutrition/recettes')}>
                Retour
              </Btn>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge>{roundSmart(scaled.calories)} kcal</Badge>
                <Badge color={T.blue || '#5BA7FF'}>
                  {displayPortions} portion{displayPortions > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            <div>
              <div
                style={{
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 38,
                  lineHeight: 1,
                  maxWidth: 760,
                }}
              >
                {recipe.title || recipe.name || 'Recette'}
              </div>

              {recipe.description ? (
                <div
                  style={{
                    color: 'rgba(255,255,255,0.86)',
                    fontSize: 15,
                    lineHeight: 1.7,
                    marginTop: 14,
                    maxWidth: 760,
                  }}
                >
                  {recipe.description}
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                <Badge>P {roundSmart(scaled.proteins)}g</Badge>
                <Badge color={T.blue || '#5BA7FF'}>C {roundSmart(scaled.carbs)}g</Badge>
                <Badge color={T.orange || '#FFB454'}>F {roundSmart(scaled.fats)}g</Badge>
              </div>
            </div>
          </div>
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.85fr)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: 18 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ color: T.text, fontWeight: 900, fontSize: 18, marginBottom: 14 }}>
                Recalibrer la recette
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setPortionMode('portions')}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 999,
                    border: `1px solid ${portionMode === 'portions' ? T.accent + '40' : T.border}`,
                    background:
                      portionMode === 'portions'
                        ? 'rgba(45,255,155,0.10)'
                        : 'rgba(255,255,255,0.03)',
                    color: portionMode === 'portions' ? T.accentLight : T.textMid,
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  Par portions
                </button>

                <button
                  type="button"
                  onClick={() => setPortionMode('calories')}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 999,
                    border: `1px solid ${portionMode === 'calories' ? T.accent + '40' : T.border}`,
                    background:
                      portionMode === 'calories'
                        ? 'rgba(45,255,155,0.10)'
                        : 'rgba(255,255,255,0.03)',
                    color: portionMode === 'calories' ? T.accentLight : T.textMid,
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  Par calories
                </button>
              </div>

              {portionMode === 'portions' ? (
                <Input
                  label="Nombre de portions"
                  value={portions}
                  onChange={setPortions}
                  type="number"
                  min="0.1"
                  step="0.1"
                />
              ) : (
                <Input
                  label="Objectif calorique"
                  value={targetCalories}
                  onChange={setTargetCalories}
                  type="number"
                  min="1"
                  step="1"
                  placeholder={`Ex : ${baseCalories || 500}`}
                />
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                <Badge>{roundSmart(scaled.calories)} kcal</Badge>
                <Badge color={T.blue || '#5BA7FF'}>
                  {roundSmart(scaled.proteins)} g protéines
                </Badge>
                <Badge color={T.orange || '#FFB454'}>
                  {roundSmart(scaled.carbs)} g glucides
                </Badge>
                <Badge>{roundSmart(scaled.fats)} g lipides</Badge>
              </div>
            </Card>

            <Card style={{ padding: 20 }}>
              <div style={{ color: T.text, fontWeight: 900, fontSize: 18, marginBottom: 14 }}>
                Ingrédients recalculés
              </div>

              {ingredients.length === 0 ? (
                <div style={{ color: T.textDim, fontSize: 14 }}>
                  Aucun ingrédient renseigné.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {ingredients.map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: `1px solid ${T.border}`,
                        background: 'rgba(255,255,255,0.03)',
                        color: T.text,
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card style={{ padding: 20 }}>
              <div style={{ color: T.text, fontWeight: 900, fontSize: 18, marginBottom: 14 }}>
                Préparation
              </div>

              {instructions.length === 0 ? (
                <div style={{ color: T.textDim, fontSize: 14 }}>
                  Aucune étape renseignée.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {instructions.map((step, index) => (
                    <div
                      key={`${index}-${step}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '36px minmax(0, 1fr)',
                        gap: 12,
                        alignItems: 'start',
                        padding: '12px 14px',
                        borderRadius: 16,
                        border: `1px solid ${T.border}`,
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: 'rgba(45,255,155,0.10)',
                          border: `1px solid ${T.accent + '28'}`,
                          color: T.accentLight,
                          fontWeight: 900,
                          fontSize: 14,
                        }}
                      >
                        {index + 1}
                      </div>

                      <div
                        style={{
                          color: T.text,
                          fontSize: 14,
                          lineHeight: 1.65,
                          paddingTop: 5,
                        }}
                      >
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card style={{ padding: 20 }}>
            <div style={{ color: T.text, fontWeight: 900, fontSize: 18, marginBottom: 14 }}>
              Actions rapides
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ color: T.textSub || T.textDim, fontSize: 12, fontWeight: 800 }}>
                  Ajouter au repas
                </span>

                <select
                  value={mealSlot}
                  onChange={(e) => setMealSlot(e.target.value)}
                  style={{
                    height: 48,
                    borderRadius: 14,
                    border: `1px solid ${T.border}`,
                    background: T.surface,
                    color: T.text,
                    padding: '0 14px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                >
                  {MEAL_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>

              <Btn onClick={addToMealPlan} disabled={savingPlan}>
                {savingPlan ? 'Ajout au plan...' : "Ajouter au plan repas d'aujourd'hui"}
              </Btn>

              <Btn variant="secondary" onClick={addToTodayNutrition} disabled={savingNutrition}>
                {savingNutrition ? 'Ajout nutrition...' : "Ajouter à la nutrition du jour"}
              </Btn>
            </div>
          </Card>
        </div>
      </div>
    </PageWrap>
  )
}
