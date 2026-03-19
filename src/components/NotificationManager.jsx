// src/components/NotificationManager.jsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

const P = {
  bg: '#f5f3ef', card: '#ffffff', border: '#e8e4dc',
  text: '#1a1a1a', sub: '#6b6b6b', dim: '#9e9e9e',
  accent: '#1a3a2a', green: '#2d6a4f', red: '#c0392b', yellow: '#b5830a',
}

const DEFAULT_SETTINGS = {
  rappel_hooper: true, rappel_hooper_heure: '08:00',
  alerte_fatigue: true, alerte_fatigue_seuil: 21,
  alerte_missing: true, alerte_missing_jours: 2,
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 40, height: 22, borderRadius: 11, cursor: 'pointer', flexShrink: 0,
      background: value ? P.green : '#d1cfc9', position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

export default function NotificationManager({ clients = [] }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [manualMsg, setManualMsg] = useState({ title: '', body: '', url: '/' })
  const [manualTargets, setManualTargets] = useState([])
  const [sending, setSending] = useState(false)
  const [sentMsg, setSentMsg] = useState('')

  const load = useCallback(async () => {
    if (!clients.length) return
    const { data } = await supabase.from('notification_settings').select('*')
      .eq('coach_id', user.id).in('athlete_id', clients.map(c => c.id))
    const map = {}
    for (const c of clients) {
      const found = (data || []).find(d => d.athlete_id === c.id)
      map[c.id] = found ? { ...found } : { ...DEFAULT_SETTINGS }
    }
    setSettings(map)
  }, [clients, user.id])

  useEffect(() => { load() }, [load])

  async function save(athleteId) {
    setSaving(p => ({ ...p, [athleteId]: true }))
    const s = settings[athleteId]
    await supabase.from('notification_settings').upsert({
      coach_id: user.id, athlete_id: athleteId,
      rappel_hooper: s.rappel_hooper, rappel_hooper_heure: s.rappel_hooper_heure,
      alerte_fatigue: s.alerte_fatigue, alerte_fatigue_seuil: s.alerte_fatigue_seuil,
      alerte_missing: s.alerte_missing, alerte_missing_jours: s.alerte_missing_jours,
    }, { onConflict: 'coach_id,athlete_id' })
    setSaving(p => ({ ...p, [athleteId]: false }))
  }

  function update(id, key, val) {
    setSettings(p => ({ ...p, [id]: { ...p[id], [key]: val } }))
  }

  async function sendManual() {
    if (!manualMsg.title || !manualTargets.length) return
    setSending(true); setSentMsg('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notifications/manual`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteIds: manualTargets, title: manualMsg.title, message: manualMsg.body, url: manualMsg.url }),
      })
      const data = await res.json()
      setSentMsg(`✅ ${data.sent || 0} notification(s) envoyée(s)`)
      setManualMsg({ title: '', body: '', url: '/' }); setManualTargets([])
    } catch { setSentMsg('❌ Erreur envoi') }
    setSending(false)
  }

  const inp = { background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 10px', color: P.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: P.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, display: 'block' }

  const pillBtn = (active, onClick, label) => (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: `1px solid ${active ? P.accent : P.border}`,
      background: active ? P.accent : P.card,
      color: active ? '#fff' : P.sub,
    }}>{label}</button>
  )

  return (
    <div style={{ display: 'grid', gap: 20, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Paramètres par athlète ── */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 14 }}>Paramètres par athlète</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {clients.map(client => {
            const s = settings[client.id]
            if (!s) return null
            const isOpen = expanded === client.id
            const allOff = !s.rappel_hooper && !s.alerte_fatigue && !s.alerte_missing
            return (
              <div key={client.id} style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
                <div onClick={() => setExpanded(isOpen ? null : client.id)}
                  style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>{client.full_name || client.email}</div>
                    <div style={{ fontSize: 11, color: allOff ? P.red : P.green, marginTop: 2, fontWeight: 600 }}>
                      {allOff ? '🔕 Toutes notifs désactivées' : '🔔 Notifs actives'}
                    </div>
                  </div>
                  <span style={{ color: P.sub, fontSize: 18, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>⌄</span>
                </div>

                {isOpen && (
                  <div style={{ padding: '16px 18px', borderTop: `1px solid ${P.border}`, display: 'grid', gap: 16, background: P.bg }}>

                    {/* Rappel HOOPER */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.rappel_hooper ? 10 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Rappel HOOPER → Athlète</div>
                          <div style={{ fontSize: 11, color: P.sub }}>Notif si non rempli à l'heure choisie</div>
                        </div>
                        <Toggle value={s.rappel_hooper} onChange={v => update(client.id, 'rappel_hooper', v)} />
                      </div>
                      {s.rappel_hooper && (
                        <div>
                          <span style={lbl}>Heure d'envoi</span>
                          <input type="time" value={s.rappel_hooper_heure}
                            onChange={e => update(client.id, 'rappel_hooper_heure', e.target.value)}
                            style={{ ...inp, width: 130 }} />
                        </div>
                      )}
                    </div>

                    {/* Alerte fatigue */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.alerte_fatigue ? 10 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Alerte fatigue → Coach</div>
                          <div style={{ fontSize: 11, color: P.sub }}>Notif si score HOOPER ≥ seuil</div>
                        </div>
                        <Toggle value={s.alerte_fatigue} onChange={v => update(client.id, 'alerte_fatigue', v)} />
                      </div>
                      {s.alerte_fatigue && (
                        <div>
                          <span style={lbl}>Seuil d'alerte (/40)</span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[14, 18, 21, 25, 30].map(v => pillBtn(s.alerte_fatigue_seuil === v, () => update(client.id, 'alerte_fatigue_seuil', v), `≥${v}`))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Alerte missing */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.alerte_missing ? 10 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Alerte non-remplissage → Coach</div>
                          <div style={{ fontSize: 11, color: P.sub }}>Notif si HOOPER non rempli depuis X jours</div>
                        </div>
                        <Toggle value={s.alerte_missing} onChange={v => update(client.id, 'alerte_missing', v)} />
                      </div>
                      {s.alerte_missing && (
                        <div>
                          <span style={lbl}>Délai avant alerte</span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[1, 2, 3, 5, 7].map(v => pillBtn(s.alerte_missing_jours === v, () => update(client.id, 'alerte_missing_jours', v), `${v}j`))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button onClick={() => save(client.id)} disabled={saving[client.id]} style={{
                      padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      cursor: saving[client.id] ? 'default' : 'pointer',
                      border: 'none', background: P.accent, color: '#fff',
                    }}>
                      {saving[client.id] ? 'Sauvegarde...' : '✓ Sauvegarder'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Envoi manuel ── */}
      <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '20px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 16 }}>📢 Notification manuelle</div>

        <div style={{ marginBottom: 14 }}>
          <span style={lbl}>Destinataires</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pillBtn(manualTargets.length === clients.length, () => setManualTargets(manualTargets.length === clients.length ? [] : clients.map(c => c.id)), 'Tous')}
            {clients.map(c => pillBtn(manualTargets.includes(c.id), () => setManualTargets(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id]), (c.full_name || c.email).split(' ')[0]))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
          <div>
            <span style={lbl}>Titre *</span>
            <input value={manualMsg.title} onChange={e => setManualMsg(p => ({ ...p, title: e.target.value }))} placeholder="ex: Séance annulée demain" style={inp} />
          </div>
          <div>
            <span style={lbl}>Message</span>
            <textarea value={manualMsg.body} onChange={e => setManualMsg(p => ({ ...p, body: e.target.value }))} placeholder="Détails..." rows={2} style={{ ...inp, resize: 'none' }} />
          </div>
          <div>
            <span style={lbl}>Page à ouvrir</span>
            <select value={manualMsg.url} onChange={e => setManualMsg(p => ({ ...p, url: e.target.value }))} style={inp}>
              <option value="/">Accueil</option>
              <option value="/prep/hooper">HOOPER</option>
              <option value="/prep/charge">Charge interne</option>
              <option value="/prep/charge-externe">Charge externe</option>
              <option value="/prep/compo">Composition</option>
            </select>
          </div>
        </div>

        {sentMsg && <div style={{ fontSize: 13, fontWeight: 700, color: sentMsg.startsWith('✅') ? P.green : P.red, marginBottom: 10 }}>{sentMsg}</div>}

        <button onClick={sendManual} disabled={sending || !manualMsg.title || !manualTargets.length} style={{
          width: '100%', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none',
          cursor: sending || !manualMsg.title || !manualTargets.length ? 'default' : 'pointer',
          background: manualMsg.title && manualTargets.length ? P.accent : '#d1cfc9',
          color: manualMsg.title && manualTargets.length ? '#fff' : P.sub,
        }}>
          {sending ? 'Envoi...' : `Envoyer${manualTargets.length ? ` (${manualTargets.length} athlète${manualTargets.length > 1 ? 's' : ''})` : ''}`}
        </button>
      </div>
    </div>
  )
}
