import { useEffect, useState } from 'react'

function isIOS() {
  return (
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent)
  )
}

function isInStandaloneMode() {
  return (
    typeof window !== 'undefined' &&
    (window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches)
  )
}

const STORAGE_KEY = 'atlyo_ios_banner_dismissed'

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isIOS() && !isInStandaloneMode()) {
      const dismissed = sessionStorage.getItem(STORAGE_KEY)
      if (!dismissed) setVisible(true)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a42 100%)',
      borderRadius: 16,
      padding: '18px 20px',
      marginBottom: 16,
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      boxShadow: '0 4px 20px rgba(26,58,42,0.18)',
      animation: 'fadeUp 0.35s ease both',
    }}>
      <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>📲</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
          Active les notifications push
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
          Sur iPhone, il faut installer l'appli sur ton écran d'accueil :
        </div>
        <ol style={{ margin: '8px 0 0', padding: '0 0 0 18px', fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 2 }}>
          <li>Appuie sur <strong style={{ color: '#fff' }}>Partager</strong> <span style={{ fontSize: 14 }}>⬆️</span> en bas de Safari</li>
          <li>Choisis <strong style={{ color: '#fff' }}>"Sur l'écran d'accueil"</strong></li>
          <li>Ouvre l'appli depuis l'icône créée</li>
          <li>Active les notifications dans le toggle ci-dessous</li>
        </ol>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
          iOS 16.4 minimum requis · Safari uniquement
        </div>
      </div>
      <button
        onClick={dismiss}
        style={{
          background: 'rgba(255,255,255,0.12)',
          border: 'none',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.7)',
          fontSize: 16,
          width: 28,
          height: 28,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          padding: 0,
        }}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  )
}
