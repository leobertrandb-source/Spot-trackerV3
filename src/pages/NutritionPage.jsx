import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Btn, Input } from '../components/UI'
import { T } from '../lib/data'

function ProgressBar({ label, value, goal, suffix = '', isMobile = false }) {
  const safeGoal = Math.max(Number(goal || 0), 1)
  const safeValue = Number(value || 0)
  const percent = Math.min(100, Math.round((safeValue / safeGoal) * 100))

  return (
    <div
      style={{
        padding: isMobile ? '14px 14px' : '16px 16px',
        borderRadius: 20,
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: 10,
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: T.textSub,
          }}
        >
          {label}
        </div>

        <div
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {safeValue}
          {suffix} / {Number(goal || 0)}
          {suffix}
        </div>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(45,255,155,0.65), rgba(45,255,155,1))',
            boxShadow: '0 0 16px rgba(45,255,155,0.20)',
          }}
        />
      </div>
    </div>
  )
}

function MiniMetric({ label, value, isMobile = false }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          color: T.textMid,
          fontSize: isMobile ? 12 : 13,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: T.text,
          fontSize: isMobile ? 13 : 14,
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function FoodSearchResult({ food, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: '10px 12px',
        color: T.text,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        {food.name}
      </div>

      <div
        style={{
          color: T.textDim,
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {food.reference_quantity}
        {food.unit} • {Number(food.calories || 0).toFixed(0)} kcal • P{' '}
        {Number(food.proteins || 0).toFixed(1)} • C {Number(food.carbs || 0).toFixed(1)} • F{' '}
        {Number(food.fats || 0).toFixed(1)}
      </div>
    </button>
  )
}

function FoodQuickAddCard({
  foodSearch,
  setFoodSearch,
  searchResults,
  searchLoading,
  selectedFood,
  setSelectedFood,
  quantity,
  setQuantity,
  addFoodLoading,
  onAddFood,
  isMobile = false,
}) {
  const preview = useMemo(() => {
    if (!selectedFood) return null

    const referenceQty = Number(selectedFood.reference_quantity || 100)
    const safeQuantity = Number(quantity || 0)
    const ratio = referenceQty > 0 ? safeQuantity / referenceQty : 0

    return {
      calories: Number(selectedFood.calories || 0) * ratio,
      proteins: Number(selectedFood.proteins || 0) * ratio,
      carbs: Number(selectedFood.carbs || 0) * ratio,
      fats: Number(selectedFood.fats || 0) * ratio,
      fiber: Number(selectedFood.fiber || 0) * ratio,
    }
  }, [selectedFood, quantity])

  return (
    <div
      style={{
        padding: isMobile ? '16px 14px' : '20px 20px',
        borderRadius: 26,
        background:
          'linear-gradient(135deg, rgba(18,21,19,0.96), rgba(9,12,10,0.98))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: T.textSub,
          marginBottom: 12,
        }}
      >
        Ajouter un aliment
      </div>

      <div
        style={{
          display: 'grid',
          gap: 12,
        }}
      >
        <Input
          label="Rechercher un aliment"
          value={foodSearch}
          onChange={setFoodSearch}
          placeholder="Ex : banane, riz, poulet, skyr..."
        />

        {selectedFood ? (
          <div
            style={{
              padding: '12px 12px',
              borderRadius: 16,
              background: 'rgba(45,255,155,0.08)',
              border: `1px solid ${T.accent + '26'}`,
            }}
          >
            <div
              style={{
                color: T.text,
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              {selectedFood.name}
            </div>

            <div
              style={{
                marginTop: 6,
                color: T.textMid,
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              Référence : {selectedFood.reference_quantity}
              {selectedFood.unit} • {Number(selectedFood.calories || 0).toFixed(0)} kcal • P{' '}
              {Number(selectedFood.proteins || 0).toFixed(1)} • C{' '}
              {Number(selectedFood.carbs || 0).toFixed(1)} • F{' '}
              {Number(selectedFood.fats || 0).toFixed(1)}
            </div>

            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedFood(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: T.textMid,
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Changer d’aliment
              </button>
            </div>
          </div>
        ) : foodSearch.trim().length >= 2 ? (
          <div
            style={{
              display: 'grid',
              gap: 8,
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {searchLoading ? (
              <div style={{ color: T.textDim, fontSize: 13 }}>Recherche...</div>
            ) : searchResults.length ? (
              searchResults.map((food) => (
                <FoodSearchResult key={food.id} food={food} onSelect={setSelectedFood} />
              ))
            ) : (
              <div style={{ color: T.textDim, fontSize: 13 }}>
                Aucun aliment trouvé.
              </div>
            )}
          </div>
        ) : null}

        <Input
          label={`Quantité${selectedFood ? ` (${selectedFood.unit || 'g'})` : ''}`}
          value={quantity}
          onChange={setQuantity}
          type="number"
          placeholder={selectedFood?.reference_quantity ? String(selectedFood.reference_quantity) : '100'}
        />

        {preview ? (
          <div
            style={{
              padding: '12px 12px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                color: T.text,
                fontWeight: 800,
                fontSize: 13,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Aperçu nutritionnel
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',
                gap: 8,
              }}
            >
              <MiniMetric label="Calories" value={`${preview.calories.toFixed(0)} kcal`} isMobile={isMobile} />
              <MiniMetric label="Prot" value={`${preview.proteins.toFixed(1)} g`} isMobile={isMobile} />
              <MiniMetric label="Gluc" value={`${preview.carbs.toFixed(1)} g`} isMobile={isMobile} />
              <MiniMetric label="Lip" value={`${preview.fats.toFixed(1)} g`} isMobile={isMobile} />
            </div>
          </div>
        ) : null}

        <Btn onClick={onAddFood} disabled={!selectedFood || !quantity || addFoodLoading}>
          {addFoodLoading ? 'Ajout...' : 'Ajouter cet aliment'}
        </Btn>
      </div>
    </div>
  )
}

function MealCard({ meal, onDelete, isMobile = false }) {
  const items = meal.items || []
  const recipeIngredients = meal.recipe_details?.ingredients || []
  const hasFoodItems = items.length > 0

  return (
    <div
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
        boxShadow: '0 18px 40px rgba(0,0,0,0.20)',
      }}
    >
      <div
        style={{
          padding: isMobile ? '14px 14px 12px' : '18px 18px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'start',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: T.text,
                fontSize: isMobile ? 18 : 22,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              {meal.meal_name || 'Repas'}
            </div>

            <div
              style={{
                marginTop: 8,
                color: T.textMid,
                fontSize: isMobile ? 13 : 14,
                lineHeight: 1.6,
              }}
            >
              {Number(meal.calories || 0).toFixed(0)} kcal • P {Number(meal.proteins || 0).toFixed(1)}g • C{' '}
              {Number(meal.carbs || 0).toFixed(1)}g • F {Number(meal.fats || 0).toFixed(1)}g
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'space-between' : 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={() => onDelete(meal.id)}
              style={{
                background: 'rgba(255,80,80,0.12)',
                border: '1px solid rgba(255,80,80,0.35)',
                color: '#ff6b6b',
                borderRadius: 10,
                padding: '7px 11px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              Supprimer
            </button>

            <div
              style={{
                display: 'inline-flex',
                padding: '8px 12px',
                borderRadius: 999,
                border: `1px solid ${T.accent + '28'}`,
                background: T.accentGlowSm,
                color: T.accentLight,
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: 0.7,
                textTransform: 'uppercase',
              }}
            >
              {meal.log_date}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: isMobile ? 14 : 18 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: T.textSub,
            marginBottom: 10,
          }}
        >
          {hasFoodItems ? 'Aliments' : 'Ingrédients'}
        </div>

        {hasFoodItems ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ color: T.text, fontWeight: 700 }}>
                    {item.custom_name || item.food_name || 'Aliment'}
                  </div>
                  <div style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>
                    P {Number(item.proteins || 0).toFixed(1)} • C {Number(item.carbs || 0).toFixed(1)} • F{' '}
                    {Number(item.fats || 0).toFixed(1)}
                  </div>
                </div>

                <div style={{ color: T.textMid, fontWeight: 800 }}>
                  {Number(item.quantity || 0).toFixed(0)} {item.unit || 'g'}
                </div>
              </div>
            ))}
          </div>
        ) : recipeIngredients.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {recipeIngredients.map((ing, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ color: T.text }}>{ing.name}</div>
                <div style={{ color: T.textMid, fontWeight: 800 }}>
                  {ing.quantity} {ing.unit}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: T.textDim, fontSize: 14 }}>
            Aucun détail enregistré pour ce repas.
          </div>
        )}
      </div>
    </div>
  )
}

export default function NutritionPage() {
  const { user } = useAuth()

  const [goals, setGoals] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)

  const [foodSearch, setFoodSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState(null)
  const [quantity, setQuantity] = useState('100')
  const [addFoodLoading, setAddFoodLoading] = useState(false)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    loadNutrition()
  }, [user?.id, logDate])

  useEffect(() => {
    const delay = setTimeout(() => {
      searchFoods()
    }, 250)

    return () => clearTimeout(delay)
  }, [foodSearch, user?.id])

  async function loadNutrition() {
    if (!user?.id) return

    setLoading(true)

    const [{ data: goalsData, error: goalsErr }, { data: logsData, error: logsErr }] =
      await Promise.all([
        supabase.from('nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', logDate)
          .order('created_at', { ascending: false }),
      ])

    if (goalsErr) console.error(goalsErr)
    if (logsErr) console.error(logsErr)

    const baseLogs = logsData || []

    let itemsMap = {}

    if (baseLogs.length) {
      const logIds = baseLogs.map((log) => log.id)

      const { data: itemsData, error: itemsErr } = await supabase
        .from('nutrition_log_items')
        .select('id, nutrition_log_id, food_id, custom_name, quantity, unit, calories, proteins, carbs, fats, fiber')
        .in('nutrition_log_id', logIds)
        .order('created_at', { ascending: true })

      if (itemsErr) {
        console.error(itemsErr)
      } else {
        itemsMap = (itemsData || []).reduce((acc, item) => {
          if (!acc[item.nutrition_log_id]) acc[item.nutrition_log_id] = []
          acc[item.nutrition_log_id].push(item)
          return acc
        }, {})
      }
    }

    setGoals(
      goalsData || {
        calories: 2500,
        proteins: 180,
        carbs: 280,
        fats: 80,
        water: 2500,
      }
    )

    setLogs(
      baseLogs.map((log) => ({
        ...log,
        items: itemsMap[log.id] || [],
      }))
    )

    setLoading(false)
  }

  async function searchFoods() {
    if (!user?.id) return

    if (foodSearch.trim().length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)

    const { data, error } = await supabase
      .from('food_library')
      .select('*')
      .eq('is_active', true)
      .ilike('name', `%${foodSearch.trim()}%`)
      .order('name', { ascending: true })
      .limit(12)

    if (error) {
      console.error(error)
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    setSearchResults(data || [])
    setSearchLoading(false)
  }

  async function addFoodToLog() {
    if (!user?.id || !selectedFood) return

    const safeQuantity = Number(quantity || 0)
    if (!safeQuantity || safeQuantity <= 0) {
      alert('Entre une quantité valide.')
      return
    }

    setAddFoodLoading(true)

    const referenceQuantity = Number(selectedFood.reference_quantity || 100)
    const ratio = referenceQuantity > 0 ? safeQuantity / referenceQuantity : 0

    const calculated = {
      calories: Number(selectedFood.calories || 0) * ratio,
      proteins: Number(selectedFood.proteins || 0) * ratio,
      carbs: Number(selectedFood.carbs || 0) * ratio,
      fats: Number(selectedFood.fats || 0) * ratio,
      fiber: Number(selectedFood.fiber || 0) * ratio,
    }

    const { data: createdLog, error: logError } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id,
        log_date: logDate,
        meal_name: selectedFood.name,
        calories: Number(calculated.calories.toFixed(2)),
        proteins: Number(calculated.proteins.toFixed(2)),
        carbs: Number(calculated.carbs.toFixed(2)),
        fats: Number(calculated.fats.toFixed(2)),
        water: 0,
        recipe_details: null,
      })
      .select()
      .single()

    if (logError) {
      console.error(logError)
      alert("Impossible d'ajouter cet aliment.")
      setAddFoodLoading(false)
      return
    }

    const { error: itemError } = await supabase.from('nutrition_log_items').insert({
      nutrition_log_id: createdLog.id,
      food_id: selectedFood.id,
      custom_name: selectedFood.name,
      quantity: safeQuantity,
      unit: selectedFood.unit || 'g',
      calories: Number(calculated.calories.toFixed(2)),
      proteins: Number(calculated.proteins.toFixed(2)),
      carbs: Number(calculated.carbs.toFixed(2)),
      fats: Number(calculated.fats.toFixed(2)),
      fiber: Number(calculated.fiber.toFixed(2)),
    })

    if (itemError) {
      console.error(itemError)
      alert("Le repas a été créé, mais l'aliment n'a pas pu être détaillé.")
    }

    setSelectedFood(null)
    setFoodSearch('')
    setSearchResults([])
    setQuantity('100')
    setAddFoodLoading(false)

    await loadNutrition()
  }

  async function deleteMeal(id) {
    const confirmDelete = window.confirm('Supprimer ce repas ?')
    if (!confirmDelete) return

    const { error } = await supabase.from('nutrition_logs').delete().eq('id', id)

    if (error) {
      console.error(error)
      alert('Erreur lors de la suppression')
      return
    }

    setLogs((prev) => prev.filter((meal) => meal.id !== id))
  }

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, item) => {
        acc.calories += Number(item.calories || 0)
        acc.proteins += Number(item.proteins || 0)
        acc.carbs += Number(item.carbs || 0)
        acc.fats += Number(item.fats || 0)
        acc.water += Number(item.water || 0)
        return acc
      },
      { calories: 0, proteins: 0, carbs: 0, fats: 0, water: 0 }
    )
  }, [logs])

  const remaining = useMemo(() => {
    return {
      calories: Math.max(0, Number(goals?.calories || 0) - totals.calories),
      proteins: Math.max(0, Number(goals?.proteins || 0) - totals.proteins),
      carbs: Math.max(0, Number(goals?.carbs || 0) - totals.carbs),
      fats: Math.max(0, Number(goals?.fats || 0) - totals.fats),
      water: Math.max(0, Number(goals?.water || 0) - totals.water),
    }
  }, [goals, totals])

  return (
    <PageWrap>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: isMobile ? 22 : 28,
            padding: isMobile ? '18px 16px 20px' : '24px 24px 26px',
            background:
              'radial-gradient(circle at 16% 20%, rgba(45,255,155,0.14), transparent 28%), linear-gradient(135deg, rgba(22,27,24,0.96), rgba(10,14,12,0.98))',
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
                border: `1px solid ${T.accent + '28'}`,
                background: T.accentGlowSm,
                color: T.accentLight,
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Suivi nutrition
            </div>

            <div
              style={{
                fontSize: isMobile ? 30 : 40,
                fontWeight: 900,
                letterSpacing: isMobile ? 1 : 1.5,
                color: T.text,
                lineHeight: 1,
              }}
            >
              NUTRITION
            </div>

            <div
              style={{
                color: T.textMid,
                marginTop: 10,
                fontSize: isMobile ? 14 : 15,
                lineHeight: 1.65,
                maxWidth: 760,
              }}
            >
              Suis tes apports du jour, visualise tes objectifs et ajoute rapidement un aliment
              sans saisir les macros à la main.
            </div>

            <div
              style={{
                marginTop: 18,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'end',
                flexDirection: isMobile ? 'column' : 'row',
              }}
            >
              <div style={{ minWidth: isMobile ? '100%' : 220, width: isMobile ? '100%' : 'auto' }}>
                <Input label="Date" type="date" value={logDate} onChange={setLogDate} />
              </div>

              <Btn onClick={() => (window.location.href = '/nutrition/recettes')}>
                Ajouter une recette
              </Btn>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ color: T.textMid, padding: 16 }}>Chargement…</div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1.15fr 0.85fr',
                gap: 18,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gap: 18,
                }}
              >
                <div
                  style={{
                    padding: isMobile ? '16px 14px' : '20px 20px',
                    borderRadius: 26,
                    background:
                      'linear-gradient(135deg, rgba(18,21,19,0.96), rgba(9,12,10,0.98))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit,minmax(220px,1fr))',
                      gap: 14,
                    }}
                  >
                    <ProgressBar
                      label="Calories"
                      value={totals.calories}
                      goal={goals?.calories}
                      suffix=" kcal"
                      isMobile={isMobile}
                    />
                    <ProgressBar
                      label="Protéines"
                      value={totals.proteins}
                      goal={goals?.proteins}
                      suffix="g"
                      isMobile={isMobile}
                    />
                    <ProgressBar
                      label="Glucides"
                      value={totals.carbs}
                      goal={goals?.carbs}
                      suffix="g"
                      isMobile={isMobile}
                    />
                    <ProgressBar
                      label="Lipides"
                      value={totals.fats}
                      goal={goals?.fats}
                      suffix="g"
                      isMobile={isMobile}
                    />
                  </div>
                </div>

                <FoodQuickAddCard
                  foodSearch={foodSearch}
                  setFoodSearch={setFoodSearch}
                  searchResults={searchResults}
                  searchLoading={searchLoading}
                  selectedFood={selectedFood}
                  setSelectedFood={setSelectedFood}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  addFoodLoading={addFoodLoading}
                  onAddFood={addFoodToLog}
                  isMobile={isMobile}
                />
              </div>

              <div
                style={{
                  padding: isMobile ? '16px 14px' : '20px 20px',
                  borderRadius: 26,
                  background:
                    'radial-gradient(circle at 20% 20%, rgba(45,255,155,0.10), transparent 30%), linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
                  alignSelf: 'start',
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: T.textSub,
                    marginBottom: 12,
                  }}
                >
                  Restant aujourd’hui
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <MiniMetric label="Calories" value={`${remaining.calories} kcal`} isMobile={isMobile} />
                  <MiniMetric label="Protéines" value={`${remaining.proteins.toFixed(0)} g`} isMobile={isMobile} />
                  <MiniMetric label="Glucides" value={`${remaining.carbs.toFixed(0)} g`} isMobile={isMobile} />
                  <MiniMetric label="Lipides" value={`${remaining.fats.toFixed(0)} g`} isMobile={isMobile} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 16,
              }}
            >
              {logs.length ? (
                logs.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onDelete={deleteMeal}
                    isMobile={isMobile}
                  />
                ))
              ) : (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 22,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.02)',
                    color: T.textMid,
                  }}
                >
                  Aucun repas enregistré pour cette date.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageWrap>
  )
}
