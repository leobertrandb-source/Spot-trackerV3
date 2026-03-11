import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { resolveImageUrl } from '../lib/media'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Badge } from '../components/UI'
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

function calcPlateFillPercent(targetCalories, baseCalories) {
if (!baseCalories) return 50
const pct = (targetCalories / baseCalories) * 100
return Math.max(18, Math.min(100, pct))
}

function getSliderBounds(baseCalories) {
const safe = Math.max(100, Math.round(baseCalories || 500))
return {
min: Math.max(100, Math.round(safe * 0.4)),
max: Math.max(250, Math.round(safe * 2.2)),
step: 10,
}
}

function MacroPill({ label, value, color }) {
return (
<div
style={{
padding: '10px 12px',
borderRadius: 14,
border: `1px solid ${color || T.border}`,
background: 'rgba(255,255,255,0.04)',
minWidth: 104,
}}
>
<div
style={{
color: T.textDim,
fontSize: 11,
fontWeight: 800,
textTransform: 'uppercase',
letterSpacing: 1,
}}
>
{label}
</div>
<div
style={{
color: T.text,
fontSize: 18,
fontWeight: 900,
marginTop: 6,
}}
>
{value}
</div>
</div>
)
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
const nextRecipe = data || null
setRecipe(nextRecipe)
const base = Math.max(100, Math.round(toNumber(nextRecipe?.calories) || 400))
setTargetCalories(base)
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
return Math.max(1, toNumber(recipe?.calories))
}, [recipe])

const sliderBounds = useMemo(() => {
return getSliderBounds(baseCalories)
}, [baseCalories])

const ratio = useMemo(() => {
if (!baseCalories || !targetCalories) return 1
return targetCalories / baseCalories
}, [targetCalories, baseCalories])

const scaled = useMemo(() => {
if (!recipe) {
return { calories: 0, proteins: 0, carbs: 0, fats: 0 }
}

return {
calories: roundSmart(targetCalories),
proteins: roundSmart(toNumber(recipe.proteins || recipe.protein) * ratio),
carbs: roundSmart(toNumber(recipe.carbs) * ratio),
fats: roundSmart(toNumber(recipe.fats || recipe.fat) * ratio),
}
}, [recipe, ratio, targetCalories])

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

const plateFill = useMemo(() => {
return `${calcPlateFillPercent(targetCalories, baseCalories)}%`
}, [targetCalories, baseCalories])

const portionEquivalent = useMemo(() => {
return roundSmart(ratio)
}, [ratio])

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
meal_name: `${recipe.title || recipe.name || 'Recette'} (${roundSmart(targetCalories)} kcal)`,
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
<div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gap: 18 }}>
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
minHeight: 360,
background: heroImage
? `linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.78)), url("${heroImage}") center/cover no-repeat`
: 'linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
}}
>
<div
style={{
minHeight: 360,
padding: '24px 24px 22px',
display: 'flex',
flexDirection: 'column',
justifyContent: 'space-between',
background: heroImage
? 'linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.80))'
: 'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%)',
}}
>
<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
<Btn variant="secondary" onClick={() => navigate('/nutrition/recettes')}>
Retour
</Btn>

<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
<Badge>{roundSmart(targetCalories)} kcal</Badge>
<Badge color={T.blue || '#5BA7FF'}>
x{portionEquivalent} portion{portionEquivalent > 1 ? 's' : ''}
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
gridTemplateColumns: 'minmax(0, 1.15fr) minmax(340px, 0.85fr)',
gap: 18,
alignItems: 'start',
}}
>
<div style={{ display: 'grid', gap: 18 }}>
<Card style={{ padding: 0, overflow: 'hidden' }}>
<div
style={{
padding: 22,
background:
'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
}}
>
<div
style={{
color: T.text,
fontWeight: 900,
fontSize: 20,
marginBottom: 6,
}}
>
Choisir les calories dans l’assiette
</div>

<div
style={{
color: T.textMid,
fontSize: 14,
lineHeight: 1.6,
marginBottom: 18,
}}
>
Fais glisser la barre pour fixer exactement le nombre de calories
servies. Les quantités des ingrédients sont recalculées
automatiquement.
</div>

