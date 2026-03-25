import { useMemo, useState } from 'react'
import { supabase } from './supabase'

export function getStoragePublicUrl(bucket, path) {
  if (!bucket || !path) return ''
  const cleanPath = String(path).trim().replace(/^\/+/, '')
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath)
  return data?.publicUrl || ''
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

export function resolveImageUrl({
  imageUrl,
  imagePath,
  imageBucket = 'ui-assets',
  fallback = '',
}) {
  const rawUrl = String(imageUrl || '').trim()
  const rawPath = String(imagePath || '').trim()

  if (rawUrl && isAbsoluteUrl(rawUrl)) {
    return rawUrl
  }

  if (rawUrl) {
    return getStoragePublicUrl(imageBucket, rawUrl)
  }

  if (rawPath) {
    return getStoragePublicUrl(imageBucket, rawPath)
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
    const url = getStoragePublicUrl('ui-assets', path)
    if (url) return url
  }

  return ''
}

export function getGoalHomeCandidates(key) {
  return [
    getStoragePublicUrl('ui-assets', `goalHome/${key}.jpg`),
    getStoragePublicUrl('ui-assets', `goalHome/${key}.jpeg`),
    getStoragePublicUrl('ui-assets', `goalHome/${key}.png`),
    getStoragePublicUrl('ui-assets', `goalHome/${key}.webp`),

    getStoragePublicUrl('ui-assets', `goalHome/goalhome-${key}.jpg`),
    getStoragePublicUrl('ui-assets', `goalHome/goalhome-${key}.png`),
    getStoragePublicUrl('ui-assets', `goalHome/goalhome-${key}.webp`),

    getStoragePublicUrl('ui-assets', `goalhome/${key}.jpg`),
    getStoragePublicUrl('ui-assets', `goalhome/${key}.png`),
    getStoragePublicUrl('ui-assets', `goalhome/${key}.webp`),
  ].filter(Boolean)
}

export function SmartImage({
  candidates = [],
  alt = '',
  style,
  imgStyle,
  fallback = null,
}) {
  const valid = useMemo(() => candidates.filter(Boolean), [candidates])
  const [index, setIndex] = useState(0)

  if (!valid.length) return fallback

  return (
    <div style={style}>
      <img
        src={valid[index]}
        alt={alt}
        style={imgStyle}
        onError={() => {
          setIndex((current) => (current < valid.length - 1 ? current + 1 : current))
        }}
      />
    </div>
  )
}
