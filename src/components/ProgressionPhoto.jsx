import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, Card, Input, Label } from './UI'
import { T } from '../lib/data'

function formatDateFR(d) {
  if (!d) return ''
  if (typeof d === 'string' && d.includes('-')) {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }
  return String(d)
}

function extFromFile(file) {
  const n = (file?.name || '').toLowerCase()
  if (n.endsWith('.png')) return 'png'
  if (n.endsWith('.webp')) return 'webp'
  if (n.endsWith('.jpeg')) return 'jpg'
  return 'jpg'
}

/**
 * ProgressionPhoto
 * Props:
 * - userId: uuid of current user
 * - limit?: number (default 36)
 */
export default function ProgressionPhoto({ userId, limit = 36 }) {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [photos, setPhotos] = useState([])
  const [photoUrls, setPhotoUrls] = useState({}) // storage_path -> signedUrl

  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [photoTag, setPhotoTag] = useState('front') // front/side/back/other
  const [photoNote, setPhotoNote] = useState('')

  const canLoad = Boolean(userId)

  async function refreshSignedUrls(list) {
    // list = rows progress_photos
    const entries = await Promise.all(
      (list || []).map(async (ph) => {
        const { data, error } = await supabase.storage
          .from('progress-photos')
          .createSignedUrl(ph.storage_path, 60 * 60) // 1h

        if (error) {
          console.error('signed url error', ph.storage_path, error)
          return [ph.storage_path, null]
        }
        return [ph.storage_path, data?.signedUrl || null]
      })
    )

    const map = {}
    for (const [path, url] of entries) map[path] = url
    setPhotoUrls(map)
  }

  async function loadPhotos() {
    if (!canLoad) return
    setLoading(true)

    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .order('photo_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('progress_photos load error', error)
      setPhotos([])
      setPhotoUrls({})
      setLoading(false)
      return
    }

    const rows = data || []
    setPhotos(rows)
    await refreshSignedUrls(rows)
    setLoading(false)
  }

  useEffect(() => {
    loadPhotos()
    // pas de eslint-disable, Vercel sinon casse
  }, [userId])

  const grouped = useMemo(() => {
    // optional grouping by date
    const m = new Map()
    for (const ph of photos) {
      const k = ph.photo_date || 'unknown'
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(ph)
    }
    return Array.from(m.entries())
  }, [photos])

  async function uploadProgressPhoto(file) {
    if (!userId) return
    if (!file) return

    setUploading(true)
    try {
      const ext = extFromFile(file)
      const safeTag = String(photoTag || 'front').toLowerCase().trim() || 'front'
      const path = `${userId}/${photoDate}/${safeTag}-${Date.now()}.${ext}`

      // 1) upload storage
      const { error: upErr } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, {
          upsert: false,
          contentType: file.type || `image/${ext}`,
        })

      if (upErr) {
        console.error('upload error', upErr)
        alert(upErr.message)
        return
      }

      // 2) insert DB row
      const { error: insErr } = await supabase.from('progress_photos').insert({
        user_id: userId,
        photo_date: photoDate,
        tag: safeTag,
        storage_path: path,
        note: photoNote || null,
      })

      if (insErr) {
        console.error('insert progress_photos error', insErr)
        alert(insErr.message)
        return
      }

      setPhotoNote('')
      await loadPhotos()
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Card>
        <Label>Ajouter une photo</Label>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            marginTop: 10,
          }}
        >
          <Input label="Date" type="date" value={photoDate} onChange={setPhotoDate} />
          <Input label="Tag" value={photoTag} onChange={setPhotoTag} placeholder="front / side / back" />
          <Input label="Note" value={photoNote} onChange={setPhotoNote} placeholder="optionnel" />

          <div style={{ alignSelf: 'end' }}>
            <div style={{ color: T.textDim, fontSize: 12, marginBottom: 6 }}>Fichier</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadProgressPhoto(e.target.files?.[0])}
              disabled={uploading}
              style={{
                width: '100%',
                color: T.textMid,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: T.radius,
                padding: 10,
              }}
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <Btn disabled={uploading}>{uploading ? 'Upload…' : 'Sélectionner une photo'}</Btn>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Label>Galerie</Label>

        {loading ? (
          <div style={{ color: T.textDim, padding: 20 }}>Chargement…</div>
        ) : photos.length ? (
          <div style={{ display: 'grid', gap: 14 }}>
            {grouped.map(([date, items]) => (
              <div key={date}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, letterSpacing: 1, color: T.text }}>
                    {formatDateFR(date)}
                  </div>
                  <div style={{ color: T.textDim, fontSize: 12 }}>{items.length} photo(s)</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  {items.map((ph) => {
                    const url = photoUrls[ph.storage_path]
                    return (
                      <div
                        key={ph.id}
                        style={{
                          border: `1px solid ${T.border}`,
                          borderRadius: T.radius,
                          background: T.surface,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ aspectRatio: '1 / 1', background: T.card }}>
                          {url ? (
                            <img
                              src={url}
                              alt={ph.tag || 'photo'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              loading="lazy"
                            />
                          ) : (
                            <div
                              style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: T.textDim,
                                fontSize: 12,
                              }}
                            >
                              (URL…)
                            </div>
                          )}
                        </div>

                        <div style={{ padding: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ fontFamily: T.fontBody, fontWeight: 900, color: T.text }}>
                              {String(ph.tag || 'photo').toUpperCase()}
                            </div>
                            <div style={{ color: T.textSub, fontSize: 12 }}>{formatDateFR(ph.photo_date)}</div>
                          </div>

                          {ph.note ? (
                            <div style={{ marginTop: 6, color: T.textMid, fontSize: 12 }}>
                              {ph.note}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: T.textMid }}>Aucune photo enregistrée.</div>
        )}
      </Card>
    </div>
  )
}