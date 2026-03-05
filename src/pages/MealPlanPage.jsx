import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import { PageWrap, Card, Label, Btn, Input } from "../components/UI"
import { T } from "../lib/data"

function splitCalories(total, n) {
  // répartition réaliste
  if (n === 3) return [0.3, 0.4, 0.3].map(p => Math.round(total * p))
  if (n === 4) return [0.25, 0.3, 0.2, 0.25].map(p => Math.round(total * p))
  // fallback
  return Array.from({ length: n }, () => Math.round(total / n))
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

export default function MealPlanPage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [targetCalories, setTargetCalories] = useState(2300)
  const [mealsCount, setMealsCount] = useState(3)

  const [plan, setPlan] = useState(null)
  const [saving, setSaving] = useState(false)
  const [pushing, setPushing] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from("recipes").select("*").order("title")
      if (error) console.error(error)
      setRecipes(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const mealTargets = useMemo(() => splitCalories(Number(targetCalories) || 0, Number(mealsCount) || 3), [targetCalories, mealsCount])

  function pickRecipeCloseTo(calTarget, usedIds) {
    // choix simple: recette dont calories base est proche de calTarget
    // + évite répétitions
    const candidates = recipes
      .filter(r => !usedIds.has(r.id))
      .map(r => ({ r, diff: Math.abs((r.calories || 0) - calTarget) }))
      .sort((a,b) => a.diff - b.diff)

    return candidates[0]?.r || null
  }

  async function generatePlan() {
    if (!recipes.length) {
      alert("Aucune recette disponible.")
      return
    }

    const used = new Set()
    const meals = []

    for (let i = 0; i < mealTargets.length; i++) {
      const calTarget = clamp(mealTargets[i], 200, 1200)

      const recipe = pickRecipeCloseTo(calTarget, used) || recipes[Math.floor(Math.random() * recipes.length)]
      used.add(recipe.id)

      const ratio = calTarget / Math.max(1, Number(recipe.calories || 1))

      // charge ingrédients de la recette
      const { data: ing, error: iErr } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipe.id)
        .order("sort_order", { ascending: true })

      if (iErr) console.error(iErr)

      const ingredients = (ing || []).map(x => ({
        name: x.name,
        unit: x.unit,
        quantity: +(Number(x.quantity || 0) * ratio).toFixed(1),
      }))

      const macros = {
        calories: Math.round(Number(recipe.calories || 0) * ratio),
        proteins: +(Number(recipe.proteins || 0) * ratio).toFixed(1),
        carbs: +(Number(recipe.carbs || 0) * ratio).toFixed(1),
        fats: +(Number(recipe.fats || 0) * ratio).toFixed(1),
      }

      meals.push({
        mealIndex: i + 1,
        recipe_id: recipe.id,
        title: recipe.title,
        targetCalories: calTarget,
        ratio: +ratio.toFixed(4),
        macros,
        ingredients,
      })
    }

    setPlan({
      planDate,
      targetCalories: Number(targetCalories),
      mealsCount: Number(mealsCount),
      meals,
    })
  }

  async function savePlan() {
    if (!plan) return
    setSaving(true)

    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user?.id) {
      alert("Non connecté.")
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("daily_meal_plans")
      .upsert({
        user_id: user.id,
        plan_date: plan.planDate,
        target_calories: plan.targetCalories,
        meals: plan.meals,
      }, { onConflict: "user_id,plan_date" })

    if (error) {
      console.error(error)
      alert(error.message)
      setSaving(false)
      return
    }

    alert("Plan sauvegardé ✅")
    setSaving(false)
  }

  async function pushToNutrition() {
    if (!plan) return
    setPushing(true)

    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user?.id) {
      alert("Non connecté.")
      setPushing(false)
      return
    }

    const rows = plan.meals.map(m => ({
      user_id: user.id,
      log_date: plan.planDate,
      meal_name: m.title,
      calories: m.macros.calories,
      proteins: m.macros.proteins,
      carbs: m.macros.carbs,
      fats: m.macros.fats,
      water: 0,
      recipe_id: m.recipe_id,
      recipe_details: {
        title: m.title,
        targetCalories: m.targetCalories,
        ratio: m.ratio,
        ingredients: m.ingredients,
      }
    }))

    const { error } = await supabase.from("nutrition_logs").insert(rows)
    if (error) {
      console.error(error)
      alert(error.message)
      setPushing(false)
      return
    }

    alert("Ajouté dans Nutrition ✅")
    setPushing(false)
  }

  const totals = useMemo(() => {
    if (!plan?.meals?.length) return null
    return plan.meals.reduce((acc, m) => {
      acc.calories += m.macros.calories
      acc.proteins += Number(m.macros.proteins || 0)
      acc.carbs += Number(m.macros.carbs || 0)
      acc.fats += Number(m.macros.fats || 0)
      return acc
    }, { calories: 0, proteins: 0, carbs: 0, fats: 0 })
  }, [plan])

  if (loading) return <PageWrap>Chargement…</PageWrap>

  return (
    <PageWrap>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 2 }}>PLAN JOURNALIER</div>
        <div style={{ color: T.textMid }}>Génère automatiquement tes repas à partir des recettes.</div>
      </div>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <Input label="Date" type="date" value={planDate} onChange={setPlanDate} />
          <Input label="Calories du jour" type="number" value={String(targetCalories)} onChange={(v)=>setTargetCalories(Number(v))} />
          <Input label="Nombre de repas" type="number" value={String(mealsCount)} onChange={(v)=>setMealsCount(Number(v))} />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Btn onClick={generatePlan}>Générer</Btn>
          <Btn onClick={savePlan} disabled={!plan || saving}>{saving ? "Sauvegarde…" : "Sauvegarder"}</Btn>
          <Btn onClick={pushToNutrition} disabled={!plan || pushing}>{pushing ? "Ajout…" : "Ajouter à Nutrition"}</Btn>
        </div>
      </Card>

      {plan ? (
        <>
          <Card glow>
            <Label>Résumé</Label>
            <div style={{ marginTop: 10, color: T.textMid }}>
              Total: <b style={{ color: T.text }}>{totals.calories} kcal</b> • P {totals.proteins.toFixed(0)}g • C {totals.carbs.toFixed(0)}g • F {totals.fats.toFixed(0)}g
            </div>
          </Card>

          {plan.meals.map(m => (
            <Card key={m.mealIndex}>
              <Label>Repas {m.mealIndex} — {m.title}</Label>
              <div style={{ color: T.textMid, marginTop: 6 }}>
                {m.macros.calories} kcal • P {m.macros.proteins} • C {m.macros.carbs} • F {m.macros.fats}
              </div>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gap: 6 }}>
                {m.ingredients.map((i, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "10px 12px" }}>
                    <div>{i.name}</div>
                    <div style={{ fontWeight: 900, color: T.textMid }}>{i.quantity} {i.unit}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </>
      ) : null}
    </PageWrap>
  )
}