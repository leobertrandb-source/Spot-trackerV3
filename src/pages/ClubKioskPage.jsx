import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import KioskPinModal from '../components/kiosk/KioskPinModal'
import KioskPinSetup from '../components/kiosk/KioskPinSetup'
import { KIOSK_TESTS } from '../lib/kioskTests'

const P = {
  bg: '#f5f3ef', card: '#ffffff', border: '#e8e4dc',
  text: '#1a1a1a', sub: '#6b6b6b', dim: '#a0a0a0', accent: '#1a3a2a',
}

export default function ClubKioskPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const coachId = profile?.id || user?.id || null

  const [coach, setCoach] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pinOpen, setPinOpen] = useState(false)

  const dateLabel = useMemo(() =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), [])

  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const handle = () => window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handle)
    return () => window.removeEventListener('popstate', handle)
  }, [])

  useEffect(() => {
    if (!coachId) { setLoading(false); return }
    setCoach({
      id: coachId,
      name: profile?.full_name || user?.user_metadata?.full_name || 'Club',
      kiosk_pin: profile?.kiosk_pin || null,
    })
    setLoading(false)
  }, [coachId, profile?.full_name, profile?.kiosk_pin, user?.user_metadata?.full_name])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: P.bg, display: 'grid', placeItems: 'center', color: P.sub, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
      Chargement...
    </div>
  )

  if (!loading && coach && !coach.kiosk_pin) return (
    <KioskPinSetup
      coachId={coach.id}
      coachName={coach.name}
      supabase={supabase}
      onSave={(pin) => setCoach(prev => ({ ...prev, kiosk_pin: pin }))}
    />
  )

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: 'Inter, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: P.card, border: `1px solid ${P.border}`, borderRadius: 24,
          padding: '20px 26px', marginBottom: 32,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: P.dim, marginBottom: 6 }}>
              Mode borne équipe
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: P.text, lineHeight: 1.1 }}>{coach?.name || 'Club'}</div>
            <div style={{ fontSize: 13, color: P.sub, marginTop: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
          </div>
          <button onClick={() => setPinOpen(true)} style={{
            border: `1px solid ${P.border}`, background: P.card, color: P.sub,
            borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            Quitter
          </button>
        </div>

        {/* Titre */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: P.text, marginBottom: 4 }}>Choisir le test</div>
          <div style={{ fontSize: 14, color: P.sub }}>Sélectionne le protocole à remplir, puis choisis ton nom</div>
        </div>

        {/* Grille tests */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {KIOSK_TESTS.map(test => (
            <TestCard key={test.key} test={test} onClick={() => navigate(`/coach-kiosk/${test.key}`)} />
          ))}
        </div>

        <KioskPinModal
          open={pinOpen}
          onClose={() => setPinOpen(false)}
          expectedPin={coach?.kiosk_pin || ''}
          onSuccess={() => navigate('/coach')}
        />
      </div>
    </div>
  )
}

function TestCard({ test, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? test.bg : '#ffffff',
        border: `2px solid ${hovered ? test.color : '#e8e4dc'}`,
        borderRadius: 22, padding: '26px 22px',
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: hovered ? `0 12px 32px rgba(0,0,0,0.10)` : '0 6px 20px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        width: 54, height: 54, borderRadius: 16,
        background: test.bg, border: `1px solid ${test.border}`,
        display: 'grid', placeItems: 'center', fontSize: 26,
      }}>
        {test.emoji}
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 900, color: '#1a1a1a', marginBottom: 5 }}>{test.label}</div>
        <div style={{ fontSize: 12, color: '#6b6b6b', lineHeight: 1.5 }}>{test.sub}</div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: test.color, marginTop: 'auto' }}>
        Démarrer →
      </div>
    </button>
  )
}
