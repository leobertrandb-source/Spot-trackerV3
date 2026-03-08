import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { PageWrap, Card, Label, Btn, Input } from "../components/UI"
import { T } from "../lib/data"

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
        .from("recipes")
        .select("*")
        .eq("id", id)
        .single()

      if (rErr) {
        console.error(rErr)
        return
      }

      setRecipe(r)
      setTargetCalories(Math.max(200, Number(r.calories || 600)))

      const { data: ing, error: iErr } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", id)
        .order("sort_order", { ascending: true })

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
    return (ingredients || []).map((i) => ({
      ...i,
      scaledQty: +(Number(i.quantity || 0) * ratio).toFixed(1),
    }))
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

    const { error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id,
      log_date: logDate,
      meal_name: recipe.title,
      calories: scaledMacros.calories,
      proteins: scaledMacros.proteins,
      carbs: scaledMacros.carbs,
      fats: scaledMacros.fats,
      recipe_id: recipe.id,
      recipe_details: details,
      water: 0,
    })

    if (error) {
      console.error(error)
      alert(error.message)
      setSaving(false)
      return
    }

    alert("Ajouté ✅")
    setSaving(false)
  }

  if (!recipe) return <PageWrap>Chargement…</PageWrap>

  return (
    <PageWrap>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 2 }}>
          {recipe.title}
        </div>
        <div style={{ color: T.textMid }}>
          Ajuste les calories du repas : les quantités s’adaptent.
        </div>
      </div>

      <Card glow>
        <div
          style={{
            height: 260,
            borderRadius: 18,
            overflow: "hidden",
            background: T.card,
            marginBottom: 18,
            border: `1px solid ${T.border}`,
          }}
        >
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              onError={(e) => {
                console.log("Recipe detail image error:", recipe.title, recipe.image_url)
                e.currentTarget.style.display = "none"
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.textDim,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Image recette
            </div>
          )}
        </div>

        <Label>Calories du repas</Label>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
          <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 34, color: T.accent }}>
            {Number(targetCalories)} <span style={{ fontSize: 12, color: T.textMid }}>kcal</span>
          </div>

          <div style={{ fontSize: 12, color: T.textDim }}>
            Base : {recipe.calories} kcal • Ratio : {ratio.toFixed(2)}×
          </div>
        </div>

        <div style={{ height: 12 }} />

        <input
          type="range"
          min="200"
          max="1200"
          step="25"
          value={targetCalories}
          onChange={(e) => setTargetCalories(Number(e.target.value))}
          style={{ width: "100%" }}
        />

        <div style={{ height: 12 }} />

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: T.textMid, fontSize: 13 }}>
          <div><b style={{ color: T.text }}>P</b> {scaledMacros?.proteins ?? 0} g</div>
          <div><b style={{ color: T.text }}>C</b> {scaledMacros?.carbs ?? 0} g</div>
          <div><b style={{ color: T.text }}>F</b> {scaledMacros?.fats ?? 0} g</div>
        </div>
      </Card>

      <Card>
        <Label>Ingrédients (quantités recalculées)</Label>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {scaledIngredients.map((i) => (
            <div
              key={i.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 12px",
                border: `1px solid ${T.border}`,
                borderRadius: T.radius,
                background: T.surface,
              }}
            >
              <div style={{ color: T.text }}>{i.name}</div>
              <div style={{ color: T.textMid, fontWeight: 900 }}>
                {i.scaledQty} {i.unit}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Ajouter à Nutrition</Label>
        <Input label="Date" type="date" value={logDate} onChange={setLogDate} />
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <Btn onClick={addToNutritionLogs} disabled={saving}>
            {saving ? "Ajout…" : "Ajouter au jour"}
          </Btn>
        </div>
      </Card>
    </PageWrap>
  )
}
