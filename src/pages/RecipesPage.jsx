import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { resolveImageUrl } from '../lib/media'
import { PageWrap, Input, Card, Badge } from '../components/UI'
import { T } from '../lib/data'

function RecipeCard({ recipe, onOpen }) {
  const imageUrl = resolveImageUrl({
    imageUrl: recipe.image_url,
    imagePath: recipe.image_path,
    imageBucket: recipe.image_bucket || 'recipe-images',
  })

  const proteins = Number(recipe.proteins || recipe.protein || 0)
  const carbs = Number(recipe.carbs || 0)
  const fats = Number(recipe.fats || recipe.fat || 0)
  const calories = Number(recipe.calories || 0)

  return (
    <button
      type="button"
      onClick={() => recipe?.id && onOpen(recipe.id)}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          position: 'relative',
          minHeight: 340,
          borderRadius: 24,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          background: imageUrl
            ? `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.78)), url("${imageUrl}") center/cover no-repeat`
            : 'linear-gradient(135deg, rgba(24,28,26,0.96), rgba(10,14,12,0.98))',
          boxShadow: '0 18px 50px rgba(0,0,0,0.24)',
          transition: 'transform .2s ease, border-color .2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.borderColor = `${T.accent}44`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.borderColor = T.border
        }}
      >
        {!imageUrl ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%)',
            }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Badge>{Math.round(calories)} kcal</Badge>
          </div>

          <div>
            <div
              style={{
                color: '#fff',
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.05,
                marginBottom: 12,
              }}
            >
              {recipe.title || recipe.name || 'Recette'}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <Badge>P {Math.round(proteins)}g</Badge>
              <Badge color={T.blue || '#5BA7FF'}>C {Math.round(carbs)}g</Badge>
              <Badge color={T.orange || '#FFB454'}>F {Math.round(fats)}g</Badge>
            </div>

            <div
              style={{
                display: 'inline-flex',
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              Voir recette
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

export default function RecipesPage() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true

    async function loadRecipes() {
      setLoading(true)

      let request = supabase
        .from('recipes')
        .select('*')
        .order('title', { ascending: true })

      if (query.trim()) {
        request = request.ilike('title', `%${query.trim()}%`)
      }

      const { data, error } = await request

      if (!active) return

      if (error) {
        console.error(error)
        setRecipes([])
      } else {
        setRecipes(data || [])
      }

      setLoading(false)
    }

    const timer = setTimeout(loadRecipes, 220)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query])

  const recipeCount = useMemo(() => recipes.length, [recipes])

  return (
    <PageWrap>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 18 }}>
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
            Bibliothèque recettes
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
            RECETTES
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.65,
              marginTop: 10,
              marginBottom: 18,
            }}
          >
            Explore tes recettes et ajoute-les à ta nutrition ou à ton plan repas.
          </div>

          <div style={{ maxWidth: 420 }}>
            <Input
              label="Recherche"
              value={query}
              onChange={setQuery}
              placeholder="Poulet, pancake, riz..."
            />
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Badge>{recipeCount} recette{recipeCount > 1 ? 's' : ''}</Badge>
        </div>

        {loading ? (
          <Card style={{ padding: 20 }}>
            <div style={{ color: T.textDim, fontSize: 14 }}>
              Chargement des recettes...
            </div>
          </Card>
        ) : recipes.length === 0 ? (
          <Card style={{ padding: 20 }}>
            <div style={{ color: T.textMid, fontSize: 14 }}>
              Aucune recette trouvée.
            </div>
          </Card>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 18,
            }}
          >
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onOpen={(rid) => navigate(`/nutrition/recette/${rid}`)}
              />
            ))}
          </div>
        )}
      </div>
    </PageWrap>
  )
}
