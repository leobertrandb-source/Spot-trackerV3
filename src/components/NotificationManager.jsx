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

const JOURS = [
  { key: 1, label: 'Lun' }, { key: 2, label: 'Mar' }, { key: 3, label: 'Mer' },
  { key: 4, label: 'Jeu' }, { key: 5, label: 'Ven' }, { key: 6, label: 'Sam' }, { key: 0, label: 'Dim' },
]

const NOTIF_TYPES = [
  { key: 'hooper',   label: '🧠 Rappel HOOPER',    url: '/prep/hooper',         defaultTitle: 'HOOPER du jour', defaultBody: 'Prends 30 secondes pour renseigner ton état.' },
  { key: 'charge',   label: '⚡ Rappel charge',     url: '/prep/charge-externe', defaultTitle: 'Charge de séance', defaultBody: 'Renseigne ta charge d\'entraînement.' },
  { key: 'compo',    label: '⚖️ Bilan compo',       url: '/prep/compo',          defaultTitle: 'Bilan morphologique', defaultBody: 'Ton bilan du mois est disponible.' },
  { key: 'libre',    label: '✏️ Message libre',     url: '/',                    defaultTitle: '', defaultBody: '' },
]

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

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', padding: '6px 0' }}>
      <div onClick={onChange} style={{
        width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? P.accent : P.border}`,
        background: checked ? P.accent : P.card, display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all 0.15s',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13, color: P.text, fontWeight: 500 }}>{label}</span>
    </label>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${P.border}` }}>{children}</div>
}

