import { useEffect, useState } from 'react'

export default function KioskPinModal({ open, onClose, onSuccess, expectedPin = '' }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setPin('')
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleDigit = (digit) => {
    if (pin.length >= 4) return
    setError('')
    setPin((prev) => prev + digit)
  }

  const handleDelete = () => {
    setError('')
    setPin((prev) => prev.slice(0, -1))
  }

  const handleSubmit = (e) => {
    e?.preventDefault?.()

    if (pin.length !== 4) {
      setError('Saisissez un PIN à 4 chiffres.')
      return
    }

    if (pin !== String(expectedPin)) {
      setError('PIN incorrect.')
      setPin('')
      return
    }

    setPin('')
    setError('')
    onClose()
    onSuccess?.()
  }

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.42)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          border: '1px solid #e8e4dc',
          borderRadius: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: '#6b6b6b',
              marginBottom: 8,
            }}
          >
            Sortie coach
          </div>

          <div style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a' }}>
            Entrer le PIN
          </div>

          <div style={{ fontSize: 14, color: '#6b6b6b', marginTop: 8 }}>
            Le mode borne est protégé par un code à 4 chiffres.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[0, 1, 2, 3].map((i) => {
              const filled = i < pin.length
              return (
                <div
                  key={i}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: filled ? '#1a3a2a' : '#e8e4dc',
                    border: filled ? '1px solid #1a3a2a' : '1px solid #d7d1c8',
                    transition: 'all 0.15s ease',
                  }}
                />
              )
            })}
          </div>

          {error && (
            <div
              style={{
                marginBottom: 14,
                padding: '12px 14px',
                borderRadius: 12,
                background: '#fff1f0',
                border: '1px solid #f3b7b2',
                color: '#b42318',
                fontSize: 13,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginTop: 8,
            }}
          >
            {keypad.map((key, index) => {
              if (key === '') {
                return <div key={index} />
              }

              if (key === '⌫') {
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={handleDelete}
                    style={{
                      height: 64,
                      borderRadius: 16,
                      border: '1px solid #e8e4dc',
                      background: '#f5f3ef',
                      color: '#1a1a1a',
                      fontSize: 22,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {key}
                  </button>
                )
              }

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDigit(key)}
                  style={{
                    height: 64,
                    borderRadius: 16,
                    border: '1px solid #e8e4dc',
                    background: '#fff',
                    color: '#1a1a1a',
                    fontSize: 24,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {key}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 999,
                border: '1px solid #e8e4dc',
                background: '#fff',
                color: '#1a1a1a',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>

            <button
              type="submit"
              style={{
                flex: 1,
                height: 52,
                borderRadius: 999,
                border: 'none',
                background: '#1a3a2a',
                color: '#fff',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
