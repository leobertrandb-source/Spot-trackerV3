import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Input, Btn, Ring, MacroBar, PageWrap, PageHeader, Badge } from '../components/UI'
import { MACRO_CONFIG, T } from '../lib/data'

const today = new Date().toISOString().split('T')[0]
const EMPTY_MEAL = { meal_name: '', calories: '', proteins: '', carbs: '', fats: '', water: '' }

function MacroRings({ totals, goals }) {
  const macros = [
    { key: 'calories', size: 130, stroke: 10 },
    { key: 'proteins', size: 90,  stroke: 7  },
    { key: 'carbs',    size: 90,  stroke: 7  },
    { key: 'fats',     size: 90,  stroke: 7  },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      {macros.map(({ key, size, stroke }) => {
        const cfg = MACRO_CONFIG[key]
        const val = Math.round(totals[key] || 0)
        const max = goals[key] || 1
        return (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Ring
              value={val} max={max} color={cfg.color}
              size={size} stroke={stroke}
              label={val >= 1000 ? `${(val/1000).toFixed(1)}k` : String(val)}
              sublabel={cfg.unit}
            />
            <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: 1.5, color: T.textMid, textTransform: 'uppercase' }}>
              {cfg.icon} {cfg.label}
            </div>
          </div>
        )
      })}

      {/* Water bar */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 28, color: '#26c6da', lineHeight: 1 }}>
            {((totals.water || 0) / 1000).toFixed(1)}L
          </div>
          <div style={{ fontSize: 11, color: T.textDim }}>/ {(goals.water / 1000).toFixed(1)}L</div>
        </div>
        <MacroBar label="Hydratation" value={totals.water || 0} max={goals.water || 2500} unit="ml" color="#26c6da" />
        <MacroBar label="Protéines"   value={Math.round(totals.proteins || 0)} max={goals.proteins || 180} unit="g" color={MACRO_CONFIG.proteins.color} />
        <MacroBar label="Glucides"    value={Math.round(totals.carbs || 0)} max={goals.carbs || 280} unit="g" color={MACRO_CONFIG.carbs.color} />
        <MacroBar label="Lipides"     value={Math.round(totals.fats || 0)} max={goals.fats || 80} unit="g" color={MACRO_CONFIG.fats.color} />
      </div>
    </div>
  )
}

