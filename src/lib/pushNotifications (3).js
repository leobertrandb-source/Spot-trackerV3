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
    return { supported: true, registration }
  } catch (err) {
    console.error('SW registration failed:', err)
    return {
      supported: false,
      error: err?.message || 'Impossible d\'enregistrer le service worker',
    }
  }
}

export async function getSubscriptionStatus(userId) {
  const sw = await registerServiceWorker()

  if (!sw.supported) {
    return { subscribed: false, supported: false, error: sw.error }
  }

  try {
    const existing = await sw.registration.pushManager.getSubscription()

    if (!existing) {
      return { subscribed: false, supported: true }
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', existing.endpoint)
      .maybeSingle()

    if (error) {
      console.error('Subscription status DB error:', error)
      // On considère abonné si la subscription browser existe
      return { subscribed: true, supported: true, subscription: existing }
    }

    // FIX : si la subscription existe en browser mais pas en DB → la re-sauvegarder
    if (!data && existing) {
      try {
        const subJson = existing.toJSON()
        if (subJson?.endpoint && subJson?.keys?.p256dh && subJson?.keys?.auth) {
          await supabase.from('push_subscriptions').upsert(
            {
              user_id: userId,
              endpoint: subJson.endpoint,
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
            { onConflict: 'user_id,endpoint' }
          )
        }
      } catch (resyncErr) {
        console.warn('Resync subscription failed:', resyncErr)
      }
      return { subscribed: true, supported: true, subscription: existing }
    }

    return { subscribed: !!data, supported: true, subscription: existing }
  } catch (err) {
    console.error('getSubscriptionStatus error:', err)
    return { subscribed: false, supported: true, error: err?.message }
  }
}

export async function subscribeToPush(userId) {
  const sw = await registerServiceWorker()

  if (!sw.supported) {
    return { success: false, error: sw.error || 'Notifications non supportées' }
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID public key manquante — vérifie REACT_APP_VAPID_PUBLIC_KEY dans .env')
    return {
      success: false,
      error: 'Configuration manquante. Contacte l\'administrateur.',
    }
  }

  try {
    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      return { success: false, error: 'Permission refusée par l\'utilisateur' }
    }

    const existing = await sw.registration.pushManager.getSubscription()

    // FIX : nettoyer proprement l'ancienne subscription
    if (existing) {
      try {
        // Supprimer en DB d'abord
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', existing.endpoint)
        // Puis désabonner le browser
        await existing.unsubscribe()
      } catch (cleanupErr) {
        console.warn('Cleanup old subscription warning:', cleanupErr)
        // On continue quand même
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
      throw new Error('Abonnement push invalide — données manquantes')
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

    if (error) throw error

    return { success: true, subscription }
  } catch (err) {
    console.error('Subscribe error:', err)
    return {
      success: false,
      error: err?.message || 'Erreur inconnue pendant l\'abonnement push',
    }
  }
}

export async function unsubscribeFromPush(userId) {
  if (!isPushSupported()) {
    return { success: false, error: 'Notifications non supportées par ce navigateur' }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Pas de subscription browser → nettoyer quand même en DB (orphelins)
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
      return { success: true }
    }

    const endpoint = subscription.endpoint

    // Supprimer en DB
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    if (error) throw error

    // Désabonner le browser
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

// ── Nettoyage des endpoints orphelins en DB ───────────────────────────────────
// À appeler occasionnellement (ex: au login du coach)
export async function cleanOrphanSubscriptions(userId) {
  if (!isPushSupported()) return

  try {
    const registration = await navigator.serviceWorker.ready
    const browserSub = await registration.pushManager.getSubscription()

    if (!browserSub) {
      // Pas de subscription browser → supprimer tout en DB pour cet user
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
      return
    }

    // Supprimer les entrées DB qui ne correspondent plus à l'endpoint actif
    const { data: dbSubs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint')
      .eq('user_id', userId)

    const toDelete = (dbSubs || [])
      .filter(s => s.endpoint !== browserSub.endpoint)
      .map(s => s.id)

    if (toDelete.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', toDelete)
    }
  } catch (err) {
    console.warn('cleanOrphanSubscriptions error:', err)
  }
}