<div
style={{
display: 'grid',
gridTemplateColumns: '220px minmax(0, 1fr)',
gap: 24,
alignItems: 'center',
}}
>
<div
style={{
width: 190,
height: 190,
margin: '0 auto',
borderRadius: '50%',
border: `2px solid ${T.border}`,
background:
'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
boxShadow: 'inset 0 16px 40px rgba(0,0,0,0.28)',
position: 'relative',
overflow: 'hidden',
}}
>
<div
style={{
position: 'absolute',
left: '12%',
right: '12%',
bottom: '13%',
height: plateFill,
borderRadius: 999,
background:
'linear-gradient(180deg, rgba(45,255,155,0.95), rgba(45,255,155,0.55))',
boxShadow: '0 0 30px rgba(45,255,155,0.18)',
transition: 'height .18s ease',
}}
/>
<div
style={{
position: 'absolute',
inset: 0,
display: 'grid',
placeItems: 'center',
textAlign: 'center',
padding: 18,
}}
>
<div>
<div
style={{
color: T.text,
fontWeight: 900,
fontSize: 28,
lineHeight: 1,
}}
>
{roundSmart(targetCalories)}
</div>
<div
style={{
color: T.textDim,
fontSize: 12,
fontWeight: 800,
letterSpacing: 1,
textTransform: 'uppercase',
marginTop: 6,
}}
>
kcal
</div>
</div>
</div>
</div>

<div>
<div
style={{
display: 'flex',
justifyContent: 'space-between',
gap: 10,
alignItems: 'center',
flexWrap: 'wrap',
marginBottom: 10,
}}
>
<div
style={{
color: T.text,
fontSize: 16,
fontWeight: 800,
}}
>
Cible calorique
</div>

<div
style={{
color: T.accentLight,
fontWeight: 900,
fontSize: 18,
}}
>
{roundSmart(targetCalories)} kcal
</div>
</div>

<input
type="range"
min={sliderBounds.min}
max={sliderBounds.max}
step={sliderBounds.step}
value={targetCalories}
onChange={(e) => setTargetCalories(Number(e.target.value))}
style={{
width: '100%',
accentColor: T.accent,
cursor: 'pointer',
}}
/>

<div
style={{
display: 'flex',
justifyContent: 'space-between',
marginTop: 8,
color: T.textDim,
fontSize: 12,
fontWeight: 700,
}}
>
<span>{sliderBounds.min} kcal</span>
<span>{Math.round(baseCalories)} kcal base</span>
<span>{sliderBounds.max} kcal</span>
</div>

<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
{[0.75, 1, 1.25, 1.5].map((multiplier) => {
const value = Math.round(baseCalories * multiplier)
return (
<button
key={value}
type="button"
onClick={() => setTargetCalories(value)}
style={{
height: 36,
padding: '0 12px',
borderRadius: 999,
border: `1px solid ${
Math.round(targetCalories) === value ? T.accent + '40' : T.border
}`,
background:
Math.round(targetCalories) === value
? 'rgba(45,255,155,0.10)'
: 'rgba(255,255,255,0.03)',
color:
Math.round(targetCalories) === value
? T.accentLight
: T.textMid,
cursor: 'pointer',
fontWeight: 800,
fontSize: 12,
}}
>
{value} kcal
</button>
)
})}
</div>

<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
<MacroPill label="Protéines" value={`${roundSmart(scaled.proteins)} g`} color={T.blue || '#5BA7FF'} />
<MacroPill label="Glucides" value={`${roundSmart(scaled.carbs)} g`} color={T.orange || '#FFB454'} />
<MacroPill label="Lipides" value={`${roundSmart(scaled.fats)} g`} color={T.border} />
</div>
</div>
</div>
</div>
</Card>

<Card style={{ padding: 20 }}>
<div
style={{
color: T.text,
fontWeight: 900,
fontSize: 18,
marginBottom: 14,
}}
>
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
<div
style={{
color: T.text,
fontWeight: 900,
fontSize: 18,
marginBottom: 14,
}}
>
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
<div
style={{
color: T.text,
fontWeight: 900,
fontSize: 18,
marginBottom: 14,
}}
>
Actions rapides
</div>

<div style={{ display: 'grid', gap: 14 }}>
<label style={{ display: 'grid', gap: 8 }}>
<span
style={{
color: T.textSub || T.textDim,
fontSize: 12,
fontWeight: 800,
}}
>
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

<div
style={{
padding: 14,
borderRadius: 14,
border: `1px solid ${T.border}`,
background: 'rgba(255,255,255,0.03)',
}}
>
<div
style={{
color: T.textDim,
fontSize: 11,
fontWeight: 800,
textTransform: 'uppercase',
letterSpacing: 1,
}}
>
Quantité sélectionnée
</div>
<div
style={{
color: T.text,
fontSize: 20,
fontWeight: 900,
marginTop: 8,
}}
>
{roundSmart(targetCalories)} kcal
</div>
<div
style={{
color: T.textMid,
fontSize: 13,
marginTop: 6,
lineHeight: 1.5,
}}
>
Environ x{portionEquivalent} portion{portionEquivalent > 1 ? 's' : ''}.
</div>
</div>

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
