import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './components/AuthContext'
import { Grain, Layout } from './components/UI'
import { DirtyProvider } from './components/DirtyContext'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'

import AuthPage from './pages/AuthPage'
import SaisiePage from './pages/SaisiePage'
import HistoriquePage from './pages/HistoriquePage'
import ProgressionPage from './pages/ProgressionPage'
import CoachPage from './pages/CoachPage'
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

function AppShell() {
  const { user, loading, profile } = useAuth()
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 900
      setIsMobile(mobile)

      if (!mobile) {
        setMobileSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (loading) {
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

  if (!user) return <AuthPage />

  const hasGoal = !!profile?.goal_type

  return (
    <DirtyProvider>
      <Layout
        sidebar={
          <Sidebar
            isMobile={isMobile}
            mobileOpen={mobileSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
          />
        }
        topbar={
          <Topbar
            isMobile={isMobile}
            onMenuClick={() => setMobileSidebarOpen((v) => !v)}
          />
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              hasGoal ? (
                <Navigate to="/mon-espace" replace />
              ) : (
                <Navigate to="/objectif" replace />
              )
            }
          />

          <Route path="/objectif" element={<GoalSelectionPage />} />

          <Route
            path="/mon-espace"
            element={hasGoal ? <GoalHomePage /> : <Navigate to="/objectif" replace />}
          />

          <Route
            path="/aujourd-hui"
            element={<Navigate to="/entrainement/aujourdhui" replace />}
          />
          <Route path="/saisie" element={<Navigate to="/entrainement/libre" replace />} />
          <Route
            path="/historique"
            element={<Navigate to="/entrainement/historique" replace />}
          />
          <Route path="/nutrition" element={<Navigate to="/nutrition/macros" replace />} />
          <Route path="/recettes" element={<Navigate to="/nutrition/recettes" replace />} />
          <Route path="/plan" element={<Navigate to="/nutrition/plan" replace />} />

          <Route path="/entrainement/aujourdhui" element={<AujourdhuiPage />} />
          <Route path="/entrainement/libre" element={<SaisiePage />} />
          <Route path="/entrainement/historique" element={<HistoriquePage />} />

          <Route path="/nutrition/macros" element={<NutritionPage />} />
          <Route path="/nutrition/plan" element={<MealPlanPage />} />
          <Route path="/nutrition/recettes" element={<RecipesPage />} />
          <Route path="/nutrition/recette/:id" element={<RecipeDetailPage />} />

          <Route path="/progression" element={<ProgressionPage />} />

          <Route path="/coach" element={<CoachPage />} />
          <Route path="/programmes" element={<ProgramBuilderPage />} />

          <Route path="/programme/bodybuilding" element={<ProgrammeBodybuildingPage />} />
          <Route
            path="/programme/perte-de-poids"
            element={<ProgrammePerteDePoidsPage />}
          />
          <Route path="/programme/athletique" element={<ProgrammeAthletiquePage />} />

          <Route
            path="*"
            element={
              hasGoal ? (
                <Navigate to="/mon-espace" replace />
              ) : (
                <Navigate to="/objectif" replace />
              )
            }
          />
        </Routes>
      </Layout>
    </DirtyProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Grain />
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
