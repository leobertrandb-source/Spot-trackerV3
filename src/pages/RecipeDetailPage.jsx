import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Label, Btn, Input, Badge, PageHeader } from '../components/UI'
import { T } from '../lib/data'

const today = new Date().toISOString().split('T')[0]

function extFromFileName(name) {
  const n = String(name || '').toLowerCase()
  if (n.includes('petit') || n.includes('breakfast')) return 'Petit-déjeuner'
  if (n.includes('snack')) return 'Snack'
  return 'Repas'
}

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])

  const [targetCalories, setTargetCalories] = useState(600)
  const [mealName, setMealName] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)

    const { data: r, error: rErr } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (rErr) {
      console.error('recipe load error', rErr)
      alert(rErr.message)
      setLoading(false)
      return
    }

    const { data: ing, error: iErr } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', id)
      .order('sort_order', { ascending: true })

    if (iErr) {
      console.error('ingredients load error', iErr)
      alert(iErr.message)
      setLoading(false)
      return
    }

    setRecipe(r)
    setIngredients(ing || [])

    const baseCals = Math.max(1, Number(r?.calories || 0))
    setTargetCalories(baseCals)
    setMealName(r?.title ? r.title : extFromFileName(r?.title))

    setLoading(false)
  }

  useEffect(() => {
    if (!id) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const ratio = useMemo(() => {
    const base = Math.max(1, Number(recipe?.calories || 0))
    return Number(targetCalories || 0) / base
  }, [recipe?.calories, targetCalories])

  const scaled = useMemo(() => {
    if (!recipe) return null
    const r = ratio
    return {
      calories: Math.round((Number(recipe.calories || 0) * r) || 0),
      proteins: +(Number(recipe.proteins || 0) * r).toFixed(1),
      carbs: +(Number(recipe.carbs || 0) * r).toFixed(1),
      fats: +(Number(recipe.fats || 0) * r).toFixed(1),
      ingredients: (ingredients || []).map(i => ({
        ...i,
        scaled_qty: +(Number(i.quantity || 0) * r).toFixed(1),
      })),
    }
  }, [recipe, ingredients, ratio])

  async function addToToday() {
    if (!user?.id) return
    if (!scaled) return

    setSaving(true)
    const details = {
      recipe_id: recipe?.id,
      title: recipe?.title,
      targetCalories,
      ratio: Number(ratio.toFixed(4)),
      macros: {
        calories: scaled.calories || 0,
        proteins: scaled.proteins || 0,
        carbs: scaled.carbs || 0,
        fats: scaled.fats || 0,
      },
      ingredients: (scaled.ingredients || []).map(i => ({
        name: i.name,
        quantity: i.scaled_qty,
        unit: i.unit,
      })),
    }

    const { error } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id,
        log_date: today,
        meal_name: mealName || recipe?.title || 'Recette',
        calories: scaled.calories || 0,
        proteins: scaled.proteins || 0,
        carbs: scaled.carbs || 0,
        fats: scaled.fats || 0,
        water: 0,
        recipe_id: recipe?.id,
        recipe_details: details,
      })

    if (error) {
      console.error('addToToday error', error)
      alert(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    navigate('/nutrition')
  }

  if (loading) {
    return (
      <PageWrap>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: T.textDim, fontFamily: T.fontDisplay, fontSize: 11, letterSpacing: 3 }}>
          CHARGEMENT...
        </div>
      </PageWrap>
    )
  }

  if (!recipe) {
    return (
      <PageWrap>
        <Card>
          <Label>Recette introuvable</Label>
          <Btn onClick={() => navigate('/recettes')}>Retour</Btn>
        </Card>
      </PageWrap>
    )
  }

  const baseCalories = Math.max(1, Number(recipe.calories || 0))
  const minCals = Math.max(150, Math.round(baseCalories * 0.4 / 10) * 10)
  const maxCals = Math.max(500, Math.round(baseCalories * 2.2 / 10) * 10)

  return (
    <PageWrap>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <PageHeader title={recipe.title} sub="Ajuste les quantités avec les calories" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="secondary" size="sm" onClick={() => navigate('/recettes')}>← Liste</Btn>
          <Badge>{Math.round(targetCalories)} kcal</Badge>
        </div>
      </div>

      <Card glow>
        <Label>Macros recalculées</Label>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Badge>🔥 {scaled?.calories || 0} kcal</Badge>
            <Badge>💪 {scaled?.proteins || 0} g</Badge>
            <Badge>⚡ {scaled?.carbs || 0} g</Badge>
            <Badge>🥑 {scaled?.fats || 0} g</Badge>
          </div>

          <div style={{ minWidth: 240, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: T.textDim, fontSize: 12 }}>
              <span>{minCals} kcal</span>
              <span>{maxCals} kcal</span>
            </div>
            <input
              type="range"
              min={minCals}
              max={maxCals}
              step={10}
              value={targetCalories}
              onChange={(e) => setTargetCalories(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ marginTop: 8, color: T.textMid, fontSize: 12 }}>
              Ratio: <b>{ratio.toFixed(2)}x</b> (base {baseCalories} kcal)
            </div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'end' }}>
          <Input
            label="Nom du repas"
            value={mealName}
            onChange={setMealName}
            placeholder="Ex: Déjeuner"
          />
          <Btn onClick={addToToday} disabled={saving}>
            {saving ? '...' : 'Ajouter à aujourd\'hui'}
          </Btn>
        </div>

        <div style={{ marginTop: 10, color: T.textDim, fontSize: 12 }}>
          Le repas sera ajouté dans <b>Nutrition</b> (date: {today}).
        </div>
      </Card>

      <Card>
        <Label>Ingrédients (quantités ajustées)</Label>

        {scaled?.ingredients?.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {scaled.ingredients.map((i) => (
              <div
                key={i.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 14,
                  padding: '10px 12px',
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius,
                  background: T.surface,
                }}
              >
                <div style={{ color: T.text, fontWeight: 700 }}>{i.name}</div>
                <div style={{ color: T.textMid, fontFamily: T.fontDisplay, fontWeight: 850 }}>
                  {i.scaled_qty} {i.unit}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: T.textMid }}>Aucun ingrédient renseigné.</div>
        )}
      </Card>
    </PageWrap>
  )
}
