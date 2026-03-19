
import { useState } from 'react'
import { subscribeToPush } from '../lib/pushNotifications'

export default function PushNotifToggle({ user }) {
  const [status, setStatus] = useState('off')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    setLoading(true)
    setError('')

    const res = await subscribeToPush(user.id)

    if (res.success) {
      setStatus('on')
    } else {
      setError(res.error || 'Erreur inconnue')
    }

    setLoading(false)
  }

  return (
    <div>
      <button onClick={toggle} disabled={loading}>
        {loading ? 'Chargement...' : 'Activer notifications'}
      </button>

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'red' }}>
          {error}
        </div>
      )}
    </div>
  )
}
