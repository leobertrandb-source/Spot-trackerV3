import React from "react"

const UI = {
  bg: '#f5f3ef',
  card: '#ffffff',
  border: '#e8e4dc',
  text: '#1a1a1a',
  sub: '#6b6b6b',
  dim: '#9e9e9e',
}

const DOMS_ZONES = [
  { key: 'nuque', label: 'Nuque / Cou' },
  { key: 'epaules', label: 'Épaules' },
  { key: 'coudes', label: 'Coudes' },
  { key: 'poignets', label: 'Poignets' },
  { key: 'tronc', label: 'Tronc / Abdominaux' },
  { key: 'lombaires', label: 'Bas du dos / Lombaires' },
  { key: 'hanches', label: 'Hanches' },
  { key: 'cuisses', label: 'Cuisses' },
  { key: 'genoux', label: 'Genoux' },
  { key: 'chevilles', label: 'Chevilles' },
  { key: 'pieds', label: 'Pieds' },
]

function levelColor(level) {
  if (level >= 7) return '#c0392b'
  if (level >= 5) return '#e07040'
  if (level >= 3) return '#e6a817'
  if (level >= 1) return '#2d9e6b'
  return '#dfd9cf'
}

function zoneLevel(domsZones, key) {
  return domsZones?.[key]?.level || 0
}

function Zone({ id, d, domsZones, onHover, onLeave }) {
  const level = zoneLevel(domsZones, id)
  const active = level > 0
  return (
    <path
      d={d}
      onMouseEnter={(e) => active && onHover?.(e, id, level)}
      onMouseLeave={onLeave}
      style={{
        fill: active ? levelColor(level) : '#ece7df',
        stroke: active ? '#7a1f16' : '#b9b2a7',
        strokeWidth: active ? 2.2 : 1.4,
        cursor: active ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
    />
  )
}

export default function DomsBodyMap({ domsZones = {}, title = 'Carte', compact = false }) {
  const [hovered, setHovered] = React.useState(null)
  const activeZones = DOMS_ZONES.filter((z) => zoneLevel(domsZones, z.key) > 0)

  const handleHover = (e, key, level) => {
    const zone = DOMS_ZONES.find((z) => z.key === key)
    const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect()
    const target = e.currentTarget.getBoundingClientRect()
    setHovered({
      label: zone?.label || key,
      level,
      x: target.left - svg.left + target.width / 2,
      y: target.top - svg.top - 8,
    })
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {!compact && (
        <div style={{ fontSize: 10, fontWeight: 700, color: UI.sub, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>
          {title}
        </div>
      )}
      <div style={{ position: 'relative', background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 14, padding: 10 }}>
        <svg viewBox="0 0 260 520" style={{ width: '100%', height: compact ? 290 : 'auto', display: 'block' }}>
          <g opacity="0.18">
            <circle cx="130" cy="52" r="26" fill="#a8a093" />
            <rect x="110" y="80" width="40" height="42" rx="18" fill="#a8a093" />
            <rect x="90" y="118" width="80" height="110" rx="34" fill="#a8a093" />
            <rect x="74" y="124" width="20" height="122" rx="10" fill="#a8a093" />
            <rect x="166" y="124" width="20" height="122" rx="10" fill="#a8a093" />
            <rect x="98" y="228" width="64" height="42" rx="20" fill="#a8a093" />
            <rect x="102" y="268" width="22" height="126" rx="11" fill="#a8a093" />
            <rect x="136" y="268" width="22" height="126" rx="11" fill="#a8a093" />
            <rect x="100" y="392" width="18" height="84" rx="9" fill="#a8a093" />
            <rect x="142" y="392" width="18" height="84" rx="9" fill="#a8a093" />
            <ellipse cx="108" cy="490" rx="18" ry="10" fill="#a8a093" />
            <ellipse cx="152" cy="490" rx="18" ry="10" fill="#a8a093" />
          </g>

          <g>
            <Zone id="nuque" d="M116 82 Q130 72 144 82 L142 104 Q130 111 118 104 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="epaules" d="M88 112 Q105 98 120 110 L120 132 Q105 144 88 130 Z M172 112 Q155 98 140 110 L140 132 Q155 144 172 130 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="coudes" d="M70 202 Q82 194 90 204 L90 224 Q80 232 70 224 Z M190 202 Q178 194 170 204 L170 224 Q180 232 190 224 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="poignets" d="M70 250 Q80 244 88 250 L88 272 Q80 278 70 272 Z M190 250 Q180 244 172 250 L172 272 Q180 278 190 272 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="tronc" d="M104 136 Q130 122 156 136 L156 226 Q130 242 104 226 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="lombaires" d="M108 222 Q130 214 152 222 L152 256 Q130 266 108 256 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="hanches" d="M94 248 Q106 238 118 246 L118 276 Q106 286 94 278 Z M166 248 Q154 238 142 246 L142 276 Q154 286 166 278 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="cuisses" d="M102 278 Q114 270 124 278 L124 362 Q114 372 102 362 Z M136 278 Q146 270 158 278 L158 362 Q146 372 136 362 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="genoux" d="M102 364 Q112 356 122 364 L122 388 Q112 396 102 388 Z M138 364 Q148 356 158 364 L158 388 Q148 396 138 388 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="chevilles" d="M98 450 Q108 444 116 450 L116 472 Q108 478 98 472 Z M144 450 Q152 444 162 450 L162 472 Q152 478 144 472 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
            <Zone id="pieds" d="M90 480 Q108 472 124 482 Q108 494 90 490 Z M136 482 Q152 472 170 480 Q170 490 152 492 Q142 492 136 482 Z" domsZones={domsZones} onHover={handleHover} onLeave={() => setHovered(null)} />
          </g>

          {hovered && (
            <g transform={`translate(${hovered.x}, ${Math.max(24, hovered.y)})`} pointerEvents="none">
              <rect x="-48" y="-26" rx="8" ry="8" width="96" height="24" fill="#1a1a1a" opacity="0.92" />
              <text x="0" y="-10" fill="#fff" textAnchor="middle" fontSize="10" fontFamily="sans-serif">
                {hovered.label} · {hovered.level}/10
              </text>
            </g>
          )}
        </svg>
      </div>
      {!compact && (
        <div style={{ display: 'grid', gap: 8 }}>
          {activeZones.length === 0 ? (
            <div style={{ fontSize: 12, color: UI.dim, textAlign: 'center' }}>Aucune zone douloureuse</div>
          ) : activeZones.map((zone) => {
            const level = zoneLevel(domsZones, zone.key)
            return (
              <div key={zone.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: UI.card, border: `1px solid ${UI.border}` }}>
                <span style={{ fontSize: 12, color: UI.text }}>{zone.label}</span>
                <span style={{ minWidth: 34, textAlign: 'center', padding: '3px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#fff', background: levelColor(level) }}>
                  {level}/10
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
