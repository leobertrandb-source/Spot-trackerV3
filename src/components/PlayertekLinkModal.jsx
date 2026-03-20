import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function PlayertekLinkModal({ players = [], onClose }) {
  const { user, profile } = useAuth()
  const coachId = profile?.id || user?.id

  const [athletes, setAthletes] = useState([])
  const [map, setMap] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAthletes()
  }, [])

  async function loadAthletes() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
    setAthletes(data || [])
  }

  const uniquePlayers = useMemo(() => {
    const seen = new Set()
    return players.filter(p => {
      if (!p.player_name) return false
      if (seen.has(p.player_name)) return false
      seen.add(p.player_name)
      return true
    })
  }, [players])

  async function handleSave() {
    setLoading(true)
    setError('')

    try {
      const mappings = uniquePlayers.map(p => ({
        player_name: p.player_name,
        external_id: p.external_id,
        athlete_id: map[p.player_name]
      })).filter(m => m.athlete_id)

      const { error } = await supabase.functions.invoke(
        'link-playertek-athletes',
        {
          body: { coachId, mappings }
        }
      )

      if (error) throw error

      onClose()
    } catch (e) {
      setError('Erreur sauvegarde')
    }

    setLoading(false)
  }

  return (
    <div>
      <h2>Lier les joueurs</h2>

      {uniquePlayers.map(p => (
        <div key={p.player_name}>
          <span>{p.player_name}</span>

          <select
            onChange={(e) =>
              setMap(prev => ({
                ...prev,
                [p.player_name]: e.target.value
              }))
            }
          >
            <option>Choisir</option>
            {athletes.map(a => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </div>
      ))}

      {error && <div>{error}</div>}

      <button onClick={handleSave} disabled={loading}>
        Sauvegarder
      </button>
    </div>
  )
}
