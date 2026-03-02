import { T } from '../lib/data'

export function Grain() {
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, opacity: 0.018 }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  )
}

export function Logo({ size = 'md' }) {
  const d = size === 'sm' ? 30 : size === 'lg' ? 48 : 38
  const fs = size === 'sm' ? 13 : size === 'lg' ? 19 : 15
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, userSelect: 'none' }}>
      <div style={{
        width: d, height: d,
        background: `linear-gradient(145deg, ${T.accent}, ${T.accentDim})`,
        borderRadius: T.radius, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 0 20px ${T.accentGlow}, 0 0 60px ${T.accentGlowSm}, inset 0 1px 0 rgba(255,255,255,0.15)`,
      }}>
        <svg viewBox="0 0 24 24" width={d * 0.5} fill="#000">
          <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/>
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: fs + 1, letterSpacing: 3, color: T.text, lineHeight: 1 }}>LE SPOT</div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: fs * 0.6, letterSpacing: 3.5, color: T.accent, lineHeight: 1.3 }}>TRAINING</div>
      </div>
    </div>
  )
}

export function Card({ children, style = {}, glow = false, onClick }) {
  const base = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusLg,
    padding: '24px 26px',
    boxShadow: glow ? `${T.shadowMd}, ${T.shadowGlow}` : T.shadowSm,
    transition: 'border-color .2s, box-shadow .2s, transform .2s',
    position: 'relative',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  }
  return (
    <div style={base}
      onClick={onClick}
      onMouseEnter={onClick ? e => {
        e.currentTarget.style.borderColor = T.borderHi
        e.currentTarget.style.boxShadow = `${T.shadowMd}, ${T.shadowGlow}`
        e.currentTarget.style.transform = 'translateY(-1px)'
      } : undefined}
      onMouseLeave={onClick ? e => {
        e.currentTarget.style.borderColor = T.border
        e.currentTarget.style.boxShadow = T.shadowSm
        e.currentTarget.style.transform = 'translateY(0)'
      } : undefined}
    >
      {children}
    </div>
  )
}

export function Label({ children, style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, ...style }}>
      <div style={{
        width: 3, height: 16, borderRadius: 2,
        background: `linear-gradient(180deg, ${T.accent}, ${T.accentDim})`,
        boxShadow: `0 0 8px ${T.accentGlow}`,
      }} />
      <div style={{
        fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 11,
        letterSpacing: 3, color: T.accent, textTransform: 'uppercase',
      }}>{children}</div>
    </div>
  )
}

export function Ring({ value, max, color = T.accent, size = 120, stroke = 8, label, sublabel }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const dash = circ * pct
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.surface} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke-dasharray .7s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {label && <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: size * 0.19, color: T.text, lineHeight: 1 }}>{label}</div>}
        {sublabel && <div style={{ fontFamily: T.fontDisplay, fontSize: size * 0.105, color: T.textMid, letterSpacing: 1, marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, accent = false, color }) {
  const c = color || (accent ? T.accent : T.text)
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${accent ? T.accent + '30' : T.border}`,
      borderRadius: T.radiusLg,
      padding: '20px 22px',
      position: 'relative', overflow: 'hidden',
      transition: 'border-color .2s, box-shadow .2s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent ? T.accent + '55' : T.borderHi
        e.currentTarget.style.boxShadow = accent ? T.shadowGlow : T.shadowSm
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = accent ? T.accent + '30' : T.border
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {accent && (
        <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: T.accentGlowSm, borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
      )}
      <div style={{
        fontFamily: T.fontDisplay, fontSize: 9, fontWeight: 700,
        letterSpacing: 3, color: T.textDim, textTransform: 'uppercase', marginBottom: 12,
      }}>{label}</div>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 32, color: c, lineHeight: 1, letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textSub, marginTop: 7, fontFamily: T.fontBody, letterSpacing: 0.3 }}>{sub}</div>}
    </div>
  )
}

