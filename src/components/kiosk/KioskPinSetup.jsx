import { useState } from 'react'

export default function KioskPinSetup({ coachId, coachName, onSave, supabase }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isValid = /^\d{4}$/.test(pin) && pin === confirmPin

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!/^\d{4}$/.test(pin)) {
      setError('Le PIN doit contenir exactement 4 chiffres.')
      return
    }

    if (pin !== confirmPin) {
      setError('Les deux codes PIN ne correspondent pas.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ kiosk_pin: pin })
      .eq('id', coachId)

    setLoading(false)

    if (updateError) {
      setError(updateError.message || "Impossible d'enregistrer le PIN.")
      return
    }

    onSave(pin)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f3ef',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          border: '1px solid #e8e4dc',
          borderRadius: 22,
          padding: 28,
          boxShadow: '0 16px 40px rgba(0,0,0,0.06)',
        }}
      >
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
          Première utilisation
        </div>

        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, color: '#1a1a1a' }}>
          Configurer le PIN coach
        </h1>

        <p
          style={{
            fontSize: 15,
            color: '#6b6b6b',
            marginTop: 10,
            marginBottom: 22,
            lineHeight: 1.5,
          }}
        >
          Définissez un PIN à 4 chiffres pour quitter le mode borne
          {coachName ? ` de ${coachName}` : ''}.
        </p>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>
              Nouveau PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              style={{
                width: '100%',
                height: 56,
                borderRadius: 14,
                border: '1px solid #e8e4dc',
                padding: '0 16px',
                fontSize: 24,
                letterSpacing: 8,
                textAlign: 'center',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>
              Confirmer le PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              style={{
                width: '100%',
                height: 56,
                borderRadius: 14,
                border: '1px solid #e8e4dc',
                padding: '0 16px',
                fontSize: 24,
                letterSpacing: 8,
                textAlign: 'center',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: '#fff1f0',
              border: '1px solid #f3b7b2',
              color: '#b42318',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || loading}
          style={{
            marginTop: 22,
            width: '100%',
            height: 58,
            border: 'none',
            borderRadius: 999,
            background: !isValid || loading ? '#c8c8c8' : '#1a3a2a',
            color: '#fff',
            fontWeight: 900,
            fontSize: 17,
            cursor: !isValid || loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Enregistrement...' : 'Créer le PIN coach'}
        </button>
      </form>
    </div>
  )
}
