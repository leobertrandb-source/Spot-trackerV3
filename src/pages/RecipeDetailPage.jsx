import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Badge } from '../components/UI'
import { T } from '../lib/data'

const today = new Date().toISOString().split('T')[0]
const MEAL_SLOTS = ['Petit-déjeuner', 'Déjeuner', 'Snack', 'Dîner']

// ─── Helpers numériques ─────────────────────────────────────────────────────

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
  if (Array.isArray(value)) return value.map((l) => String(l).trim()).filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map((l) => String(l).trim()).filter(Boolean)
    } catch {}
    return value.split('\n').map((l) => l.trim()).filter(Boolean)
  }
  return []
}

// ─── Recalcul ingrédients intelligent ───────────────────────────────────────

/**
 * Parse une ligne d'ingrédient en { amount, unit, rest }
 * Gère : "200g de riz", "2 œufs", "1.5 cs d'huile", "300 ml lait"
 */
function parseIngredientLine(line) {
  if (!line) return { amount: null, unit: null, rest: line }

  // Regex : nombre (optionnellement décimal) + unité optionnelle
  const UNITS = ['g', 'kg', 'ml', 'l', 'cl', 'cs', 'cc', 'c\\.s\\.', 'c\\.c\\.', 'tasse', 'poignée', 'pincée', 'tranche', 'tranches', 'morceau', 'morceaux', 'gousse', 'gousses']
  const unitGroup = UNITS.join('|')
  const re = new RegExp(
    `^(\\d+(?:[.,]\\d+)?)\\s*(${unitGroup})?\\b(.*)$`,
    'i'
  )

  const match = line.trim().match(re)
  if (!match) return { amount: null, unit: null, rest: line }

  return {
    amount: Number(match[1].replace(',', '.')),
    unit: match[2] || null,
    rest: match[3].trim(),
  }
}

function formatAmount(value) {
  if (!Number.isFinite(value)) return ''
  if (value >= 100) return String(Math.round(value))
  if (value >= 10) return String(Math.round(value * 10) / 10)
  // Arrondi au 0.25 le plus proche pour < 10 (mesures culinaires)
  const snapped = Math.round(value * 4) / 4
  return String(snapped).replace('.', ',')
}

function scaleIngredientLine(line, ratio) {
  if (!line || !Number.isFinite(ratio) || ratio <= 0) return String(line || '')

  const { amount, unit, rest } = parseIngredientLine(line)

  if (amount === null) return line // pas de nombre → retourne tel quel

  const scaled = amount * ratio
  const formattedAmount = formatAmount(scaled)
  const unitStr = unit ? `${unit} ` : ''

  return `${formattedAmount} ${unitStr}${rest}`.trim()
}

// ─── Étapes : parsing + enrichissement ──────────────────────────────────────

const STEP_TYPES = {
  prep:    { icon: '🔪', label: 'Préparation', color: '#9d7dea' },
  cook:    { icon: '🔥', label: 'Cuisson',     color: '#ff7043' },
  mix:     { icon: '🥣', label: 'Mélange',     color: '#4d9fff' },
  rest:    { icon: '⏱️',  label: 'Repos',       color: '#ffa500' },
  serve:   { icon: '🍽️', label: 'Dressage',    color: '#39e07a' },
  season:  { icon: '🧂', label: 'Assaisonner', color: '#26d4e8' },
}

const STEP_KEYWORDS = {
  cook:   ['cuire', 'faire revenir', 'poêler', 'cuisson', 'chauffer', 'four', 'griller', 'bouillir', 'mijoter', 'dorer', 'frire', 'rôtir', 'saisir', 'blanchir', 'vapeur'],
  mix:    ['mélanger', 'fouetter', 'mixer', 'incorporer', 'mêler', 'combiner', 'battre', 'émulsionner', 'homogène'],
  rest:   ['repos', 'reposer', 'réfrigérer', 'refroidir', 'mariner', 'attendre', 'laisser', 'minutes', 'heures'],
  prep:   ['couper', 'trancher', 'hacher', 'émincer', 'peler', 'éplucher', 'ciseler', 'dénoyauter', 'râper', 'préparer', 'laver'],
  serve:  ['dresser', 'servir', 'déposer', 'disposer', 'garnir', 'décorer', 'présenter'],
  season: ['saler', 'poivrer', 'assaisonner', 'ajouter', 'arroser', 'parsemer'],
}

