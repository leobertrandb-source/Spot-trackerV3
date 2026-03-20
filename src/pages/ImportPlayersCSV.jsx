import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

function normalizeRow(row) {
  return {
    email: String(row.email || row.mail || row['e-mail'] || '').trim().toLowerCase(),
    first_name: String(row.first_name || row.prenom || row.firstname || '').trim(),
    last_name: String(row.last_name || row.nom || row.lastname || '').trim(),
  }
}

export default function ImportPlayersCSV({ onClose, onSuccess }) {
  const { user, profile } = useAuth()
  const coachId = profile?.id || user?.id || null

  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [importStats, setImportStats] = useState(null)

  const previewRows = useMemo(() => rows.slice(0, 8), [rows])

  const validCount = useMemo(
    () =>
      rows.filter((row) => row.email && (row.first_name || row.last_name)).length,
    [rows]
  )

  function handleFile(file) {
    if (!file) return
    setErrorMessage('')
    setSuccessMessage('')
    setImportStats(null)
    setFileName(file.name || '')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = (result?.data || [])
          .map(normalizeRow)
          .filter((row) => row.email || row.first_name || row.last_name)

        setRows(parsed)
      },
      error: (error) => {
        console.error(error)
        setRows([])
        setErrorMessage("Impossible de lire le fichier CSV.")
      },
    })
  }

  async function handleImport() {
    if (!coachId) {
      setErrorMessage("Coach introuvable.")
      return
    }

    if (!rows.length) {
      setErrorMessage("Aucune ligne à importer.")
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    setImportStats(null)

    let created = 0
    let linked = 0
    let skipped = 0

    try {
      for (const row of rows) {
        const email = row.email
        const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim()

        if (!email || !fullName) {
          skipped += 1
          continue
        }

        const { data: existingProfile, error: existingError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', email)
          .maybeSingle()

        if (existingError) {
          throw existingError
        }

        let profileId = existingProfile?.id || null

        if (!profileId) {
          const { data: newProfile, error: insertProfileError } = await supabase
            .from('profiles')
            .insert({
              email,
              full_name: fullName,
              role: 'athlete',
            })
            .select('id')
            .single()

          if (insertProfileError) {
            throw insertProfileError
          }

          profileId = newProfile?.id || null
          created += 1
        }

        if (!profileId) {
          skipped += 1
          continue
        }

        const { error: linkError } = await supabase
          .from('coach_clients')
          .upsert(
            {
              coach_id: coachId,
              client_id: profileId,
            },
            { onConflict: 'coach_id,client_id' }
          )

        if (linkError) {
          throw linkError
        }

        linked += 1
      }

      setImportStats({ created, linked, skipped })
      setSuccessMessage("Import terminé.")
      if (onSuccess) await onSuccess()
    } catch (error) {
      console.error('Import players CSV error:', error)
      setErrorMessage("Erreur lors de l'import des joueurs.")
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
          <div
            style={{
              fontSize: 17,
              fontWeight: 900,
              color: T.text,
            }}
          >
            Importer des joueurs
          </div>
          <div
            style={{
              color: T.textDim,
              fontSize: 13,
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            Format recommandé : email, first_name, last_name
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
          Dépose un CSV ou sélectionne un fichier.
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

      {rows.length > 0 ? (
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 13, color: T.textMid }}>
              {rows.length} ligne{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 13, color: T.accentLight, fontWeight: 800 }}>
              {validCount} valide{validCount > 1 ? 's' : ''}
            </div>
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
                gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)',
                gap: 0,
                padding: '10px 12px',
                borderBottom: `1px solid ${T.border}`,
                fontSize: 11,
                fontWeight: 800,
                color: T.textDim,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              <div>Email</div>
              <div>Prénom</div>
              <div>Nom</div>
            </div>

            <div style={{ display: 'grid' }}>
              {previewRows.map((row, index) => (
                <div
                  key={`${row.email}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)',
                    gap: 0,
                    padding: '10px 12px',
                    borderBottom: index === previewRows.length - 1 ? 'none' : `1px solid ${T.border}33`,
                    fontSize: 13,
                    color: T.text,
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.email || '—'}
                  </div>
                  <div>{row.first_name || '—'}</div>
                  <div>{row.last_name || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          {rows.length > previewRows.length ? (
            <div style={{ fontSize: 12, color: T.textDim }}>
              Aperçu limité aux {previewRows.length} premières lignes.
            </div>
          ) : null}
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
          {importStats ? ` ${importStats.created} créé(s), ${importStats.linked} lié(s), ${importStats.skipped} ignoré(s).` : ''}
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
          disabled={loading || validCount === 0}
          style={{
            height: 42,
            borderRadius: 12,
            border: `1px solid ${T.accent + '30'}`,
            background: `${T.accent}16`,
            color: T.accentLight,
            padding: '0 16px',
            cursor: loading || validCount === 0 ? 'default' : 'pointer',
            fontWeight: 900,
            fontSize: 13,
            opacity: loading || validCount === 0 ? 0.7 : 1,
          }}
        >
          {loading ? 'Import en cours...' : 'Importer les joueurs'}
        </button>
      </div>
    </div>
  )
}
