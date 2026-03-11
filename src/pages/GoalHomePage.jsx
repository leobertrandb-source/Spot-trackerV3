import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Badge, StatCard } from '../components/UI'
import { T, SEANCE_ICONS } from '../lib/data'

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return String(value)
  }
}

function goalLabel(goalType) {
  const value = String(goalType || '').toLowerCase()

  if (value.includes('body')) return 'Prise de masse'
  if (value.includes('perte')) return 'Perte de poids'
  if (value.includes('athlet')) return 'Performance athlétique'

  return goalType || 'Objectif non défini'
}

function sumNutrition(logs = []) {
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

function getUiAsset(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('ui-assets').getPublicUrl(path)
  return data?.publicUrl || ''
}

function getRecipeImage(recipe) {
  if (!recipe) return ''

  if (recipe.image_url) return recipe.image_url

  if (recipe.image_path) {
    const bucket = recipe.image_bucket || 'recipe-images'
    const { data } = supabase.storage.from(bucket).getPublicUrl(recipe.image_path)
    return data?.publicUrl || ''
  }

  return ''
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

function VisualHero({ title, imageUrl, badge, minHeight = 320, children }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          minHeight,
          background: imageUrl
            ? `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.80)), url("${imageUrl}") center/cover no-repeat`
            : 'linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
        }}
      >
        <div
          style={{
            minHeight,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: imageUrl
              ? 'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.82))'
              : 'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{title}</div>
            {badge || null}
          </div>

          <div>{children}</div>
        </div>
      </div>
    </Card>
  )
}

export default function GoalHomePage() {
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [warningMessage, setWarningMessage] = useState('')

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
    setWarningMessage('')

    const results = await Promise.allSettled([
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
        .limit(8),

      supabase
        .from('recipes')
        .select('*')
        .limit(50),
    ])

    const [assignmentRes, goalsRes, logsRes, sessionsRes, recipesRes] = results
    let hasError = false

    if (assignmentRes.status === 'fulfilled' && !assignmentRes.value.error) {
      setTodayAssignment(assignmentRes.value.data?.[0] || null)
    } else {
      setTodayAssignment(null)
      hasError = true
    }

    if (goalsRes.status === 'fulfilled' && !goalsRes.value.error) {
      setNutritionGoals(goalsRes.value.data || null)
    } else {
      setNutritionGoals(null)
      hasError = true
    }

    if (logsRes.status === 'fulfilled' && !logsRes.value.error) {
      setTodayNutritionLogs(logsRes.value.data || [])
    } else {
      setTodayNutritionLogs([])
      hasError = true
    }

    if (sessionsRes.status === 'fulfilled' && !sessionsRes.value.error) {
      setRecentSessions(sessionsRes.value.data || [])
    } else {
      setRecentSessions([])
      hasError = true
    }

    if (recipesRes.status === 'fulfilled' && !recipesRes.value.error) {
      setRecipes(recipesRes.value.data || [])
    } else {
      setRecipes([])
      hasError = true
    }

    if (hasError) {
      setWarningMessage("Certaines données n'ont pas pu être chargées.")
    }

    setLoading(false)
  }, [user?.id, today])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const nutritionTotals = useMemo(
    () => sumNutrition(todayNutritionLogs),
    [todayNutritionLogs]
  )

  const nutritionSummary = useMemo(() => {
    const goals = nutritionGoals || {}
    return {
      caloriesGoal: Number(goals.calories || goals.calories_target || 0) || 0,
      proteinsGoal: Number(goals.proteins || goals.protein_target || 0) || 0,
      carbsGoal: Number(goals.carbs || goals.carbs_target || 0) || 0,
      fatsGoal: Number(goals.fats || goals.fats_target || 0) || 0,
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

  const suggestedRecipeImage = useMemo(
    () => getRecipeImage(suggestedRecipe),
    [suggestedRecipe]
  )

  const workoutImage = useMemo(() => getUiAsset('goalHome/workout.jpg'), [])
  const nutritionImage = useMemo(() => getUiAsset('goalHome/nutrition.jpg'), [])
  const progressImage = useMemo(() => getUiAsset('goalHome/progress.jpg'), [])

  const nutritionCompletion = useMemo(() => {
    const goal = nutritionSummary.caloriesGoal || 0
    if (!goal) return 0
    return Math.max(0, Math.min(100, Math.round((nutritionTotals.calories / goal) * 100)))
  }, [nutritionTotals.calories, nutritionSummary.caloriesGoal])

  const lastSession = recentSessions[0] || null

  const progressionInsight = useMemo(() => {
    if (!recentSessions.length) {
      return {
        title: 'Aucune séance récente',
        subtitle: 'Commence une séance pour faire vivre ton suivi.',
      }
    }

    if (recentSessions.length === 1) {
      return {
        title: 'Une séance récente enregistrée',
        subtitle: `Dernière activité le ${formatDate(recentSessions[0].date)}.`,
      }
    }

    return {
      title: `${recentSessions.length} séances récentes`,
      subtitle: `Dernière séance le ${formatDate(recentSessions[0].date)}.`,
    }
  }, [recentSessions])

  return (
    <PageWrap>
      <div style={{ display: 'grid', gap: 18 }}>
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
              fontSize: 32,
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

        {warningMessage ? (
          <Card
            style={{
              padding: 16,
              border: '1px solid rgba(255,180,84,0.22)',
              background: 'rgba(255,180,84,0.06)',
            }}
          >
            <div style={{ color: '#FFD59A', fontWeight: 800, fontSize: 14 }}>
              {warningMessage}
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
              <StatCard
                label="Objectif actuel"
                value={goalLabel(profile?.goal_type)}
                icon="🎯"
                accent
              />

              <StatCard
                label="Séance aujourd'hui"
                value={sessionSummary.exists ? sessionSummary.name || 'Oui' : 'Libre'}
                icon={SEANCE_ICONS[sessionSummary.type] || '🏋️'}
              />

              <StatCard
                label="Calories du jour"
                value={`${Math.round(nutritionTotals.calories)} kcal`}
                icon="🔥"
              />

              <StatCard
                label="Dernière séance"
                value={lastSession ? formatDate(lastSession.date) : 'Aucune'}
                icon="📈"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 18,
              }}
            >
              <VisualHero
                title="Séance du jour"
                imageUrl={workoutImage}
                badge={
                  sessionSummary.type ? (
                    <Badge>
                      {(SEANCE_ICONS[sessionSummary.type] || '💪') + ' ' + sessionSummary.type}
                    </Badge>
                  ) : (
                    <Badge color={T.blue || '#5BA7FF'}>Séance libre</Badge>
                  )
                }
              >
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 28, lineHeight: 1.05 }}>
                  {sessionSummary.exists ? sessionSummary.name : 'Aucun programme assigné'}
                </div>

                <div
                  style={{
                    color: 'rgba(255,255,255,0.86)',
                    fontSize: 14,
                    lineHeight: 1.65,
                    marginTop: 10,
                    maxWidth: 560,
                  }}
                >
                  {sessionSummary.exists
                    ? `${sessionSummary.exerciseCount} exercice${sessionSummary.exerciseCount > 1 ? 's' : ''} prévus aujourd’hui avec suivi intelligent.`
                    : 'Aucun programme prévu aujourd’hui. Tu peux lancer une séance libre avec le coach intelligent actif sur tes exercices.'}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  <Link
                    to={sessionSummary.exists ? '/entrainement/aujourdhui' : '/entrainement/libre'}
                    style={{ textDecoration: 'none' }}
                  >
                    <Btn>
                      {sessionSummary.exists ? 'Commencer la séance' : 'Démarrer une séance libre'}
                    </Btn>
                  </Link>

                  <Link to="/progression" style={{ textDecoration: 'none' }}>
                    <Btn variant="secondary">Voir ma progression</Btn>
                  </Link>
                </div>
              </VisualHero>

              <VisualHero
                title="Nutrition du jour"
                imageUrl={nutritionImage}
                badge={<Badge color={T.blue || '#5BA7FF'}>{nutritionCompletion}% atteint</Badge>}
              >
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 28, lineHeight: 1.05 }}>
                  {Math.round(nutritionTotals.calories)} / {Math.round(nutritionSummary.caloriesGoal || 0)} kcal
                </div>

                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.14)',
                    overflow: 'hidden',
                    marginTop: 14,
                    maxWidth: 420,
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

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  <Badge>{Math.round(nutritionTotals.proteins)} g prot</Badge>
                  <Badge color={T.blue || '#5BA7FF'}>{Math.round(nutritionTotals.carbs)} g gluc</Badge>
                  <Badge color={T.orange || '#FFB454'}>{Math.round(nutritionTotals.fats)} g lip</Badge>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  <Link to="/nutrition/macros" style={{ textDecoration: 'none' }}>
                    <Btn>Voir la nutrition</Btn>
                  </Link>

                  <Link to="/nutrition/plan" style={{ textDecoration: 'none' }}>
                    <Btn variant="secondary">Plan repas</Btn>
                  </Link>
                </div>
              </VisualHero>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 18,
              }}
            >
              <VisualHero
                title="Recette suggérée du jour"
                imageUrl={suggestedRecipeImage}
                badge={suggestedRecipe?.calories ? <Badge>{suggestedRecipe.calories} kcal</Badge> : null}
                minHeight={340}
              >
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 28, lineHeight: 1.05 }}>
                  {suggestedRecipe?.title || suggestedRecipe?.name || 'Aucune recette disponible'}
                </div>

                <div
                  style={{
                    color: 'rgba(255,255,255,0.86)',
                    fontSize: 14,
                    lineHeight: 1.65,
                    marginTop: 10,
                    maxWidth: 560,
                  }}
                >
                  {suggestedRecipe?.description ||
                    'Une suggestion adaptée à ton objectif pour nourrir ta progression.'}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  <Link to="/nutrition/recettes" style={{ textDecoration: 'none' }}>
                    <Btn>Voir les recettes</Btn>
                  </Link>

                  {suggestedRecipe?.id ? (
                    <Link
                      to={`/nutrition/recette/${suggestedRecipe.id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <Btn variant="secondary">Ouvrir</Btn>
                    </Link>
                  ) : null}
                </div>
              </VisualHero>

              <VisualHero
                title="Progression rapide"
                imageUrl={progressImage}
                badge={<Badge color={T.orange || '#FFB454'}>{recentSessions.length} séances</Badge>}
                minHeight={340}
              >
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 24, lineHeight: 1.1 }}>
                  {progressionInsight.title}
                </div>

                <div
                  style={{
                    color: 'rgba(255,255,255,0.82)',
                    fontSize: 14,
                    lineHeight: 1.65,
                    marginTop: 10,
                  }}
                >
                  {progressionInsight.subtitle}
                </div>

                {recentSessions.length ? (
                  <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
                    {recentSessions.slice(0, 3).map((session) => (
                      <div
                        key={session.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>
                            {session.seance_type || 'Séance'}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.70)', fontSize: 12, marginTop: 4 }}>
                            {formatDate(session.date)}
                          </div>
                        </div>

                        <div style={{ fontSize: 18 }}>
                          {SEANCE_ICONS[session.seance_type] || '💪'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  <Link to="/progression" style={{ textDecoration: 'none' }}>
                    <Btn>Voir ma progression</Btn>
                  </Link>

                  <Link to="/entrainement/libre" style={{ textDecoration: 'none' }}>
                    <Btn variant="secondary">Nouvelle séance</Btn>
                  </Link>
                </div>
              </VisualHero>
            </div>
          </>
        )}
      </div>
    </PageWrap>
  )
}
