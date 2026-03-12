import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

// ─── Design tokens ─────────────────────────────────────────────────────────
const C = {
  bg:     '#07090e',
  card:   'rgba(12,16,24,0.80)',
  border: 'rgba(255,255,255,0.07)',
  text:   '#edf2f7',
  sub:    '#6b7f94',
  accent: '#3ecf8e',
  blue:   '#4d9fff',
  orange: '#ff7043',
  purple: '#9d7dea',
  yellow: '#fbbf24',
  red:    '#ff4566',
}

const GLASS = {
  background: C.card,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${C.border}`,
  borderRadius: 16,
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0]
}

function MacroBar({ label, current, goal, color }) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>
        <span style={{ color: C.sub }}>{label}</span>
        <span style={{ color: C.text, fontWeight: 700 }}>{Math.round(current)}{goal ? ` / ${goal}g` : 'g'}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

// ─── Open Food Facts search ────────────────────────────────────────────────
async function searchOFF(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,brands,nutriments,serving_size,image_small_url`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Erreur réseau')
  const data = await res.json()
  return (data.products || [])
    .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'])
    .map(p => ({
      id:       p.code || Math.random().toString(36).slice(2),
      name:     p.product_name,
      brand:    p.brands || '',
      image:    p.image_small_url || null,
      serving:  parseFloat(p.serving_size) || 100,
      per100: {
        kcal:    Math.round(p.nutriments['energy-kcal_100g'] || 0),
        protein: Math.round((p.nutriments['proteins_100g'] || 0) * 10) / 10,
        carbs:   Math.round((p.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
        fat:     Math.round((p.nutriments['fat_100g'] || 0) * 10) / 10,
        fiber:   Math.round((p.nutriments['fiber_100g'] || 0) * 10) / 10,
      }
    }))
}

function calcMacros(item, grams) {
  const r = grams / 100
  return {
    kcal:    Math.round(item.per100.kcal * r),
    protein: Math.round(item.per100.protein * r * 10) / 10,
    carbs:   Math.round(item.per100.carbs * r * 10) / 10,
    fat:     Math.round(item.per100.fat * r * 10) / 10,
    fiber:   Math.round(item.per100.fiber * r * 10) / 10,
  }
}

// ─── SearchPanel ──────────────────────────────────────────────────────────
function SearchPanel({ onAdd, onClose }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState(null)
  const [grams, setGrams]       = useState(100)
  const [meal, setMeal]         = useState('dejeuner')
  const timerRef = useRef(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try { setResults(await searchOFF(query)) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }, 500)
    return () => clearTimeout(timerRef.current)
  }, [query])

  const macros = selected ? calcMacros(selected, grams) : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...GLASS, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, fontFamily: "'Syne',sans-serif" }}>Ajouter un aliment</div>
            <div style={{ fontSize: 11, color: C.sub, fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>Recherche Open Food Facts</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: C.sub, width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center' }}>✕</button>
        </div>

        {/* Recherche */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            placeholder="Ex : yaourt grec, poulet grillé, riz basmati..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '10px 14px', color: C.text,
              fontSize: 14, outline: 'none', fontFamily: "'DM Sans',sans-serif",
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Résultats */}
          {!selected && (
            <div>
              {loading && (
                <div style={{ padding: 20, textAlign: 'center', color: C.sub, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
                  Recherche en cours...
                </div>
              )}
              {!loading && results.map(r => (
                <div key={r.id} onClick={() => { setSelected(r); setGrams(r.serving || 100) }}
                  style={{ padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {r.image
                    ? <img src={r.image} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, borderRadius: 8, background: `${C.accent}15`, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 18 }}>🥗</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'DM Sans',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{r.brand || ''} • {r.per100.kcal} kcal/100g</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, flexShrink: 0 }}>
                    P {r.per100.protein}g
                  </div>
                </div>
              ))}
              {!loading && query.length >= 2 && results.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: C.sub, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
                  Aucun résultat pour "{query}"
                </div>
              )}
            </div>
          )}

          {/* Détail produit sélectionné */}
          {selected && macros && (
            <div style={{ padding: '16px 20px', display: 'grid', gap: 14 }}>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
                ← Retour aux résultats
              </button>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {selected.image
                  ? <img src={selected.image} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover' }} />
                  : <div style={{ width: 52, height: 52, borderRadius: 10, background: `${C.accent}15`, display: 'grid', placeItems: 'center', fontSize: 24 }}>🥗</div>
                }
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: "'Syne',sans-serif" }}>{selected.name}</div>
                  {selected.brand && <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{selected.brand}</div>}
                </div>
              </div>

              {/* Quantité */}
              <div>
                <label style={{ fontSize: 12, color: C.sub, fontFamily: "'DM Sans',sans-serif", display: 'block', marginBottom: 6 }}>Quantité (grammes)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" min="1" max="2000"
                    value={grams}
                    onChange={e => setGrams(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: 90, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 14, outline: 'none', fontFamily: "'DM Sans',sans-serif" }}
                  />
                  <span style={{ fontSize: 12, color: C.sub }}>g</span>
                  {[50, 100, 150, 200].map(g => (
                    <button key={g} onClick={() => setGrams(g)}
                      style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${grams === g ? C.accent + '60' : C.border}`, background: grams === g ? `${C.accent}15` : 'rgba(255,255,255,0.03)', color: grams === g ? C.accent : C.sub, fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
                      {g}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Repas */}
              <div>
                <label style={{ fontSize: 12, color: C.sub, fontFamily: "'DM Sans',sans-serif", display: 'block', marginBottom: 6 }}>Repas</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[['petit-dejeuner','Petit-déj'],['dejeuner','Déjeuner'],['diner','Dîner'],['collation','Collation']].map(([v, l]) => (
                    <button key={v} onClick={() => setMeal(v)}
                      style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${meal === v ? C.blue + '60' : C.border}`, background: meal === v ? `${C.blue}15` : 'rgba(255,255,255,0.03)', color: meal === v ? C.blue : C.sub, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Macros calculées */}
              <div style={{ ...GLASS, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
                {[
                  { label: 'Kcal', value: macros.kcal, color: C.orange },
                  { label: 'Protéines', value: `${macros.protein}g`, color: C.accent },
                  { label: 'Glucides', value: `${macros.carbs}g`, color: C.blue },
                  { label: 'Lipides', value: `${macros.fat}g`, color: C.yellow },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: m.color, fontFamily: "'Syne',sans-serif" }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: C.sub, marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onAdd({ product: selected, grams, meal, macros })}
                style={{ padding: '13px', borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, #2ab377)`, border: 'none', color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: "'Syne',sans-serif", letterSpacing: 0.3 }}>
                Ajouter au journal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────
export default function NutritionPage() {
  const { profile } = useAuth()
  const [entries, setEntries]         = useState([])
  const [goals, setGoals]             = useState({ cal: 0, protein: 0, carbs: 0, fat: 0 })
  const [showSearch, setShowSearch]   = useState(false)
  const [loading, setLoading]         = useState(true)

  const uid = profile?.id

  // Charger entrées du jour + objectifs
  useEffect(() => {
    if (!uid) return
    async function load() {
      setLoading(true)
      const [{ data: g }, { data: e }] = await Promise.all([
        supabase.from('nutrition_goals').select('*').eq('user_id', uid).single(),
        supabase.from('food_entries').select('*').eq('user_id', uid).eq('date', today()).order('created_at'),
      ])
      if (g) setGoals({ cal: g.calories || 0, protein: g.protein || 0, carbs: g.carbs || 0, fat: g.fat || 0 })
      if (e) setEntries(e)
      setLoading(false)
    }
    load()
  }, [uid])

  // Ajouter un aliment
  async function handleAdd({ product, grams, meal, macros }) {
    if (!uid) return
    const entry = {
      user_id:      uid,
      date:         today(),
      meal_type:    meal,
      food_name:    product.name,
      brand:        product.brand || null,
      quantity_g:   grams,
      calories:     macros.kcal,
      protein_g:    macros.protein,
      carbs_g:      macros.carbs,
      fat_g:        macros.fat,
      fiber_g:      macros.fiber,
      image_url:    product.image || null,
    }
    const { data, error } = await supabase.from('food_entries').insert(entry).select().single()
    if (!error && data) {
      setEntries(prev => [...prev, data])
      setShowSearch(false)
    }
  }

  // Supprimer une entrée
  async function handleDelete(id) {
    await supabase.from('food_entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  // Totaux
  const totals = entries.reduce((acc, e) => ({
    cal:     acc.cal + (e.calories || 0),
    protein: acc.protein + (e.protein_g || 0),
    carbs:   acc.carbs + (e.carbs_g || 0),
    fat:     acc.fat + (e.fat_g || 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 })

  const MEALS = [
    { key: 'petit-dejeuner', label: 'Petit-déjeuner', color: C.yellow },
    { key: 'dejeuner',       label: 'Déjeuner',       color: C.accent },
    { key: 'diner',          label: 'Dîner',           color: C.blue },
    { key: 'collation',      label: 'Collation',       color: C.purple },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 20px', maxWidth: 720, margin: '0 auto', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.8px' }}>
            Nutrition
          </h1>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          style={{ padding: '10px 18px', borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, #2ab377)`, border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Syne',sans-serif', display: 'flex', alignItems: 'center', gap: 6" }}>
          + Aliment
        </button>
      </div>

      {/* Résumé macros */}
      <div style={{ ...GLASS, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Aujourd'hui</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: totals.cal > goals.cal && goals.cal > 0 ? C.red : C.accent, fontFamily: "'Syne',sans-serif" }}>
            {Math.round(totals.cal)} <span style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{goals.cal ? `/ ${goals.cal} kcal` : 'kcal'}</span>
          </span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <MacroBar label="Protéines" current={totals.protein} goal={goals.protein} color={C.accent} />
          <MacroBar label="Glucides"  current={totals.carbs}   goal={goals.carbs}   color={C.blue} />
          <MacroBar label="Lipides"   current={totals.fat}     goal={goals.fat}     color={C.yellow} />
        </div>
      </div>

      {/* Entrées par repas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.sub }}>Chargement...</div>
      ) : (
        MEALS.map(m => {
          const mealEntries = entries.filter(e => e.meal_type === m.key)
          const mealKcal = mealEntries.reduce((s, e) => s + (e.calories || 0), 0)
          return (
            <div key={m.key} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: m.color, textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</span>
                {mealKcal > 0 && <span style={{ fontSize: 11, color: C.sub }}>{Math.round(mealKcal)} kcal</span>}
              </div>

              {mealEntries.length === 0 ? (
                <div
                  onClick={() => { setShowSearch(true) }}
                  style={{ ...GLASS, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', opacity: 0.5, borderStyle: 'dashed' }}>
                  <span style={{ fontSize: 13, color: C.sub }}>+ Ajouter un aliment</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {mealEntries.map(e => (
                    <div key={e.id} style={{ ...GLASS, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                      {e.image_url
                        ? <img src={e.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 8, background: `${m.color}15`, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 16 }}>🥗</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.food_name}</div>
                        <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>
                          {e.quantity_g}g • P {e.protein_g}g • G {e.carbs_g}g • L {e.fat_g}g
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.orange }}>{e.calories} kcal</div>
                        <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 12, padding: '2px 0', marginTop: 2 }}>✕</button>
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => setShowSearch(true)}
                    style={{ padding: '8px 14px', borderRadius: 10, border: `1px dashed ${C.border}`, color: C.sub, fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>
                    + Ajouter
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {showSearch && <SearchPanel onAdd={handleAdd} onClose={() => setShowSearch(false)} />}
    </div>
  )
}
