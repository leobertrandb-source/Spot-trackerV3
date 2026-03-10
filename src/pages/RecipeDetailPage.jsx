import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Input, Badge } from '../components/UI'
import { T } from '../lib/data'

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return String(value)
  }
}

const MEAL_SLOTS = [
  'Petit-déjeuner',
  'Déjeuner',
  'Snack',
  'Dîner',
]

export default function MealPlanPage() {
  const { user } = useAuth()

  const [selectedDate, setSelectedDate] = useState(todayString())
  const [recipes, setRecipes] = useState([])
  const [plan, setPlan] = useState([])
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [selectedMealSlot, setSelectedMealSlot] = useState(MEAL_SLOTS[0])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(todayString(), index))
  }, [])

  const loadMealPlan = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const weekStart = weekDates[0]
      const weekEnd = weekDates[weekDates.length - 1]

      const [recipesRes, planRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('*')
          .order('title', { ascending: true }),

        supabase
          .from('meal_plan')
          .select('*, recipes(*)')
          .eq('user_id', user.id)
          .gte('plan_date', weekStart)
          .lte('plan_date', weekEnd)
          .order('plan_date', { ascending: true })
          .order('meal_slot', { ascending: true }),
      ])

      if (recipesRes.error) throw recipesRes.error
      if (planRes.error) throw planRes.error

      const nextRecipes = recipesRes.data || []
      const nextPlan = planRes.data || []

      setRecipes(nextRecipes)
      setPlan(nextPlan)

      if (!selectedRecipeId && nextRecipes.length > 0) {
        setSelectedRecipeId(nextRecipes[0].id)
      }
    } catch (error) {
      console.error('Erreur chargement plan repas :', error)
      setErrorMessage("Impossible de charger le plan repas.")
      setRecipes([])
      setPlan([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, weekDates, selectedRecipeId])

  useEffect(() => {
    loadMealPlan()
  }, [loadMealPlan])

  const selectedDayPlan = useMemo(() => {
    return plan.filter((item) => item.plan_date === selectedDate)
  }, [plan, selectedDate])

  const selectedDayTotals = useMemo(() => {
    return selectedDayPlan.reduce(
      (acc, item) => {
        const recipe = item.recipes || {}
        return {
          calories: acc.calories + Number(recipe.calories || 0),
          proteins: acc.proteins + Number(recipe.proteins || recipe.protein || 0),
          carbs: acc.carbs + Number(recipe.carbs || 0),
          fats: acc.fats + Number(recipe.fats || recipe.fat || 0),
        }
      },
      { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    )
  }, [selectedDayPlan])

  const groupedWeekPlan = useMemo(() => {
    return weekDates.map((date) => ({
      date,
      items: plan.filter((item) => item.plan_date === date),
    }))
  }, [plan, weekDates])

  async function addRecipeToPlan() {
    if (!user?.id || !selectedRecipeId || !selectedDate) return

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data, error } = await supabase
        .from('meal_plan')
        .insert({
          user_id: user.id,
          recipe_id: selectedRecipeId,
          plan_date: selectedDate,
          meal_slot: selectedMealSlot,
        })
        .select('*, recipes(*)')
        .single()

      if (error) throw error

      setPlan((prev) => [...prev, data].sort((a, b) => {
        const dateCompare = String(a.plan_date).localeCompare(String(b.plan_date))
        if (dateCompare !== 0) return dateCompare
        return String(a.meal_slot).localeCompare(String(b.meal_slot))
      }))

      setSuccessMessage('Recette ajoutée au plan repas.')
    } catch (error) {
      console.error('Erreur ajout plan repas :', error)
      setErrorMessage("Impossible d'ajouter cette recette au plan repas.")
    } finally {
      setSaving(false)
    }
  }

  async function removePlanItem(id) {
    const confirmed = window.confirm('Supprimer ce repas du plan ?')
    if (!confirmed) return

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error } = await supabase
        .from('meal_plan')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPlan((prev) => prev.filter((item) => item.id !== id))
      setSuccessMessage('Repas supprimé du plan.')
    } catch (error) {
      console.error('Erreur suppression plan repas :', error)
      setErrorMessage("Impossible de supprimer ce repas.")
    }
  }

  return (
    <PageWrap>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gap: 18,
        }}
      >
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
            Plan repas
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
            PLANIFIER MES REPAS
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.65,
              marginTop: 10,
            }}
          >
            Organise tes recettes sur la semaine et visualise rapidement tes apports.
          </div>
        </Card>

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

        <Card style={{ padding: 20 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px minmax(0, 1fr) 180px auto',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <Input
              label="Date"
              value={selectedDate}
              onChange={setSelectedDate}
              type="date"
            />

            <label style={{ display: 'grid', gap: 8 }}>
              <span
                style={{
                  color: T.textSub || T.textDim,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Recette
              </span>

              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
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
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.title || recipe.name || 'Recette'}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span
                style={{
                  color: T.textSub || T.textDim,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Repas
              </span>

              <select
                value={selectedMealSlot}
                onChange={(e) => setSelectedMealSlot(e.target.value)}
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

            <Btn onClick={addRecipeToPlan} disabled={saving || !selectedRecipeId}>
              {saving ? 'Ajout...' : 'Ajouter'}
            </Btn>
          </div>
        </Card>

        {loading ? (
          <Card style={{ padding: 20 }}>
            <div style={{ color: T.textDim, fontSize: 14 }}>
              Chargement du plan repas...
            </div>
          </Card>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 10,
              }}
            >
              {weekDates.map((date) => {
                const active = selectedDate === date
                const count = plan.filter((item) => item.plan_date === date).length

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    style={{
                      padding: '14px 14px',
                      borderRadius: 16,
                      border: `1px solid ${active ? T.accent + '40' : T.border}`,
                      background: active
                        ? 'rgba(45,255,155,0.10)'
                        : 'rgba(255,255,255,0.03)',
                      color: active ? T.accentLight : T.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      {formatDate(date)}
                    </div>

                    <div
                      style={{
                        color: active ? T.accentLight : T.textDim,
                        fontSize: 12,
                        marginTop: 6,
                      }}
                    >
                      {count} repas
                    </div>
                  </button>
                )
              })}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.85fr)',
                gap: 18,
                alignItems: 'start',
              }}
            >
              <Card style={{ padding: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      color: T.text,
                      fontWeight: 900,
                      fontSize: 18,
                    }}
                  >
                    Plan du {formatDate(selectedDate)}
                  </div>

                  <Badge>{selectedDayPlan.length} repas</Badge>
                </div>

                {selectedDayPlan.length === 0 ? (
                  <div style={{ color: T.textMid, fontSize: 14 }}>
                    Aucun repas planifié pour cette date.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {selectedDayPlan.map((item) => {
                      const recipe = item.recipes || {}
                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 18,
                            border: `1px solid ${T.border}`,
                            background: 'rgba(255,255,255,0.03)',
                            display: 'grid',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              alignItems: 'flex-start',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color: T.text,
                                  fontWeight: 900,
                                  fontSize: 15,
                                }}
                              >
                                {recipe.title || recipe.name || 'Recette'}
                              </div>

                              <div
                                style={{
                                  color: T.textDim,
                                  fontSize: 12,
                                  marginTop: 4,
                                }}
                              >
                                {item.meal_slot || 'Repas'}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removePlanItem(item.id)}
                              style={{
                                height: 36,
                                borderRadius: 12,
                                border: `1px solid ${T.border}`,
                                background: 'transparent',
                                color: T.danger,
                                cursor: 'pointer',
                                padding: '0 12px',
                                fontWeight: 800,
                              }}
                            >
                              Supprimer
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {recipe.calories ? <Badge>{recipe.calories} kcal</Badge> : null}
                            {(recipe.proteins || recipe.protein) ? (
                              <Badge color={T.blue || '#5BA7FF'}>
                                {recipe.proteins || recipe.protein} g prot
                              </Badge>
                            ) : null}
                            {recipe.carbs ? (
                              <Badge color={T.orange || '#FFB454'}>
                                {recipe.carbs} g gluc
                              </Badge>
                            ) : null}
                            {(recipe.fats || recipe.fat) ? (
                              <Badge>{recipe.fats || recipe.fat} g lip</Badge>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
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
                  Totaux du jour
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${T.border}`,
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
                      Calories
                    </div>
                    <div
                      style={{
                        color: T.text,
                        fontSize: 22,
                        fontWeight: 900,
                        marginTop: 8,
                      }}
                    >
                      {Math.round(selectedDayTotals.calories)} kcal
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge>{Math.round(selectedDayTotals.proteins)} g prot</Badge>
                    <Badge color={T.blue || '#5BA7FF'}>
                      {Math.round(selectedDayTotals.carbs)} g gluc
                    </Badge>
                    <Badge color={T.orange || '#FFB454'}>
                      {Math.round(selectedDayTotals.fats)} g lip
                    </Badge>
                  </div>
                </div>
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
                Vue semaine
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {groupedWeekPlan.map((day) => (
                  <div
                    key={day.date}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                        marginBottom: day.items.length ? 10 : 0,
                      }}
                    >
                      <div
                        style={{
                          color: T.text,
                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        {formatDate(day.date)}
                      </div>

                      <div
                        style={{
                          color: T.textDim,
                          fontSize: 12,
                        }}
                      >
                        {day.items.length} repas
                      </div>
                    </div>

                    {day.items.length ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {day.items.map((item) => (
                          <Badge key={item.id}>
                            {(item.meal_slot || 'Repas') + ' • ' + (item.recipes?.title || item.recipes?.name || 'Recette')}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: T.textDim, fontSize: 13 }}>
                        Aucun repas planifié.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </PageWrap>
  )
}
