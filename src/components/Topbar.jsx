import { T } from '../lib/data'

export default function Topbar({ isMobile = false, onMenuClick }) {
  return (
    <div
      style={{
        height: 64,
        borderBottom: `1px solid ${T.border}`,
        background: 'rgba(10,14,13,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isMobile && (
          <button
            onClick={onMenuClick}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: T.text,
            }}
          >
            ☰
          </button>
        )}

        <div
          style={{
            fontWeight: 900,
            fontSize: 16,
            color: T.text,
            letterSpacing: 1,
          }}
        >
          LE SPOT
        </div>
      </div>

      <div
        style={{
          fontSize: 13,
          color: T.textDim,
          fontWeight: 700,
        }}
      >
        Dashboard
      </div>
    </div>
  )
}