function classifyStep(text) {
  const lower = text.toLowerCase()
  for (const [type, keywords] of Object.entries(STEP_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return type
  }
  return 'prep'
}

// Extrait une durée du texte (ex: "10 min", "2 heures", "30 secondes")
function extractDuration(text) {
  const lower = text.toLowerCase()
  const matchMin = lower.match(/(\d+)\s*min(?:utes?)?/)
  const matchH   = lower.match(/(\d+)\s*h(?:eures?)?/)
  const matchSec = lower.match(/(\d+)\s*sec(?:ondes?)?/)

  if (matchH)   return `${matchH[1]}h`
  if (matchMin) return `${matchMin[1]} min`
  if (matchSec) return `${matchSec[1]} sec`
  return null
}

function enrichStep(text, index) {
  const type = classifyStep(text)
  const duration = extractDuration(text)
  const info = STEP_TYPES[type] || STEP_TYPES.prep

  return {
    index,
    text,
    type,
    duration,
    icon: info.icon,
    label: info.label,
    color: info.color,
  }
}

// ─── Génération IA des étapes ────────────────────────────────────────────────

async function generateStepsWithAI(recipeName, ingredients) {
  const supabaseUrl = supabase.supabaseUrl
  const supabaseKey = supabase.supabaseKey

  const res = await fetch(`${supabaseUrl}/functions/v1/generate-recipe-steps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      name: recipeName,
      ingredients: ingredients.slice(0, 20),
    }),
  })

  if (!res.ok) {
    console.error('Edge function error:', res.status, await res.text())
    return []
  }

  const data = await res.json()
  if (Array.isArray(data.steps)) return data.steps.map(String).filter(Boolean)

  return []
}

async function saveStepsToRecipe(recipeId, steps) {
  if (!recipeId || !steps.length) return
  const { error } = await supabase
    .from('recipes')
    .update({ instructions: JSON.stringify(steps) })
    .eq('id', recipeId)
  if (error) console.error('Erreur sauvegarde étapes :', error)
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function MacroPill({ label, value, color }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 14,
      border: `1px solid ${color || T.border}`,
      background: 'rgba(255,255,255,0.04)', minWidth: 104,
    }}>
      <div style={{ color: T.textDim, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ color: T.text, fontSize: 18, fontWeight: 900, marginTop: 6 }}>
        {value}
      </div>
    </div>
  )
}

function IngredientRow({ ingredient, ratio }) {
  const scaledQty = roundSmart(Number(ingredient.quantity || 0) * ratio)
  const changed = Math.abs(ratio - 1) > 0.01

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 14px', borderRadius: 14,
      border: `1px solid ${changed ? T.accent + '28' : T.border}`,
      background: changed ? 'rgba(57,224,122,0.04)' : 'rgba(255,255,255,0.03)',
      transition: 'all 0.2s ease',
    }}>
      <span style={{ color: T.text, fontSize: 14, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700, color: changed ? T.accentLight : T.text }}>
          {scaledQty} {ingredient.unit}
        </span>
        {' '}{ingredient.name}
      </span>
      {changed && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: T.accent,
          background: 'rgba(57,224,122,0.12)', padding: '2px 7px',
          borderRadius: 20, marginLeft: 8, whiteSpace: 'nowrap',
        }}>
          ×{roundSmart(ratio)}
        </span>
      )}
    </div>
  )
}

function StepCard({ step }) {
  const info = STEP_TYPES[step.type] || STEP_TYPES.prep

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '48px minmax(0, 1fr)',
      gap: 14, alignItems: 'start',
      padding: '14px 16px',
      borderRadius: 18,
      border: `1px solid ${T.border}`,
      background: 'rgba(255,255,255,0.025)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Accent bar gauche */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3, background: info.color,
        opacity: 0.5, borderRadius: '18px 0 0 18px',
      }} />

      {/* Numéro + icône */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          background: `${info.color}18`,
          border: `1px solid ${info.color}38`,
          fontSize: 16,
        }}>
          {step.icon}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 900, color: info.color,
          letterSpacing: 0,
        }}>
          {step.index + 1}
        </span>
      </div>

      {/* Contenu */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 800, color: info.color,
            background: `${info.color}15`, padding: '2px 8px',
            borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {step.label}
          </span>
          {step.duration && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: T.textDim,
              background: 'rgba(255,255,255,0.05)',
              padding: '2px 8px', borderRadius: 20,
            }}>
              ⏱ {step.duration}
            </span>
          )}
        </div>
        <p style={{ color: T.text, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          {step.text}
        </p>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

function getRecipeImageUrl(recipe) {
  if (!recipe) return ''
  if (recipe.image_url) return recipe.image_url
  if (recipe.image_path) {
    const bucket = recipe.image_bucket || 'recipe-images'
    const { data } = supabase.storage.from(bucket).getPublicUrl(recipe.image_path)
    return data?.publicUrl || ''
  }
  return ''
}

function calcPlateFillPercent(targetCalories, baseCalories) {
  if (!baseCalories) return 50
  return Math.max(18, Math.min(100, (targetCalories / baseCalories) * 100))
}

function getSliderBounds(baseCalories) {
  const safe = Math.max(100, Math.round(baseCalories || 500))
  return {
    min: Math.max(100, Math.round(safe * 0.4)),
    max: Math.max(250, Math.round(safe * 2.2)),
    step: 10,
  }
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
  const [mealSlot, setMealSlot] = useState(MEAL_SLOTS[1])
  const [targetCalories, setTargetCalories] = useState(400)

  // Étapes IA
  const [aiSteps, setAiSteps] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)

  useEffect(() => {
    let active = true
    async function loadRecipe() {
      setLoading(true)
      setErrorMessage('')
      setSuccessMessage('')
      const { data, error } = await supabase.from('recipes').select('*, recipe_ingredients(*)').eq('id', id).maybeSingle()
      if (!active) return
      if (error) {
        setErrorMessage("Impossible de charger cette recette.")
      } else {
        setRecipe(data || null)
        const base = Math.max(100, Math.round(toNumber(data?.calories) || 400))
        setTargetCalories(base)
      }
      setLoading(false)
    }
    if (id) loadRecipe()
    else setLoading(false)
    return () => { active = false }
  }, [id])

  const baseCalories = useMemo(() => Math.max(1, toNumber(recipe?.calories)), [recipe])
  const sliderBounds = useMemo(() => getSliderBounds(baseCalories), [baseCalories])
  const ratio = useMemo(() => {
    if (!baseCalories || !targetCalories) return 1
    return targetCalories / baseCalories
  }, [targetCalories, baseCalories])

  const scaled = useMemo(() => {
    if (!recipe) return { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    return {
      calories: roundSmart(targetCalories),
      proteins: roundSmart(toNumber(recipe.proteins || recipe.protein) * ratio),
      carbs:    roundSmart(toNumber(recipe.carbs) * ratio),
      fats:     roundSmart(toNumber(recipe.fats || recipe.fat) * ratio),
    }
  }, [recipe, ratio, targetCalories])

  const heroImage = useMemo(() => getRecipeImageUrl(recipe), [recipe])

  // Ingrédients depuis la table recipe_ingredients
  const rawIngredients = useMemo(() => {
    const rows = recipe?.recipe_ingredients || []
    return rows.map(row => `${row.quantity} ${row.unit} ${row.name}`.trim())
  }, [recipe])

  // Instructions existantes enrichies
  const rawInstructions = useMemo(
    () => normalizeLines(recipe?.instructions || recipe?.steps || recipe?.preparation),
    [recipe]
  )

  const enrichedSteps = useMemo(() => {
    const source = aiGenerated && aiSteps.length > 0 ? aiSteps : rawInstructions
    return source.map((text, i) => enrichStep(text, i))
  }, [rawInstructions, aiSteps, aiGenerated])

  const hasInstructions = rawInstructions.length > 0

  const plateFill = useMemo(
    () => `${calcPlateFillPercent(targetCalories, baseCalories)}%`,
    [targetCalories, baseCalories]
  )
  const portionEquivalent = useMemo(() => roundSmart(ratio), [ratio])

  async function handleGenerateSteps() {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const name = recipe?.title || recipe?.name || 'Recette'
      const steps = await generateStepsWithAI(name, rawIngredients)
      if (steps.length > 0) {
        // Sauvegarde dans Supabase — une seule fois pour tous les utilisateurs
        await saveStepsToRecipe(recipe.id, steps)
        // Met à jour l'état local
        setRecipe(prev => ({ ...prev, instructions: JSON.stringify(steps) }))
        setAiSteps(steps)
        setAiGenerated(true)
      }
    } catch (err) {
      console.error('Erreur génération étapes :', err)
    } finally {
      setAiLoading(false)
    }
  }

  async function addToMealPlan() {
    if (!user?.id || !recipe?.id) return
    setSavingPlan(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const { error } = await supabase.from('meal_plan').insert({
        user_id: user.id, recipe_id: recipe.id, plan_date: today, meal_slot: mealSlot,
      })
      if (error) throw error
      setSuccessMessage('Recette ajoutée au plan repas.')
    } catch (err) {
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
        meal_name: `${recipe.title || recipe.name || 'Recette'} (${roundSmart(targetCalories)} kcal)`,
        calories: roundSmart(scaled.calories),
        proteins: roundSmart(scaled.proteins),
        carbs:    roundSmart(scaled.carbs),
        fats:     roundSmart(scaled.fats),
        water: 0,
      })
      if (error) throw error
      setSuccessMessage("Recette ajoutée à la nutrition du jour.")
    } catch (err) {
      setErrorMessage("Impossible d'ajouter la recette à la nutrition.")
    } finally {
      setSavingNutrition(false)
    }
  }

  if (loading) {
    return (
      <PageWrap>
      <style>{`
        .recipe-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          align-items: start;
        }
        .recipe-slider-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          align-items: center;
        }
        @media (min-width: 768px) {
          .recipe-grid {
            grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.85fr);
          }
          .recipe-slider-grid {
            grid-template-columns: 220px minmax(0, 1fr);
            gap: 24px;
          }
        }
      `}</style>
        <Card style={{ padding: 20 }}>
          <div style={{ color: T.textDim, fontSize: 14 }}>Chargement de la recette...</div>
        </Card>
      </PageWrap>
    )
  }

  if (!recipe) {
    return (
      <PageWrap>
        <Card style={{ padding: 20 }}>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>Recette introuvable</div>
          <div style={{ marginTop: 12 }}>
            <Btn onClick={() => navigate('/nutrition/recettes')}>Retour aux recettes</Btn>
          </div>
        </Card>
      </PageWrap>
    )
  }

  return (
    <PageWrap>
      <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gap: 18 }}>

        {errorMessage && (
          <Card style={{ padding: 16, border: '1px solid rgba(255,120,120,0.22)', background: 'rgba(255,90,90,0.06)' }}>
            <div style={{ color: '#FFB3B3', fontWeight: 800, fontSize: 14 }}>{errorMessage}</div>
          </Card>
        )}
        {successMessage && (
          <Card style={{ padding: 16, border: `1px solid ${T.accent}22`, background: 'rgba(57,224,122,0.07)' }}>
            <div style={{ color: T.accentLight, fontWeight: 800, fontSize: 14 }}>{successMessage}</div>
          </Card>
        )}

        {/* Hero */}
        <Card glow style={{
          padding: 0, overflow: 'hidden', minHeight: 360,
          background: heroImage
            ? `linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.78)), url("${heroImage}") center/cover no-repeat`
            : 'linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
        }}>
          <div style={{
            minHeight: 360, padding: '24px 24px 22px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            background: heroImage
              ? 'linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.80))'
              : 'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <Btn variant="secondary" onClick={() => navigate('/nutrition/recettes')}>Retour</Btn>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge>{roundSmart(targetCalories)} kcal</Badge>
                <Badge color={T.blue || '#5BA7FF'}>
                  x{portionEquivalent} portion{portionEquivalent > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 38, lineHeight: 1, maxWidth: 760 }}>
                {recipe.title || recipe.name || 'Recette'}
              </div>
              {recipe.description && (
                <div style={{ color: 'rgba(255,255,255,0.86)', fontSize: 15, lineHeight: 1.7, marginTop: 14, maxWidth: 760 }}>
                  {recipe.description}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                <Badge>P {roundSmart(scaled.proteins)}g</Badge>
                <Badge color={T.blue || '#5BA7FF'}>C {roundSmart(scaled.carbs)}g</Badge>
                <Badge color={T.orange || '#FFB454'}>F {roundSmart(scaled.fats)}g</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Contenu principal */}
        <div className="recipe-grid">
          <div style={{ display: 'grid', gap: 18 }}>

            {/* Slider calories */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 22, background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
                <div style={{ color: T.text, fontWeight: 900, fontSize: 20, marginBottom: 6 }}>
                  Choisir les calories dans l'assiette
                </div>
                <div style={{ color: T.textMid, fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
                  Les quantités des ingrédients se recalculent automatiquement en temps réel.
                </div>

                <div className="recipe-slider-grid">
                  {/* Assiette animée */}
                  <div style={{
                    width: 160, height: 160, margin: '0 auto', borderRadius: '50%',
                    border: `2px solid ${T.border}`,
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
                    boxShadow: 'inset 0 16px 40px rgba(0,0,0,0.28)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', left: '12%', right: '12%', bottom: '13%',
                      height: plateFill, borderRadius: 999,
                      background: 'linear-gradient(180deg, rgba(45,255,155,0.95), rgba(45,255,155,0.55))',
                      boxShadow: '0 0 30px rgba(45,255,155,0.18)',
                      transition: 'height .18s ease',
                    }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 18 }}>
                      <div>
                        <div style={{ color: T.text, fontWeight: 900, fontSize: 28, lineHeight: 1 }}>
                          {roundSmart(targetCalories)}
                        </div>
                        <div style={{ color: T.textDim, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 }}>
                          kcal
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ color: T.text, fontSize: 16, fontWeight: 800 }}>Cible calorique</div>
                      <div style={{ color: T.accentLight, fontWeight: 900, fontSize: 18 }}>{roundSmart(targetCalories)} kcal</div>
                    </div>

                    <input
                      type="range"
                      min={sliderBounds.min} max={sliderBounds.max} step={sliderBounds.step}
                      value={targetCalories}
                      onChange={(e) => setTargetCalories(Number(e.target.value))}
                      style={{ width: '100%', accentColor: T.accent, cursor: 'pointer' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: T.textDim, fontSize: 12, fontWeight: 700 }}>
                      <span>{sliderBounds.min} kcal</span>
                      <span>{Math.round(baseCalories)} kcal base</span>
                      <span>{sliderBounds.max} kcal</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                      {[0.75, 1, 1.25, 1.5].map((mult) => {
                        const val = Math.round(baseCalories * mult)
                        const active = Math.round(targetCalories) === val
                        return (
                          <button key={val} type="button" onClick={() => setTargetCalories(val)} style={{
                            height: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
                            border: `1px solid ${active ? T.accent + '40' : T.border}`,
                            background: active ? 'rgba(45,255,155,0.10)' : 'rgba(255,255,255,0.03)',
                            color: active ? T.accentLight : T.textMid,
                            fontWeight: 800, fontSize: 12,
                          }}>
                            {val} kcal
                          </button>
                        )
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                      <MacroPill label="Protéines" value={`${roundSmart(scaled.proteins)} g`} color={T.blue || '#5BA7FF'} />
                      <MacroPill label="Glucides"  value={`${roundSmart(scaled.carbs)} g`}    color={T.orange || '#FFB454'} />
                      <MacroPill label="Lipides"   value={`${roundSmart(scaled.fats)} g`}     color={T.border} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Ingrédients */}
            <Card style={{ padding: 20 }}>
              <div style={{ color: T.text, fontWeight: 900, fontSize: 18, marginBottom: 4 }}>
                Ingrédients
              </div>
              {Math.abs(ratio - 1) > 0.01 && (
                <div style={{ fontSize: 12, color: T.accent, marginBottom: 14, fontWeight: 600 }}>
                  ✓ Quantités ajustées pour {roundSmart(targetCalories)} kcal
                </div>
              )}
              {!Math.abs(ratio - 1) > 0.01 && <div style={{ marginBottom: 14 }} />}

              {rawIngredients.length === 0 ? (
                <div style={{ color: T.textDim, fontSize: 14 }}>Aucun ingrédient renseigné.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {(recipe?.recipe_ingredients || []).map((ing) => (
                    <IngredientRow key={ing.id} ingredient={ing} ratio={ratio} />
                  ))}
                </div>
              )}
            </Card>

            {/* Étapes de préparation */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: T.text, fontWeight: 900, fontSize: 18 }}>
                    Étapes de préparation
                    {aiGenerated && (
                      <span style={{
                        marginLeft: 8, fontSize: 11, fontWeight: 700,
                        color: T.accent, background: 'rgba(57,224,122,0.12)',
                        padding: '2px 8px', borderRadius: 20,
                      }}>
                        🤖 Généré par IA
                      </span>
                    )}
                  </div>
                  {enrichedSteps.length > 0 && (
                    <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>
                      {enrichedSteps.length} étape{enrichedSteps.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Bouton génération IA */}
                {(!hasInstructions && !aiGenerated) && (
                  <button
                    type="button"
                    onClick={handleGenerateSteps}
                    disabled={aiLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      height: 36, padding: '0 14px', borderRadius: 12,
                      border: `1px solid ${T.accent}38`,
                      background: 'rgba(57,224,122,0.08)',
                      color: T.accentLight,
                      cursor: aiLoading ? 'wait' : 'pointer',
                      fontWeight: 700, fontSize: 12,
                      opacity: aiLoading ? 0.6 : 1,
                    }}
                  >
                    {aiLoading ? (
                      <>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                        Génération…
                      </>
                    ) : (
                      <>🤖 {aiGenerated ? 'Regénérer' : 'Générer avec l\'IA'}</>
                    )}
                  </button>
                )}
              </div>

              {enrichedSteps.length === 0 ? (
                <div style={{
                  padding: 20, borderRadius: 16,
                  border: `1px dashed ${T.border}`,
                  background: 'rgba(255,255,255,0.02)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>👨‍🍳</div>
                  <div style={{ color: T.textMid, fontSize: 14, fontWeight: 600 }}>
                    Aucune étape renseignée
                  </div>
                  <div style={{ color: T.textDim, fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                    Génère automatiquement les étapes avec l'IA
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSteps}
                    disabled={aiLoading}
                    style={{
                      height: 40, padding: '0 20px', borderRadius: 12,
                      border: `1px solid ${T.accent}40`,
                      background: 'rgba(57,224,122,0.10)',
                      color: T.accentLight,
                      cursor: aiLoading ? 'wait' : 'pointer',
                      fontWeight: 800, fontSize: 13,
                    }}
                  >
                    {aiLoading ? '⏳ Génération en cours…' : '🤖 Générer les étapes'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {enrichedSteps.map((step) => (
                    <StepCard key={step.index} step={step} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar actions */}
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
                    height: 48, borderRadius: 14, border: `1px solid ${T.border}`,
                    background: T.surface, color: T.text, padding: '0 14px',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box', width: '100%',
                  }}
                >
                  {MEAL_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </label>

              <div style={{ padding: 14, borderRadius: 14, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: T.textDim, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Quantité sélectionnée
                </div>
                <div style={{ color: T.text, fontSize: 20, fontWeight: 900, marginTop: 8 }}>
                  {roundSmart(targetCalories)} kcal
                </div>
                <div style={{ color: T.textMid, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                  Environ x{portionEquivalent} portion{portionEquivalent > 1 ? 's' : ''}.
                </div>
              </div>

              <Btn onClick={addToMealPlan} disabled={savingPlan}>
                {savingPlan ? 'Ajout au plan…' : "Ajouter au plan repas d'aujourd'hui"}
              </Btn>

              <Btn variant="secondary" onClick={addToTodayNutrition} disabled={savingNutrition}>
                {savingNutrition ? 'Ajout nutrition…' : "Ajouter à la nutrition du jour"}
              </Btn>
            </div>
          </Card>
        </div>
      </div>
    </PageWrap>
  )
}
