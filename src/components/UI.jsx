import { T } from '../lib/data'

/* ── Grain overlay (texture visuelle) ─────────────────────────────── */
export function Grain() {
  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
      opacity: 0.4,
    }} />
  )
}

/* ── Logo ─────────────────────────────────────────────────────────── */
export function Logo({ size = 'md' }) {
  const dim = size === 'sm' ? 30 : size === 'lg' ? 48 : 38
  const fs = size === 'sm' ? 13 : size === 'lg' ? 20 : 16
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, userSelect: 'none' }}>
      <div style={{
        width: dim, height: dim,
        background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`,
        borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: `0 0 20px ${T.accentGlow}`,
      }}>
        <svg viewBox="0 0 24 24" width={dim * 0.52} fill="#000">
          <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/>
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: fs, letterSpacing: 3, color: T.text, lineHeight: 1 }}>LE SPOT</div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: fs * 0.6, letterSpacing: 2.5, color: T.accent, lineHeight: 1, marginTop: 2 }}>TRAINING</div>
      </div>
    </div>
  )
}

/* ── Card ─────────────────────────────────────────────────────────── */
export function Card({ children, style = {}, glow = false, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusLg,
        padding: '24px 26px',
        boxShadow: glow ? T.shadowGlow : T.shadowCard,
        transition: 'border-color .2s, box-shadow .2s',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={onClick ? e => {
        e.currentTarget.style.borderColor = T.borderHi
        e.currentTarget.style.boxShadow = T.shadowGlow
      } : undefined}
      onMouseLeave={onClick ? e => {
        e.currentTarget.style.borderColor = T.border
        e.currentTarget.style.boxShadow = T.shadowCard
      } : undefined}
    >
      {children}
    </div>
  )
}

/* ── Section label ────────────────────────────────────────────────── */
export function Label({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: T.fontDisplay,
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: T.accent,
      marginBottom: 18,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      ...style,
    }}>
      <div style={{ width: 16, height: 2, background: T.accent, borderRadius: 1 }} />
      {children}
    </div>
  )
}

/* ── Stat card ────────────────────────────────────────────────────── */
export function StatCard({ label, value, sub, accent = false }) {
  return (
    <div style={{
      background: accent ? `linear-gradient(135deg, ${T.accentGlow}, transparent)` : T.card,
      border: `1px solid ${accent ? T.accent + '44' : T.border}`,
      borderRadius: T.radiusLg,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {accent && <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: T.accentGlow, borderRadius: '50%', filter: 'blur(20px)' }} />}
      <div style={{ fontSize: 9, fontFamily: T.fontDisplay, fontWeight: 700, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 30, color: accent ? T.accent : T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 6, fontFamily: T.fontBody }}>{sub}</div>}
    </div>
  )
}

/* ── Input ────────────────────────────────────────────────────────── */
export function Input({ label, value, onChange, type = 'text', placeholder = '', min, step, required, autoFocus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase' }}>
          {label}{required && <span style={{ color: T.accent }}> *</span>}
        </label>
      )}
      <input
        type={type} value={value} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} min={min} step={step}
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusSm,
          padding: '11px 14px',
          color: T.text,
          fontFamily: T.fontBody,
          fontSize: 14,
          outline: 'none',
          width: '100%',
          transition: 'border-color .2s, box-shadow .2s',
        }}
        onFocus={e => {
          e.target.style.borderColor = T.accent
          e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`
        }}
        onBlur={e => {
          e.target.style.borderColor = T.border
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

/* ── Select ───────────────────────────────────────────────────────── */
export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase' }}>{label}</label>
      )}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        padding: '11px 14px',
        color: T.text,
        fontFamily: T.fontBody,
        fontSize: 14,
        outline: 'none',
        width: '100%',
        cursor: 'pointer',
      }}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  )
}

/* ── Button ───────────────────────────────────────────────────────── */
export function Btn({ children, onClick, variant = 'primary', disabled = false, size = 'md', style = {} }) {
  const sizes = { sm: { padding: '7px 14px', fontSize: 12 }, md: { padding: '11px 24px', fontSize: 14 }, lg: { padding: '14px 32px', fontSize: 16 } }
  const variants = {
    primary: { background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`, color: '#000', border: 'none', boxShadow: `0 4px 16px ${T.accentGlow}` },
    secondary: { background: 'transparent', color: T.text, border: `1px solid ${T.border}` },
    ghost: { background: 'transparent', color: T.textMid, border: `1px solid transparent` },
    danger: { background: 'transparent', color: T.danger, border: `1px solid #3a1020` },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: T.radiusSm,
        fontFamily: T.fontDisplay,
        fontWeight: 800,
        letterSpacing: 1,
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all .2s',
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={!disabled && variant === 'primary' ? e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${T.accentGlow}` } : undefined}
      onMouseLeave={!disabled && variant === 'primary' ? e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 16px ${T.accentGlow}` } : undefined}
    >
      {children}
    </button>
  )
}

/* ── Badge ────────────────────────────────────────────────────────── */
export function Badge({ children, color = T.accent }) {
  return (
    <span style={{
      background: color + '18',
      border: `1px solid ${color}44`,
      borderRadius: 5,
      padding: '3px 9px',
      fontFamily: T.fontDisplay,
      fontWeight: 700,
      fontSize: 11,
      color,
      letterSpacing: 1,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

/* ── Divider ──────────────────────────────────────────────────────── */
export function Divider() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${T.border}, transparent)`, margin: '8px 0' }} />
}

/* ── Page wrapper with fade-in ────────────────────────────────────── */
export function PageWrap({ children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 20,
      animation: 'fadeUp .35s ease both',
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
      {children}
    </div>
  )
}

/* ── Layout with sidebar ──────────────────────────────────────────── */
export function Layout({ children, sidebar }) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex' }}>
      {sidebar}
      <main style={{ flex: 1, padding: '36px 32px 80px', minWidth: 0, maxWidth: 980, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  )
}
