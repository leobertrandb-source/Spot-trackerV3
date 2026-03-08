import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { T } from './lib/data'

function AppShell() {
  const { user, loading } = useAuth()

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

  return (
    <DirtyProvider>
      <Layout sidebar={<Sidebar />} topbar={<Topbar />}>
        <Routes>
          {/* redirect principal */}
          <Route path="/" element={<Navigate to="/entrainement/aujourdhui" replace />} />

          {/* compat anciennes routes */}
          <Route path="/aujourd-hui" element={<Navigate to="/entrainement/aujourdhui" replace />} />
          <Route path="/saisie" element={<Navigate to="/entrainement/libre" replace />} />
          <Route path="/historique" element={<Navigate to="/entrainement/historique" replace />} />
          <Route path="/nutrition" element={<Navigate to="/nutrition/macros" replace />} />
          <Route path="/recettes" element={<Navigate to="/nutrition/recettes" replace />} />
          <Route path="/plan" element={<Navigate to="/nutrition/plan" replace />} />
          <Route path="/recette/:id" element={<RecipeDetailPage />} />

          {/* ENTRAINEMENT */}
          <Route path="/entrainement/aujourdhui" element={<AujourdhuiPage />} />
          <Route path="/entrainement/libre" element={<SaisiePage />} />
          <Route path="/entrainement/historique" element={<HistoriquePage />} />

          {/* NUTRITION */}
          <Route path="/nutrition/macros" element={<NutritionPage />} />
          <Route path="/nutrition/plan" element={<MealPlanPage />} />
          <Route path="/nutrition/recettes" element={<RecipesPage />} />
          <Route path="/nutrition/recette/:id" element={<RecipeDetailPage />} />

          {/* PROGRESSION */}
          <Route path="/progression" element={<ProgressionPage />} />

          {/* COACH */}
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/programmes" element={<ProgramBuilderPage />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/entrainement/aujourdhui" replace />} />
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
