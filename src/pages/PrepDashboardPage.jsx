import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card } from '../components/UI'
import { T } from '../lib/data'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreLabel(total) {
  if (!total) return { text: '—', color: T.textDim, bg: 'transparent' }
  if (total <= 7)  return { text: 'Très bon',         color: '#3ecf8e', bg: 'rgba(62,207,142,0.08)' }
  if (total <= 13) return { text: 'Correct',           color: '#3ecf8e', bg: 'rgba(62,207,142,0.06)' }
  if (total <= 20) return { text: 'Vigilance',         color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' }
  return               { text: 'Fatigue importante', color: '#ff4566', bg: 'rgba(255,69,102,0.10)' }
}

function acwrColor(r) {
  if (!r) return T.textDim
  if (r < 0.8)  return '#4d9fff'
  if (r <= 1.3) return '#3ecf8e'
  if (r <= 1.5) return '#fbbf24'
  return '#ff4566'
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000)
  return diff
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrepDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'alert' | 'ok'

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)

    // 1. Récupérer les clients du coach
    const { data: links } = await supabase
      .from('coach_clients').select('client_id').eq('coach_id', user.id)
    if (!links?.length) { setLoading(false); return }
    const ids = links.map(l => l.client_id)

    // 2. Profils
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, email').in('id', ids)

    // 3. HOOPER — dernière entrée par athlète
    const { data: hoopers } = await supabase
      .from('hooper_logs').select('*')
      .in('user_id', ids)
      .order('date', { ascending: false })

    // 4. Composition corporelle — dernière mesure
    const { data: compos } = await supabase
      .from('body_composition_logs').select('*')
      .in('user_id', ids)
      .order('date', { ascending: false })

    // 5. Charge externe — dernière semaine
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const { data: charges } = await supabase
      .from('charge_externe_logs').select('*')
      .in('user_id', ids)
      .gte('date', weekAgo.toISOString().split('T')[0])

    // Organiser par athlète
    const hooperByUser = {}
    for (const h of (hoopers || [])) {
      if (!hooperByUser[h.user_id]) hooperByUser[h.user_id] = h
    }

    const compoByUser = {}
    for (const c of (compos || [])) {
      if (!compoByUser[c.user_id]) compoByUser[c.user_id] = c
    }

    const chargeByUser = {}
    for (const c of (charges || [])) {
      if (!chargeByUser[c.user_id]) chargeByUser[c.user_id] = { total: 0, sessions: 0 }
      chargeByUser[c.user_id].total += c.charge_ua || (c.rpe * c.duree_min)
      chargeByUser[c.user_id].sessions += 1
    }

    const data = (profiles || []).map(p => ({
      ...p,
      hooper: hooperByUser[p.id] || null,
      compo:  compoByUser[p.id] || null,
      charge: chargeByUser[p.id] || null,
    }))

    setAthletes(data)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // Trier : alertes en premier
  const sorted = [...athletes].sort((a, b) => {
    const sa = a.hooper ? a.hooper.fatigue + a.hooper.sommeil + a.hooper.stress + a.hooper.courbatures : -1
    const sb = b.hooper ? b.hooper.fatigue + b.hooper.sommeil + b.hooper.stress + b.hooper.courbatures : -1
    return sb - sa
  })

  const filtered = sorted.filter(a => {
    if (filter === 'all') return true
    const score = a.hooper ? a.hooper.fatigue + a.hooper.sommeil + a.hooper.stress + a.hooper.courbatures : 0
    if (filter === 'alert') return score >= 21
    if (filter === 'ok') return score < 21 && score > 0
    return true
  })

  const alerts = sorted.filter(a => {
    const s = a.hooper ? a.hooper.fatigue + a.hooper.sommeil + a.hooper.stress + a.hooper.courbatures : 0
    return s >= 21
  })

  const hooperToday = sorted.filter(a => a.hooper?.date === today).length
  const hooperMissing = sorted.filter(a => !a.hooper || a.hooper.date !== today).length

  return (
    <PageWrap>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* Header */}
        <div>
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, border: `1px solid ${T.accent}28`, background: T.accentGlowSm, color: T.accentLight, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Prépa physique
          </div>
          <div style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: T.text, fontFamily: T.fontDisplay }}>Dashboard athlètes</div>
          <div style={{ color: T.textMid, fontSize: 14, marginTop: 4 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {athletes.length} athlète{athletes.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* KPIs du jour */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {[
            { label: 'HOOPER rempli', value: hooperToday, unit: `/ ${athletes.length}`, color: '#3ecf8e' },
            { label: 'Non rempli', value: hooperMissing, unit: 'athlètes', color: hooperMissing > 0 ? '#fbbf24' : T.textDim },
            { label: '🚨 Alertes', value: alerts.length, unit: 'fatigue imp.', color: alerts.length > 0 ? '#ff4566' : T.textDim, glow: alerts.length > 0 },
          ].map(({ label, value, unit, color, glow }) => (
            <div key={label} style={{ padding: '14px', background: glow ? 'rgba(255,69,102,0.06)' : 'rgba(255,255,255,0.03)', borderRadius: 14, border: `1px solid ${glow ? 'rgba(255,69,102,0.2)' : T.border}` }}>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: T.fontDisplay, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{unit}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all',   label: `Tous (${athletes.length})` },
            { key: 'alert', label: `🚨 Alertes (${alerts.length})` },
            { key: 'ok',    label: 'OK' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${filter === f.key ? T.accent + '40' : T.border}`, background: filter === f.key ? `${T.accent}12` : 'transparent', color: filter === f.key ? T.accentLight : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {f.label}
            </button>
          ))}
          <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontSize: 12, cursor: 'pointer' }}>↻ Actualiser</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>Aucun athlète</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map(athlete => {
              const h = athlete.hooper
              const score = h ? h.fatigue + h.sommeil + h.stress + h.courbatures : null
              const si = scoreLabel(score)
              const isAlert = score >= 21
              const daysH = h ? daysAgo(h.date) : null
              const c = athlete.compo
              const ch = athlete.charge

              return (
                <div key={athlete.id}
                  onClick={() => navigate(`/coach/client/${athlete.id}`)}
                  style={{ background: isAlert ? 'rgba(255,69,102,0.04)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isAlert ? 'rgba(255,69,102,0.25)' : T.border}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = isAlert ? 'rgba(255,69,102,0.07)' : 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = isAlert ? 'rgba(255,69,102,0.04)' : 'rgba(255,255,255,0.025)'}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>

                    {/* Identité */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {isAlert && <span style={{ fontSize: 14 }}>🚨</span>}
                        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {athlete.full_name || athlete.email}
                        </div>
                      </div>

                      {/* HOOPER */}
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {score !== null ? (
                          <>
                            <div style={{ padding: '4px 10px', borderRadius: 20, background: si.bg, border: `1px solid ${si.color}30`, fontSize: 12, fontWeight: 700, color: si.color }}>
                              HOOPER {score}/40 — {si.text}
                            </div>
                            {daysH !== null && daysH > 0 && (
                              <div style={{ fontSize: 11, color: T.textDim }}>il y a {daysH}j</div>
                            )}
                            {daysH === 0 && <div style={{ fontSize: 11, color: T.accentLight }}>✓ Aujourd'hui</div>}
                          </>
                        ) : (
                          <div style={{ fontSize: 12, color: T.textDim, fontStyle: 'italic' }}>HOOPER non rempli</div>
                        )}
                      </div>

                      {/* Détail HOOPER si alerte */}
                      {isAlert && h && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {[
                            { label: 'Fatigue', val: h.fatigue, color: '#ff7043' },
                            { label: 'Sommeil', val: h.sommeil, color: '#9d7dea' },
                            { label: 'Stress',  val: h.stress,  color: '#4d9fff' },
                            { label: 'Courbatures', val: h.courbatures, color: '#ff4566' },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ fontSize: 11, color }}>
                              <span style={{ color: T.textDim }}>{label}: </span><strong>{val}/10</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* DOMS si présents */}
                      {h?.doms_zones && Object.values(h.doms_zones).some(z => z.level > 0) && (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#ff4566' }}>
                          🩹 DOMS actifs — {Object.values(h.doms_zones).filter(z => z.level > 0).length} zone{Object.values(h.doms_zones).filter(z => z.level > 0).length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Métriques rapides */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                      {c?.weight_kg && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#3ecf8e', fontFamily: T.fontDisplay }}>{c.weight_kg}<span style={{ fontSize: 10 }}>kg</span></div>
                          <div style={{ fontSize: 9, color: T.textDim }}>Poids</div>
                        </div>
                      )}
                      {c?.body_fat_pct && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#ff7043', fontFamily: T.fontDisplay }}>{c.body_fat_pct}<span style={{ fontSize: 10 }}>%</span></div>
                          <div style={{ fontSize: 9, color: T.textDim }}>M. grasse</div>
                        </div>
                      )}
                      {ch && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#4d9fff', fontFamily: T.fontDisplay }}>{Math.round(ch.total)}</div>
                          <div style={{ fontSize: 9, color: T.textDim }}>UA / sem.</div>
                        </div>
                      )}
                      <div style={{ color: T.textDim, fontSize: 16 }}>→</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageWrap>
  )
}
