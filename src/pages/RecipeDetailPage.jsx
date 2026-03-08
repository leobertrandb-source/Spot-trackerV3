import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageWrap, Card, Label, Btn, Input } from '../components/UI'
import { T } from '../lib/data'

function MacroBadge({ children }) {
return (
<div
style={{
display: 'inline-flex',
alignItems: 'center',
padding: '8px 12px',
borderRadius: 999,
background: 'rgba(255,255,255,0.08)',
border: '1px solid rgba(255,255,255,0.10)',
color: '#fff',
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

function IngredientRow({ name, qty, unit }) {
return (
<div
style={{
display: 'flex',
justifyContent: 'space-between',
gap: 12,
padding: '12px 14px',
borderRadius: 16,
background: 'rgba(255,255,255,0.03)',
border: '1px solid rgba(255,255,255,0.06)',
}}
>
<div style={{ color: T.text, fontWeight: 700 }}>{name}</div>
<div style={{ color: T.textMid, fontWeight: 900 }}>
{qty} {unit}
</div>
</div>
)
}

export default function RecipeDetailPage() {
const { id } = useParams()

const [recipe, setRecipe] = useState(null)
const [ingredients, setIngredients] = useState([])
const [targetCalories, setTargetCalories] = useState(600)
const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
const [saving, setSaving] = useState(false)

useEffect(() => {
async function load() {
const { data: r, error: rErr } = await supabase
.from('recipes')
.select('*')
.eq('id', id)
.single()

if (rErr) {
console.error(rErr)
alert(rErr.message)
return
}

setRecipe(r)
setTargetCalories(Math.max(200, Number(r.calories || 600)))

const { data: ing, error: iErr } = await supabase
.from('recipe_ingredients')
.select('*')
.eq('recipe_id', id)
.order('sort_order', { ascending: true })

if (iErr) console.error(iErr)
setIngredients(ing || [])
}

load()
}, [id])

const ratio = useMemo(() => {
const base = Math.max(1, Number(recipe?.calories || 1))
return Number(targetCalories) / base
}, [recipe, targetCalories])

const scaledIngredients = useMemo(() => {
return (ingredients || []).map((i) => {
const baseQty = Number(i.quantity || 0)
const scaledQty = +(baseQty * ratio).toFixed(1)
return { ...i, scaledQty }
})
}, [ingredients, ratio])

const scaledMacros = useMemo(() => {
if (!recipe) return null
return {
calories: Math.round(Number(recipe.calories || 0) * ratio),
proteins: +(Number(recipe.proteins || 0) * ratio).toFixed(1),
carbs: +(Number(recipe.carbs || 0) * ratio).toFixed(1),
fats: +(Number(recipe.fats || 0) * ratio).toFixed(1),
}
}, [recipe, ratio])

async function addToNutritionLogs() {
if (!recipe || !scaledMacros) return

setSaving(true)

const { data: auth } = await supabase.auth.getUser()
const user = auth?.user

if (!user?.id) {
alert('Non connecté')
setSaving(false)
return
}

const details = {
recipe_id: recipe.id,
title: recipe.title,
baseCalories: recipe.calories,
targetCalories: Number(targetCalories),
ratio: +ratio.toFixed(4),
ingredients: scaledIngredients.map((i) => ({
name: i.name,
quantity: i.scaledQty,
unit: i.unit,
})),
}

const { error } = await supabase.from('nutrition_logs').insert({
user_id: user.id,
log_date: logDate,
meal_name: recipe.title,
calories: scaledMacros.calories,
proteins: scaledMacros.proteins,
carbs: scaledMacros.carbs,
fats: scaledMacros.fats,
water: 0,
recipe_id: recipe.id,
recipe_details: details,
})

if (error) {
console.error(error)
alert(error.message)
setSaving(false)
return
}

alert('Ajouté ✅')
setSaving(false)
}

if (!recipe) {
return <PageWrap>Chargement…</PageWrap>
}

return (
<PageWrap>
<div style={{ maxWidth: 1180, margin: '0 auto' }}>
<div
style={{
position: 'relative',
minHeight: 420,
borderRadius: 30,
overflow: 'hidden',
border: '1px solid rgba(255,255,255,0.08)',
background: recipe.image_url
? `linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.82)), url("${recipe.image_url}") center/cover no-repeat`
: 'linear-gradient(135deg, rgba(26,32,29,0.96), rgba(9,12,10,0.98))',
boxShadow: '0 24px 60px rgba(0,0,0,0.24)',
marginBottom: 20,
}}
>
{!recipe.image_url ? (
<div
style={{
position: 'absolute',
inset: 0,
opacity: 0.08,
backgroundImage:
'radial-gradient(rgba(255,255,255,0.72) 0.7px, transparent 0.7px)',
backgroundSize: '14px 14px',
}}
/>
) : null}

<div
style={{
position: 'absolute',
inset: 0,
background: recipe.image_url
? 'linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.82))'
: 'radial-gradient(circle at 18% 15%, rgba(45,255,155,0.14), transparent 35%)',
}}
/>

<div
style={{
position: 'absolute',
inset: 0,
padding: 24,
display: 'flex',
flexDirection: 'column',
justifyContent: 'flex-end',
}}
>
<div
style={{
display: 'inline-flex',
width: 'fit-content',
padding: '8px 12px',
borderRadius: 999,
border: `1px solid ${T.accent + '28'}`,
background: 'rgba(10,12,11,0.36)',
color: T.accentLight,
fontWeight: 800,
fontSize: 12,
letterSpacing: 1,
textTransform: 'uppercase',
marginBottom: 14,
backdropFilter: 'blur(10px)',
}}
>
Recette premium
</div>

<div
style={{
color: '#fff',
fontSize: 42,
fontWeight: 900,
lineHeight: 0.98,
maxWidth: 760,
marginBottom: 12,
}}
>
{recipe.title}
</div>

<div
style={{
color: 'rgba(255,255,255,0.78)',
fontSize: 15,
lineHeight: 1.65,
maxWidth: 760,
marginBottom: 16,
}}
>
Ajuste les calories du repas et les quantités des ingrédients se recalculent automatiquement.
</div>

<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
<MacroBadge>{scaledMacros?.calories ?? recipe.calories} kcal</MacroBadge>
<MacroBadge>P {scaledMacros?.proteins ?? recipe.proteins}g</MacroBadge>
<MacroBadge>C {scaledMacros?.carbs ?? recipe.carbs}g</MacroBadge>
<MacroBadge>F {scaledMacros?.fats ?? recipe.fats}g</MacroBadge>
</div>
</div>
</div>

<div
style={{
display: 'grid',
gridTemplateColumns: '1.2fr 0.9fr',
gap: 18,
}}
>
<Card
glow
style={{
borderRadius: 26,
background: 'linear-gradient(135deg, rgba(18,21,19,0.96), rgba(9,12,10,0.98))',
border: '1px solid rgba(255,255,255,0.08)',
boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
}}
>
<Label>Calories du repas</Label>

<div
style={{
display: 'flex',
justifyContent: 'space-between',
alignItems: 'end',
gap: 12,
marginTop: 8,
}}
>
<div
style={{
fontFamily: T.fontDisplay,
fontWeight: 900,
fontSize: 38,
color: T.accent,
}}
>
{Number(targetCalories)}
<span style={{ fontSize: 12, color: T.textMid, marginLeft: 8 }}>kcal</span>
</div>

<div style={{ fontSize: 12, color: T.textDim }}>
Base : {recipe.calories} kcal • Ratio : {ratio.toFixed(2)}×
</div>
</div>

<div style={{ height: 16 }} />

<input
type="range"
min="200"
max="1200"
step="25"
value={targetCalories}
onChange={(e) => setTargetCalories(Number(e.target.value))}
style={{ width: '100%' }}
/>

<div style={{ height: 18 }} />

<div style={{ display: 'grid', gap: 12 }}>
<IngredientRow name="Protéines" qty={scaledMacros?.proteins ?? 0} unit="g" />
<IngredientRow name="Glucides" qty={scaledMacros?.carbs ?? 0} unit="g" />
<IngredientRow name="Lipides" qty={scaledMacros?.fats ?? 0} unit="g" />
</div>
</Card>

<Card
style={{
borderRadius: 26,
background:
'radial-gradient(circle at 18% 20%, rgba(45,255,155,0.10), transparent 30%), linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
border: '1px solid rgba(255,255,255,0.08)',
boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
}}
>
<Label>Ajouter à Nutrition</Label>

<div style={{ color: T.textMid, fontSize: 14, lineHeight: 1.6, marginTop: 10, marginBottom: 12 }}>
Ajoute directement cette version recalculée à ta journée nutrition.
</div>

<Input label="Date" type="date" value={logDate} onChange={setLogDate} />

<div style={{ marginTop: 14 }}>
<Btn onClick={addToNutritionLogs} disabled={saving}>
{saving ? 'Ajout…' : 'Ajouter au jour'}
</Btn>
</div>
</Card>
</div>

<div style={{ height: 18 }} />

<Card
style={{
borderRadius: 26,
background: 'linear-gradient(135deg, rgba(18,21,19,0.96), rgba(9,12,10,0.98))',
border: '1px solid rgba(255,255,255,0.08)',
boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
}}
>
<Label>Ingrédients recalculés</Label>

<div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
{scaledIngredients.length ? (
scaledIngredients.map((i) => (
<IngredientRow
key={i.id}
name={i.name}
qty={i.scaledQty}
unit={i.unit}
/>
))
) : (
<div style={{ color: T.textMid }}>
Aucun ingrédient renseigné.
</div>
)}
</div>
</Card>
</div>
</PageWrap>
)
}
