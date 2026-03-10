import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { AuthProvider, useAuth } from '../components/AuthContext'
import { DirtyProvider } from '../components/DirtyContext'
import { Grain, Layout } from '../components/UI'

import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

import AuthPage from '../pages/AuthPage'
import InviteAcceptPage from '../pages/InviteAcceptPage'

import GoalSelectionPage from '../pages/GoalSelectionPage'
import GoalHomePage from '../pages/GoalHomePage'

import AujourdhuiPage from '../pages/AujourdhuiPage'
import SaisiePage from '../pages/SaisiePage'
import ProgressionPage from '../pages/ProgressionPage'

import NutritionPage from '../pages/NutritionPage'
import RecipesPage from '../pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import MealPlanPage from '../pages/MealPlanPage'

import CoachPage from '../pages/CoachPage'
import CoachClientsPage from '../pages/CoachClientsPage'
import CoachClientDetailPage from '../pages/CoachClientDetailPage'
import ProgramBuilderPage from '../pages/ProgramBuilderPage'

import ProgrammeBodybuildingPage from '../pages/ProgrammeBodybuildingPage'
import ProgrammePerteDePoidsPage from '../pages/ProgrammePerteDePoidsPage'
import ProgrammeAthletiquePage from '../pages/ProgrammeAthletiquePage'

import { T } from '../lib/data'

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: T.textDim,
        fontFamily: T.fontDisplay,
        letterSpacing: 2,
        fontSize: 12,
      }}
    >
      Chargement...
    </div>
  )
}

function PrivateAppShell() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  const [isMobile, setIsMobile] = useState(window.innerWidth < 900)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 899px)')

    const update = () => {
      const mobile = media.matches
      setIsMobile(mobile)

      if (!mobile) {
        setMobileSidebarOpen(false)
      }
    }

    update()

    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  if (loading) {
    return <LoadingScreen />
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
      {isMobile && (
        <Sidebar
          isMobile
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
      )}

      <Layout
        sidebar={!isMobile ? <Sidebar /> : null}
        topbar={
          <Topbar
            isMobile={isMobile}
            onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          />
        }
      >
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

          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </Layout>
    </DirtyProvider>
  )
}

function InviteRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!user) return <InviteAcceptPage />

  const redirect =
    profile?.role === 'coach'
      ? '/coach'
      : profile?.goal_type
      ? '/mon-espace'
      : '/objectif'

  return <Navigate to={redirect} replace />
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
