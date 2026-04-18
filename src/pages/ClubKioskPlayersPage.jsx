import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import PlayerTile from '../components/kiosk/PlayerTile'
import { KIOSK_TESTS } from '../lib/kioskTests'

const P = {
  bg: '#f5f3ef', card: '#ffffff', border: '#e8e4dc',
  text: '#1a1a1a', sub: '#6b6b6b', dim: '#a0a0a0', accent: '#1a3a2a',
}

function todayIso() { return new Date().toISOString().slice(0, 10) }

export default function ClubKioskPlayersPage() {
  const { testKey } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const coachId = profile?.id || user?.id || null
  const test = KIOSK_TESTS.find(t => t.key === testKey)

  const [players, setPlayers] = useState([])
  const [doneMap, setDoneMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('remaining')

  const dateLabel = useMemo(() =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), [])

  const loadDoneMap = useCallback(async (ids, today) => {
    if (!test) return {}
    if (test.doneField) {
      const { data } = await supabase
        .from(test.doneTable).select('user_id')
        .in('user_id', ids).eq('date', today)
        .not(test.doneField, 'is', null)
      return Object.fromEntries((data || []).map(r => [r.user_id, true]))
    }
    const { data } = await supabase
      .from(test.doneTable).select('user_id')
      .in('user_id', ids).eq('date', today)
    return Object.fromEntries((data || []).map(r => [r.user_id, true]))
  }, [test])

  useEffect(() => {
    const load = async () => {
      if (!coachId || !test) { setLoading(false); return }
      setLoading(true)
      const today = todayIso()

      const { data: links } = await supabase.from('coach_clients').select('client_id').eq('coach_id', coachId)
      const ids = (links || []).map(l => l.client_id).filter(Boolean)

      if (!ids.length) { setPlayers([]); setDoneMap({}); setLoading(false); return }

      const [{ data: profilesData }, done] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', ids),
        loadDoneMap(ids, today),
      ])

      setPlayers((profilesData || []).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      setDoneMap(done)
      setLoading(false)
    }
    load()
  }, [coachId, testKey, loadDoneMap, test])

  // Temps réel : rafraîchir doneMap quand un joueur soumet
  useEffect(() => {
    if (!test || !players.length) return
    const ids = players.map(p => p.id)
    const today = todayIso()
    const ch = supabase.channel(`kiosk-${testKey}-${today}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: test.doneTable },
        async () => {
          const done = await loadDoneMap(ids, today)
          setDoneMap(done)
        }
      ).subscribe()
    return () => supabase.removeChannel(ch)
  }, [players, testKey, test, loadDoneMap])

  const filteredPlayers = useMemo(() => {
    if (statusFilter === 'done') return players.filter(p => !!doneMap[p.id])
    if (statusFilter === 'remaining') return players.filter(p => !doneMap[p.id])
    return players
  }, [players, doneMap, statusFilter])

  const doneCount = Object.values(doneMap).filter(Boolean).length

  if (!test) return (
    <div style={{ minHeight: '100vh', background: P.bg, display: 'grid', placeItems: 'center', color: P.sub, fontFamily: 'Inter, sans-serif' }}>
      Test inconnu. <button onClick={() => navigate('/coach-kiosk')} style={{ marginLeft: 10, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: P.sub }}>Retour</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: 'Inter, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: P.card, border: `1px solid ${P.border}`, borderRadius: 24,
          padding: '18px 24px', marginBottom: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: test.bg, border: `1px solid ${test.border}`,
              display: 'grid', placeItems: 'center', fontSize: 24, flexShrink: 0,
            }}>
              {test.emoji}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.3, textTransform: 'uppercase', color: P.dim, marginBottom: 4 }}>
                {test.label} · {dateLabel}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: P.text }}>Sélectionner un joueur</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              background: '#f5f3ef', border: `1px solid ${P.border}`,
              borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 800, color: P.text,
            }}>
              {doneCount} / {players.length} complétés
            </div>
            <button onClick={() => navigate('/coach-kiosk')} style={{
              border: `1px solid ${P.border}`, background: P.card, color: P.sub,
              borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              ← Changer de test
            </button>
          </div>
        </div>

        {/* Filtre */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 13, color: P.sub }}>
            {doneCount > 0
              ? `${doneCount} joueur${doneCount > 1 ? 's ont' : ' a'} déjà complété aujourd'hui`
              : 'Aucun joueur n\'a encore complété ce test aujourd\'hui'}
          </div>
          <div style={{ display: 'flex', gap: 6, background: P.card, border: `1px solid ${P.border}`, borderRadius: 999, padding: 5 }}>
            {[{ key: 'remaining', label: 'Restants' }, { key: 'all', label: 'Tous' }, { key: 'done', label: 'Terminés' }].map(item => (
              <button key={item.key} onClick={() => setStatusFilter(item.key)} style={{
                height: 34, padding: '0 14px', borderRadius: 999, border: 'none',
                background: statusFilter === item.key ? P.accent : 'transparent',
                color: statusFilter === item.key ? '#fff' : P.text,
                fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>{item.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: P.sub, fontSize: 13 }}>Chargement...</div>
        ) : filteredPlayers.length === 0 ? (
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: 32, textAlign: 'center', color: P.sub, fontWeight: 600 }}>
            {players.length === 0 ? 'Aucun athlète trouvé pour ce coach.' : 'Aucun joueur dans ce filtre.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {filteredPlayers.map(player => (
              <PlayerTile
                key={player.id}
                player={player}
                done={!!doneMap[player.id]}
                onClick={() => {
                  if (doneMap[player.id]) return
                  navigate(`/coach-kiosk/${testKey}/${player.id}`)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
