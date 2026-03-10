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

export function slugifyExerciseName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function resolveExerciseImage(exerciseName) {
  const slug = slugifyExerciseName(exerciseName)
  if (!slug) return ''

  const bucket = 'ui-assets'
  const candidates = [
    `exercises/${slug}.jpg`,
    `exercises/${slug}.png`,
    `${slug}.jpg`,
    `${slug}.png`,
  ]

  for (const path of candidates) {
    const url = getStoragePublicUrl(bucket, path)
    if (url) return url
  }

  return ''
}

export function resolveUiAssetImage(...paths) {
  for (const path of paths) {
    if (!path) continue
    const url = getStoragePublicUrl('ui-assets', path)
    if (url) return url
  }
  return ''
}
