export default function KioskSuccessScreen({ playerName }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f3ef',
      display: 'grid',
      placeItems: 'center',
      padding: 20,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 640, background: '#fff', border: '1px solid #e8e4dc', borderRadius: 28,
        padding: '48px 36px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: 54, marginBottom: 14 }}>✅</div>
        <div style={{ fontSize: 34, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.1 }}>
          Merci {playerName}
        </div>
        <div style={{ fontSize: 18, color: '#6b6b6b', marginTop: 12 }}>
          Ton questionnaire HOOPER a bien été enregistré.
        </div>
        <div style={{ fontSize: 15, color: '#6b6b6b', marginTop: 18 }}>
          Retour automatique à l’accueil...
        </div>
      </div>
    </div>
  )
}
