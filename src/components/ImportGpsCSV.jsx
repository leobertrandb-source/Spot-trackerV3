import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

const PROVIDER = 'playertek'

const COLUMN_ALIASES = {
  external_id: [
    'player id',
    'playerid',
    'id',
    'athlete id',
    'athleteid',
    'player code',
    'player_code',
  ],
  player_name: [
    'session ti player name',
    'player name',
    'athlete name',
    'name',
    'player',
  ],
  date: ['date', 'session date', 'session_date'],
  duration: ['duration', 'session duration', 'time'],
  distance_total: ['distance', 'total distance', 'distance total'],
  top_speed: ['top speed', 'topspeed', 'max speed', 'maximum speed'],
  energy: ['energy'],
  work_ratio: ['work ratio', 'workratio'],
  impacts: ['impacts', 'impact count'],
  zone_1: ['distance 1', 'zone 1', 'z1 distance', 'distance z1'],
  zone_2: ['distance 2', 'zone 2', 'z2 distance', 'distance z2'],
  zone_3: ['distance 3', 'zone 3', 'z3 distance', 'distance z3'],
  zone_4: ['distance 4', 'zone 4', 'z4 distance', 'distance z4'],
  zone_5: ['distance 5', 'zone 5', 'z5 distance', 'distance z5'],
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/[()]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function parseCsvLine(line) {
  const out = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      out.push(current)
      current = ''
    } else {
      current += char
    }
  }

  out.push(current)
  return out.map((value) => value.trim())
}

function parseCsvText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (!lines.length) return []

  const headers = parseCsvLine(lines[0])

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    return row
  })
}

function findColumnKey(headers, aliases) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }))

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias)
    const exact = normalizedHeaders.find((item) => item.normalized === normalizedAlias)
    if (exact) return exact.original
  }

  return null
}

function buildAutoMapping(headers) {
  const mapping = {}
  Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
    mapping[field] = findColumnKey(headers, aliases) || ''
  })
  return mapping
}

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const cleaned = String(value).trim().replace(/\s/g, '').replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function milesToKm(value) {
  if (value === null || value === undefined) return null
  return Math.round(value * 1.60934 * 100) / 100
}

