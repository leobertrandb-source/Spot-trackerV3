import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Badge } from '../components/UI'
import { T, SEANCE_ICONS } from '../lib/data'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function goalLabel(goalType) {
  const value = String(goalType || '').toLowerCase()

  if (value.includes('body')) return 'Prise de masse'
  if (value.includes('perte')) return 'Perte de poids'
  if (value.includes('athlet')) return 'Performance athlétique'
  return goalType || 'Objectif non défini'
}

function getMacroCalories({ protein, carbs, fats }) {
  return protein * 4 + carbs * 4 + fats * 9
}

function recipeMatchesGoal(recipe, goalType) {
  const goal = String(goalType || '').toLowerCase()
  const title = String(recipe?.title || recipe?.name || '').toLowerCase()
  const tags = String(recipe?.tags || '').toLowerCase()
  const combined = `${title} ${tags}`

  if (goal.includes('perte')) {
    return (
      combined.includes('light') ||
      combined.includes('lean') ||
      combined.includes('salade') ||
      combined.includes('healthy')
    )
  }

  if (goal.includes('body')) {
    return (
      combined.includes('proté') ||
      combined.includes('protein') ||
      combined.includes('riz') ||
      combined.includes('poulet') ||
      combined.includes('beef')
    )
  }

  if (goal.includes('athlet')) {
    return (
      combined.includes('énergie') ||
      combined.includes('energy') ||
      combined.includes('pâtes') ||
      combined.includes('riz') ||
      combined.includes('avoine')
    )
  }

  return true
}

