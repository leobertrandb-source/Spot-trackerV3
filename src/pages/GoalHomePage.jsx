import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { resolveImageUrl, getGoalHomeImage } from '../lib/media'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Badge } from '../components/UI'
import { T, SEANCE_ICONS } from '../lib/data'

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function goalLabel(goalType) {
  const value = String(goalType || '').toLowerCase()
  if (value.includes('body')) return 'Prise de masse'
  if (value.includes('perte')) return 'Perte de poids'
  if (value.includes('athlet')) return 'Performance athlétique'
  return goalType || 'Objectif non défini'
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return String(value)
  }
}

function sumMacros(logs = []) {
  return logs.reduce(
    (acc, log) => ({
      calories: acc.calories + Number(log.calories || 0),
      proteins: acc.proteins + Number(log.proteins || 0),
      carbs: acc.carbs + Number(log.carbs || 0),
      fats: acc.fats + Number(log.fats || 0),
      water: acc.water + Number(log.water || 0),
    }),
    { calories: 0, proteins: 0, carbs: 0, fats: 0, water: 0 }
  )
}

function pickSuggestedRecipe(recipes = [], goalType) {
  if (!recipes.length) return null

  const goal = String(goalType || '').toLowerCase()

  const scoreRecipe = (recipe) => {
    const title = String(recipe.title || recipe.name || '').toLowerCase()
    const description = String(recipe.description || '').toLowerCase()
    const tags = String(recipe.tags || '').toLowerCase()
    const text = `${title} ${description} ${tags}`

    let score = 0

    if (goal.includes('perte')) {
      if (text.includes('light')) score += 2
      if (text.includes('salade')) score += 2
      if (text.includes('healthy')) score += 2
      if (Number(recipe.calories || 0) <= 550 && Number(recipe.calories || 0) > 0) score += 2
    }

    if (goal.includes('body')) {
      if (text.includes('protein')) score += 2
      if (text.includes('proté')) score += 2
      if (text.includes('poulet')) score += 2
      if (text.includes('riz')) score += 1
      if (Number(recipe.protein || recipe.proteins || 0) >= 25) score += 2
    }

    if (goal.includes('athlet')) {
      if (text.includes('energy')) score += 2
      if (text.includes('énergie')) score += 2
      if (text.includes('avoine')) score += 2
      if (text.includes('pâtes')) score += 1
      if (text.includes('riz')) score += 1
    }

    score += Math.min(2, Number(recipe.protein || recipe.proteins || 0) / 20)
    return score
  }

  return [...recipes].sort((a, b) => scoreRecipe(b) - scoreRecipe(a))[0]
}

function VisualCard({ imageUrl, children }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          minHeight: 300,
          background: imageUrl
            ? `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.78)), url("${imageUrl}") center/cover no-repeat`
            : 'linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
        }}
      >
        <div
          style={{
            minHeight: 300,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: imageUrl
              ? 'linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.82))'
              : 'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%)',
          }}
        >
          {children}
        </div>
      </div>
    </Card>
  )
}

