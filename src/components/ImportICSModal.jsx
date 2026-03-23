import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const P = {
  bg:     '#f5f3ef',
  card:   '#ffffff',
  border: '#e8e4dc',
  text:   '#1a1a1a',
  sub:    '#6b6b6b',
  dim:    '#9e9e9e',
  accent: '#1a3a2a',
  green:  '#2d6a4f',
  yellow: '#b5830a',
  red:    '#c0392b',
  blue:   '#1a3a5c',
}

// ── Parser ICS ───────────────────────────────────────────────────────────────
function parseICS(text) {
  const events = []
  let current = null

  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line === 'BEGIN:VEVENT') {
      current = {}
    } else if (line === 'END:VEVENT' && current) {
      if (current.summary && current.dtstart) {
        events.push(current)
      }
      current = null
    } else if (current) {
      if (line.startsWith('SUMMARY:')) {
        current.summary = line.slice(8).replace(/\\n/g, ' ').trim()
      } else if (line.startsWith('DTSTART')) {
        const val = line.split(':').slice(1).join(':')
        current.dtstart = val
      } else if (line.startsWith('LOCATION:')) {
        current.location = line.slice(9).replace(/\\n/g, ', ').replace(/\\,/g, ',').trim()
      } else if (line.startsWith('URL:')) {
        current.url = line.slice(4).trim()
      } else if (line.startsWith('DESCRIPTION:')) {
        current.description = line.slice(12).replace(/\\n/g, ' ').trim()
      } else if (line.startsWith('UID:')) {
        current.uid = line.slice(4).trim()
      }
    }
  }

  return events
}

function parseDate(dtstart) {
  if (!dtstart) return null
  const clean = dtstart.replace(/[TZ]/g, '').slice(0, 8)
  if (clean.length === 8) {
    return `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`
  }
  return null
}

