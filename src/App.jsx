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

function ProtectedApp() {
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

if (!user) {
return <AuthPage />
}

const isCoach = profile?.role === 'coach'
const hasGoal = !!profile?.goal_type

function getDefaultAthleteRoute() {
if (hasGoal) return '/mon-espace'
return '/objectif'
}

function getDefaultRoute() {
if (isCoach) return '/coach'
return getDefaultAthleteRoute()
}

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
<Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

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

<Route path="/coach" element={isCoach ? <CoachPage /> : <Navigate to={getDefaultAthleteRoute()} replace />} />

<Route
path="/programmes"
element={isCoach ? <ProgramBuilderPage /> : <Navigate to={getDefaultAthleteRoute()} replace />}
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

<Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
</Routes>
</Layout>
</DirtyProvider>
)
}

function PublicInviteRoute() {
const { user, loading, profile } = useAuth()

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

if (user) {
const target = profile?.role === 'coach'
? '/coach'
: profile?.goal_type
? '/mon-espace'
: '/objectif'

return <Navigate to={target} replace />
}

return <InviteAcceptPage />
}

function AppRouter() {
const { loading } = useAuth()

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

return (
<Routes>
<Route path="/invite/:token" element={<PublicInviteRoute />} />
<Route path="*" element={<ProtectedApp />} />
</Routes>
)
}

export default function App() {
return (
<AuthProvider>
<Grain />
<BrowserRouter>
<AppRouter />
</BrowserRouter>
</AuthProvider>
)
}
