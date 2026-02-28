import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Btn, Badge, PageWrap } from '../components/UI'
import { SEANCE_ICONS, T } from '../lib/data'

export default function HistoriquePage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  async function load() {
    const { data: sess } = await supabase.from('sessions').select('*').eq('user_id', user.id).order('date', { ascending: false })
    if (!sess?.length) { setLoading(false); return }
    const ids = sess.map(s => s.id)
    const { data: sets } = await supabase.from('sets').select('*').in('session_id', ids).order('set_order')
    setSessions(sess.map(s => ({ ...s, sets: (sets || []).filter(set => set.session_id === s.id) })))
    setLoading(false)
  }

  useEffect(() => { load() }, [user.id])

  async function deleteSession(id) {
    if (!window.confirm('Supprimer cette séance ?')) return
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(p => p.filter(s => s.id !== id))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: T.textDim, fontFamily: T.fontDisplay, letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' }}>
      Chargement...
    </div>
  )

  if (!sessions.length) return (
    <PageWrap>
      <Card style={{ textAlign: 'center', padding: '60px 40px' }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 60, color: T.border, marginBottom: 16 }}>◈</div>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 20, color: T.text, letterSpacing: 1 }}>AUCUNE SÉANCE</div>
        <div style={{ fontSize: 14, color: T.textMid, marginTop: 8 }}>Ton historique apparaîtra ici.</div>
      </Card>
    </PageWrap>
  )

  return (
    <PageWrap>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 36, letterSpacing: 2, color: T.text, lineHeight: 1 }}>HISTORIQUE</div>
        <div style={{ fontSize: 14, color: T.textMid, marginTop: 6 }}>{sessions.length} séance{sessions.length > 1 ? 's' : ''} enregistrée{sessions.length > 1 ? 's' : ''}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sessions.map(session => {
          const isOpen = expanded === session.id
          const maxWeight = Math.max(...session.sets.map(s => parseFloat(s.weight) || 0))

          return (
            <div key={session.id} style={{
              background: T.card, border: `1px solid ${isOpen ? T.borderHi : T.border}`,
              borderRadius: T.radiusLg, overflow: 'hidden',
              boxShadow: isOpen ? T.shadowGlowSm : T.shadowCard,
              transition: 'all .2s',
            }}>

              {/* Header */}
              <div
                onClick={() => setExpanded(isOpen ? null : session.id)}
                style={{
                  padding: '16px 20px', display: 'flex', alignItems: 'center',
                  gap: 16, cursor: 'pointer', userSelect: 'none',
                  borderBottom: isOpen ? `1px solid ${T.border}` : 'none',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: T.accentGlow, border: `1px solid ${T.accent}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  {SEANCE_ICONS[session.seance_type] || '💪'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: 0.5 }}>
                    {session.seance_type}
                  </div>
                  <div style={{ fontSize: 12, color: T.textDim, marginTop: 3, display: 'flex', gap: 10 }}>
                    <span>{session.date}</span>
                    <span>·</span>
                    <span>{session.sets.length} série{session.sets.length > 1 ? 's' : ''}</span>
                    {maxWeight > 0 && <><span>·</span><span style={{ color: T.accent }}>Max {maxWeight} kg</span></>}
                  </div>
                </div>

                {session.notes && (
                  <div style={{ fontSize: 11, color: T.textDim, fontStyle: 'italic', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.notes}
                  </div>
                )}

                <div style={{ color: T.textDim, fontSize: 12, transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}>▶</div>
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: '0 20px 20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                    <thead>
                      <tr>
                        {['Exercice', 'Rép.', 'Charge', 'RPE'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {session.sets.map((s, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${T.surface}` }}>
                          <td style={{ padding: '10px 12px', fontFamily: T.fontBody, fontSize: 13, color: T.textMid }}>{s.exercise}</td>
                          <td style={{ padding: '10px 12px', fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 15, color: T.accent }}>{s.reps ?? '—'}</td>
                          <td style={{ padding: '10px 12px', fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 15, color: T.accent }}>{s.weight ? `${s.weight} kg` : '—'}</td>
                          <td style={{ padding: '10px 12px', fontFamily: T.fontBody, fontSize: 13, color: T.textDim }}>{s.rpe ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <Btn variant="danger" size="sm" onClick={() => deleteSession(session.id)}>
                      Supprimer
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </PageWrap>
  )
}
