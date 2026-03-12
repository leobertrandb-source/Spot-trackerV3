import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap } from '../components/UI'
import { T } from '../lib/data'

// ─── Helpers YouTube ──────────────────────────────────────────────────────────

function extractYoutubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function getYoutubeThumbnail(url) {
  const id = extractYoutubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
}

function getYoutubeEmbedUrl(url) {
  const id = extractYoutubeId(url)
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null
}

// ─── Groupes musculaires ──────────────────────────────────────────────────────

const MUSCLE_GROUPS = [
  'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps',
  'Jambes', 'Fessiers', 'Abdominaux', 'Mollets', 'Cardio', 'Autre',
]

const GROUP_COLORS = {
  'Pectoraux':  '#4d9fff',
  'Dos':        '#9d7dea',
  'Épaules':    '#ff7043',
  'Biceps':     '#26d4e8',
  'Triceps':    '#38bdf8',
  'Jambes':     '#3ecf8e',
  'Fessiers':   '#a78bfa',
  'Abdominaux': '#fbbf24',
  'Mollets':    '#34d399',
  'Cardio':     '#f87171',
  'Autre':      '#8899aa',
}

function groupColor(g) { return GROUP_COLORS[g] || '#8899aa' }

// ─── Styles partagés ──────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', borderRadius: 10, padding: '0 12px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e8edf2', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  height: 42,
}

const labelStyle = {
  fontSize: 11, fontWeight: 800, color: '#8899aa',
  textTransform: 'uppercase', letterSpacing: 0.8,
  display: 'block', marginBottom: 6,
}

// ─── Composant vidéo YouTube ──────────────────────────────────────────────────

function YoutubeEmbed({ url }) {
  const [playing, setPlaying] = useState(false)
  const embedUrl = getYoutubeEmbedUrl(url)
  const thumb    = getYoutubeThumbnail(url)

  if (!embedUrl) return null

  if (playing) {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Exercise video"
        />
      </div>
    )
  }

  return (
    <div
      onClick={() => setPlaying(true)}
      style={{
        borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9',
        background: '#111', cursor: 'pointer', position: 'relative',
      }}
    >
      {thumb && (
        <img src={thumb} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.35)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(255,0,0,0.9)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '18px solid white', marginLeft: 4 }} />
        </div>
      </div>
    </div>
  )
}

