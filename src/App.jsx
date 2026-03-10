import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './components/AuthContext'
import { Grain, Layout } from './components/UI'
import { DirtyProvider } from './components/DirtyContext'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'

import AuthPage from './pages/AuthPage'
import InviteAcceptPage from './pages/InviteAcceptPage'

import SaisiePage from './pages/SaisiePage'
import HistoriquePage from './pages/HistoriquePage'
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

function PrivateAppShell() {
const { user, profile, loading } = useAuth()
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

if (!user) {
return <AuthPage />
}

if (loading) {
return <AppLoadingScreen />
}

const isCoach = profile?.role === 'coach'
const hasGoal = !!profile?.goal_type

const athleteHome = hasGoal ? '/mon-espace' : '/objectif'
const defaultRoute = isCoach ? '/coach' : athleteHome

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
<Route path="/" element={<Navigate to={defaultRoute} replace />} />

<Route
path="/objectif"
element={
isCoach ? <Navigate to="/coach" replace /> : <GoalSelectionPage />
}
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
path="/aujourdhui"
element={
isCoach ? (
<Navigate to="/coach" replace />
) : (
<Navigate to="/entrainement/aujourdhui" replace />
)
}
/>

<Route
path="/saisie"
element={
isCoach ? (
<Navigate to="/coach" replace />
) : (
<Navigate to="/entrainement/libre" replace />
)
}
/>

<Route
path="/historique"
element={
isCoach ? (
<Navigate to="/coach" replace />
) : (
<Navigate to="/entrainement/historique" replace />
)
}
/>

<Route
path="/nutrition"
element={
isCoach ? (
<Navigate to="/coach" replace />
) : (
<Navigate to="/nutrition/macros" replace />
)
}
/>

<Route
path="/recettes"
element={
isCoach ? (
<Navigate to="/coach" replace />
) : (
<Navigate to="/nutrition/recettes" replace />
)
}
/>

<Route
path="/plan"
element={
isCoach ? (
<Navigate to="/coach" replace />
) : (
<Navigate to="/nutrition/plan" replace />
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
path="/entrainement/historique"
element={isCoach ? <Navigate to="/coach" replace /> : <HistoriquePage />}
/>

<Route
path="/nutrition/macros"
element={isCoach ? <Navigate to="/coach" replace /> : <NutritionPage />}
/>

<Route
path="/nutrition/plan"
element={isCoach ? <Navigate to="/coach" replace /> : <MealPlanPage />}
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
path="/progression"
element={isCoach ? <Navigate to="/coach" replace /> : <ProgressionPage />}
/>

<Route
path="/coach"
element={
isCoach ? <CoachPage /> : <Navigate to={athleteHome} replace />
}
/>

<Route
path="/coach/clients"
element={
isCoach ? <CoachClientsPage /> : <Navigate to={athleteHome} replace />
}
/>

<Route
path="/coach/client/:id"
element={
isCoach ? <CoachClientDetailPage /> : <Navigate to={athleteHome} replace />
}
/>

<Route
path="/programmes"
element={
isCoach ? <ProgramBuilderPage /> : <Navigate to={athleteHome} replace />
}
/>

<Route
path="/programme/bodybuilding"
element={
isCoach ? <Navigate to="/coach" replace /> : <ProgrammeBodybuildingPage />
}
/>

<Route
path="/programme/perte-de-poids"
element={
isCoach ? <Navigate to="/coach" replace /> : <ProgrammePerteDePoidsPage />
}
/>

<Route
path="/programme/athletique"
element={
isCoach ? <Navigate to="/coach" replace /> : <ProgrammeAthletiquePage />
}
/>

<Route path="*" element={<Navigate to={defaultRoute} replace />} />
</Routes>
</Layout>
</DirtyProvider>
)
}

function InviteRoute() {
const { user, profile } = useAuth()

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
