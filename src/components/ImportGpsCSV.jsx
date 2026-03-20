import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import PlayertekLinkModal from './PlayertekLinkModal'

export default function ImportGpsCSV() {
  const { user, profile } = useAuth()
  const coachId = profile?.id || user?.id

  const [rows, setRows] = useState([])
  const [showLink, setShowLink] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]
    const reader = new FileReader()

    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n')

      const parsed = lines.slice(1).map(line => {
        const cols = line.split(',')
        return {
          player_name: cols[2],
          external_id: cols[3],
          date: cols[0],
          distance_km: parseFloat(cols[7]),
          duration_min: parseFloat(cols[6])
        }
      })

      setRows(parsed)
    }

    reader.readAsText(file)
  }

  async function handleImport() {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.functions.invoke(
        'import-gps-csv',
        {
          body: {
            coachId,
            sessions: rows
          }
        }
      )

      if (error) throw error

    } catch (e) {
      setError('Erreur import')
    }

    setLoading(false)
  }

  return (
    <div>
      <h2>Import GPS</h2>

      <input type="file" onChange={handleFile} />

      <button onClick={() => setShowLink(true)}>
        Lier joueurs
      </button>

      <button onClick={handleImport} disabled={loading}>
        Importer
      </button>

      {error && <div>{error}</div>}

      {showLink && (
        <PlayertekLinkModal
          players={rows}
          onClose={() => setShowLink(false)}
        />
      )}
    </div>
  )
}
