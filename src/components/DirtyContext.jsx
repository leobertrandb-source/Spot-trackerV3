import { createContext, useContext, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../lib/data'

const DirtyContext = createContext({})

export function DirtyProvider({ children }) {
  const [isDirty, setIsDirty] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [pendingPath, setPendingPath] = useState(null)
  const navigate = useNavigate()

  const markDirty = useCallback(() => setIsDirty(true), [])
  const markClean = useCallback(() => setIsDirty(false), [])

  function tryNavigate(path) {
    if (isDirty) {
      setPendingPath(path)
      setShowModal(true)
    } else {
      navigate(path)
    }
  }

  function confirmLeave() {
    setIsDirty(false)
    setShowModal(false)
    navigate(pendingPath)
  }

  function cancelLeave() {
    setShowModal(false)
    setPendingPath(null)
  }

  return (
    <DirtyContext.Provider value={{ isDirty, markDirty, markClean, tryNavigate }}>
      {children}

      {/* Modal d'avertissement */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg + 4, padding: 36, maxWidth: 420, width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            animation: 'fadeUp .2s ease both',
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 20, color: T.text, letterSpacing: 1, marginBottom: 10 }}>
              SÉANCE NON SAUVEGARDÉE
            </div>
            <div style={{ fontSize: 14, color: T.textMid, marginBottom: 28, lineHeight: 1.6 }}>
              Tu as des données non enregistrées. Si tu quittes maintenant, elles seront perdues.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={cancelLeave} style={{
                background: 'transparent', border: `1px solid ${T.border}`,
                borderRadius: T.radiusSm, padding: '10px 20px',
                fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 12,
                letterSpacing: 1, color: T.textMid, cursor: 'pointer',
                textTransform: 'uppercase',
              }}>
                Rester
              </button>
              <button onClick={confirmLeave} style={{
                background: T.danger + '22', border: `1px solid ${T.danger}55`,
                borderRadius: T.radiusSm, padding: '10px 20px',
                fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 12,
                letterSpacing: 1, color: T.danger, cursor: 'pointer',
                textTransform: 'uppercase',
              }}>
                Quitter sans sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </DirtyContext.Provider>
  )
}

export const useDirty = () => useContext(DirtyContext)
