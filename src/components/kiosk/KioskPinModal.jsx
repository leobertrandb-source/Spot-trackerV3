import { useState } from 'react'

export default function KioskPinModal({ open, onClose, expectedPin, onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const submit = () => {
    if (!expectedPin) {
      onSuccess()
      return
    }
    if (pin === expectedPin) {
      setPin('')
      setError('')
      onSuccess()
      return
    }
    setError('Code incorrect')
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420, background: '#fff', borderRadius: 24,
        border: '1px solid #e8e4dc', padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>Quitter le mode borne</div>
        <div style={{ fontSize: 14, color: '#6b6b6b', marginTop: 8 }}>
          Saisis le code coach pour revenir à l’application.
        </div>

        <input
          type="password"
          value={pin}
          onChange={e => { setPin(e.target.value); setError('') }}
          placeholder="Code PIN"
          autoFocus
          style={{
            width: '100%', marginTop: 18, height: 54, borderRadius: 14,
            border: '1px solid #d9d4ca', padding: '0 16px', fontSize: 18, fontWeight: 700,
          }}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
        />

        {error && <div style={{ fontSize: 13, color: '#c0392b', marginTop: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <button onClick={onClose} style={{
            height: 48, padding: '0 16px', borderRadius: 999,
            border: '1px solid #d9d4ca', background: '#fff', color: '#1a1a1a', fontWeight: 800, cursor: 'pointer',
          }}>
            Annuler
          </button>
          <button onClick={submit} style={{
            height: 48, padding: '0 20px', borderRadius: 999,
            border: 'none', background: '#1a3a2a', color: '#fff', fontWeight: 900, cursor: 'pointer',
          }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )
}
