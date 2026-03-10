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

export function getGoalHomeImage(key) {
  const candidates = [
    `goalHome/${key}.jpg`,
    `goalHome/${key}.jpeg`,
    `goalHome/${key}.png`,
    `goalHome/${key}.webp`,
    `goalHome/goalhome-${key}.jpg`,
    `goalHome/goalhome-${key}.png`,
    `goalHome/goalhome-${key}.webp`,
    `goalhome/${key}.jpg`,
    `goalhome/${key}.png`,
    `goalhome/${key}.webp`,
  ]

  for (const path of candidates) {
    const url = getStoragePublicUrl('ui-assets', path)
    if (url) return url
  }

  return ''
}
