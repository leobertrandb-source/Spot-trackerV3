import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"

import { AuthProvider, useAuth } from "./components/AuthContext"
import { Grain, Layout } from "./components/UI"
import { DirtyProvider } from "./components/DirtyContext"

import Sidebar from "./components/Sidebar"
import Topbar from "./components/Topbar"

import AuthPage from "./pages/AuthPage"
import InviteAcceptPage from "./pages/InviteAcceptPage"

import SaisiePage from "./pages/SaisiePage"
import HistoriquePage from "./pages/HistoriquePage"
import ProgressionPage from "./pages/ProgressionPage"
import CoachPage from "./pages/CoachPage"
import CoachClientsPage from "./pages/CoachClientsPage"
import CoachClientDetailPage from "./pages/CoachClientDetailPage"
import AujourdhuiPage from "./pages/AujourdhuiPage"
import NutritionPage from "./pages/NutritionPage"
import ProgramBuilderPage from "./pages/ProgramBuilderPage"
import RecipesPage from "./pages/RecipesPage"
import RecipeDetailPage from "./pages/RecipeDetailPage"
import MealPlanPage from "./pages/MealPlanPage"

import GoalSelectionPage from "./pages/GoalSelectionPage"
import GoalHomePage from "./pages/GoalHomePage"
import ProgrammeBodybuildingPage from "./pages/ProgrammeBodybuildingPage"
import ProgrammePerteDePoidsPage from "./pages/ProgrammePerteDePoidsPage"
import ProgrammeAthletiquePage from "./pages/ProgrammeAthletiquePage"

function PrivateAppShell() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 899px)")

    const update = () => {
      const mobile = media.matches
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }

    update()
    media.addEventListener("change", update)

    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  if (!user) return <AuthPage />
  if (loading) return <div style={{ padding: 40 }}>Chargement...</div>

  const isCoach = profile?.role === "coach"
  const hasGoal = !!profile?.goal_type

  const athleteHome = hasGoal ? "/mon-espace" : "/objectif"
  const defaultRoute = isCoach ? "/coach" : athleteHome

  return (
    <DirtyProvider>
      {isMobile && (
        <Sidebar
          isMobile
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      )}

      <Layout
        sidebar={!isMobile ? <Sidebar /> : null}
        topbar={
          <Topbar
            isMobile={isMobile}
            onMenuClick={() => setMobileOpen((v) => !v)}
          />
        }
      >
        <Routes>

          <Route path="/" element={<Navigate to={defaultRoute} replace />} />

          <Route path="/objectif" element={<GoalSelectionPage />} />
          <Route path="/mon-espace" element={<GoalHomePage />} />

          <Route path="/entrainement/aujourdhui" element={<AujourdhuiPage />} />
          <Route path="/entrainement/libre" element={<SaisiePage />} />
          <Route path="/entrainement/historique" element={<HistoriquePage />} />

          <Route path="/nutrition/macros" element={<NutritionPage />} />
          <Route path="/nutrition/recettes" element={<RecipesPage />} />
          <Route path="/nutrition/recette/:id" element={<RecipeDetailPage />} />
          <Route path="/nutrition/plan" element={<MealPlanPage />} />

          <Route path="/progression" element={<ProgressionPage />} />

          <Route path="/coach" element={<CoachPage />} />
          <Route path="/coach/clients" element={<CoachClientsPage />} />
          <Route path="/coach/client/:id" element={<CoachClientDetailPage />} />

          <Route path="/programmes" element={<ProgramBuilderPage />} />

          <Route path="/programme/bodybuilding" element={<ProgrammeBodybuildingPage />} />
          <Route path="/programme/perte-de-poids" element={<ProgrammePerteDePoidsPage />} />
          <Route path="/programme/athletique" element={<ProgrammeAthletiquePage />} />

          <Route path="*" element={<Navigate to={defaultRoute} replace />} />

        </Routes>
      </Layout>
    </DirtyProvider>
  )
}

function InviteRoute() {
  const { user } = useAuth()

  if (!user) return <InviteAcceptPage />

  return <Navigate to="/" replace />
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
