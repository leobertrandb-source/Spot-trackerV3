import { T } from '../lib/data'

export function Grain() {
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, opacity: 0.025 }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  )
}

export function Logo({ size = 'md' }) {
  const d = size === 'sm' ? 28 : size === 'lg' ? 46 : 36
  const fs = size === 'sm' ? 12 : size === 'lg' ? 18 : 15
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
      <div style={{
        width: d, height: d,
        background: `linear-gradient(145deg, ${T.accent}, ${T.accentDim})`,
        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: `0 0 24px ${T.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
      }}>
        <svg viewBox="0 0 24 24" width={d * 0.5} fill="#000">
          <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/>
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: fs, letterSpacing: 2.5, color: T.text, lineHeight: 1 }}>LE SPOT</div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: fs * 0.58, letterSpacing: 3, color: T.accent, lineHeight: 1.2 }}>TRAINING</div>
      </div>
    </div>
  )
}

export function Card({ children, style = {}, glow = false, onClick }) {
  const base = {
    background: `linear-gradient(145deg, ${T.card}, ${T.surface})`,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusLg,
    padding: '22px 24px',
    boxShadow: glow ? `${T.shadowMd}, ${T.shadowGlow}` : T.shadowSm,
    transition: 'border-color .25s, box-shadow .25s',
    position: 'relative',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  }
  return (
    <div style={base}
      onClick={onClick}
      onMouseEnter={onClick ? e => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.boxShadow = `${T.shadowMd}, ${T.shadowGlow}` } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = T.shadowSm } : undefined}
    >
      {children}
    </div>
  )
}

export function Label({ children, style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, ...style }}>
      <div style={{ width: 2, height: 14, background: T.accent, borderRadius: 1 }} />
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: 3, color: T.accent, textTransform: 'uppercase' }}>{children}</div>
    </div>
  )
}

// Circular progress ring — Whoop style
export function Ring({ value, max, color = T.accent, size = 120, stroke = 8, label, sublabel }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const dash = circ * pct
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray .6s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {label && <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: size * 0.18, color: T.text, lineHeight: 1 }}>{label}</div>}
        {sublabel && <div style={{ fontFamily: T.fontDisplay, fontSize: size * 0.1, color: T.textMid, letterSpacing: 1, marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, accent = false, color }) {
  const c = color || (accent ? T.accent : T.text)
  return (
    <div style={{
      background: `linear-gradient(145deg, ${T.card}, ${T.surface})`,
      border: `1px solid ${accent ? T.borderHi : T.border}`,
      borderRadius: T.radiusLg, padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      {accent && <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: T.accentGlow, borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />}
      <div style={{ fontFamily: T.fontDisplay, fontSize: 9, fontWeight: 700, letterSpacing: 2.5, color: T.textDim, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 28, color: c, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 6, fontFamily: T.fontBody }}>{sub}</div>}
    </div>
  )
}

export function Input({ label, value, onChange, type = 'text', placeholder = '', min, step, required, autoFocus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9, letterSpacing: 2.5, color: T.textDim, textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: T.accent }}> *</span>}
      </label>}
      <input type={type} value={value} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} min={min} step={step}
        style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: T.radius, padding: '10px 13px',
          color: T.text, fontFamily: T.fontBody, fontSize: 14,
          outline: 'none', width: '100%', transition: 'border-color .2s, box-shadow .2s',
        }}
        onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}` }}
        onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}

export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9, letterSpacing: 2.5, color: T.textDim, textTransform: 'uppercase' }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: T.radius, padding: '10px 13px',
        color: T.text, fontFamily: T.fontBody, fontSize: 14,
        outline: 'none', width: '100%', cursor: 'pointer',
      }}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Btn({ children, onClick, variant = 'primary', disabled = false, size = 'md', style = {} }) {
  const sizes = { sm: { padding: '7px 16px', fontSize: 11 }, md: { padding: '10px 22px', fontSize: 12 }, lg: { padding: '13px 32px', fontSize: 14 } }
  const variants = {
    primary: { background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`, color: '#000', border: 'none', boxShadow: `0 4px 20px ${T.accentGlow}` },
    secondary: { background: 'transparent', color: T.text, border: `1px solid ${T.border}` },
    ghost: { background: 'transparent', color: T.textMid, border: '1px solid transparent' },
    danger: { background: `${T.danger}15`, color: T.danger, border: `1px solid ${T.danger}33` },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      borderRadius: T.radius, fontFamily: T.fontDisplay, fontWeight: 800,
      letterSpacing: 1.5, textTransform: 'uppercase',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1, transition: 'all .2s',
      ...sizes[size], ...variants[variant], ...style,
    }}
      onMouseEnter={!disabled && variant === 'primary' ? e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${T.accentGlow}` } : undefined}
      onMouseLeave={!disabled && variant === 'primary' ? e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px ${T.accentGlow}` } : undefined}
    >{children}</button>
  )
}

export function Badge({ children, color = T.accent }) {
  return (
    <span style={{
      background: color + '15', border: `1px solid ${color}33`,
      borderRadius: 4, padding: '2px 8px',
      fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 10,
      color, letterSpacing: 1.5, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

export function PageWrap({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeUp .3s ease both' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseRing { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
      `}</style>
      {children}
    </div>
  )
}

export function PageHeader({ title, sub }) {
  return (
    <div style={{ paddingBottom: 4 }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 40, letterSpacing: 1, color: T.text, lineHeight: 1, textTransform: 'uppercase' }}>{title}</div>
      {sub && <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.textMid, marginTop: 7, letterSpacing: 0.3 }}>{sub}</div>}
    </div>
  )
}

// MacroBar — thin progress bar with label
export function MacroBar({ label, value, max, unit, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: 1.5, color: T.textMid, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 12, color }}>
          {value}<span style={{ color: T.textDim, fontWeight: 400 }}>/{max} {unit}</span>
        </span>
      </div>
      <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 2,
          background: `linear-gradient(90deg, ${color}, ${color}bb)`,
          boxShadow: `0 0 8px ${color}66`,
          transition: 'width .6s ease',
        }} />
      </div>
    </div>
  )
}

export function Layout({ children, sidebar }) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex' }}>
      {sidebar}
      <main style={{ flex: 1, padding: '36px 36px 80px', minWidth: 0, maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  )
}