export default function NutritionPage() {
  const { user } = useAuth()
  const [goals, setGoals] = useState({ calories: 2500, proteins: 180, carbs: 280, fats: 80, water: 2500 })
  const [logs, setLogs] = useState([])
  const [meal, setMeal] = useState(EMPTY_MEAL)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showGoals, setShowGoals] = useState(false)
  const [goalDraft, setGoalDraft] = useState({})

  // Wait for auth to be ready (important for Supabase RLS + user_id).
  useEffect(() => {
    if (!user?.id) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function loadAll() {
    try {
      setLoading(true)
      const [{ data: g, error: gErr }, { data: l, error: lErr }] = await Promise.all([
        // If the user has no row yet, Supabase can return an error with .single().
        // We keep defaults in that case.
        supabase.from('nutrition_goals').select('*').eq('user_id', user.id).single(),
        supabase.from('nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', today).order('created_at'),
      ])

      if (gErr && gErr.code !== 'PGRST116') {
        console.error('Nutrition goals load error:', gErr)
      }
      if (lErr) {
        console.error('Nutrition logs load error:', lErr)
      }

      if (g) setGoals(g)
      setLogs(l || [])
    } finally {
      setLoading(false)
    }
  }

  const totals = logs.reduce((acc, log) => ({
    calories: (acc.calories || 0) + (log.calories || 0),
    proteins: (acc.proteins || 0) + parseFloat(log.proteins || 0),
    carbs:    (acc.carbs    || 0) + parseFloat(log.carbs    || 0),
    fats:     (acc.fats     || 0) + parseFloat(log.fats     || 0),
    water:    (acc.water    || 0) + (log.water || 0),
  }), {})

  async function addMeal() {
    if (!meal.calories && !meal.proteins && !meal.water) return
    setSaving(true)
    const { data, error } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id,
        log_date: today,
        meal_name: meal.meal_name || null,
        calories: parseInt(meal.calories) || 0,
        proteins: parseFloat(meal.proteins) || 0,
        carbs: parseFloat(meal.carbs) || 0,
        fats: parseFloat(meal.fats) || 0,
        water: parseInt(meal.water) || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur ajout repas:', error)
      alert(`Impossible d\'enregistrer le repas : ${error.message}`)
      setSaving(false)
      return
    }

    if (data) setLogs(p => [...p, data])
    setMeal(EMPTY_MEAL)
    setSaving(false)
  }

  async function removeLog(id) {
    await supabase.from('nutrition_logs').delete().eq('id', id)
    setLogs(p => p.filter(l => l.id !== id))
  }

  async function saveGoals() {
    const updated = { ...goals, ...goalDraft }
    await supabase.from('nutrition_goals').upsert({ user_id: user.id, ...updated })
    setGoals(updated)
    setShowGoals(false)
    setGoalDraft({})
  }

  const calPct = Math.round(((totals.calories || 0) / goals.calories) * 100)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: T.textDim, fontFamily: T.fontDisplay, fontSize: 11, letterSpacing: 3 }}>CHARGEMENT...</div>
  )

  return (
    <PageWrap>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <PageHeader title="Nutrition" sub={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
        <Btn variant="secondary" size="sm" onClick={() => { setShowGoals(!showGoals); setGoalDraft(goals) }}>
          {showGoals ? 'Fermer' : '⚙ Objectifs'}
        </Btn>
      </div>

      {/* Objectifs editor */}
      {showGoals && (
        <Card style={{ border: `1px solid ${T.borderHi}` }}>
          <Label>Mes objectifs quotidiens</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
            {Object.entries(MACRO_CONFIG).map(([key, cfg]) => (
              <Input key={key} label={`${cfg.icon} ${cfg.label} (${cfg.unit})`}
                value={goalDraft[key] ?? goals[key]}
                onChange={v => setGoalDraft(p => ({ ...p, [key]: parseInt(v) || 0 }))}
                type="number" min="0"
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn onClick={saveGoals}>Sauvegarder</Btn>
          </div>
        </Card>
      )}

      {/* Rings */}
      <Card glow>
        <Label>Bilan du jour — {calPct}% de l'objectif calorique</Label>
        <MacroRings totals={totals} goals={goals} />
      </Card>

      {/* Ajouter un repas */}
      <Card>
        <Label>Ajouter un repas / aliment</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
          <Input label="Repas" value={meal.meal_name} onChange={v => setMeal(p => ({ ...p, meal_name: v }))} placeholder="Déjeuner, snack..." />
          {[
            { key: 'calories', label: '🔥 Kcal',    placeholder: '650' },
            { key: 'proteins', label: '💪 Prot. g',  placeholder: '45' },
            { key: 'carbs',    label: '⚡ Gluc. g',  placeholder: '80' },
            { key: 'fats',     label: '🥑 Lip. g',   placeholder: '20' },
            { key: 'water',    label: '💧 Eau ml',   placeholder: '500' },
          ].map(f => (
            <Input key={f.key} label={f.label} value={meal[f.key]}
              onChange={v => setMeal(p => ({ ...p, [f.key]: v }))}
              type="number" min="0" placeholder={f.placeholder}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn onClick={addMeal} disabled={saving}>{saving ? '...' : 'Ajouter'}</Btn>
        </div>
      </Card>

      {/* Liste repas du jour */}
      {logs.length > 0 && (
        <Card>
          <Label>Repas enregistrés aujourd'hui</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr) 28px', gap: 8, padding: '0 4px 10px', borderBottom: `1px solid ${T.border}` }}>
              {['Repas', 'Kcal', 'Prot.', 'Gluc.', 'Lip.', 'Eau', ''].map((h, i) => (
                <div key={i} style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 9, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {logs.map(log => (
              <div key={log.id} style={{
                display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr) 28px',
                gap: 8, padding: '10px 4px',
                borderBottom: `1px solid ${T.border}`,
                transition: 'background .2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = T.surface}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.text }}>{log.meal_name || '—'}</div>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 14, color: MACRO_CONFIG.calories.color }}>{log.calories}</div>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: MACRO_CONFIG.proteins.color }}>{log.proteins}g</div>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: MACRO_CONFIG.carbs.color }}>{log.carbs}g</div>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: MACRO_CONFIG.fats.color }}>{log.fats}g</div>
                <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: '#26c6da' }}>{log.water}ml</div>
                <button onClick={() => removeLog(log.id)} style={{ background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 14, padding: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = T.danger}
                  onMouseLeave={e => e.currentTarget.style.color = T.textDim}
                >×</button>
              </div>
            ))}
            {/* Totaux */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr) 28px',
              gap: 8, padding: '12px 4px 0', marginTop: 4,
            }}>
              <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 10, letterSpacing: 2, color: T.textMid, textTransform: 'uppercase' }}>Total</div>
              {[
                { v: Math.round(totals.calories || 0), c: MACRO_CONFIG.calories.color, u: '' },
                { v: Math.round(totals.proteins || 0), c: MACRO_CONFIG.proteins.color, u: 'g' },
                { v: Math.round(totals.carbs || 0),    c: MACRO_CONFIG.carbs.color,    u: 'g' },
                { v: Math.round(totals.fats || 0),     c: MACRO_CONFIG.fats.color,     u: 'g' },
                { v: totals.water || 0,                c: '#26c6da',                   u: 'ml' },
              ].map((item, i) => (
                <div key={i} style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 15, color: item.c }}>
                  {item.v}{item.u}
                </div>
              ))}
              <div />
            </div>
          </div>
        </Card>
      )}
    </PageWrap>
  )
}