export default function NotificationManager({ clients = [] }) {
  const { user } = useAuth()

  // ── Tab actif ──────────────────────────────────────────────────────
  const [tab, setTab] = useState('campagne') // 'campagne' | 'parametres'

  // ── Campagne ───────────────────────────────────────────────────────
  const [campTargets, setCampTargets] = useState([])         // athlete ids sélectionnés
  const [campType, setCampType] = useState(NOTIF_TYPES[0])   // type de notif
  const [campTitle, setCampTitle] = useState(NOTIF_TYPES[0].defaultTitle)
  const [campBody, setCampBody] = useState(NOTIF_TYPES[0].defaultBody)
  const [campUrl, setCampUrl] = useState(NOTIF_TYPES[0].url)
  const [campMode, setCampMode] = useState('immediat')       // 'immediat' | 'programme'
  const [campHeure, setCampHeure] = useState('08:00')
  const [campJours, setCampJours] = useState([1, 2, 3, 4, 5]) // lun-ven par défaut
  const [sending, setSending] = useState(false)
  const [sentMsg, setSentMsg] = useState('')

  // ── Paramètres individuels ─────────────────────────────────────────
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState({})
  const [expanded, setExpanded] = useState(null)

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

  // Quand le type change, mettre à jour titre/body/url par défaut
  function selectType(type) {
    setCampType(type)
    if (type.defaultTitle) setCampTitle(type.defaultTitle)
    if (type.defaultBody) setCampBody(type.defaultBody)
    setCampUrl(type.url)
  }

  const allSelected = campTargets.length === clients.length
  function toggleAll() { setCampTargets(allSelected ? [] : clients.map(c => c.id)) }
  function toggleTarget(id) { setCampTargets(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]) }
  function toggleJour(j) { setCampJours(p => p.includes(j) ? p.filter(x => x !== j) : [...p, j]) }

  async function sendCampagne() {
    if (!campTitle || !campTargets.length) return
    setSending(true); setSentMsg('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notifications/manual`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteIds: campTargets, title: campTitle, message: campBody, url: campUrl }),
      })
      const data = await res.json()
      setSentMsg(`✅ ${data.sent || 0} notification(s) envoyée(s)`)
    } catch { setSentMsg('❌ Erreur d\'envoi') }
    setSending(false)
  }

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

  function update(id, key, val) { setSettings(p => ({ ...p, [id]: { ...p[id], [key]: val } })) }

  const inp = { background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 10px', color: P.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: P.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, display: 'block' }

  const pillBtn = (active, onClick, label) => (
    <button key={label} onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: `1px solid ${active ? P.accent : P.border}`,
      background: active ? P.accent : P.card, color: active ? '#fff' : P.sub,
    }}>{label}</button>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[{ key: 'campagne', label: '📢 Envoyer une notif' }, { key: 'parametres', label: '⚙️ Paramètres individuels' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${tab === t.key ? P.accent : P.border}`,
            background: tab === t.key ? P.accent : P.card,
            color: tab === t.key ? '#fff' : P.sub,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ ONGLET CAMPAGNE ══════════════════════════════════════════════ */}
      {tab === 'campagne' && (
        <div style={{ display: 'grid', gap: 20 }}>

          {/* 1. Destinataires */}
          <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '18px 20px' }}>
            <SectionTitle>① Destinataires</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4 }}>
              <Checkbox checked={allSelected} onChange={toggleAll} label={<strong>Tout sélectionner ({clients.length})</strong>} />
              <div style={{ gridColumn: '1 / -1', height: 1, background: P.border, margin: '4px 0' }} />
              {clients.map(c => (
                <Checkbox key={c.id} checked={campTargets.includes(c.id)}
                  onChange={() => toggleTarget(c.id)}
                  label={c.full_name || c.email} />
              ))}
            </div>
            {campTargets.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: P.green, fontWeight: 600 }}>
                {campTargets.length} athlète{campTargets.length > 1 ? 's' : ''} sélectionné{campTargets.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* 2. Type de notif */}
          <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '18px 20px' }}>
            <SectionTitle>② Type de notification</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {NOTIF_TYPES.map(t => (
                <button key={t.key} onClick={() => selectType(t)} style={{
                  padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${campType.key === t.key ? P.accent : P.border}`,
                  background: campType.key === t.key ? `${P.accent}10` : P.bg,
                  color: campType.key === t.key ? P.accent : P.sub,
                  outline: campType.key === t.key ? `2px solid ${P.accent}` : 'none',
                }}>{t.label}</button>
              ))}
            </div>

            {/* Contenu message */}
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <div>
                <span style={lbl}>Titre</span>
                <input value={campTitle} onChange={e => setCampTitle(e.target.value)} placeholder="Titre de la notification" style={inp} />
              </div>
              <div>
                <span style={lbl}>Message</span>
                <textarea value={campBody} onChange={e => setCampBody(e.target.value)}
                  placeholder="Corps du message..." rows={2} style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
          </div>

          {/* 3. Envoi */}
          <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '18px 20px' }}>
            <SectionTitle>③ Envoi</SectionTitle>

            {/* Mode */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {pillBtn(campMode === 'immediat', () => setCampMode('immediat'), '⚡ Immédiat')}
              {pillBtn(campMode === 'programme', () => setCampMode('programme'), '🕐 Programmé (récurrent)')}
            </div>

            {/* Options programmé */}
            {campMode === 'programme' && (
              <div style={{ display: 'grid', gap: 14, padding: '14px', background: P.bg, borderRadius: 10, border: `1px solid ${P.border}`, marginBottom: 16 }}>
                <div>
                  <span style={lbl}>Heure d'envoi</span>
                  <input type="time" value={campHeure} onChange={e => setCampHeure(e.target.value)}
                    style={{ ...inp, width: 130 }} />
                </div>
                <div>
                  <span style={lbl}>Jours de la semaine</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {JOURS.map(j => pillBtn(campJours.includes(j.key), () => toggleJour(j.key), j.label))}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <button onClick={() => setCampJours([1,2,3,4,5])} style={{ fontSize: 11, color: P.sub, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Sem. de travail</button>
                    <button onClick={() => setCampJours([0,1,2,3,4,5,6])} style={{ fontSize: 11, color: P.sub, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Tous les jours</button>
                    <button onClick={() => setCampJours([])} style={{ fontSize: 11, color: P.red, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Effacer</button>
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                  ⚠️ La programmation récurrente nécessite que le cron Vercel soit actif (configuré dans vercel.json)
                </div>
              </div>
            )}

            {sentMsg && (
              <div style={{ fontSize: 13, fontWeight: 700, color: sentMsg.startsWith('✅') ? P.green : P.red, marginBottom: 12 }}>
                {sentMsg}
              </div>
            )}

            <button onClick={sendCampagne} disabled={sending || !campTitle || !campTargets.length} style={{
              width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none',
              cursor: sending || !campTitle || !campTargets.length ? 'default' : 'pointer',
              background: campTitle && campTargets.length ? P.accent : '#d1cfc9',
              color: campTitle && campTargets.length ? '#fff' : P.sub,
              opacity: sending ? 0.7 : 1,
            }}>
              {sending
                ? 'Envoi en cours...'
                : campMode === 'immediat'
                  ? `Envoyer maintenant${campTargets.length ? ` → ${campTargets.length} athlète${campTargets.length > 1 ? 's' : ''}` : ''}`
                  : `Programmer${campTargets.length ? ` → ${campTargets.length} athlète${campTargets.length > 1 ? 's' : ''}` : ''}`
              }
            </button>
          </div>
        </div>
      )}

      {/* ══ ONGLET PARAMÈTRES INDIVIDUELS ═══════════════════════════════ */}
      {tab === 'parametres' && (
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

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.rappel_hooper ? 10 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Rappel HOOPER → Athlète</div>
                          <div style={{ fontSize: 11, color: P.sub }}>Notif si non rempli à l'heure choisie</div>
                        </div>
                        <Toggle value={s.rappel_hooper} onChange={v => update(client.id, 'rappel_hooper', v)} />
                      </div>
                      {s.rappel_hooper && (
                        <div><span style={lbl}>Heure d'envoi</span>
                          <input type="time" value={s.rappel_hooper_heure}
                            onChange={e => update(client.id, 'rappel_hooper_heure', e.target.value)}
                            style={{ ...inp, width: 130 }} /></div>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.alerte_fatigue ? 10 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Alerte fatigue → Coach</div>
                          <div style={{ fontSize: 11, color: P.sub }}>Notif si score HOOPER ≥ seuil</div>
                        </div>
                        <Toggle value={s.alerte_fatigue} onChange={v => update(client.id, 'alerte_fatigue', v)} />
                      </div>
                      {s.alerte_fatigue && (
                        <div><span style={lbl}>Seuil (/40)</span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[14, 18, 21, 25, 30].map(v => pillBtn(s.alerte_fatigue_seuil === v, () => update(client.id, 'alerte_fatigue_seuil', v), `≥${v}`))}
                          </div></div>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.alerte_missing ? 10 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Alerte non-remplissage → Coach</div>
                          <div style={{ fontSize: 11, color: P.sub }}>Notif si HOOPER non rempli depuis X jours</div>
                        </div>
                        <Toggle value={s.alerte_missing} onChange={v => update(client.id, 'alerte_missing', v)} />
                      </div>
                      {s.alerte_missing && (
                        <div><span style={lbl}>Délai</span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[1, 2, 3, 5, 7].map(v => pillBtn(s.alerte_missing_jours === v, () => update(client.id, 'alerte_missing_jours', v), `${v}j`))}
                          </div></div>
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
      )}
    </div>
  )
}