// ─── Card exercice ────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, onDelete, isOwner }) {
  const [expanded, setExpanded] = useState(false)
  const color = groupColor(exercise.muscle_group)

  return (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${expanded ? color + '40' : 'rgba(255,255,255,0.07)'}`,
      background: expanded ? `${color}06` : 'rgba(255,255,255,0.025)',
      overflow: 'hidden',
      transition: 'border-color 0.15s ease',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        {/* Thumbnail ou icône */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
          background: `${color}15`, border: `1px solid ${color}30`,
          display: 'grid', placeItems: 'center',
        }}>
          {exercise.youtube_url && getYoutubeThumbnail(exercise.youtube_url) ? (
            <img
              src={getYoutubeThumbnail(exercise.youtube_url)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 20 }}>💪</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e8edf2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {exercise.name}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {exercise.muscle_group && (
              <span style={{
                fontSize: 10, fontWeight: 700, color,
                background: `${color}15`, border: `1px solid ${color}30`,
                padding: '2px 8px', borderRadius: 20,
              }}>
                {exercise.muscle_group}
              </span>
            )}
            {exercise.youtube_url && (
              <span style={{ fontSize: 10, color: '#ff4444', fontWeight: 700 }}>▶ Vidéo</span>
            )}
            {exercise.is_custom && (
              <span style={{ fontSize: 10, color: '#8899aa' }}>· Custom</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOwner && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(exercise.id) }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.5)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px' }}
            >
              ×
            </button>
          )}
          <span style={{ color: '#4a5568', fontSize: 14, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
            ▼
          </span>
        </div>
      </div>

      {/* Contenu déplié */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', display: 'grid', gap: 12 }}>
          {/* Vidéo YouTube */}
          {exercise.youtube_url && <YoutubeEmbed url={exercise.youtube_url} />}

          {/* Description */}
          {exercise.description && (
            <div style={{ fontSize: 13, color: '#8899aa', lineHeight: 1.6 }}>
              {exercise.description}
            </div>
          )}

          {!exercise.youtube_url && !exercise.description && (
            <div style={{ fontSize: 12, color: '#4a5568', fontStyle: 'italic' }}>
              Aucune description ni vidéo.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modal création ───────────────────────────────────────────────────────────

function CreateModal({ onSaved, onClose }) {
  const { user } = useAuth()
  const [name, setName]         = useState('')
  const [muscleGroup, setMG]    = useState('')
  const [youtubeUrl, setYT]     = useState('')
  const [description, setDesc]  = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const ytId    = extractYoutubeId(youtubeUrl)
  const ytThumb = getYoutubeThumbnail(youtubeUrl)
  const ytValid = ytId !== null

  async function save() {
    setError('')
    if (!name.trim()) { setError('Donne un nom à cet exercice.'); return }
    if (youtubeUrl && !ytValid) { setError('URL YouTube invalide. Essaie : https://youtu.be/xxxxx'); return }
    setSaving(true)
    try {
      const baseSlug = name.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const slug = `${baseSlug}-${Date.now()}`

      const { error: e } = await supabase.from('exercises').insert({
        name: name.trim(),
        slug,
        muscle_group: muscleGroup || null,
        youtube_url: youtubeUrl.trim() || null,
        description: description.trim() || null,
        created_by: user.id,
        is_custom: true,
      })
      if (e) throw e
      onSaved()
    } catch (err) {
      setError(err.message || 'Erreur lors de la création.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'grid', placeItems: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500,
          background: '#111820', borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.14)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#e8edf2' }}>Nouvel exercice</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#8899aa', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'grid', gap: 18 }}>
          {/* Nom */}
          <div>
            <label style={labelStyle}>Nom de l'exercice *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex : Curl marteau, Hip thrust..."
              autoFocus
              style={{ ...inputStyle, height: 46, fontSize: 15 }}
            />
          </div>

          {/* Groupe musculaire */}
          <div>
            <label style={labelStyle}>Groupe musculaire</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MUSCLE_GROUPS.map(g => {
                const sel = muscleGroup === g
                const c   = groupColor(g)
                return (
                  <button key={g} type="button" onClick={() => setMG(sel ? '' : g)} style={{
                    padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    border: `1px solid ${sel ? c + '60' : 'rgba(255,255,255,0.08)'}`,
                    background: sel ? `${c}15` : 'rgba(255,255,255,0.03)',
                    color: sel ? c : '#8899aa',
                  }}>
                    {g}
                  </button>
                )
              })}
            </div>
          </div>

          {/* YouTube URL */}
          <div>
            <label style={labelStyle}>Lien YouTube (optionnel)</label>
            <input
              value={youtubeUrl} onChange={e => setYT(e.target.value)}
              placeholder="https://youtu.be/xxxxx ou youtube.com/watch?v=..."
              style={{ ...inputStyle, borderColor: youtubeUrl && !ytValid ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.08)' }}
            />
            {youtubeUrl && ytValid && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={ytThumb} alt="" style={{ width: 80, height: 45, borderRadius: 6, objectFit: 'cover' }} />
                <span style={{ fontSize: 12, color: '#3ecf8e', fontWeight: 700 }}>✓ Vidéo détectée</span>
              </div>
            )}
            {youtubeUrl && !ytValid && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#ff8080' }}>
                URL non reconnue — colle directement depuis la barre du navigateur.
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description / Conseils (optionnel)</label>
            <textarea
              value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Garde le dos droit, contrôle la descente..."
              rows={3}
              style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080', fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, height: 46, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: '#8899aa', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Annuler</button>
          <button type="button" onClick={save} disabled={saving} style={{
            flex: 2, height: 46, borderRadius: 12, border: 'none', fontFamily: 'inherit',
            background: name.trim() ? '#3ecf8e' : 'rgba(62,207,142,0.25)',
            color: name.trim() ? '#05070a' : 'rgba(62,207,142,0.5)',
            fontWeight: 800, fontSize: 14, cursor: name.trim() ? 'pointer' : 'default',
          }}>
            {saving ? 'Sauvegarde...' : 'Créer l\'exercice'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ExercisesPage() {
  const { user } = useAuth()

  const [exercises, setExercises] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [filterType, setFilterType]   = useState('all') // all | custom | standard
  const [showCreate, setShowCreate]   = useState(false)

  const loadExercises = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('exercises').select('*').order('name')
    setExercises(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadExercises() }, [loadExercises])

  async function deleteExercise(id) {
    if (!window.confirm('Supprimer cet exercice ?')) return
    await supabase.from('exercises').delete().eq('id', id)
    setExercises(prev => prev.filter(e => e.id !== id))
  }

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      if (search && !ex.name?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterGroup && ex.muscle_group !== filterGroup) return false
      if (filterType === 'custom' && !ex.is_custom) return false
      if (filterType === 'standard' && ex.is_custom) return false
      return true
    })
  }, [exercises, search, filterGroup, filterType])

  const withVideo  = exercises.filter(e => e.youtube_url).length
  const customCount = exercises.filter(e => e.is_custom).length

  const usedGroups = useMemo(() =>
    [...new Set(exercises.map(e => e.muscle_group).filter(Boolean))], [exercises])

  return (
    <PageWrap>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .ex-anim { animation: fadeUp 0.3s ease both; }
        .ex-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 700px) { .ex-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1100px) { .ex-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 20 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 900, color: '#e8edf2', letterSpacing: '-0.5px' }}>
              Bibliothèque d'exercices
            </div>
            <div style={{ fontSize: 13, color: '#8899aa', marginTop: 4 }}>
              {exercises.length} exercices · {withVideo} avec vidéo · {customCount} custom
            </div>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} style={{
            height: 42, padding: '0 20px', borderRadius: 12, border: 'none',
            background: '#3ecf8e', color: '#05070a',
            fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            + Ajouter un exercice
          </button>
        </div>

        {/* ── Filtres ── */}
        <div style={{ display: 'grid', gap: 10 }}>
          {/* Recherche */}
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un exercice..."
            style={{ ...inputStyle, height: 44 }}
          />

          {/* Filtre type */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'all',      label: `Tous (${exercises.length})` },
              { key: 'custom',   label: `Custom (${customCount})` },
              { key: 'standard', label: 'Standard' },
            ].map(f => (
              <button key={f.key} type="button" onClick={() => setFilterType(f.key)} style={{
                height: 32, padding: '0 14px', borderRadius: 16, cursor: 'pointer',
                border: `1px solid ${filterType === f.key ? '#3ecf8e50' : 'rgba(255,255,255,0.07)'}`,
                background: filterType === f.key ? 'rgba(62,207,142,0.12)' : 'rgba(255,255,255,0.03)',
                color: filterType === f.key ? '#3ecf8e' : '#8899aa',
                fontWeight: 700, fontSize: 12,
              }}>
                {f.label}
              </button>
            ))}

            {/* Filtre groupe */}
            {usedGroups.map(g => {
              const c = groupColor(g)
              const sel = filterGroup === g
              return (
                <button key={g} type="button" onClick={() => setFilterGroup(sel ? '' : g)} style={{
                  height: 32, padding: '0 14px', borderRadius: 16, cursor: 'pointer',
                  border: `1px solid ${sel ? c + '50' : 'rgba(255,255,255,0.07)'}`,
                  background: sel ? `${c}12` : 'rgba(255,255,255,0.03)',
                  color: sel ? c : '#8899aa',
                  fontWeight: 700, fontSize: 12,
                }}>
                  {g}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Liste ── */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8899aa' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', borderRadius: 16,
            border: '1px dashed rgba(255,255,255,0.08)', color: '#4a5568',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div>Aucun exercice trouvé.</div>
            <button type="button" onClick={() => { setSearch(''); setFilterGroup(''); setFilterType('all') }}
              style={{ marginTop: 10, background: 'none', border: 'none', color: '#3ecf8e', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="ex-grid">
            {filtered.map((ex, i) => (
              <div key={ex.id} className="ex-anim" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                <ExerciseCard
                  exercise={ex}
                  onDelete={deleteExercise}
                  isOwner={ex.created_by === user?.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onSaved={() => { setShowCreate(false); loadExercises() }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </PageWrap>
  )
}
