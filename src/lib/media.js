import { supabase } from './supabase'

export function getStoragePublicUrl(bucket, path) {
  if (!bucket || !path) return ''
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl || ''
}

export function resolveImageUrl({
  imageUrl,
  imagePath,
  imageBucket = 'ui-assets',
  fallback = '',
}) {
  if (imageUrl && String(imageUrl).trim()) {
    return String(imageUrl).trim()
  }

  if (imagePath && String(imagePath).trim()) {
    return getStoragePublicUrl(imageBucket, String(imagePath).trim())
  }

  return fallback
}

export function resolveExerciseImage(slug) {
  if (!slug) return ''

  const candidates = [
    `exercises/${slug}.jpg`,
    `exercises/${slug}.jpeg`,
    `exercises/${slug}.png`,
    `exercises/${slug}.webp`,
  ]

  for (const path of candidates) {
    const { data } = supabase.storage.from('ui-assets').getPublicUrl(path)
    if (data?.publicUrl) {
      return data.publicUrl
    }
  }

  return ''
}

export function getGoalHomeImage(key) {
  const candidates = [
    `goalHome/${key}.jpg`,
    `goalHome/${key}.jpeg`,
    `goalHome/${key}.png`,
    `goalHome/${key}.webp`,
  ]

  for (const path of candidates) {
    const { data } = supabase.storage.from('ui-assets').getPublicUrl(path)
    if (data?.publicUrl) {
      return data.publicUrl
    }
  }

  return ''
}