export function Input({ label, value, onChange, type = 'text', placeholder = '', min, step, required, autoFocus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9,
          letterSpacing: 2.5, color: T.textSub, textTransform: 'uppercase',
        }}>
          {label}{required && <span style={{ color: T.accent, marginLeft: 3 }}>*</span>}
        </label>
      )}
      <input
        type={type} value={value} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} min={min} step={step}
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: '10px 14px',
          color: T.text,
          fontFamily: T.fontBody, fontSize: 14,
          outline: 'none', width: '100%',
          transition: 'border-color .15s, box-shadow .15s',
        }}
        onFocus={e => {
          e.target.style.borderColor = T.accent
          e.target.style.boxShadow = `0 0 0 3px ${T.accentGlowSm}`
        }}
        onBlur={e => {
          e.target.style.borderColor = T.border
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9,
          letterSpacing: 2.5, color: T.textSub, textTransform: 'uppercase',
        }}>{label}</label>
      )}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: '10px 14px',
        color: T.text,
        fontFamily: T.fontBody, fontSize: 14,
        outline: 'none', width: '100%', cursor: 'pointer',
        transition: 'border-color .15s',
      }}
        onFocus={e => e.target.style.borderColor = T.accent}
        onBlur={e => e.target.style.borderColor = T.border}
      >
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Btn({ children, onClick, variant = 'primary', disabled = false, size = 'md', style = {} }) {
  const sizes = {
    sm: { padding: '7px 16px', fontSize: 11 },
    md: { padding: '11px 24px', fontSize: 12 },
    lg: { padding: '14px 34px', fontSize: 13 },
  }
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`,
      color: '#050a05',
      border: 'none',
      boxShadow: `0 4px 16px ${T.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
    },
    secondary: {
      background: T.surface,
      color: T.text,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadowSm,
    },
    ghost: {
      background: 'transparent',
      color: T.textMid,
      border: '1px solid transparent',
    },
    danger: {
      background: T.dangerGlow,
      color: T.danger,
      border: `1px solid ${T.danger}30`,
    },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      borderRadius: T.radius,
      fontFamily: T.fontDisplay,
      fontWeight: 800,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all .18s',
      ...sizes[size],
      ...variants[variant],
      ...style,
    }}
      onMouseEnter={!disabled ? e => {
        if (variant === 'primary') {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = `0 8px 24px ${T.accentGlowMd}`
        }
        if (variant === 'secondary') {
          e.currentTarget.style.borderColor = T.borderHi
          e.currentTarget.style.background = T.cardHover
        }
      } : undefined}
      onMouseLeave={!disabled ? e => {
        if (variant === 'primary') {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = `0 4px 16px ${T.accentGlow}`
        }
        if (variant === 'secondary') {
          e.currentTarget.style.borderColor = T.border
          e.currentTarget.style.background = T.surface
        }
      } : undefined}
    >{children}</button>
  )
}

export function Badge({ children, color = T.accent }) {
  return (
    <span style={{
      background: color + '14',
      border: `1px solid ${color}30`,
      borderRadius: T.radiusSm,
      padding: '3px 9px',
      fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 10,
      color, letterSpacing: 1.5, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

export function PageWrap({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp .25s ease both' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseRing { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      {children}
    </div>
  )
}

export function PageHeader({ title, sub }) {
  return (
    <div style={{ paddingBottom: 4 }}>
      <h1 style={{
        fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 42,
        letterSpacing: 1, color: T.text, lineHeight: 0.95,
        textTransform: 'uppercase', margin: 0,
      }}>{title}</h1>
      {sub && <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.textMid, marginTop: 9, letterSpacing: 0.3 }}>{sub}</div>}
    </div>
  )
}

export function MacroBar({ label, value, max, unit, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const over = value > max
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: 2, color: T.textMid, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 13, color: over ? T.warn : color }}>
          {value}<span style={{ color: T.textDim, fontWeight: 400, fontSize: 11 }}>/{max} {unit}</span>
        </span>
      </div>
      <div style={{ height: 5, background: T.surface, borderRadius: T.radiusFull, overflow: 'hidden', border: `1px solid ${T.border}` }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: T.radiusFull,
          background: over
            ? `linear-gradient(90deg, ${T.warn}, ${T.orange})`
            : `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 10px ${color}55`,
          transition: 'width .6s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    </div>
  )
}

export function Layout({ children, sidebar }) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex' }}>
      {sidebar}
      <main style={{
        flex: 1, padding: '40px 40px 100px',
        minWidth: 0, maxWidth: 1020, margin: '0 auto', width: '100%',
      }}>
        {children}
      </main>
    </div>
  )
}

export function Divider({ style = {} }) {
  return <div style={{ height: 1, background: T.border, borderRadius: 1, ...style }} />
}

export function Chip({ children, active = false, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px',
      borderRadius: T.radiusFull,
      background: active ? T.accentGlow : T.surface,
      border: `1px solid ${active ? T.accent + '40' : T.border}`,
      color: active ? T.accent : T.textMid,
      fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 11,
      letterSpacing: 1.5, textTransform: 'uppercase',
      cursor: 'pointer', transition: 'all .15s',
    }}>{children}</button>
  )
}