function parseDurationToMinutes(value) {
  if (!value) return null
  const raw = String(value).trim()

  if (/^\d+(\.\d+)?$/.test(raw.replace(',', '.'))) {
    const numeric = safeNumber(raw)
    return numeric === null ? null : Math.round(numeric)
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null

  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  const seconds = Number(match[3] || 0)

  return Math.round(hours * 60 + minutes + seconds / 60)
}

function normalizePlayerName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function buildPreviewRows(rows, mapping) {
  return rows.slice(0, 8).map((row) => {
    const totalMiles = safeNumber(row[mapping.distance_total])
    const z1 = milesToKm(safeNumber(row[mapping.zone_1]))
    const z2 = milesToKm(safeNumber(row[mapping.zone_2]))
    const z3 = milesToKm(safeNumber(row[mapping.zone_3]))
    const z4 = milesToKm(safeNumber(row[mapping.zone_4]))
    const z5 = milesToKm(safeNumber(row[mapping.zone_5]))

    return {
      player_name: row[mapping.player_name] || '—',
      external_id: row[mapping.external_id] || '',
      date: row[mapping.date] || '',
      duration_min: parseDurationToMinutes(row[mapping.duration]),
      distance_km: milesToKm(totalMiles),
      top_speed: safeNumber(row[mapping.top_speed]),
      energy: safeNumber(row[mapping.energy]),
      impacts: safeNumber(row[mapping.impacts]),
      speed_bands: {
        lent: z1,
        modere: z2,
        rapide: z3,
        sprint: (z4 || 0) + (z5 || 0) || null,
      },
    }
  })
}

export default function ImportGpsCSV({ onClose, onSuccess }) {
  const { user, profile } = useAuth()
  const coachId = profile?.id || user?.id || null

  const [rawRows, setRawRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [importStats, setImportStats] = useState(null)

  const headers = useMemo(() => {
    if (!rawRows.length) return []
    return Object.keys(rawRows[0])
  }, [rawRows])

  const previewRows = useMemo(() => buildPreviewRows(rawRows, mapping), [rawRows, mapping])

  const validRows = useMemo(() => {
    return previewRows.filter((row) => row.player_name && row.date)
  }, [previewRows])

  function handleFile(file) {
    if (!file) return

    setErrorMessage('')
    setSuccessMessage('')
    setImportStats(null)
    setFileName(file.name || '')

    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const text = String(event?.target?.result || '')
        const parsedRows = parseCsvText(text)

        if (!parsedRows.length) {
          setRawRows([])
          setMapping({})
          setErrorMessage('Aucune ligne détectée dans le CSV.')
          return
        }

        const nextHeaders = Object.keys(parsedRows[0] || {})
        setRawRows(parsedRows)
        setMapping(buildAutoMapping(nextHeaders))
      } catch (error) {
        console.error(error)
        setRawRows([])
        setMapping({})
        setErrorMessage('Impossible de lire le fichier CSV.')
      }
    }

    reader.onerror = () => {
      setRawRows([])
      setMapping({})
      setErrorMessage('Impossible de lire le fichier CSV.')
    }

    reader.readAsText(file)
  }

  async function handleImport() {
    if (!coachId) {
      setErrorMessage('Coach introuvable.')
      return
    }

    if (!validRows.length) {
      setErrorMessage('Aucune ligne valide à importer.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    setImportStats(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/import-gps-csv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            coachId,
            provider: PROVIDER,
            sessions: validRows.map((row) => ({
              external_id: row.external_id || null,
              player_name: row.player_name,
              date: row.date,
              duree_min: row.duration_min,
              km_total: row.distance_km,
              vitesse_max: row.top_speed,
              energy: row.energy,
              impacts: row.impacts,
              speed_bands: row.speed_bands,
            })),
          }),
        }
      )

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Erreur lors de l'import GPS.")
      }

      setImportStats(payload?.stats || null)
      setSuccessMessage('Import GPS terminé.')
      if (onSuccess) await onSuccess()
    } catch (error) {
      console.error('Import GPS CSV error:', error)
      setErrorMessage(error?.message || "Erreur lors de l'import GPS.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        background: 'rgba(14,18,16,0.98)',
        border: `1px solid ${T.border}`,
        borderRadius: 20,
        padding: 20,
        color: T.text,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: T.text }}>
            Import GPS PlayerTek
          </div>
          <div
            style={{
              color: T.textDim,
              fontSize: 13,
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            Détection automatique des colonnes, matching par identifiant externe puis par nom.
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: T.textMid,
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 14,
          border: `1px dashed ${T.border}`,
          background: 'rgba(255,255,255,0.02)',
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, color: T.textMid }}>
          Dépose un export CSV PlayerTek.
        </div>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleFile(e.target.files?.[0])}
          style={{ color: T.textMid }}
        />

        {fileName ? (
          <div style={{ fontSize: 12, color: T.accentLight, fontWeight: 700 }}>
            Fichier : {fileName}
          </div>
        ) : null}
      </div>

      {headers.length > 0 ? (
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {[
              ['Joueur', mapping.player_name],
              ['Identifiant externe', mapping.external_id],
              ['Date', mapping.date],
              ['Durée', mapping.duration],
              ['Distance', mapping.distance_total],
              ['Top speed', mapping.top_speed],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, color: value ? T.text : '#FFB3B3', fontWeight: 700 }}>
                  {value || 'Non détecté'}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 13, color: T.textMid }}>
            {rawRows.length} ligne{rawRows.length > 1 ? 's' : ''} détectée{rawRows.length > 1 ? 's' : ''} · {validRows.length} prête{validRows.length > 1 ? 's' : ''} à importer
          </div>

          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.2fr) 110px 100px 100px 100px',
                padding: '10px 12px',
                borderBottom: `1px solid ${T.border}`,
                fontSize: 11,
                fontWeight: 800,
                color: T.textDim,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              <div>Joueur</div>
              <div>Date</div>
              <div>Durée</div>
              <div>Km</div>
              <div>Top speed</div>
            </div>

            <div style={{ display: 'grid' }}>
              {previewRows.map((row, index) => (
                <div
                  key={`${row.player_name}-${row.date}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.2fr) 110px 100px 100px 100px',
                    padding: '10px 12px',
                    borderBottom: index === previewRows.length - 1 ? 'none' : `1px solid ${T.border}33`,
                    fontSize: 13,
                    color: T.text,
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.player_name || '—'}
                  </div>
                  <div>{row.date || '—'}</div>
                  <div>{row.duration_min ?? '—'} min</div>
                  <div>{row.distance_km ?? '—'}</div>
                  <div>{row.top_speed ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: '1px solid rgba(255,120,120,0.24)',
            background: 'rgba(255,90,90,0.06)',
            color: '#FFB3B3',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${T.accent}30`,
            background: 'rgba(45,255,155,0.08)',
            color: T.accentLight,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {successMessage}
          {importStats
            ? ` ${importStats.imported} importée(s), ${importStats.matched_by_external_id} matchée(s) par ID, ${importStats.matched_by_name} par nom, ${importStats.skipped} ignorée(s).`
            : ''}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 18,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            height: 42,
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: T.textMid,
            padding: '0 16px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          Fermer
        </button>

        <button
          type="button"
          onClick={handleImport}
          disabled={loading || validRows.length === 0}
          style={{
            height: 42,
            borderRadius: 12,
            border: `1px solid ${T.accent + '30'}`,
            background: `${T.accent}16`,
            color: T.accentLight,
            padding: '0 16px',
            cursor: loading || validRows.length === 0 ? 'default' : 'pointer',
            fontWeight: 900,
            fontSize: 13,
            opacity: loading || validRows.length === 0 ? 0.7 : 1,
          }}
        >
          {loading ? 'Import en cours...' : 'Importer GPS'}
        </button>
      </div>
    </div>
  )
}