function normalizeTeamName(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(stade|rugby|club|rc|sc|us|as|fc)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTeams(summary) {
  if (!summary) return { homeTeam: '', awayTeam: '' }

  const main = summary.split('|')[0].trim()
  const separators = [' - ', ' vs ', ' VS ', ' / ']

  for (const sep of separators) {
    if (main.includes(sep)) {
      const [homeTeam, awayTeam] = main.split(sep).map(s => s.trim())
      return { homeTeam: homeTeam || '', awayTeam: awayTeam || '' }
    }
  }

  return { homeTeam: '', awayTeam: '' }
}

function isMatchingTeam(summary, teamName, aliases = []) {
  const { homeTeam, awayTeam } = extractTeams(summary)

  const candidates = [teamName, ...aliases]
    .map(normalizeTeamName)
    .filter(Boolean)

  if (!candidates.length) return true

  const home = normalizeTeamName(homeTeam)
  const away = normalizeTeamName(awayTeam)

  return candidates.some(name => home === name || away === name)
}

function buildFallbackUid(event, teamName) {
  const summary = event.summary?.split('|')[0].trim() || ''
  const date = parseDate(event.dtstart) || 'no-date'
  const location = event.location || 'no-location'
  const target = normalizeTeamName(teamName || 'unknown-team')
  return `ics:${target}:${summary}:${date}:${location}`
}

export default function ImportICSModal({
  onClose,
  onImported,
  teamName,
  teamAliases = [],
}) {
  const { user, gym } = useAuth()
  const fileRef = useRef()

  const [tab, setTab] = useState('file')
  const [icalUrl, setIcalUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')
  const [filterTeam, setFilterTeam] = useState(true)
  const [manualTeamName, setManualTeamName] = useState(teamName || '')
  const [replaceExisting, setReplaceExisting] = useState(true)

  useEffect(() => {
    if (gym?.ical_url) {
      setSavedUrl(gym.ical_url)
      setIcalUrl(gym.ical_url)
    }
  }, [gym])

  useEffect(() => {
    if (teamName) {
      setManualTeamName(teamName)
    }
  }, [teamName])

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const events = parseICS(ev.target.result)
      setPreview(events)
      setMsg(`${events.length} événements trouvés dans le fichier.`)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleLoadUrl() {
    if (!icalUrl.trim()) return
    setSyncing(true)
    setMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/fetch-ical`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: icalUrl.trim() }),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      const events = parseICS(data.content)
      setPreview(events)
      setMsg(`${events.length} événements trouvés.`)
    } catch (err) {
      setMsg(`❌ ${err.message}`)
    }

    setSyncing(false)
  }

  async function saveUrl() {
    if (!gym?.id) return
    await supabase.from('gyms').update({ ical_url: icalUrl.trim() }).eq('id', gym.id)
    setSavedUrl(icalUrl.trim())
    setMsg('✓ URL sauvegardée — synchronisation automatique activée')
  }

  async function handleImport() {
    if (filterTeam && !manualTeamName.trim()) {
      setMsg('❌ Entre le nom de ton équipe avant d’importer.')
      return
    }

    const activeTeamName = manualTeamName.trim()
    const toImport = filterTeam && activeTeamName
      ? preview.filter(e => isMatchingTeam(e.summary, activeTeamName, teamAliases))
      : preview

    if (!toImport.length) {
      setMsg('Aucun match à importer.')
      return
    }

    setImporting(true)
    setMsg('')

    try {
      const rows = toImport
        .map(e => {
          const summary = e.summary?.split('|')[0].trim() || ''
          const { homeTeam, awayTeam } = extractTeams(summary)

          const normalizedTeam = normalizeTeamName(activeTeamName)
          const isHome = normalizeTeamName(homeTeam) === normalizedTeam
          const isAway = normalizeTeamName(awayTeam) === normalizedTeam

          const opponent = isHome
            ? awayTeam
            : isAway
              ? homeTeam
              : summary

          return {
            coach_id: user.id,
            label: summary,
            match_date: parseDate(e.dtstart),
            opponent: opponent || summary,
            location: e.location || null,
            external_uid: e.uid || buildFallbackUid(e, activeTeamName),
          }
        })
        .filter(r => r.match_date)

      if (!rows.length) {
        setMsg('Aucun match avec date valide à importer.')
        setImporting(false)
        return
      }

      if (replaceExisting) {
        const externalUids = rows.map(r => r.external_uid).filter(Boolean)

        const { error: deleteError } = await supabase
          .from('match_history')
          .delete()
          .eq('coach_id', user.id)
          .in('external_uid', externalUids)

        if (deleteError) {
          throw deleteError
        }

        const { error: deleteWrongTeamError } = await supabase
          .from('match_history')
          .delete()
          .eq('coach_id', user.id)
          .not('external_uid', 'is', null)
          .not('label', 'ilike', `%${activeTeamName}%`)

        if (deleteWrongTeamError) {
          throw deleteWrongTeamError
        }
      }

      const { error } = await supabase
        .from('match_history')
        .upsert(rows, { onConflict: 'coach_id,external_uid', ignoreDuplicates: true })

      if (error) {
        throw error
      }

      setMsg(`✓ ${rows.length} matchs importés avec succès !`)
      setTimeout(() => {
        onImported?.()
        onClose()
      }, 1200)
    } catch (error) {
      setMsg(`❌ Erreur: ${error.message}`)
    }

    setImporting(false)
  }

  const activeTeamName = manualTeamName.trim()
  const filteredPreview = filterTeam && activeTeamName
    ? preview.filter(e => isMatchingTeam(e.summary, activeTeamName, teamAliases))
    : preview

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: P.card,
          borderRadius: 20,
          padding: 28,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: P.text }}>Import calendrier</div>
            <div style={{ fontSize: 12, color: P.sub, marginTop: 2 }}>Fichier .ics ou abonnement URL</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: P.sub }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[{ key: 'file', label: '📄 Fichier .ics' }, { key: 'url', label: '🔗 Abonnement URL' }].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: `1px solid ${tab === t.key ? P.accent : P.border}`,
                background: tab === t.key ? P.accent : 'transparent',
                color: tab === t.key ? '#fff' : P.text,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'file' && (
          <div>
            <div style={{ fontSize: 13, color: P.sub, marginBottom: 12, lineHeight: 1.6 }}>
              Depuis le site de ta fédération, exporte le calendrier de ta compétition au format{' '}
              <code style={{ background: P.bg, padding: '1px 5px', borderRadius: 4 }}>.ics</code> et importe-le ici.
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${P.border}`,
                borderRadius: 14,
                padding: '32px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: P.bg,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = P.border }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: P.text, marginBottom: 4 }}>
                Cliquer pour sélectionner
              </div>
              <div style={{ fontSize: 12, color: P.sub }}>
                Fichier .ics exporté depuis monclubhouse.ffr.fr
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".ics"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        )}

        {tab === 'url' && (
          <div>
            <div style={{ fontSize: 13, color: P.sub, marginBottom: 12, lineHeight: 1.6 }}>
              Depuis le site de ta fédération, copie l'URL d'abonnement au calendrier. Le calendrier se synchronisera automatiquement à chaque mise à jour.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="url"
                value={icalUrl}
                onChange={e => setIcalUrl(e.target.value)}
                placeholder="https://api-web.monclubhouse.ffr.fr/ical/poule/..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: P.bg,
                  border: `1px solid ${P.border}`,
                  borderRadius: 10,
                  color: P.text,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleLoadUrl}
                disabled={syncing || !icalUrl.trim()}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: 'none',
                  background: P.accent,
                  color: '#fff',
                  flexShrink: 0,
                  opacity: syncing || !icalUrl.trim() ? 0.6 : 1,
                }}
              >
                {syncing ? '...' : 'Charger'}
              </button>
            </div>
            {savedUrl && (
              <div style={{ fontSize: 12, color: P.green, marginBottom: 8 }}>
                ✓ URL sauvegardée — synchronisation active
              </div>
            )}
            {icalUrl !== savedUrl && icalUrl.trim() && (
              <button
                onClick={saveUrl}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: P.accent,
                  background: 'transparent',
                  border: `1px solid ${P.accent}`,
                  borderRadius: 8,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Sauvegarder cette URL pour la sync auto
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: P.sub, marginBottom: 4 }}>Nom de ton équipe</div>
          <input
            value={manualTeamName}
            onChange={(e) => setManualTeamName(e.target.value)}
            placeholder="Ex: US Marmande"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${P.border}`,
              background: P.bg,
              fontSize: 13,
              color: P.text,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {preview.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>
                {filteredPreview.length} match{filteredPreview.length > 1 ? 's' : ''} à importer
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: P.sub }}>
                <input
                  type="checkbox"
                  checked={filterTeam}
                  onChange={e => setFilterTeam(e.target.checked)}
                  style={{ accentColor: P.accent }}
                />
                Seulement cette équipe
              </label>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: P.sub, marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={e => setReplaceExisting(e.target.checked)}
                style={{ accentColor: P.accent }}
              />
              Remplacer les anciens matchs importés avant de réimporter
            </label>

            <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${P.border}`, borderRadius: 12 }}>
              {filteredPreview.slice(0, 50).map((e, i) => {
                const date = parseDate(e.dtstart)
                const summary = e.summary?.split('|')[0].trim()
                const isLast = i === Math.min(filteredPreview.length, 50) - 1

                return (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      borderBottom: isLast ? 'none' : `1px solid ${P.border}`,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: P.sub, flexShrink: 0, minWidth: 80 }}>
                      {date ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '?'}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: P.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {summary}
                    </div>
                  </div>
                )
              })}
              {filteredPreview.length > 50 && (
                <div style={{ padding: '8px 14px', fontSize: 12, color: P.sub, textAlign: 'center' }}>
                  + {filteredPreview.length - 50} autres matchs
                </div>
              )}
            </div>
          </div>
        )}

        {msg && (
          <div
            style={{
              marginTop: 14,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: msg.startsWith('✓') ? P.green : msg.startsWith('❌') ? P.red : P.sub,
              background: msg.startsWith('✓') ? '#e8f5ee' : msg.startsWith('❌') ? '#fdecea' : P.bg,
            }}
          >
            {msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              border: `1px solid ${P.border}`,
              background: 'transparent',
              color: P.sub,
            }}
          >
            Annuler
          </button>
          {filteredPreview.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing || (filterTeam && !manualTeamName.trim())}
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: importing ? 'default' : 'pointer',
                fontFamily: 'inherit',
                border: 'none',
                background: P.accent,
                color: '#fff',
                opacity: importing || (filterTeam && !manualTeamName.trim()) ? 0.7 : 1,
              }}
            >
              {importing ? 'Import...' : `Importer ${filteredPreview.length} matchs`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
