
import React from 'react'

const LABELS = {
  nuque: 'Nuque / Cou',
  epaules: 'Épaules',
  coudes: 'Coudes',
  poignets: 'Poignets',
  tronc: 'Tronc / Abdominaux',
  lombaires: 'Bas du dos / Lombaires',
  hanches: 'Hanches',
  cuisses: 'Cuisses',
  genoux: 'Genoux',
  chevilles: 'Chevilles',
  pieds: 'Pieds',
}

const ZONES = [
  { key: 'nuque', d: 'M126 80 C122 86 120 94 121 103 L121 118 C127 123 133 123 139 118 L139 103 C140 94 138 86 134 80 Z' },
  { key: 'epaules', d: 'M86 113 C94 103 108 98 120 102 L120 136 C109 140 97 140 86 131 Z M180 113 C172 103 158 98 146 102 L146 136 C157 140 169 140 180 131 Z' },
  { key: 'coudes', d: 'M67 219 C74 212 83 211 90 216 L90 236 C83 242 74 242 67 235 Z M199 219 C192 212 183 211 176 216 L176 236 C183 242 192 242 199 235 Z' },
  { key: 'poignets', d: 'M66 279 C72 274 79 274 85 278 L85 294 C79 299 72 299 66 294 Z M200 279 C194 274 187 274 181 278 L181 294 C187 299 194 299 200 294 Z' },
  { key: 'tronc', d: 'M111 136 C120 128 146 128 155 136 L160 168 L160 250 C150 259 116 259 106 250 L106 168 Z' },
  { key: 'lombaires', d: 'M110 248 C120 242 146 242 156 248 L156 278 C146 286 120 286 110 278 Z' },
  { key: 'hanches', d: 'M101 278 C110 272 118 271 126 276 L126 312 C116 318 108 318 101 312 Z M165 278 C156 272 148 271 140 276 L140 312 C150 318 158 318 165 312 Z' },
  { key: 'cuisses', d: 'M108 314 C117 308 124 308 130 314 L130 398 C124 404 117 404 108 398 Z M136 314 C145 308 152 308 158 314 L158 398 C152 404 145 404 136 398 Z' },
  { key: 'genoux', d: 'M108 399 C116 394 123 394 130 399 L130 425 C123 430 116 430 108 425 Z M136 399 C143 394 150 394 158 399 L158 425 C150 430 143 430 136 425 Z' },
  { key: 'chevilles', d: 'M108 500 C114 496 121 496 127 500 L127 519 C121 524 114 524 108 519 Z M139 500 C145 496 152 496 158 500 L158 519 C152 524 145 524 139 519 Z' },
  { key: 'pieds', d: 'M104 520 C114 516 124 517 130 523 L130 540 C121 545 112 545 104 539 Z M136 523 C144 517 154 516 164 520 L164 539 C156 545 147 545 136 540 Z' },
]

function levelColor(level) {
  if (level >= 8) return '#b42318'
  if (level >= 6) return '#dc6803'
  if (level >= 4) return '#f79009'
  if (level >= 2) return '#12b76a'
  if (level >= 1) return '#32d583'
  return '#ded9d2'
}

function zoneLevel(domsZones, key) {
  return Number(domsZones?.[key]?.level || 0)
}

