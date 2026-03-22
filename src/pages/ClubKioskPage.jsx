import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import KioskHeader from '../components/kiosk/KioskHeader'
import PlayerTile from '../components/kiosk/PlayerTile'
import KioskPinModal from '../components/kiosk/KioskPinModal'
import KioskPinSetup from '../components/kiosk/KioskPinSetup'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ClubKioskPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [coachProfile, setCoachProfile] = useState(null)
  const [players, setPlayers] = useState([])
  const [doneMap, setDoneMap] = useState({})
  const [statusFilter, setStatusFilter] = useState('remaining') // remaining | all | done
  const [pinOpen, setPinOpen] = useState(false)

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    []
  )

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      const today = todayIso()

      const [{ data: coachData }, { data: links, error: linksError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, kiosk_pin')
          .eq('id', user.id)
          .single(),

        supabase
          .from('coach_clients')
          .select('client_id')
          .eq('coach_id', user.id),
      ])

      if (linksError) {
        console.error(linksError)
        setLoading(false)
        return
      }

      const ids = (links || []).map((row) => row.client_id)
      let cleanPlayers = []
      let logs = []

      if (ids.length > 0) {
        const [{ data: profileRows, error: profilesError }, { data: hooperData, error: hooperError }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .in('id', ids),

          supabase
            .from('hooper_logs')
            .select('user_id, date')
            .in('user_id', ids)
            .eq('date', today),
        ])

        if (profilesError) console.error(profilesError)
        if (hooperError) console.error(hooperError)

        cleanPlayers = (profileRows || [])
          .filter(Boolean)
          .sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || ''))

        logs = hooperData || []
      }

      const nextDoneMap = Object.fromEntries(logs.map((log) => [log.user_id, true]))

      setCoachProfile(coachData || profile || null)
      setPlayers(cleanPlayers)
      setDoneMap(nextDoneMap)
      setLoading(false)
    }

    load()
  }, [user?.id, profile])

  const doneCount = Object.values(doneMap).filter(Boolean).length

  const filteredPlayers = useMemo(() => {
    if (statusFilter === 'done') {
      return players.filter((p) => !!doneMap[p.id])
    }
    if (statusFilter === 'remaining') {
      return players.filter((p) => !doneMap[p.id])
    }
    return players
  }, [players, doneMap, statusFilter])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f3ef',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'Inter, sans-serif',
          color: '#6b6b6b',
        }}
      >
        Chargement du mode borne...
      </div>
    )
  }

  if (!loading && coachProfile && !coachProfile.kiosk_pin) {
    return (
      <KioskPinSetup
        entityName={coachProfile.full_name || coachProfile.email}
        savePin={async (pin) => {
          const { error } = await supabase
            .from('profiles')
            .update({ kiosk_pin: pin })
            .eq('id', user.id)
          if (error) throw error
        }}
        onSave={(pin) => setCoachProfile((prev) => ({ ...prev, kiosk_pin: pin }))}
      />
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f3ef',
        padding: 20,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <KioskHeader
          clubName={coachProfile?.full_name || coachProfile?.email || 'Mode borne'}
          protocol="HOOPER"
          dateLabel={dateLabel}
          completedCount={doneCount}
          totalCount={players.length}
          onExit={() => setPinOpen(true)}
        />

        <div
          style={{
            marginBottom: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 18, color: '#1a1a1a', fontWeight: 800 }}>
              Sélectionner un joueur
            </div>
            <div style={{ fontSize: 13, color: '#6b6b6b', marginTop: 4 }}>
              {doneCount} / {players.length} questionnaires complétés aujourd&apos;hui
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              background: '#fff',
              border: '1px solid #e8e4dc',
              borderRadius: 999,
              padding: 6,
            }}
          >
            {[
              { key: 'remaining', label: 'Restants' },
              { key: 'all', label: 'Tous' },
              { key: 'done', label: 'Terminés' },
            ].map((item) => {
              const active = statusFilter === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 999,
                    border: 'none',
                    background: active ? '#1a3a2a' : 'transparent',
                    color: active ? '#fff' : '#1a1a1a',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e8e4dc',
              borderRadius: 20,
              padding: 28,
              textAlign: 'center',
              color: '#6b6b6b',
              fontWeight: 600,
            }}
          >
            Aucun joueur dans ce filtre.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {filteredPlayers.map((player) => {
              const done = !!doneMap[player.id]
              return (
                <PlayerTile
                  key={player.id}
                  player={player}
                  done={done}
                  disabled={done}
                  onClick={() => {
                    if (done) return
                    navigate(`/coach-kiosk/hooper/${player.id}`)
                  }}
                />
              )
            })}
          </div>
        )}

        <KioskPinModal
          open={pinOpen}
          onClose={() => setPinOpen(false)}
          expectedPin={coachProfile?.kiosk_pin || ''}
          onSuccess={() => navigate('/coach')}
        />
      </div>
    </div>
  )
}
