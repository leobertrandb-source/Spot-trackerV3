function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

export default function PlayerTile({ player, done, disabled = false, onClick }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        border: `2px solid ${done ? '#2d6a4f' : '#e8e4dc'}`,
        background: '#ffffff',
        borderRadius: 24,
        padding: 18,
        cursor: disabled ? 'not-allowed' : 'pointer',
        minHeight: 208,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        boxShadow: done ? '0 12px 28px rgba(45,106,79,0.12)' : '0 12px 28px rgba(0,0,0,0.05)',
        opacity: disabled ? 0.72 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {player.avatar_url ? (
        <img
          src={player.avatar_url}
          alt={player.full_name}
          style={{
            width: 92,
            height: 92,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid #f5f3ef',
            background: '#f5f3ef',
          }}
        />
      ) : (
        <div style={{
          width: 92,
          height: 92,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: '#1a3a2a',
          color: '#fff',
          fontWeight: 900,
          fontSize: 28,
        }}>
          {initials(player.full_name)}
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>
          {player.full_name}
        </div>
        <div style={{
          marginTop: 10,
          display: 'inline-block',
          padding: '7px 12px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
          background: done ? '#e7f5ec' : '#f2f2f2',
          color: done ? '#2d6a4f' : '#6b6b6b',
        }}>
          {done ? 'Déjà rempli' : 'À faire'}
        </div>
      </div>
    </button>
  )
}
