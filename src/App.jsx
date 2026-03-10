import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthContext'
import { DirtyProvider } from './components/DirtyContext'
import { Grain } from './components/UI'

import AuthPage from './pages/AuthPage'
import InviteAcceptPage from './pages/InviteAcceptPage'

import SaisiePage from './pages/SaisiePage'
import ProgressionPage from './pages/ProgressionPage'
import CoachPage from './pages/CoachPage'
import CoachClientsPage from './pages/CoachClientsPage'
import CoachClientDetailPage from './pages/CoachClientDetailPage'
import AujourdhuiPage from './pages/AujourdhuiPage'
import NutritionPage from './pages/NutritionPage'
import ProgramBuilderPage from './pages/ProgramBuilderPage'
import RecipesPage from './pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import MealPlanPage from './pages/MealPlanPage'

import GoalSelectionPage from './pages/GoalSelectionPage'
import GoalHomePage from './pages/GoalHomePage'
import ProgrammeBodybuildingPage from './pages/ProgrammeBodybuildingPage'
import ProgrammePerteDePoidsPage from './pages/ProgrammePerteDePoidsPage'
import ProgrammeAthletiquePage from './pages/ProgrammeAthletiquePage'

import { T } from './lib/data'

function AppLoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.fontDisplay,
        fontSize: 11,
        letterSpacing: 3,
        color: T.textDim,
        textTransform: 'uppercase',
      }}
    >
      Chargement...
    </div>
  )
}

function AppFrame({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function PrivateAppShell() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <AppLoadingScreen />
  }

  if (!user) {
    return <AuthPage />
  }

  const isCoach = profile?.role === 'coach'
  const hasGoal = !!profile?.goal_type

  const athleteHome = hasGoal ? '/mon-espace' : '/objectif'
  const defaultRoute = isCoach ? '/coach' : athleteHome

  return (
    <DirtyProvider>
      <AppFrame>
        <Routes>
          <Route path="/" element={<Navigate to={defaultRoute} replace />} />

          <Route
            path="/objectif"
            element={isCoach ? <Navigate to="/coach" replace /> : <GoalSelectionPage />}
          />

          <Route
            path="/mon-espace"
            element={
              isCoach ? (
                <Navigate to="/coach" replace />
              ) : hasGoal ? (
                <GoalHomePage />
              ) : (
                <Navigate to="/objectif" replace />
              )
            }
          />

          <Route
            path="/entrainement/aujourdhui"
            element={isCoach ? <Navigate to="/coach" replace /> : <AujourdhuiPage />}
          />

          <Route
            path="/entrainement/libre"
            element={isCoach ? <Navigate to="/coach" replace /> : <SaisiePage />}
          />

          <Route
            path="/progression"
            element={isCoach ? <Navigate to="/coach" replace /> : <ProgressionPage />}
          />

          <Route
            path="/nutrition/macros"
            element={isCoach ? <Navigate to="/coach" replace /> : <NutritionPage />}
          />

          <Route
            path="/nutrition/recettes"
            element={isCoach ? <Navigate to="/coach" replace /> : <RecipesPage />}
          />

          <Route
            path="/nutrition/recette/:id"
            element={isCoach ? <Navigate to="/coach" replace /> : <RecipeDetailPage />}
          />

          <Route
            path="/nutrition/plan"
            element={isCoach ? <Navigate to="/coach" replace /> : <MealPlanPage />}
          />

          <Route
            path="/coach"
            element={isCoach ? <CoachPage /> : <Navigate to={athleteHome} replace />}
          />

          <Route
            path="/coach/clients"
            element={isCoach ? <CoachClientsPage /> : <Navigate to={athleteHome} replace />}
          />

          <Route
            path="/coach/client/:id"
            element={isCoach ? <CoachClientDetailPage /> : <Navigate to={athleteHome} replace />}
          />

          <Route
            path="/programmes"
            element={isCoach ? <ProgramBuilderPage /> : <Navigate to={athleteHome} replace />}
          />

          <Route
            path="/programme/bodybuilding"
            element={isCoach ? <Navigate to="/coach" replace /> : <ProgrammeBodybuildingPage />}
          />

          <Route
            path="/programme/perte-de-poids"
            element={isCoach ? <Navigate to="/coach" replace /> : <ProgrammePerteDePoidsPage />}
          />

          <Route
            path="/programme/athletique"
            element={isCoach ? <Navigate to="/coach" replace /> : <ProgrammeAthletiquePage />}
          />

          <Route
            path="/historique"
            element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/progression" replace />}
          />

          <Route
            path="/entrainement/historique"
            element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/progression" replace />}
          />

          <Route
            path="/nutrition"
            element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/nutrition/macros" replace />}
          />

          <Route
            path="/recettes"
            element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/nutrition/recettes" replace />}
          />

          <Route
            path="/plan"
            element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/nutrition/plan" replace />}
          />

          <Route
            path="/aujourdhui"
            element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/entrainement/aujourdhui" replace />}
          />

          <Route
            path="/saisie"
            element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/entrainement/libre" replace />}
          />

          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </AppFrame>
    </DirtyProvider>
  )
}

function InviteRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <AppLoadingScreen />
  }

  if (!user) {
    return <InviteAcceptPage />
  }

  const redirectTo =
    profile?.role === 'coach'
      ? '/coach'
      : profile?.goal_type
        ? '/mon-espace'
        : '/objectif'

  return <Navigate to={redirectTo} replace />
}

function RootRouter() {
  return (
    <Routes>
      <Route path="/invite/:token" element={<InviteRoute />} />
      <Route path="*" element={<PrivateAppShell />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Grain />
      <BrowserRouter>
        <RootRouter />
      </BrowserRouter>
    </AuthProvider>
  )
}
