import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthContext'
import { Grain, Layout } from './components/UI'
import { DirtyProvider } from './components/DirtyContext'
import Sidebar from './components/Sidebar'
import AuthPage from './pages/AuthPage'
import SaisiePage from './pages/SaisiePage'
import HistoriquePage from './pages/HistoriquePage'
import ProgressionPage from './pages/ProgressionPage'
import CoachPage from './pages/CoachPage'
import AujourdhuiPage from './pages/AujourdhuiPage'
import NutritionPage from './pages/NutritionPage'
import ProgramBuilderPage from './pages/ProgramBuilderPage'
import { T } from './lib/data'

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.fontDisplay, fontSize: 11, letterSpacing: 3,
      color: T.textDim, textTransform: 'uppercase',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 8, background: T.accent, borderRadius: '50%', animation: 'pulse 1.2s ease-in-out infinite' }} />
        <div style={{ width: 8, height: 8, background: T.accent, borderRadius: '50%', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '.2s', opacity: .6 }} />
        <div style={{ width: 8, height: 8, background: T.accent, borderRadius: '50%', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '.4s', opacity: .3 }} />
      </div>
      <style>{`@keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: .3; } }`}</style>
    </div>
  )

  if (!user) return <AuthPage />

  return (
    <DirtyProvider>
    <Layout sidebar={<Sidebar />}>
      <Routes>
        <Route path="/" element={<Navigate to="/aujourd-hui" />} />
        <Route path="/saisie" element={<SaisiePage />} />
        <Route path="/historique" element={<HistoriquePage />} />
        <Route path="/progression" element={<ProgressionPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/aujourd-hui" element={<AujourdhuiPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/programmes" element={<ProgramBuilderPage />} />
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
