import { useEffect, useState } from 'react'
import {
  getSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotifications'
import { T } from '../lib/data'

export default function PushNotifToggle({ user }) {
  const [status, setStatus] = useState('off')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    let mounted = true

    async function checkStatus() {
      if (!user?.id) {
        if (mounted) {
          setChecking(false)
          setStatus('off')
          setInfo('')
          setError('Utilisateur non chargé')
        }
        return
      }

      setChecking(true)
      setError('')
      setInfo('')

      try {
        const res = await getSubscriptionStatus(user.id)

        if (!mounted) return

        if (res?.error) {
          setError(res.error)
        }

        if (res?.supported === false) {
          setStatus('off')
          setChecking(false)
          return
        }

        setStatus(res?.subscribed ? 'on' : 'off')
      } catch (err) {
        if (!mounted) return
        console.error('Push status error:', err)
        setError(err?.message || 'Erreur lors de la vérification')
        setStatus('off')
      } finally {
        if (mounted) setChecking(false)
      }
    }

    checkStatus()

    return () => {
      mounted = false
    }
  }, [user?.id])

  async function toggle() {
    if (!user?.id) {
      setError("Utilisateur introuvable. Recharge la page ou reconnecte-toi.")
      return
    }

    setLoading(true)
    setError('')
    setInfo('')

    try {
      if (status === 'on') {
        const res = await unsubscribeFromPush(user.id)

        if (res.success) {
          setStatus('off')
          setInfo('Notifications désactivées')
        } else {
          setError(res.error || 'Erreur lors de la désactivation')
        }
      } else {
        const res = await subscribeToPush(user.id)

        if (res.success) {
          setStatus('on')
          setInfo('Notifications activées')
        } else {
          setError(res.error || "Erreur lors de l'activation")
        }
      }
    } catch (err) {
      console.error('Push toggle error:', err)
      setError(err?.message || 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || checking || !user?.id

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: `1px solid ${T.border}`,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: T.text,
              marginBottom: 4,
            }}
          >
            Notifications push
          </div>

          <div style={{ fontSize: 12, color: T.textDim }}>
            {checking
              ? 'Vérification en cours...'
              : status === 'on'
              ? 'Tu recevras les alertes importantes.'
              : 'Active les notifications pour recevoir les alertes.'}
          </div>
        </div>

        <button
          onClick={toggle}
          disabled={isDisabled}
          style={{
            border: 'none',
            borderRadius: 999,
            padding: '10px 14px',
            fontSize: 12,
            fontWeight: 800,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.6 : 1,
            background:
              status === 'on'
                ? 'rgba(62,207,142,0.16)'
                : 'rgba(157,125,234,0.16)',
            color: status === 'on' ? '#3ecf8e' : T.accentLight,
          }}
        >
          {checking
            ? 'Chargement...'
            : loading
            ? 'Chargement...'
            : status === 'on'
            ? 'Désactiver'
            : 'Activer'}
        </button>
      </div>

      {!user?.id && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#ff4566' }}>
          Utilisateur non chargé
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#ff4566' }}>
          {error}
        </div>
      )}

      {info && !error && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#3ecf8e' }}>
          {info}
        </div>
      )}
    </div>
  )
}