export default function DomsBodyMapPro({
  domsZones = {},
  editable = false,
  onZoneClick = null,
  selectedZone = null,
  title = 'Carte corporelle',
  compact = false,
}) {
  const activeZones = ZONES.filter((z) => zoneLevel(domsZones, z.key) > 0)
  const [hovered, setHovered] = React.useState(null)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? 'minmax(160px, 220px)' : 'minmax(220px, 280px) minmax(180px, 1fr)',
      gap: 16,
      alignItems: 'start',
    }}>
      <div style={{
        position: 'relative',
        borderRadius: 18,
        border: '1px solid #e8e4dc',
        background: 'linear-gradient(180deg, #fbfaf8 0%, #f4f1eb 100%)',
        padding: compact ? 10 : 14,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase', color: '#7b756d', marginBottom: 8, textAlign: 'center' }}>
          {title}
        </div>
        <svg viewBox="0 0 266 560" style={{ width: '100%', height: compact ? 300 : 420, display: 'block' }}>
          <defs>
            <filter id="shadowZone" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.08" />
            </filter>
          </defs>

          <g opacity="0.18" fill="#7d7468">
            <circle cx="133" cy="45" r="27" />
            <path d="M120 74 C126 69 140 69 146 74 L148 104 C145 110 121 110 118 104 Z" />
            <path d="M103 104 C113 97 153 97 163 104 L167 138 L167 246 C156 259 110 259 99 246 L99 138 Z" />
            <path d="M70 154 C78 147 90 147 98 154 L98 246 C90 254 78 254 70 246 Z" />
            <path d="M196 154 C188 147 176 147 168 154 L168 246 C176 254 188 254 196 246 Z" />
            <path d="M98 248 C108 240 158 240 168 248 L168 305 C158 314 108 314 98 305 Z" />
            <path d="M106 304 C114 297 127 297 134 304 L134 495 C127 502 114 502 106 495 Z" />
            <path d="M160 304 C152 297 139 297 132 304 L132 495 C139 502 152 502 160 495 Z" />
            <path d="M106 495 C113 490 127 490 134 495 L134 540 C127 547 113 547 106 540 Z" />
            <path d="M160 495 C153 490 139 490 132 495 L132 540 C139 547 153 547 160 540 Z" />
          </g>

          {ZONES.map((zone) => {
            const level = zoneLevel(domsZones, zone.key)
            const active = level > 0
            const selected = selectedZone === zone.key
            return (
              <path
                key={zone.key}
                d={zone.d}
                onMouseEnter={() => setHovered({ key: zone.key, level })}
                onMouseLeave={() => setHovered(null)}
                onClick={() => editable && onZoneClick?.(zone.key, level)}
                style={{
                  fill: active ? levelColor(level) : '#e5e0d8',
                  stroke: selected ? '#111827' : active ? '#7a271a' : '#b6afa4',
                  strokeWidth: selected ? 3 : active ? 2.2 : 1.6,
                  cursor: editable ? 'pointer' : active ? 'default' : 'default',
                  transition: 'all 0.15s ease',
                  filter: active ? 'url(#shadowZone)' : 'none',
                }}
              />
            )
          })}

          {hovered && hovered.level > 0 && (
            <g transform="translate(133 24)" pointerEvents="none">
              <rect x="-62" y="-12" width="124" height="22" rx="11" fill="#1f2937" opacity="0.96" />
              <text x="0" y="3" textAnchor="middle" fontSize="10" fill="#fff" fontFamily="sans-serif">
                {LABELS[hovered.key]} · {hovered.level}/10
              </text>
            </g>
          )}
        </svg>
      </div>

      {!compact && (
        <div style={{
          borderRadius: 18,
          border: '1px solid #e8e4dc',
          background: '#faf8f5',
          padding: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase', color: '#7b756d', marginBottom: 10 }}>
            Intensité par zone
          </div>
          {activeZones.length === 0 ? (
            <div style={{ fontSize: 12, color: '#8a8278' }}>Aucune zone douloureuse.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {activeZones.map((zone) => {
                const level = zoneLevel(domsZones, zone.key)
                return (
                  <button
                    key={zone.key}
                    type="button"
                    onClick={() => editable && onZoneClick?.(zone.key, level)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: `1px solid ${selectedZone === zone.key ? '#d0d5dd' : '#e8e4dc'}`,
                      background: '#fff',
                      cursor: editable ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{ minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{LABELS[zone.key]}</div>
                      <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                        {Array.from({ length: 10 }, (_, i) => (
                          <div key={i} style={{ width: 10, height: 6, borderRadius: 999, background: i < level ? levelColor(level) : '#e7e3dc' }} />
                        ))}
                      </div>
                    </div>
                    <div style={{
                      minWidth: 42,
                      textAlign: 'center',
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: levelColor(level),
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      {level}/10
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
