// src/components/PushNotifToggle.jsx
// Bouton d'activation des notifications — à intégrer dans PrepHooperPage
// Usage : <PushNotifToggle />

import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { subscribeToPush, unsubscribeFromPush, getSubscriptionStatus } from '../lib/pushNotifications'
import { T } from '../lib/data'

export default function PushNotifToggle() {
  const { user } = useAuth()
  const [status, setStatus]   = useState('loading') // loading | unsupported | off | on
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getSubscriptionStatus(user.id).then(({ supported, subscribed }) => {
      if (!supported) setStatus('unsupported')
      else setStatus(subscribed ? 'on' : 'off')
    })
  }, [user.id])

  async function toggle() {
    setLoading(true)
    if (status === 'on') {
      await unsubscribeFromPush(user.id)
      setStatus('off')
    } else {
      const { success } = await subscribeToPush(user.id)
      setStatus(success ? 'on' : 'off')
    }
    setLoading(false)
  }

  if (status === 'loading' || status === 'unsupported') return null

  const isOn = status === 'on'

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderRadius: 12,
      background: isOn ? 'rgba(62,207,142,0.06)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isOn ? T.accent + '30' : T.border}`,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
          {isOn ? '🔔 Rappels activés' : '🔕 Rappels désactivés'}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
          {isOn
            ? 'Tu recevras un rappel si tu oublies ton HOOPER'
            : 'Active pour recevoir un rappel quotidien'}
        </div>
      </div>
      <button onClick={toggle} disabled={loading}
        style={{
          padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
          cursor: loading ? 'default' : 'pointer', border: 'none',
          background: isOn ? 'rgba(255,69,102,0.15)' : `${T.accent}20`,
          color: isOn ? '#ff4566' : T.accentLight,
        }}>
        {loading ? '...' : isOn ? 'Désactiver' : 'Activer'}
      </button>
    </div>
  )
}
