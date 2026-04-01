import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { AuthProvider, useAuth } from './components/AuthContext'
import { DirtyProvider } from './components/DirtyContext'
import { Grain, Layout } from './components/UI'

import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'

import InviteAcceptPage from './pages/InviteAcceptPage'
import PlayerJoinPage from './pages/PlayerJoinPage'
import LoginPage from './pages/LoginPage'

import GoalSelectionPage from './pages/GoalSelectionPage'
import GoalHomePage from './pages/GoalHomePage'

import AujourdhuiPage from './pages/AujourdhuiPage'
import SaisiePage from './pages/SaisiePage'
import ProgressionPage from './pages/ProgressionPage'

import NutritionPage from './pages/NutritionPage'
import RecipesPage from './pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'

import CoachPage from './pages/CoachPage'
import CoachClientsPage from './pages/CoachClientsPage'
import CoachClientDetailPage from './pages/CoachClientDetailPage'
import ProgramBuilderPage from './pages/ProgramBuilderPage'
import CoachPlanningPage from './pages/CoachPlanningPage'

import ProgrammeBodybuildingPage from './pages/ProgrammeBodybuildingPage'
import ProgrammePerteDePoidsPage from './pages/ProgrammePerteDePoidsPage'
import ProgrammeAthletiquePage from './pages/ProgrammeAthletiquePage'

import ExercisesPage from './pages/ExercisesPage'
import PrepHooperPage from './pages/PrepHooperPage'
import PrepChargePage from './pages/PrepChargePage'
import PrepCompoPage from './pages/PrepCompoPage'
import PrepTopsetPage from './pages/PrepTopsetPage'
import PrepChargeExternePage from './pages/PrepChargeExternePage'
import PrepDashboardPage from './pages/PrepDashboardPage'
import PrepAnalysePage from './pages/PrepAnalysePage'
import CoachPageProSport from './pages/CoachPage_ProSport'
import ClubKioskPage from './pages/ClubKioskPage'
import ClubKioskHooperPage from './pages/ClubKioskHooperPage'

import MedicalPage from './pages/MedicalPage'
import MedicalHubPage from './pages/MedicalHubPage'
import CalendarPage from './pages/CalendarPage'
import TrainingAttendancePage from './pages/TrainingAttendancePage'
import MyAttendancePage from './pages/MyAttendancePage'
import AthleteDashboardPage from './pages/AthleteDashboardPage'

import { T } from './lib/data'
import PrivacyPage from './pages/PrivacyPage'

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: T.textDim,
      fontFamily: T.fontDisplay,
      letterSpacing: 2,
      fontSize: 12,
      textTransform: 'uppercase',
    }}>
      Chargement...
    </div>
  )
}

