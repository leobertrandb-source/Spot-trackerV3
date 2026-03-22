import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import KioskHeader from '../components/kiosk/KioskHeader'
import PlayerTile from '../components/kiosk/PlayerTile'
import KioskPinModal from '../components/kiosk/KioskPinModal'
import KioskPinSetup from '../components/kiosk/KioskPinSetup'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ClubKioskPage() {
  const { clubId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [club, setClub] = useState(null)
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
      setLoading(true)
      const today = todayIso()

      const [{ data: clubData }, { data: membersData, error: membersError }] = await Promise.all([
        supabase
          .from('clubs')
          .select('id, name, logo_url, kiosk_pin')
          .eq('id', clubId)
          .single(),

        supabase
          .from('club_members')
          .select(`
            user_id,
            role,
            profiles:user_id (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('club_id', clubId)
          .eq('role', 'athlete'),
      ])

      if (membersError) {
        console.error(membersError)
        setLoading(false)
        return
      }

      const cleanPlayers = (membersData || [])
        .map((row) => row.profiles)
        .filter(Boolean)
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

      const playerIds = cleanPlayers.map((p) => p.id)

      let logs = []
      if (playerIds.length > 0) {
        const { data: hooperData, error: hooperError } = await supabase
          .from('hooper_logs')
          .select('user_id, date')
          .in('user_id', playerIds)
          .eq('date', today)

        if (hooperError) {
          console.error(hooperError)
        }

        logs = hooperData || []
      }

      const nextDoneMap = Object.fromEntries(logs.map((log) => [log.user_id, true]))

      setClub(clubData || null)
      setPlayers(cleanPlayers)
      setDoneMap(nextDoneMap)
      setLoading(false)
    }

    load()
  }, [clubId])

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

  if (!loading && club && !club.kiosk_pin) {
    return (
      <KioskPinSetup
        clubId={club.id}
        clubName={club.name}
        supabase={supabase}
        onSave={(pin) => setClub((prev) => ({ ...prev, kiosk_pin: pin }))}
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
          clubName={club?.name}
          protocol="HOOPER"
          dateLabel={dateLabel}
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
              {doneCount} / {players.length} questionnaires complétés aujourd'hui
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
                  onClick={() => {
                    if (done) return
                    navigate(`/club-kiosk/${clubId}/hooper/${player.id}`)
                  }}
                />
              )
            })}
          </div>
        )}

        <KioskPinModal
          open={pinOpen}
          onClose={() => setPinOpen(false)}
          expectedPin={club?.kiosk_pin || ''}
          onSuccess={() => navigate(-1)}
        />
      </div>
    </div>
  )
}
