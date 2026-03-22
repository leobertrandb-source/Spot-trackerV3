export default function KioskHeader({ clubName, protocol = 'HOOPER', dateLabel, completedCount = 0, totalCount = 0, onExit }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e8e4dc',
      borderRadius: 24,
      padding: '20px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap',
      boxShadow: '0 16px 40px rgba(16, 24, 40, 0.06)',
    }}>
      <div>
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1.3,
          textTransform: 'uppercase',
          color: '#6b6b6b',
          marginBottom: 6,
        }}>
          Mode borne équipe
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.1 }}>
          {clubName || 'Club'}
        </div>
        <div style={{ fontSize: 14, color: '#6b6b6b', marginTop: 8 }}>
          {protocol} · {dateLabel}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          background: '#f5f3ef',
          border: '1px solid #e8e4dc',
          borderRadius: 999,
          padding: '10px 14px',
          fontSize: 13,
          fontWeight: 800,
          color: '#1a1a1a',
        }}>
          {completedCount} / {totalCount} complétés
        </div>
        <button
          onClick={onExit}
          style={{
            border: '1px solid #d9d4ca',
            background: '#fff',
            color: '#1a1a1a',
            borderRadius: 999,
            padding: '12px 18px',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Quitter
        </button>
      </div>
    </div>
  )
}
