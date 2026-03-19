// src/lib/pushNotifications.js
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function isSecurePushContext() {
  return window.isSecureContext || window.location.hostname === 'localhost'
}

export async function registerServiceWorker() {
  if (!isPushSupported()) {
    return {
      supported: false,
      error: 'Notifications push non supportées par ce navigateur',
    }
  }

  if (!isSecurePushContext()) {
    return {
      supported: false,
      error: 'Les notifications push nécessitent HTTPS ou localhost',
    }
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    return {
      supported: true,
      registration,
    }
  } catch (err) {
    console.error('SW registration failed:', err)
    return {
      supported: false,
      error: err?.message || 'Impossible d’enregistrer le service worker',
    }
  }
}

export async function getSubscriptionStatus(userId) {
  const sw = await registerServiceWorker()

  if (!sw.supported) {
    return {
      subscribed: false,
      supported: false,
      error: sw.error,
    }
  }

  try {
    const existing = await sw.registration.pushManager.getSubscription()

    if (!existing) {
      return {
        subscribed: false,
        supported: true,
      }
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', existing.endpoint)
      .maybeSingle()

    if (error) {
      console.error('Subscription status DB error:', error)
      return {
        subscribed: true,
        supported: true,
        subscription: existing,
      }
    }

    return {
      subscribed: !!data,
      supported: true,
      subscription: existing,
    }
  } catch (err) {
    console.error('getSubscriptionStatus error:', err)
    return {
      subscribed: false,
      supported: true,
      error: err?.message || 'Erreur lors de la vérification',
    }
  }
}

export async function subscribeToPush(userId) {
  const sw = await registerServiceWorker()

  if (!sw.supported) {
    return {
      success: false,
      error: sw.error || 'Notifications non supportées',
    }
  }

  if (!VAPID_PUBLIC_KEY) {
    return {
      success: false,
      error: 'Clé VAPID publique manquante (REACT_APP_VAPID_PUBLIC_KEY)',
    }
  }

  try {
    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Permission refusée',
      }
    }

    const existing = await sw.registration.pushManager.getSubscription()

    if (existing) {
      try {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', existing.endpoint)

        await existing.unsubscribe()
      } catch (cleanupErr) {
        console.warn('Cleanup old subscription warning:', cleanupErr)
      }
    }

    const subscription = await sw.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const subscriptionJson = subscription.toJSON()
    const endpoint = subscriptionJson?.endpoint
    const keys = subscriptionJson?.keys || {}

    if (!endpoint || !keys.p256dh || !keys.auth) {
      throw new Error('Abonnement push invalide')
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'user_id,endpoint' }
    )

    if (error) {
      throw error
    }

    return {
      success: true,
      subscription,
    }
  } catch (err) {
    console.error('Subscribe error:', err)
    return {
      success: false,
      error: err?.message || 'Erreur inconnue pendant l’abonnement push',
    }
  }
}

export async function unsubscribeFromPush(userId) {
  if (!isPushSupported()) {
    return {
      success: false,
      error: 'Notifications non supportées par ce navigateur',
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return { success: true }
    }

    const endpoint = subscription.endpoint

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    if (error) {
      throw error
    }

    await subscription.unsubscribe()

    return { success: true }
  } catch (err) {
    console.error('Unsubscribe error:', err)
    return {
      success: false,
      error: err?.message || 'Erreur lors de la désactivation',
    }
  }
}
