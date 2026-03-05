import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageWrap, Card, Label, Input, Btn, Badge, PageHeader } from '../components/UI'
import { T } from '../lib/data'

export default function RecipesPage() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('recipes')
      .select('id,title,description,image_url,calories,proteins,carbs,fats')
      .order('title', { ascending: true })

    if (error) {
      console.error('recipes load error', error)
      alert(error.message)
      setLoading(false)
      return
    }

    setRecipes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return recipes
    return recipes.filter(r =>
      (r.title || '').toLowerCase().includes(s) ||
      (r.description || '').toLowerCase().includes(s)
    )
  }, [recipes, q])

  if (loading) {
    return (
      <PageWrap>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: T.textDim, fontFamily: T.fontDisplay, fontSize: 11, letterSpacing: 3 }}>
          CHARGEMENT...
        </div>
      </PageWrap>
    )
  }

  return (
    <PageWrap>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <PageHeader title="Recettes" sub="Recettes ajustables — curseur calories" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Badge>+{filtered.length}</Badge>
        </div>
      </div>

      <Card>
        <Label>Rechercher</Label>
        <Input
          label="Nom / mot-clé"
          value={q}
          onChange={setQ}
          placeholder="Poulet, porridge, bowl…"
          autoFocus
        />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {filtered.map(r => (
          <Card
            key={r.id}
            onClick={() => navigate(`/recette/${r.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 16, letterSpacing: 1, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.title}
                </div>
                {r.description ? (
                  <div style={{ color: T.textSub, fontSize: 12, marginTop: 6, lineHeight: 1.4, maxHeight: 34, overflow: 'hidden' }}>
                    {r.description}
                  </div>
                ) : null}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 18, color: T.accent }}>
                  {Math.round(r.calories || 0)}
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.textMid, marginLeft: 6 }}>kcal</span>
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                  P {Number(r.proteins || 0).toFixed(0)}g · C {Number(r.carbs || 0).toFixed(0)}g · F {Number(r.fats || 0).toFixed(0)}g
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Btn size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/recette/${r.id}`) }}>
                Ouvrir
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '50px 30px' }}>
          <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 44, color: T.border, marginBottom: 12 }}>◎</div>
          <div style={{ fontFamily: T.fontDisplay, fontWeight: 850, fontSize: 18, letterSpacing: 1, color: T.text }}>Aucune recette</div>
          <div style={{ marginTop: 8, color: T.textMid, fontSize: 13 }}>Ajoute des recettes dans Supabase (table <b>recipes</b>) puis reviens.</div>
        </Card>
      ) : null}
    </PageWrap>
  )
}
