import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export default function PlayertekLinkModal({ provider = 'playertek', players = [], onClose, onSaved }) {
  const { user, profile } = useAuth()
  const coachId = profile?.id || user?.id || null
  const [athletes, setAthletes] = useState([])
  const [loadingAthletes, setLoadingAthletes] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedMap, setSelectedMap] = useState({})

  useEffect(() => {
    let active = true
    async function loadAthletes() {
      if (!coachId) {
        if (active) {
          setAthletes([])
          setLoadingAthletes(false)
        }
        return
      }
      setLoadingAthletes(true)
      try {
        const { data, error } = await supabase
          .from('coach_clients')
          .select(`
            client_id,
            profiles!coach_clients_client_id_fkey (
              id,
              full_name,
              email
            )
          `)
          .eq('coach_id', coachId)
        if (error) throw error
        const list = (data || [])
          .map((row) => row.profiles)
          .filter(Boolean)
          .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
        if (active) setAthletes(list)
      } catch (error) {
        console.error(error)
        if (active) setErrorMessage("Impossible de charger les athlètes.")
      } finally {
        if (active) setLoadingAthletes(false)
      }
    }
    loadAthletes()
    return () => { active = false }
  }, [coachId])

  const normalizedAthletes = useMemo(() => athletes.map((athlete) => ({
    ...athlete,
    normalized_name: normalizeName(athlete.full_name),
  })), [athletes])

  const uniquePlayers = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const row of players) {
      const externalId = String(row?.external_id || '').trim()
      const playerName = String(row?.player_name || '').trim()
      const key = `${externalId}::${playerName}`
      if (!playerName || seen.has(key)) continue
      seen.add(key)
      const suggestion = normalizedAthletes.find((athlete) => athlete.normalized_name === normalizeName(playerName)) || null
      out.push({ external_id: externalId, player_name: playerName, suggestion_id: suggestion?.id || '' })
    }
    return out
  }, [players, normalizedAthletes])

  useEffect(() => {
    const next = {}
    uniquePlayers.forEach((player) => {
      next[player.external_id || player.player_name] = player.suggestion_id || ''
    })
    setSelectedMap(next)
  }, [uniquePlayers])

  async function handleSave() {
    const mappings = uniquePlayers
      .map((player) => ({
        external_id: player.external_id,
        player_name: player.player_name,
        athlete_id: selectedMap[player.external_id || player.player_name] || '',
      }))
      .filter((row) => row.athlete_id)

    if (!coachId) return setErrorMessage("Coach introuvable.")
    if (!mappings.length) return setErrorMessage("Aucune liaison sélectionnée.")

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/link-playertek-athletes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ coachId, provider, mappings }),
        }
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Erreur lors de la sauvegarde.')
      setSuccessMessage('Liaisons enregistrées.')
      onSaved?.(payload?.stats || null)
    } catch (error) {
      console.error(error)
      setErrorMessage(error?.message || "Erreur lors de la sauvegarde.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'rgba(14,18,16,0.98)', border: `1px solid ${T.border}`, borderRadius: 20, padding: 20, color: T.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: T.text }}>Lier les joueurs PlayerTek</div>
          <div style={{ color: T.textDim, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Associe les noms du CSV aux athlètes de l'application.
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.03)', color: T.textMid, cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>

      {loadingAthletes ? (
        <div style={{ padding: 18, color: T.textDim }}>Chargement des athlètes...</div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 800, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            <div>Joueur PlayerTek</div>
            <div>Athlète app</div>
          </div>
          <div style={{ display: 'grid' }}>
            {uniquePlayers.map((player, index) => (
              <div key={`${player.external_id}-${player.player_name}-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, padding: 12, borderBottom: index === uniquePlayers.length - 1 ? 'none' : `1px solid ${T.border}33`, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{player.player_name}</div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>ID externe : {player.external_id || 'non fourni'}</div>
                </div>
                <select
                  value={selectedMap[player.external_id || player.player_name] || ''}
                  onChange={(e) => setSelectedMap((prev) => ({ ...prev, [player.external_id || player.player_name]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 13 }}
                >
                  <option value="">Choisir un athlète</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>{athlete.full_name || athlete.email}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage ? <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: '1px solid rgba(255,120,120,0.24)', background: 'rgba(255,90,90,0.06)', color: '#FFB3B3', fontWeight: 700, fontSize: 13 }}>{errorMessage}</div> : null}
      {successMessage ? <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: `1px solid ${T.accent}30`, background: 'rgba(45,255,155,0.08)', color: T.accentLight, fontWeight: 700, fontSize: 13 }}>{successMessage}</div> : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <button type="button" onClick={onClose} style={{ height: 42, borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.03)', color: T.textMid, padding: '0 16px', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>Fermer</button>
        <button type="button" onClick={handleSave} disabled={saving || loadingAthletes} style={{ height: 42, borderRadius: 12, border: `1px solid ${T.accent + '30'}`, background: `${T.accent}16`, color: T.accentLight, padding: '0 16px', cursor: saving || loadingAthletes ? 'default' : 'pointer', fontWeight: 900, fontSize: 13, opacity: saving || loadingAthletes ? 0.7 : 1 }}>
          {saving ? 'Enregistrement...' : 'Enregistrer les liaisons'}
        </button>
      </div>
    </div>
  )
}
