import { useState } from 'react'
import { subscribeToPush, unsubscribeFromPush } from '../lib/pushNotifications'

export default function PushNotifToggle({ user }) {
  const [status, setStatus] = useState('off')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    if (!user?.id) {
      setError("Utilisateur introuvable. Recharge la page ou reconnecte-toi.")
      return
    }

    setLoading(true)
    setError('')

    try {
      if (status === 'on') {
        const res = await unsubscribeFromPush(user.id)

        if (res.success) {
          setStatus('off')
        } else {
          setError(res.error || 'Erreur lors de la désactivation')
        }
      } else {
        const res = await subscribeToPush(user.id)

        if (res.success) {
          setStatus('on')
        } else {
          setError(res.error || "Erreur lors de l'activation")
        }
      }
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={toggle} disabled={loading || !user?.id}>
        {loading
          ? 'Chargement...'
          : status === 'on'
          ? 'Désactiver les notifications'
          : 'Activer les notifications'}
      </button>

      {!user?.id && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'red' }}>
          Utilisateur non chargé
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'red' }}>
          {error}
        </div>
      )}
    </div>
  )
}
