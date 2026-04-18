import { useEffect, useState } from 'react'
import {
  getSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotifications'

export default function PushNotifToggle({ user, light = false }) {
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

  const borderColor = light ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'
  const textColor   = light ? '#1a1a2e' : '#f0f0f0'
  const subColor    = light ? '#6b7280' : '#9ca3af'
  const bg          = light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: `1px solid ${borderColor}`,
        background: bg,
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
              color: textColor,
              marginBottom: 4,
            }}
          >
            Notifications push
          </div>

          <div style={{ fontSize: 12, color: subColor }}>
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
            color: status === 'on' ? '#3ecf8e' : '#9d7dea',
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
