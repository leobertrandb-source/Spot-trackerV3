// src/lib/pushNotifications.js
import { supabase } from './supabase'

// ── Clé publique VAPID ────────────────────────────────────────────────────────
// Génère ta paire VAPID : npx web-push generate-vapid-keys
// Mets la clé publique ici et la privée dans les env vars Supabase
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// ── Enregistrement du service worker ─────────────────────────────────────────
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false }
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    return { supported: true, registration: reg }
  } catch (err) {
    console.error('SW registration failed:', err)
    return { supported: false, error: err }
  }
}

// ── Vérifier si l'user est déjà abonné ───────────────────────────────────────
export async function getSubscriptionStatus(userId) {
  const { supported, registration } = await registerServiceWorker()
  if (!supported) return { subscribed: false, supported: false }

  const existing = await registration.pushManager.getSubscription()
  if (!existing) return { subscribed: false, supported: true }

  // Vérifier en base
  const { data } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('endpoint', existing.endpoint)
    .maybeSingle()

  return { subscribed: !!data, supported: true, subscription: existing }
}

// ── S'abonner aux notifications ───────────────────────────────────────────────
export async function subscribeToPush(userId) {
  const { supported, registration } = await registerServiceWorker()
  if (!supported) return { success: false, error: 'Non supporté par ce navigateur' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { success: false, error: 'Permission refusée' }

  try {
    // Désabonner l'ancienne si elle existe
    const existing = await registration.pushManager.getSubscription()
    if (existing) await existing.unsubscribe()

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const { endpoint, keys } = subscription.toJSON()

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, { onConflict: 'user_id,endpoint' })

    if (error) throw error
    return { success: true, subscription }
  } catch (err) {
    console.error('Subscribe error:', err)
    return { success: false, error: err.message }
  }
}

// ── Se désabonner ─────────────────────────────────────────────────────────────
export async function unsubscribeFromPush(userId) {
  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (subscription) {
      await supabase.from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
      await subscription.unsubscribe()
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
