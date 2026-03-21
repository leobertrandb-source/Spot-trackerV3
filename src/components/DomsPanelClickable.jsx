import { useMemo, useState } from 'react'

const COLORS = {
  bg: '#ffffff',
  panel: '#f7f4ef',
  border: '#e8e4dc',
  text: '#1a1a1a',
  sub: '#6b6b6b',
}

function levelColor(level) {
  if (level >= 7) return '#c0392b'
  if (level >= 4) return '#d97706'
  if (level >= 1) return '#d4a017'
  return '#d8d2c8'
}

function inquietudeLabel(i) {
  if (i === 1) return 'Pas inquiet'
  if (i === 2) return 'Peu inquiet'
  if (i === 3) return 'Très inquiet'
  return 'Non renseignée'
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
      <span style={{ color: COLORS.sub }}>{label}</span>
      <span style={{ color: COLORS.text, fontWeight: 700, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export default function DomsPanelClickable({
  zones = [],
  doms = {},
  compact = false,
  title = 'Zones douloureuses',
  emptyLabel = 'Aucune zone douloureuse',
}) {
  const [selectedKey, setSelectedKey] = useState(null)

  const activeZones = useMemo(
    () => zones.filter((z) => (doms?.[z.key]?.level || 0) > 0),
    [zones, doms],
  )

  const selected = activeZones.find((z) => z.key === selectedKey) || activeZones[0] || null

  return (
    <div
      style={{
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: compact ? 14 : 16,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: compact ? '12px 14px' : '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: compact ? 11 : 12, fontWeight: 700, color: COLORS.sub, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {title}
        </div>
      </div>

      {activeZones.length === 0 ? (
        <div style={{ padding: compact ? 14 : 16, fontSize: 13, color: COLORS.sub }}>{emptyLabel}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1.2fr) minmax(180px, 0.8fr)' }}>
          <div style={{ padding: compact ? 10 : 12, display: 'grid', gap: 8 }}>
            {activeZones.map((zone) => {
              const level = doms?.[zone.key]?.level || 0
              const inquietude = doms?.[zone.key]?.inquietude || 0
              const selectedRow = zone.key === (selected?.key || '')
              const color = levelColor(level)

              return (
                <button
                  key={zone.key}
                  onClick={() => setSelectedKey(zone.key)}
                  style={{
                    textAlign: 'left',
                    padding: compact ? '10px 12px' : '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${selectedRow ? color + '55' : COLORS.border}`,
                    background: selectedRow ? color + '12' : COLORS.panel,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{zone.label}</div>
                      {inquietude > 0 && (
                        <div style={{ fontSize: 11, color: COLORS.sub, marginTop: 3 }}>{inquietudeLabel(inquietude)}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color }}>{level}/10</div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 9 }}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} style={{ flex: 1, height: 7, borderRadius: 3, background: i < level ? color : '#e6e0d7' }} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {!compact && selected && (
            <div style={{ borderLeft: `1px solid ${COLORS.border}`, padding: 16, background: '#fcfaf7' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                Détail sélectionné
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>{selected.label}</div>
              <div style={{ marginTop: 8, fontSize: 28, lineHeight: 1, fontWeight: 800, color: levelColor(doms?.[selected.key]?.level || 0) }}>
                {doms?.[selected.key]?.level || 0}/10
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: COLORS.sub }}>
                {(() => {
                  const level = doms?.[selected.key]?.level || 0
                  if (level >= 7) return 'Charge de douleur élevée à surveiller.'
                  if (level >= 4) return 'Zone sensible à surveiller aujourd’hui.'
                  return 'Douleur légère, compatible avec une simple vigilance.'
                })()}
              </div>
              <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
                <InfoRow label='Inquiétude' value={inquietudeLabel(doms?.[selected.key]?.inquietude || 0)} />
                <InfoRow label='Statut' value={(doms?.[selected.key]?.level || 0) >= 4 ? 'À suivre' : 'RAS'} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
