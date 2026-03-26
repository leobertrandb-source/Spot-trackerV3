import { useMemo } from 'react'
import { T } from '../lib/data'

export function Grain() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.035,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 0.6px, transparent 0.6px)',
        backgroundSize: '7px 7px',
        zIndex: 0,
      }}
    />
  )
}

export function Layout({ sidebar, topbar, children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${T.bg} 0%, ${T.bgAlt} 100%)`,
        color: T.text,
        display: 'flex',
        position: 'relative',
        zIndex: 1,
        overflowX: 'hidden',
        maxWidth: '100vw',
      }}
    >
      {sidebar ? <div style={{ flexShrink: 0 }}>{sidebar}</div> : null}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {topbar ? <div style={{ flexShrink: 0 }}>{topbar}</div> : null}

        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowX: 'hidden',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export function PageWrap({ children, style = {} }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1360,
        margin: '0 auto',
        padding: 'clamp(16px,3vw,26px) clamp(14px,3vw,24px) 34px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Card({ children, style = {}, glow = false }) {
  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${T.card} 0%, ${T.surface} 100%)`,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusLg,
        padding: 18,
        boxShadow: glow ? `${T.shadowMd}, ${T.shadowGlow}` : T.shadowSm,
        backdropFilter: 'blur(14px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Label({ children, style = {} }) {
  return (
    <div
      style={{
        color: T.textSub,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 8,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Input({ label, value, onChange, placeholder = '', type = 'text', min, max, step }) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      {label ? (
        <span style={{ color: T.textSub, fontSize: 12, fontWeight: 800 }}>
          {label}
        </span>
      ) : null}

      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        type={type}
        min={min}
        max={max}
        step={step}
        style={{
          height: 48,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          background: T.surface,
          color: T.text,
          padding: '0 14px',
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
        }}
      />
    </label>
  )
}

export function Select({ label, value, onChange, options = [] }) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      {label ? (
        <span style={{ color: T.textSub, fontSize: 12, fontWeight: 800 }}>
          {label}
        </span>
      ) : null}

      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          height: 48,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          background: T.surface,
          color: T.text,
          padding: '0 14px',
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Btn({ children, onClick, disabled = false, type = 'button', style = {}, variant = 'primary' }) {
  const buttonStyle = useMemo(() => {
    if (variant === 'secondary') {
      return {
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${T.border}`,
        color: T.text,
        boxShadow: 'none',
      }
    }
    if (variant === 'ghost') {
      return {
        background: 'transparent',
        border: `1px solid transparent`,
        color: T.textMid,
        boxShadow: 'none',
      }
    }
    return {
      background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDim} 100%)`,
      border: '1px solid rgba(255,255,255,0.06)',
      color: '#eff6ff',
      boxShadow: T.shadowGlow,
    }
  }, [variant])

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 46,
        borderRadius: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 800,
        fontSize: 14,
        opacity: disabled ? 0.6 : 1,
        padding: '0 16px',
        transition: 'transform 0.16s ease, opacity 0.16s ease, box-shadow 0.16s ease',
        ...buttonStyle,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Badge({ children, color }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        padding: '0 10px',
        borderRadius: 999,
        background: `${color || T.accent}18`,
        border: `1px solid ${(color || T.accent) + '30'}`,
        color: color || T.accentLight || T.accent,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

export function StatCard({ label, value, icon }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border: `1px solid ${T.border}`,
        background: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: T.shadowSm,
      }}
    >
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: T.textDim, fontWeight: 800 }}>
        {label}
      </div>

      <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>
        {value}
      </div>

      {icon ? <div style={{ fontSize: 20, opacity: 0.75 }}>{icon}</div> : null}
    </div>
  )
}