function PrivateAppShell() {
  const { user, profile, loading, showPrepPhysique, showCoachingPerso } = useAuth()
  const location = useLocation()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 980)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 979px)')
    const update = () => {
      const mobile = media.matches
      setIsMobile(mobile)
      if (!mobile) setMobileSidebarOpen(false)
    }
    update()
    if (media.addEventListener) {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  if (loading) return <LoadingScreen />
  if (!user) return <LoginPage />

  const isCoach        = profile?.role === 'coach'
  const isStaffMedical = profile?.role === 'staff_medical'
  const hasGoal        = !!profile?.goal_type

  const canCoachingPerso = showCoachingPerso
  const canPrepPhysique  = showPrepPhysique
  const canMedical       = canPrepPhysique && (isCoach || isStaffMedical)

  const athleteHome  = hasGoal ? '/mon-espace' : '/objectif'
  const defaultRoute = isCoach ? '/coach' : isStaffMedical ? '/medical' : (canPrepPhysique ? '/mon-tableau-de-bord' : athleteHome)

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
        showPrepPhysique={showPrepPhysique}
        sidebar={!isMobile ? <Sidebar /> : null}
        topbar={
          <Topbar
            isMobile={isMobile}
            onMenuClick={() => setMobileSidebarOpen(v => !v)}
          />
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to={defaultRoute} replace />} />

          {/* ── COACHING PERSO ── */}
          <Route path="/objectif"
            element={isCoach ? <Navigate to="/coach" replace /> : <GoalSelectionPage />}
          />
          <Route path="/mon-espace"
            element={
              isCoach ? <Navigate to="/coach" replace />
              : hasGoal ? <GoalHomePage />
              : <Navigate to="/objectif" replace />
            }
          />
          <Route path="/entrainement/aujourdhui"
            element={isCoach ? <Navigate to="/coach" replace /> : <AujourdhuiPage />}
          />
          <Route path="/entrainement/libre"
            element={isCoach ? <Navigate to="/coach" replace /> : <SaisiePage />}
          />
          <Route path="/progression"
            element={isCoach ? <Navigate to="/coach" replace /> : <ProgressionPage />}
          />
          <Route path="/nutrition/macros"
            element={isCoach ? <Navigate to="/coach" replace /> : canCoachingPerso ? <NutritionPage /> : <Navigate to={athleteHome} replace />}
          />
          <Route path="/nutrition/recettes"
            element={isCoach ? <Navigate to="/coach" replace /> : canCoachingPerso ? <RecipesPage /> : <Navigate to={athleteHome} replace />}
          />
          <Route path="/nutrition/recette/:id"
            element={isCoach ? <Navigate to="/coach" replace /> : canCoachingPerso ? <RecipeDetailPage /> : <Navigate to={athleteHome} replace />}
          />
          <Route path="/exercices" element={!canPrepPhysique ? <ExercisesPage /> : <Navigate to="/mon-tableau-de-bord" replace />} />
          <Route path="/mon-tableau-de-bord" element={canPrepPhysique && !isCoach && !isStaffMedical ? <AthleteDashboardPage /> : <Navigate to={defaultRoute} replace />} />

          {/* ── PRÉPA PHYSIQUE ── */}
          <Route path="/prep/hooper"         element={canPrepPhysique ? <PrepHooperPage />       : <Navigate to={athleteHome} replace />} />
          <Route path="/prep/charge"         element={canPrepPhysique ? <PrepChargePage />        : <Navigate to={athleteHome} replace />} />
          <Route path="/prep/compo"          element={canPrepPhysique ? <PrepCompoPage />         : <Navigate to={athleteHome} replace />} />
          <Route path="/prep/topset"         element={canPrepPhysique ? <PrepTopsetPage />        : <Navigate to={athleteHome} replace />} />
          <Route path="/prep/charge-externe" element={canPrepPhysique ? <PrepChargeExternePage /> : <Navigate to={athleteHome} replace />} />
          <Route path="/prep/dashboard"      element={canPrepPhysique && isCoach ? <PrepDashboardPage /> : <Navigate to={athleteHome} replace />} />
          <Route path="/prep/analyse/:id"    element={canPrepPhysique && isCoach ? <PrepAnalysePage />   : <Navigate to={athleteHome} replace />} />

          {/* ── MODULE MÉDICAL ── */}
          <Route path="/medical"     element={canMedical ? <MedicalHubPage /> : <Navigate to={athleteHome} replace />} />
          <Route path="/medical/:id" element={canMedical ? <MedicalPage />    : <Navigate to={athleteHome} replace />} />
          <Route path="/calendrier"  element={canPrepPhysique ? <CalendarPage /> : <Navigate to={athleteHome} replace />} />
          <Route path="/presences"   element={canMedical ? <TrainingAttendancePage /> : <Navigate to={athleteHome} replace />} />
          <Route path="/ma-presence" element={!isCoach && !isStaffMedical ? <MyAttendancePage /> : <Navigate to={defaultRoute} replace />} />

          {/* ── COACH ── */}
          <Route path="/coach"
            element={isCoach ? (showPrepPhysique ? <CoachPageProSport /> : <CoachPage />) : <Navigate to={athleteHome} replace />}
          />
          <Route path="/coach/clients"
            element={isCoach ? <CoachClientsPage /> : <Navigate to={athleteHome} replace />}
          />
          <Route path="/coach/client/:id"
            element={isCoach ? <CoachClientDetailPage /> : <Navigate to={athleteHome} replace />}
          />
          <Route path="/planning"
            element={isCoach ? <CoachPlanningPage /> : <Navigate to={athleteHome} replace />}
          />
          <Route path="/programmes"
            element={isCoach ? <ProgramBuilderPage /> : <Navigate to={athleteHome} replace />}
          />
          <Route path="/programme/bodybuilding"
            element={isCoach ? <Navigate to="/coach" replace /> : canCoachingPerso ? <ProgrammeBodybuildingPage /> : <Navigate to={athleteHome} replace />}
          />
          <Route path="/programme/perte-de-poids"
            element={isCoach ? <Navigate to="/coach" replace /> : canCoachingPerso ? <ProgrammePerteDePoidsPage /> : <Navigate to={athleteHome} replace />}
          />
          <Route path="/programme/athletique"
            element={isCoach ? <Navigate to="/coach" replace /> : canCoachingPerso ? <ProgrammeAthletiquePage /> : <Navigate to={athleteHome} replace />}
          />

          {/* Redirects legacy */}
          <Route path="/historique"     element={<Navigate to="/progression" replace />} />
          <Route path="/nutrition"      element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/nutrition/macros" replace />} />
          <Route path="/recettes"       element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/nutrition/recettes" replace />} />
          <Route path="/plan"           element={<Navigate to="/nutrition/macros" replace />} />
          <Route path="/nutrition/plan" element={<Navigate to="/nutrition/macros" replace />} />
          <Route path="/aujourdhui"     element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/entrainement/aujourdhui" replace />} />
          <Route path="/saisie"         element={isCoach ? <Navigate to="/coach" replace /> : <Navigate to="/entrainement/libre" replace />} />

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
  const redirect = profile?.role === 'coach' ? '/coach' : profile?.goal_type ? '/mon-espace' : '/objectif'
  return <Navigate to={redirect} replace />
}

function RootRouter() {
  return (
    <Routes>
      <Route path="/invite/:token" element={<InviteRoute />} />
      <Route path="/politique-confidentialite" element={<PrivacyPage />} />
      <Route path="/join/:token" element={<PlayerJoinPage />} />
      <Route path="/coach-kiosk" element={<ClubKioskPage />} />
      <Route path="/coach-kiosk/hooper/:playerId" element={<ClubKioskHooperPage />} />
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
