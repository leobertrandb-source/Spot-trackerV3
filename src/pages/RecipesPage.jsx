import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { PageWrap, Card, Label, Btn, Input } from "../components/UI"
import { T } from "../lib/data"

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")

  async function loadRecipes() {
    setLoading(true)

    let query = supabase
      .from("recipes")
      .select("*")
      .order("title", { ascending: true })

    if (q.trim()) {
      query = query.ilike("title", `%${q.trim()}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("recipes load error", error)
      setLoading(false)
      return
    }

    setRecipes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadRecipes()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      loadRecipes()
    }, 250)

    return () => clearTimeout(t)
  }, [q])

  return (
    <PageWrap>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 2 }}>
          RECETTES
        </div>
        <div style={{ color: T.textMid }}>
          Bibliothèque de recettes ajustables
        </div>
      </div>

      <Card>
        <Input
          label="Recherche"
          value={q}
          onChange={setQ}
          placeholder="Poulet, saumon, pancakes..."
        />
      </Card>

      {loading ? (
        <div style={{ color: T.textMid, padding: 16 }}>Chargement…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 16,
          }}
        >
          {recipes.map((r) => (
            <Card key={r.id} glow>
              <div
                style={{
                  height: 180,
                  borderRadius: 16,
                  overflow: "hidden",
                  background: T.card,
                  marginBottom: 14,
                  border: `1px solid ${T.border}`,
                }}
              >
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt={r.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    onError={(e) => {
                      console.log("Image error:", r.title, r.image_url)
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

              <Label>{r.title}</Label>

              <div style={{ color: T.textMid, marginTop: 4 }}>
                {r.calories} kcal
              </div>

              <div style={{ height: 10 }} />

              <div style={{ fontSize: 12, color: T.text }}>
                P {Number(r.proteins || 0).toFixed(0)}g • C {Number(r.carbs || 0).toFixed(0)}g • F {Number(r.fats || 0).toFixed(0)}g
              </div>

              <div style={{ height: 14 }} />

              <Btn onClick={() => (window.location.href = `/nutrition/recette/${r.id}`)}>
                Voir recette
              </Btn>
            </Card>
          ))}
        </div>
      )}
    </PageWrap>
  )
}
