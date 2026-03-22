import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import KioskHeader from '../components/kiosk/KioskHeader'
import PlayerTile from '../components/kiosk/PlayerTile'
import KioskPinModal from '../components/kiosk/KioskPinModal'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ClubKioskPage() {
  const { clubId } = useParams()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [club, setClub] = useState(null)
  const [players, setPlayers] = useState([])
  const [doneMap, setDoneMap] = useState({})
  const [filter, setFilter] = useState('restants')
  const [pinOpen, setPinOpen] = useState(false)

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    []
  )

  useEffect(() => {
    if (authLoading || !user) return

    const load = async () => {
      setLoading(true)
      const today = todayIso()

      const [{ data: clubData, error: clubError }, { data: membersData, error: membersError }] = await Promise.all([
        supabase.from('clubs').select('id, name, logo_url, kiosk_pin').eq('id', clubId).single(),
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

      if (clubError || membersError) {
        console.error(clubError || membersError)
        setLoading(false)
        return
      }

      const cleanPlayers = (membersData || [])
        .map(row => row.profiles)
        .filter(Boolean)
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

      const playerIds = cleanPlayers.map(p => p.id)
      let logs = []
      if (playerIds.length) {
        const { data: hooperData, error: hooperError } = await supabase
          .from('hooper_logs')
          .select('user_id, date')
          .in('user_id', playerIds)
          .eq('date', today)
        if (hooperError) console.error(hooperError)
        logs = hooperData || []
      }

      setClub(clubData || null)
      setPlayers(cleanPlayers)
      setDoneMap(Object.fromEntries(logs.map(log => [log.user_id, true])))
      setLoading(false)
    }

    load()
  }, [authLoading, user, clubId])

  const completedCount = Object.values(doneMap).filter(Boolean).length
  const filteredPlayers = players.filter(player => {
    const done = !!doneMap[player.id]
    if (filter === 'restants') return !done
    if (filter === 'termines') return done
    return true
  })

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'grid', placeItems: 'center', color: '#6b6b6b', fontFamily: 'Inter, sans-serif' }}>
        Chargement du mode borne...
      </div>
    )
  }

  if (!user || profile?.role !== 'coach') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1a1a1a' }}>Accès réservé au staff</div>
          <div style={{ fontSize: 15, color: '#6b6b6b', marginTop: 8 }}>Connecte-toi avec un compte coach pour utiliser le mode borne.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ef', padding: 20, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <KioskHeader
          clubName={club?.name}
          protocol="HOOPER"
          dateLabel={dateLabel}
          completedCount={completedCount}
          totalCount={players.length}
          onExit={() => setPinOpen(true)}
        />

        <div style={{
          marginTop: 16,
          marginBottom: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Sélectionner un joueur</div>
            <div style={{ fontSize: 13, color: '#6b6b6b', marginTop: 4 }}>
              Les joueurs déjà complétés restent visibles mais ne sont plus cliquables.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'restants', label: 'Restants' },
              { key: 'tous', label: 'Tous' },
              { key: 'termines', label: 'Terminés' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                style={{
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 999,
                  border: `1px solid ${filter === item.key ? '#1a3a2a' : '#d9d4ca'}`,
                  background: filter === item.key ? '#1a3a2a' : '#fff',
                  color: filter === item.key ? '#fff' : '#1a1a1a',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px solid #e8e4dc', borderRadius: 24, padding: 32,
            textAlign: 'center', color: '#6b6b6b',
          }}>
            Aucun joueur dans ce filtre.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
            {filteredPlayers.map(player => {
              const done = !!doneMap[player.id]
              return (
                <PlayerTile
                  key={player.id}
                  player={player}
                  done={done}
                  disabled={done}
                  onClick={() => navigate(`/club-kiosk/${clubId}/hooper/${player.id}`)}
                />
              )
            })}
          </div>
        )}
      </div>

      <KioskPinModal
        open={pinOpen}
        expectedPin={club?.kiosk_pin || ''}
        onClose={() => setPinOpen(false)}
        onSuccess={() => navigate('/coach')}
      />
    </div>
  )
}
