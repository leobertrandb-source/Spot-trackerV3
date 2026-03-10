import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageWrap, Input } from '../components/UI'
import { T } from '../lib/data'

function MacroBadge({ children }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '7px 10px',
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

function RecipeCard({ recipe, onOpen }) {
  const proteins = Number(recipe.proteins || recipe.protein || 0)
  const carbs = Number(recipe.carbs || 0)
  const fats = Number(recipe.fats || recipe.fat || 0)
  const calories = Number(recipe.calories || 0)

  return (
    <button
      type="button"
      onClick={() => onOpen(recipe.id)}
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
          minHeight: 360,
          borderRadius: 26,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background: recipe.image_url
            ? `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.78)), url("${recipe.image_url}") center/cover no-repeat`
            : 'linear-gradient(135deg, rgba(26,32,29,0.96), rgba(9,12,10,0.98))',
          boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
          transition: 'transform .22s ease, box-shadow .22s ease, border-color .22s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 28px 60px rgba(0,0,0,0.28)'
          e.currentTarget.style.borderColor = 'rgba(45,255,155,0.20)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)'
          e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.22)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: recipe.image_url
              ? 'linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.82))'
              : 'radial-gradient(circle at 18% 15%, rgba(45,255,155,0.14), transparent 35%)',
          }}
        />

        {!recipe.image_url ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.08,
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.75) 0.7px, transparent 0.7px)',
              backgroundSize: '14px 14px',
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
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 999,
                background: 'rgba(10,12,11,0.42)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.5,
                backdropFilter: 'blur(12px)',
              }}
            >
              {calories} kcal
            </div>
          </div>

          <div>
            <div
              style={{
                color: '#fff',
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.05,
                marginBottom: 14,
                maxWidth: 420,
              }}
            >
              {recipe.title || recipe.name || 'Recette'}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <MacroBadge>P {proteins.toFixed(0)}g</MacroBadge>
              <MacroBadge>C {carbs.toFixed(0)}g</MacroBadge>
              <MacroBadge>F {fats.toFixed(0)}g</MacroBadge>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                backdropFilter: 'blur(12px)',
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
  const [q, setQ] = useState('')

  useEffect(() => {
    let active = true

    async function loadRecipes() {
      setLoading(true)

      let query = supabase
        .from('recipes')
        .select('*')
        .order('title', { ascending: true })

      if (q.trim()) {
        query = query.ilike('title', `%${q.trim()}%`)
      }

      const { data, error } = await query

      if (!active) return

      if (error) {
        console.error(error)
        setRecipes([])
        setLoading(false)
        return
      }

      setRecipes(data || [])
      setLoading(false)
    }

    const timeout = setTimeout(() => {
      loadRecipes()
    }, 250)

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [q])

  function openRecipe(id) {
    navigate(`/nutrition/recette/${id}`)
  }

  return (
    <PageWrap>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 28,
            padding: '24px 24px 26px',
            background:
              'radial-gradient(circle at 15% 20%, rgba(45,255,155,0.14), transparent 28%), linear-gradient(135deg, rgba(22,27,24,0.96), rgba(10,14,12,0.98))',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.24)',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.07,
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.72) 0.7px, transparent 0.7px)',
              backgroundSize: '14px 14px',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                padding: '8px 12px',
                borderRadius: 999,
                border: `1px solid ${(T.accent || '#43E97B') + '28'}`,
                background: 'rgba(45,255,155,0.10)',
                color: T.accentLight || T.accent || '#43E97B',
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Bibliothèque premium
            </div>

            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                letterSpacing: 1.5,
                color: T.text,
                lineHeight: 1,
              }}
            >
              RECETTES
            </div>

            <div
              style={{
                color: T.textMid,
                marginTop: 10,
                fontSize: 15,
                lineHeight: 1.65,
                maxWidth: 760,
              }}
            >
              Explore tes recettes, ajuste les calories, recalcule les quantités et ajoute-les directement à ta journée.
            </div>

            <div style={{ marginTop: 18, maxWidth: 420 }}>
              <Input
                label="Recherche"
                value={q}
                onChange={setQ}
                placeholder="Poulet, saumon, pancakes..."
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ color: T.textMid, padding: 16 }}>Chargement…</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
              gap: 18,
            }}
          >
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onOpen={openRecipe} />
            ))}

            {!recipes.length ? (
              <div
                style={{
                  padding: 18,
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.02)',
                  color: T.textMid,
                }}
              >
                Aucune recette trouvée.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PageWrap>
  )
}
