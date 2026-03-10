import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'

import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { Layout } from './components/UI'

import CoachPage from './pages/CoachPage'
import CoachClientsPage from './pages/CoachClientsPage'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobile
}

export default function App() {
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <BrowserRouter>
      {/* Sidebar mobile */}
      {isMobile && (
        <Sidebar
          isMobile
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      )}

      <Layout
        sidebar={
          !isMobile ? (
            <Sidebar />
          ) : null
        }
        topbar={
          <Topbar
            isMobile={isMobile}
            onMenuClick={() => setMobileOpen(true)}
          />
        }
      >
        <Routes>
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/coach/clients" element={<CoachClientsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
