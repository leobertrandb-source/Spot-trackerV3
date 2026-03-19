// src/components/NotificationManager.jsx
// Composant de gestion des notifications — à intégrer dans CoachPage_ProSport
// Usage : <NotificationManager clients={clients} />

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  rappel_hooper:        true,
  rappel_hooper_heure:  '08:00',
  alerte_fatigue:       true,
  alerte_fatigue_seuil: 21,
  alerte_missing:       true,
  alerte_missing_jours: 2,
}

// ── Mini toggle ───────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
      background: value ? T.accent : 'rgba(255,255,255,0.1)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function NotificationManager({ clients = [] }) {
  const { user } = useAuth()
  const [settings, setSettings]     = useState({}) // keyed by athlete_id
  const [saving, setSaving]         = useState({})
  const [expanded, setExpanded]     = useState(null)
  const [manualMsg, setManualMsg]   = useState({ title: '', body: '', url: '/' })
  const [manualTargets, setManualTargets] = useState([])
  const [sending, setSending]       = useState(false)
  const [sentMsg, setSentMsg]       = useState('')

  // Charger les paramètres existants
  const load = useCallback(async () => {
    if (!clients.length) return
    const ids = clients.map(c => c.id)
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('coach_id', user.id)
      .in('athlete_id', ids)

    const map = {}
    for (const c of clients) {
      const found = (data || []).find(d => d.athlete_id === c.id)
      map[c.id] = found ? { ...found } : { ...DEFAULT_SETTINGS, athlete_id: c.id, coach_id: user.id }
    }
    setSettings(map)
  }, [clients, user.id])

  useEffect(() => { load() }, [load])

  // Sauvegarder les paramètres d'un athlète
  async function save(athleteId) {
    setSaving(p => ({ ...p, [athleteId]: true }))
    const s = settings[athleteId]
    await supabase.from('notification_settings').upsert({
      coach_id:             user.id,
      athlete_id:           athleteId,
      rappel_hooper:        s.rappel_hooper,
      rappel_hooper_heure:  s.rappel_hooper_heure,
      alerte_fatigue:       s.alerte_fatigue,
      alerte_fatigue_seuil: s.alerte_fatigue_seuil,
      alerte_missing:       s.alerte_missing,
      alerte_missing_jours: s.alerte_missing_jours,
    }, { onConflict: 'coach_id,athlete_id' })
    setSaving(p => ({ ...p, [athleteId]: false }))
  }

  function update(athleteId, key, value) {
    setSettings(p => ({ ...p, [athleteId]: { ...p[athleteId], [key]: value } }))
  }

  // Envoi manuel
  async function sendManual() {
    if (!manualMsg.title || !manualTargets.length) return
    setSending(true)
    setSentMsg('')
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/send-notifications/manual`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            athleteIds: manualTargets,
            title: manualMsg.title,
            message: manualMsg.body,
            url: manualMsg.url,
          }),
        }
      )
      const data = await res.json()
      setSentMsg(`✅ ${data.sent || 0} notification(s) envoyée(s)`)
      setManualMsg({ title: '', body: '', url: '/' })
      setManualTargets([])
    } catch {
      setSentMsg('❌ Erreur envoi')
    }
    setSending(false)
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`,
    borderRadius: 8, padding: '7px 10px', color: T.text, fontSize: 13,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  const labelStyle = { fontSize: 11, color: T.textDim, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ── Paramètres par athlète ── */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>
          Paramètres par athlète
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {clients.map(client => {
            const s = settings[client.id]
            if (!s) return null
            const isOpen = expanded === client.id
            const allOff = !s.rappel_hooper && !s.alerte_fatigue && !s.alerte_missing

            return (
              <div key={client.id} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 14,
                border: `1px solid ${T.border}`, overflow: 'hidden',
              }}>
                {/* Header */}
                <div onClick={() => setExpanded(isOpen ? null : client.id)} style={{
                  padding: '12px 16px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                      {client.full_name || client.email}
                    </div>
                    <div style={{ fontSize: 11, color: allOff ? '#ff4566' : T.accentLight, marginTop: 2 }}>
                      {allOff ? '🔕 Toutes notifs désactivées' : '🔔 Notifs actives'}
                    </div>
                  </div>
                  <span style={{ color: T.textDim, fontSize: 18 }}>{isOpen ? '⌃' : '⌄'}</span>
                </div>

                {/* Détail */}
                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${T.border}`, display: 'grid', gap: 14 }}>

                    {/* Rappel HOOPER */}
                    <div style={{ paddingTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.rappel_hooper ? 10 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Rappel HOOPER</div>
                          <div style={{ fontSize: 11, color: T.textDim }}>Notif à l'athlète si non rempli</div>
                        </div>
                        <Toggle value={s.rappel_hooper} onChange={v => update(client.id, 'rappel_hooper', v)} />
                      </div>
                      {s.rappel_hooper && (
                        <div>
                          <div style={labelStyle}>Heure d'envoi</div>
                          <input type="time" value={s.rappel_hooper_heure}
                            onChange={e => update(client.id, 'rappel_hooper_heure', e.target.value)}
                            style={{ ...inputStyle, width: 120 }} />
                        </div>
                      )}
                    </div>

                    {/* Alerte fatigue */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.alerte_fatigue ? 10 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Alerte fatigue → Coach</div>
                          <div style={{ fontSize: 11, color: T.textDim }}>Notif si score HOOPER ≥ seuil</div>
                        </div>
                        <Toggle value={s.alerte_fatigue} onChange={v => update(client.id, 'alerte_fatigue', v)} />
                      </div>
                      {s.alerte_fatigue && (
                        <div>
                          <div style={labelStyle}>Seuil d'alerte (/40)</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[14, 18, 21, 25, 30].map(v => (
                              <button key={v} onClick={() => update(client.id, 'alerte_fatigue_seuil', v)}
                                style={{
                                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                  cursor: 'pointer', border: `1px solid ${s.alerte_fatigue_seuil === v ? T.accent + '60' : T.border}`,
                                  background: s.alerte_fatigue_seuil === v ? `${T.accent}15` : 'transparent',
                                  color: s.alerte_fatigue_seuil === v ? T.accentLight : T.textDim,
                                }}>
                                ≥{v}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Alerte non-remplissage */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.alerte_missing ? 10 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Alerte non-remplissage → Coach</div>
                          <div style={{ fontSize: 11, color: T.textDim }}>Notif si HOOPER non rempli depuis X jours</div>
                        </div>
                        <Toggle value={s.alerte_missing} onChange={v => update(client.id, 'alerte_missing', v)} />
                      </div>
                      {s.alerte_missing && (
                        <div>
                          <div style={labelStyle}>Délai avant alerte</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[1, 2, 3, 5, 7].map(v => (
                              <button key={v} onClick={() => update(client.id, 'alerte_missing_jours', v)}
                                style={{
                                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                  cursor: 'pointer', border: `1px solid ${s.alerte_missing_jours === v ? T.accent + '60' : T.border}`,
                                  background: s.alerte_missing_jours === v ? `${T.accent}15` : 'transparent',
                                  color: s.alerte_missing_jours === v ? T.accentLight : T.textDim,
                                }}>
                                {v}j
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sauvegarder */}
                    <button onClick={() => save(client.id)} disabled={saving[client.id]}
                      style={{
                        padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        cursor: saving[client.id] ? 'default' : 'pointer',
                        border: `1px solid ${T.accent}40`,
                        background: `${T.accent}15`, color: T.accentLight,
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
      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 14 }}>
          📢 Envoyer une notification manuelle
        </div>

        {/* Sélection athlètes */}
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Destinataires</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setManualTargets(manualTargets.length === clients.length ? [] : clients.map(c => c.id))}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${manualTargets.length === clients.length ? T.accent + '60' : T.border}`,
                background: manualTargets.length === clients.length ? `${T.accent}15` : 'transparent',
                color: manualTargets.length === clients.length ? T.accentLight : T.textDim,
              }}>
              Tous
            </button>
            {clients.map(c => (
              <button key={c.id} onClick={() => setManualTargets(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${manualTargets.includes(c.id) ? T.accent + '60' : T.border}`,
                  background: manualTargets.includes(c.id) ? `${T.accent}15` : 'transparent',
                  color: manualTargets.includes(c.id) ? T.accentLight : T.textDim,
                }}>
                {(c.full_name || c.email).split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={labelStyle}>Titre *</div>
            <input value={manualMsg.title} onChange={e => setManualMsg(p => ({ ...p, title: e.target.value }))}
              placeholder="ex: Séance annulée demain" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Message</div>
            <textarea value={manualMsg.body} onChange={e => setManualMsg(p => ({ ...p, body: e.target.value }))}
              placeholder="Détails..." rows={2}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div>
            <div style={labelStyle}>Lien (page à ouvrir)</div>
            <select value={manualMsg.url} onChange={e => setManualMsg(p => ({ ...p, url: e.target.value }))}
              style={inputStyle}>
              <option value="/">Accueil</option>
              <option value="/prep/hooper">HOOPER</option>
              <option value="/prep/charge">Charge interne</option>
              <option value="/prep/charge-externe">Charge externe</option>
              <option value="/prep/compo">Composition</option>
            </select>
          </div>
        </div>

        {sentMsg && (
          <div style={{ fontSize: 12, fontWeight: 700, color: sentMsg.startsWith('✅') ? T.accentLight : '#ff7b7b', marginBottom: 10 }}>
            {sentMsg}
          </div>
        )}

        <button onClick={sendManual} disabled={sending || !manualMsg.title || !manualTargets.length}
          style={{
            width: '100%', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 800,
            cursor: sending || !manualMsg.title || !manualTargets.length ? 'default' : 'pointer',
            background: manualMsg.title && manualTargets.length ? T.accent : 'rgba(255,255,255,0.05)',
            color: manualMsg.title && manualTargets.length ? '#fff' : T.textDim,
            border: 'none', opacity: sending ? 0.7 : 1,
          }}>
          {sending ? 'Envoi...' : `Envoyer${manualTargets.length ? ` (${manualTargets.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}