export default function GoalHomePage() {
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [todayAssignment, setTodayAssignment] = useState(null)
  const [nutritionGoals, setNutritionGoals] = useState(null)
  const [todayNutritionLogs, setTodayNutritionLogs] = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [recipes, setRecipes] = useState([])

  const today = useMemo(() => todayString(), [])

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const [assignmentRes, goalsRes, logsRes, sessionsRes, recipesRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('*, programs(name, seance_type, program_exercises(*))')
          .eq('athlete_id', user.id)
          .eq('assigned_date', today)
          .order('created_at', { ascending: false })
          .limit(1),

        supabase
          .from('nutrition_goals')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),

        supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .order('created_at'),

        supabase
          .from('sessions')
          .select('id, date, seance_type, notes')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(5),

        supabase
          .from('recipes')
          .select('*')
          .limit(40),
      ])

      if (assignmentRes.error) throw assignmentRes.error
      if (goalsRes.error) throw goalsRes.error
      if (logsRes.error) throw logsRes.error
      if (sessionsRes.error) throw sessionsRes.error
      if (recipesRes.error) throw recipesRes.error

      setTodayAssignment(assignmentRes.data?.[0] || null)
      setNutritionGoals(goalsRes.data || null)
      setTodayNutritionLogs(logsRes.data || [])
      setRecentSessions(sessionsRes.data || [])
      setRecipes(recipesRes.data || [])
    } catch (error) {
      console.error('Erreur chargement dashboard athlète :', error)
      setErrorMessage("Impossible de charger ton espace du jour.")
      setTodayAssignment(null)
      setNutritionGoals(null)
      setTodayNutritionLogs([])
      setRecentSessions([])
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, today])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const nutritionTotals = useMemo(() => sumMacros(todayNutritionLogs), [todayNutritionLogs])

  const nutritionSummary = useMemo(() => {
    const goals = nutritionGoals || {}
    return {
      caloriesGoal: Number(goals.calories || goals.calories_target || 0) || 0,
    }
  }, [nutritionGoals])

  const sessionSummary = useMemo(() => {
    const program = todayAssignment?.programs || null
    const exercises = program?.program_exercises || []
    return {
      exists: !!program,
      name: program?.name || null,
      type: program?.seance_type || null,
      exerciseCount: exercises.length,
    }
  }, [todayAssignment])

  const suggestedRecipe = useMemo(
    () => pickSuggestedRecipe(recipes, profile?.goal_type),
    [recipes, profile?.goal_type]
  )

  const suggestedRecipeImage = useMemo(() => {
    if (!suggestedRecipe) return ''
    return resolveImageUrl({
      imageUrl: suggestedRecipe.image_url,
      imagePath: suggestedRecipe.image_path,
      imageBucket: suggestedRecipe.image_bucket || 'recipe-images',
    })
  }, [suggestedRecipe])

  const workoutImage = useMemo(() => getGoalHomeImage('workout'), [])
  const nutritionImage = useMemo(() => getGoalHomeImage('nutrition'), [])
  const progressImage = useMemo(() => getGoalHomeImage('progress'), [])

  const nutritionCompletion = useMemo(() => {
    const goal = nutritionSummary.caloriesGoal || 0
    if (!goal) return 0
    return Math.min(100, Math.round((nutritionTotals.calories / goal) * 100))
  }, [nutritionTotals.calories, nutritionSummary.caloriesGoal])

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
            Bienvenue {profile?.full_name || 'athlète'}. Voici ton plan de la journée.
          </div>
        </Card>

        {errorMessage ? (
          <Card style={{ padding: 16 }}>
            <div style={{ color: '#FFB3B3', fontWeight: 800, fontSize: 14 }}>
              {errorMessage}
            </div>
          </Card>
        ) : null}

        {loading ? (
          <Card style={{ padding: 20 }}>
            <div style={{ color: T.textDim, fontSize: 14 }}>Chargement du dashboard...</div>
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
                <div style={{ color: T.textSub, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  Objectif actuel
                </div>
                <div style={{ color: T.text, fontWeight: 900, fontSize: 22, marginTop: 8 }}>
                  {goalLabel(profile?.goal_type)}
                </div>
              </Card>

              <Card style={{ padding: 18 }}>
                <div style={{ color: T.textSub, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  Séance aujourd'hui
                </div>
                <div style={{ color: T.text, fontWeight: 900, fontSize: 22, marginTop: 8 }}>
                  {sessionSummary.exists ? 'Oui' : 'Libre'}
                </div>
              </Card>

              <Card style={{ padding: 18 }}>
                <div style={{ color: T.textSub, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  Calories du jour
                </div>
                <div style={{ color: T.text, fontWeight: 900, fontSize: 22, marginTop: 8 }}>
                  {Math.round(nutritionTotals.calories)} kcal
                </div>
              </Card>

              <Card style={{ padding: 18 }}>
                <div style={{ color: T.textSub, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  Dernière séance
                </div>
                <div style={{ color: T.text, fontWeight: 900, fontSize: 18, marginTop: 8 }}>
                  {recentSessions[0] ? formatDate(recentSessions[0].date) : 'Aucune'}
                </div>
              </Card>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.85fr)',
                gap: 18,
              }}
            >
              <VisualCard imageUrl={workoutImage}>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>
                  Séance du jour
                </div>

                <div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {sessionSummary.type ? (
                      <Badge>
                        {(SEANCE_ICONS[sessionSummary.type] || '💪') + ' ' + sessionSummary.type}
                      </Badge>
                    ) : (
                      <Badge color={T.blue || '#5BA7FF'}>Séance libre</Badge>
                    )}
                  </div>

                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 28, lineHeight: 1.05 }}>
                    {sessionSummary.exists ? sessionSummary.name : 'Aucun programme assigné'}
                  </div>

                  <div
                    style={{
                      color: 'rgba(255,255,255,0.86)',
                      fontSize: 14,
                      lineHeight: 1.65,
                      marginTop: 10,
                    }}
                  >
                    {sessionSummary.exists
                      ? `${sessionSummary.exerciseCount} exercice${sessionSummary.exerciseCount > 1 ? 's' : ''} prévu${sessionSummary.exerciseCount > 1 ? 's' : ''} aujourd’hui.`
                      : 'Tu peux lancer une séance libre et enregistrer ton entraînement.'}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <Link to={sessionSummary.exists ? '/entrainement/aujourdhui' : '/entrainement/libre'} style={{ textDecoration: 'none' }}>
                      <Btn>{sessionSummary.exists ? 'Commencer la séance' : 'Démarrer une séance libre'}</Btn>
                    </Link>
                  </div>
                </div>
              </VisualCard>

              <VisualCard imageUrl={nutritionImage}>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>
                  Nutrition du jour
                </div>

                <div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge>
                      {Math.round(nutritionTotals.calories)} / {Math.round(nutritionSummary.caloriesGoal || 0)} kcal
                    </Badge>
                    <Badge color={T.blue || '#5BA7FF'}>{nutritionCompletion}% atteint</Badge>
                  </div>

                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.14)',
                      overflow: 'hidden',
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${nutritionCompletion}%`,
                        background: T.accent,
                      }}
                    />
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <Link to="/nutrition/macros" style={{ textDecoration: 'none' }}>
                      <Btn variant="secondary">Voir la nutrition</Btn>
                    </Link>
                  </div>
                </div>
              </VisualCard>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: 18,
              }}
            >
              <VisualCard imageUrl={suggestedRecipeImage}>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>
                  Recette suggérée du jour
                </div>

                <div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 28, lineHeight: 1.05 }}>
                    {suggestedRecipe?.title || suggestedRecipe?.name || 'Aucune recette'}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <Link to="/nutrition/recettes" style={{ textDecoration: 'none' }}>
                      <Btn variant="secondary">Voir les recettes</Btn>
                    </Link>
                  </div>
                </div>
              </VisualCard>

              <VisualCard imageUrl={progressImage}>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>
                  Progression rapide
                </div>

                <div>
                  <div style={{ marginTop: 16 }}>
                    <Link to="/progression" style={{ textDecoration: 'none' }}>
                      <Btn variant="secondary">Voir ma progression</Btn>
                    </Link>
                  </div>
                </div>
              </VisualCard>
            </div>
          </>
        )}
      </div>
    </PageWrap>
  )
}
