import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const P = {
  border: '#e8e4dc',
  text: '#1a1a1a',
  sub: '#6b6b6b',
  card: '#ffffff',
  bgAlt: 'rgba(255,255,255,0.03)',
  textDark: '#f5f5f5',
  subDark: 'rgba(255,255,255,0.7)',
  badge: '#c0392b',
}

export default function MedicalNotificationsBell({ dark = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!user?.id) return

    let active = true
    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (active) setItems(data || [])
    }

    load()

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, load)
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const unread = useMemo(() => items.filter(i => !i.is_read).length, [items])

  async function markOneAndOpen(item) {
    if (!item.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', item.id)
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
    }
    setOpen(false)
    if (item.link) navigate(item.link)
  }

  async function markAllRead() {
    const unreadIds = items.filter(i => !i.is_read).map(i => i.id)
    if (!unreadIds.length) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const panelBg = dark ? '#0f1413' : P.card
  const panelText = dark ? P.textDark : P.text
  const panelSub = dark ? P.subDark : P.sub
  const btnBg = dark ? 'rgba(255,255,255,0.03)' : P.card

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          border: `1px solid ${P.border}`,
          background: btnBg,
          color: dark ? P.textDark : P.text,
          cursor: 'pointer',
          position: 'relative',
          fontSize: 18,
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            borderRadius: 999,
            background: P.badge,
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 50,
          width: 360,
          maxHeight: 460,
          overflow: 'hidden',
          borderRadius: 16,
          border: `1px solid ${P.border}`,
          background: panelBg,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          zIndex: 100,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: panelText }}>Notifications</div>
            <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: panelSub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Tout lire</button>
          </div>
          <div style={{ maxHeight: 390, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: 18, color: panelSub, fontSize: 13 }}>Aucune notification.</div>
            ) : items.map(item => (
              <button
                key={item.id}
                onClick={() => markOneAndOpen(item)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 16px',
                  border: 'none',
                  borderBottom: `1px solid ${P.border}`,
                  background: item.is_read ? 'transparent' : (dark ? 'rgba(45,106,79,0.14)' : '#f7fbf8'),
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: panelText, marginBottom: 4 }}>{item.title}</div>
                {item.body && <div style={{ fontSize: 12, color: panelSub, lineHeight: 1.45 }}>{item.body}</div>}
                <div style={{ fontSize: 11, color: panelSub, marginTop: 6 }}>
                  {new Date(item.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
