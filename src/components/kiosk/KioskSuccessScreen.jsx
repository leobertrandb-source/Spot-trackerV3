export default function KioskSuccessScreen({
  title = 'Merci',
  message = 'Réponse enregistrée.',
  footer = 'Retour à l’accueil...',
}) {
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
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#fff',
          border: '1px solid #e8e4dc',
          borderRadius: 22,
          padding: 40,
          textAlign: 'center',
          boxShadow: '0 16px 40px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#1a1a1a' }}>{title}</div>
        <div style={{ fontSize: 16, color: '#6b6b6b', marginTop: 10 }}>{message}</div>
        <div style={{ fontSize: 14, color: '#6b6b6b', marginTop: 18 }}>{footer}</div>
      </div>
    </div>
  )
}