export default function GoalHomePage() {
  const { user, profile } = useAuth()

  const [assignment, setAssignment] = useState(null)
  const [nutrition, setNutrition] = useState(null)
  const [recipeOfDay, setRecipeOfDay] = useState(null)
  const [recentSessions, setRecentSessions] = useState([])

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const today = useMemo(() => todayString(), [])

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const [
        assignmentRes,
        profileRes,
        recipesRes,
        sessionsRes,
      ] = await Promise.all([
        supabase
          .from('assignments')
          .select('*, programs(name, seance_type, program_exercises(*))')
          .eq('athlete_id', user.id)
          .eq('assigned_date', today)
          .order('created_at', { ascending: false })
          .limit(1),

        supabase
          .from('profiles')
          .select('calories_target, protein_target, carbs_target, fats_target, goal_type')
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from('recipes')
          .select('*')
          .limit(30),

        supabase
          .from('sessions')
          .select('id, date, seance_type')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(5),
      ])

      if (assignmentRes.error) throw assignmentRes.error
      if (profileRes.error) throw profileRes.error
      if (recipesRes.error) throw recipesRes.error
      if (sessionsRes.error) throw sessionsRes.error

      const currentAssignment = assignmentRes.data?.[0] || null
      const nutritionData = profileRes.data || null
      const allRecipes = recipesRes.data || []
      const sessionsData = sessionsRes.data || []

      const matchedRecipe =
        allRecipes.find((recipe) =>
          recipeMatchesGoal(recipe, nutritionData?.goal_type || profile?.goal_type)
        ) || allRecipes[0] || null

      setAssignment(currentAssignment)
      setNutrition(nutritionData)
      setRecipeOfDay(matchedRecipe)
      setRecentSessions(sessionsData)
    } catch (error) {
      console.error('Erreur dashboard athlète :', error)
      setErrorMessage("Impossible de charger le dashboard du jour.")
      setAssignment(null)
      setNutrition(null)
      setRecipeOfDay(null)
      setRecentSessions([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, today, profile?.goal_type])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const nutritionSummary = useMemo(() => {
    const protein = Number(nutrition?.protein_target || 0)
    const carbs = Number(nutrition?.carbs_target || 0)
    const fats = Number(nutrition?.fats_target || 0)
    const calories = Number(nutrition?.calories_target || 0)
    const calculated = getMacroCalories({ protein, carbs, fats })

    return {
      protein,
      carbs,
      fats,
      calories: calories || calculated,
    }
  }, [nutrition])

  const sessionSummary = useMemo(() => {
    const exercises = assignment?.programs?.program_exercises || []

    return {
      name: assignment?.programs?.name || null,
      type: assignment?.programs?.seance_type || null,
      count: exercises.length,
    }
  }, [assignment])

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
            Dashboard du jour
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
            MON ESPACE
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.7,
              marginTop: 10,
            }}
          >
            Bienvenue {profile?.full_name || 'athlète'}. Voici ce que tu dois faire aujourd’hui.
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
            <div
              style={{
                color: '#FFB3B3',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              {errorMessage}
            </div>
          </Card>
        ) : null}

        {loading ? (
          <Card style={{ padding: 20 }}>
            <div style={{ color: T.textDim, fontSize: 14 }}>
              Chargement du dashboard...
            </div>
          </Card>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              <Card style={{ padding: 18 }}>
                <div
                  style={{
                    color: T.textSub,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  Objectif actuel
                </div>

                <div
                  style={{
                    color: T.text,
                    fontWeight: 900,
                    fontSize: 22,
                    marginTop: 8,
                  }}
                >
                  {goalLabel(profile?.goal_type)}
                </div>
              </Card>

              <Card style={{ padding: 18 }}>
                <div
                  style={{
                    color: T.textSub,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  Séance aujourd'hui
                </div>

                <div
                  style={{
                    color: T.text,
                    fontWeight: 900,
                    fontSize: 22,
                    marginTop: 8,
                  }}
                >
                  {sessionSummary.name ? 'Oui' : 'Libre'}
                </div>
              </Card>

              <Card style={{ padding: 18 }}>
                <div
                  style={{
                    color: T.textSub,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  Calories cible
                </div>

                <div
                  style={{
                    color: T.text,
                    fontWeight: 900,
                    fontSize: 22,
                    marginTop: 8,
                  }}
                >
                  {nutritionSummary.calories
                    ? `${Math.round(nutritionSummary.calories)} kcal`
                    : '—'}
                </div>
              </Card>

              <Card style={{ padding: 18 }}>
                <div
                  style={{
                    color: T.textSub,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  Dernières séances
                </div>

                <div
                  style={{
                    color: T.text,
                    fontWeight: 900,
                    fontSize: 22,
                    marginTop: 8,
                  }}
                >
                  {recentSessions.length}
                </div>
              </Card>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.9fr)',
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
                    flexWrap: 'wrap',
                    alignItems: 'center',
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
                    Séance du jour
                  </div>

                  {sessionSummary.type ? (
                    <Badge>
                      {(SEANCE_ICONS[sessionSummary.type] || '💪') + ' ' + sessionSummary.type}
                    </Badge>
                  ) : (
                    <Badge color={T.blue}>Séance libre</Badge>
                  )}
                </div>

                {sessionSummary.name ? (
                  <>
                    <div
                      style={{
                        color: T.text,
                        fontWeight: 800,
                        fontSize: 18,
                      }}
                    >
                      {sessionSummary.name}
                    </div>

                    <div
                      style={{
                        color: T.textMid,
                        fontSize: 14,
                        marginTop: 8,
                        lineHeight: 1.65,
                      }}
                    >
                      {sessionSummary.count} exercice{sessionSummary.count > 1 ? 's' : ''} prévu
                      {sessionSummary.count > 1 ? 's' : ''} aujourd’hui.
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                        marginTop: 18,
                      }}
                    >
                      <Link to="/entrainement/aujourdhui" style={{ textDecoration: 'none' }}>
                        <Btn>Commencer la séance</Btn>
                      </Link>

                      <Link to="/entrainement/libre" style={{ textDecoration: 'none' }}>
                        <Btn variant="secondary">Passer en séance libre</Btn>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        color: T.text,
                        fontWeight: 800,
                        fontSize: 18,
                      }}
                    >
                      Aucun programme assigné aujourd’hui
                    </div>

                    <div
                      style={{
                        color: T.textMid,
                        fontSize: 14,
                        marginTop: 8,
                        lineHeight: 1.65,
                      }}
                    >
                      Tu peux lancer une séance libre et enregistrer ton entraînement.
                    </div>

                    <div style={{ marginTop: 18 }}>
                      <Link to="/entrainement/libre" style={{ textDecoration: 'none' }}>
                        <Btn>Démarrer une séance libre</Btn>
                      </Link>
                    </div>
                  </>
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
                  Nutrition du jour
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      fontWeight: 800,
                    }}
                  >
                    {nutritionSummary.calories
                      ? `${Math.round(nutritionSummary.calories)} kcal`
                      : 'Objectif calories non défini'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Badge>{nutritionSummary.protein || 0} g protéines</Badge>
                    <Badge color={T.blue}>{nutritionSummary.carbs || 0} g glucides</Badge>
                    <Badge color={T.orange}>{nutritionSummary.fats || 0} g lipides</Badge>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <Link to="/nutrition/macros" style={{ textDecoration: 'none' }}>
                      <Btn variant="secondary">Voir la nutrition</Btn>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: 18,
                alignItems: 'start',
              }}
            >
              <Card style={{ padding: 20 }}>
                <div
                  style={{
                    color: T.text,
                    fontWeight: 900,
                    fontSize: 18,
                    marginBottom: 14,
                  }}
                >
                  Recette suggérée du jour
                </div>

                {recipeOfDay ? (
                  <>
                    <div
                      style={{
                        color: T.text,
                        fontWeight: 800,
                        fontSize: 18,
                      }}
                    >
                      {recipeOfDay.title || recipeOfDay.name || 'Recette'}
                    </div>

                    {recipeOfDay.description ? (
                      <div
                        style={{
                          color: T.textMid,
                          fontSize: 14,
                          lineHeight: 1.65,
                          marginTop: 8,
                        }}
                      >
                        {recipeOfDay.description}
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                        marginTop: 16,
                      }}
                    >
                      {recipeOfDay.calories ? <Badge>{recipeOfDay.calories} kcal</Badge> : null}
                      {recipeOfDay.protein ? <Badge>{recipeOfDay.protein} g prot</Badge> : null}
                    </div>

                    <div style={{ marginTop: 18 }}>
                      <Link to="/nutrition/recettes" style={{ textDecoration: 'none' }}>
                        <Btn variant="secondary">Voir les recettes</Btn>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      color: T.textMid,
                      fontSize: 14,
                    }}
                  >
                    Aucune recette disponible pour le moment.
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
                  Progression rapide
                </div>

                {recentSessions.length === 0 ? (
                  <div
                    style={{
                      color: T.textMid,
                      fontSize: 14,
                    }}
                  >
                    Aucune séance récente.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {recentSessions.slice(0, 4).map((session) => (
                      <div
                        key={session.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${T.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color: T.text,
                              fontWeight: 800,
                              fontSize: 14,
                            }}
                          >
                            {session.seance_type || 'Séance'}
                          </div>

                          <div
                            style={{
                              color: T.textDim,
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            {session.date}
                          </div>
                        </div>

                        <div style={{ fontSize: 18 }}>
                          {SEANCE_ICONS[session.seance_type] || '💪'}
                        </div>
                      </div>
                    ))}

                    <div style={{ marginTop: 8 }}>
                      <Link to="/progression" style={{ textDecoration: 'none' }}>
                        <Btn variant="secondary">Voir ma progression</Btn>
                      </Link>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </PageWrap>
  )
}
