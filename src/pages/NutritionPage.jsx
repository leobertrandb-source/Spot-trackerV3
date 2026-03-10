import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { Card, Label, Input, Btn, PageWrap, Badge } from '../components/UI'
import { T } from '../lib/data'

const today = new Date().toISOString().split('T')[0]

const EMPTY_MEAL = {
  meal_name: '',
  calories: '',
  proteins: '',
  carbs: '',
  fats: '',
  water: '',
}

const QUICK_FOODS = [
  { label: 'Banane', calories: 105, proteins: 1.3, carbs: 27, fats: 0.3, water: 0 },
  { label: 'Riz cuit 100g', calories: 130, proteins: 2.7, carbs: 28, fats: 0.3, water: 0 },
  { label: 'Poulet 150g', calories: 248, proteins: 46, carbs: 0, fats: 5.4, water: 0 },
  { label: 'Flocons d’avoine 60g', calories: 228, proteins: 7.8, carbs: 38, fats: 4.2, water: 0 },
  { label: 'Œufs x2', calories: 156, proteins: 13, carbs: 1, fats: 11, water: 0 },
  { label: 'Yaourt grec', calories: 130, proteins: 15, carbs: 6, fats: 4, water: 0 },
  { label: 'Eau 500ml', calories: 0, proteins: 0, carbs: 0, fats: 0, water: 500 },
]

function Ring({ value, max, color, label, sublabel, size = 110, stroke = 9 }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(1, max > 0 ? value / max : 0)
  const dashOffset = circumference * (1 - progress)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <div
            style={{
              color: T.text,
              fontWeight: 900,
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            {label}
          </div>
          <div
            style={{
              color: T.textDim,
              fontSize: 11,
              marginTop: 4,
            }}
          >
            {sublabel}
          </div>
        </div>
      </div>
    </div>
  )
}

function MacroBar({ label, value, max, unit, color }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 12,
        }}
      >
        <span style={{ color: T.text }}>{label}</span>
        <span style={{ color: T.textDim }}>
          {Math.round(value)} / {Math.round(max)} {unit}
        </span>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
          }}
        />
      </div>
    </div>
  )
}

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export default function NutritionPage() {
  const { user } = useAuth()

  const [goals, setGoals] = useState({
    calories: 2500,
    proteins: 180,
    carbs: 280,
    fats: 80,
    water: 2500,
  })

  const [logs, setLogs] = useState([])
  const [meal, setMeal] = useState(EMPTY_MEAL)

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showGoals, setShowGoals] = useState(false)
  const [goalDraft, setGoalDraft] = useState({})

  useEffect(() => {
    if (user?.id) {
      loadAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function loadAll() {
    setLoading(true)
    setError('')

    const [{ data: g, error: goalsError }, { data: l, error: logsError }] =
      await Promise.all([
        supabase
          .from('nutrition_goals')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),

        supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .order('created_at'),
      ])

    if (goalsError) {
      console.error(goalsError)
    }

    if (logsError) {
      console.error(logsError)
      setError(logsError.message || 'Erreur lors du chargement nutrition.')
    }

    if (g) {
      setGoals({
        calories: g.calories ?? g.calories_target ?? 2500,
        proteins: g.proteins ?? g.protein_target ?? 180,
        carbs: g.carbs ?? g.carbs_target ?? 280,
        fats: g.fats ?? g.fats_target ?? 80,
        water: g.water ?? g.water_target ?? 2500,
      })
    }

    setLogs(l || [])
    setLoading(false)
  }

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, log) => ({
        calories: acc.calories + toNumber(log.calories),
        proteins: acc.proteins + toNumber(log.proteins),
        carbs: acc.carbs + toNumber(log.carbs),
        fats: acc.fats + toNumber(log.fats),
        water: acc.water + toNumber(log.water),
      }),
      { calories: 0, proteins: 0, carbs: 0, fats: 0, water: 0 }
    )
  }, [logs])

  const calPct = Math.round(
    goals.calories > 0 ? (totals.calories / goals.calories) * 100 : 0
  )

  function updateMeal(field, value) {
    setMeal((prev) => ({ ...prev, [field]: value }))
  }

  function fillQuickFood(food) {
    setMeal({
      meal_name: food.label,
      calories: String(food.calories),
      proteins: String(food.proteins),
      carbs: String(food.carbs),
      fats: String(food.fats),
      water: String(food.water),
    })
    setError('')
  }

  async function addMeal() {
    const hasValue =
      meal.calories || meal.proteins || meal.carbs || meal.fats || meal.water

    if (!hasValue) {
      setError('Remplis au moins un champ nutritionnel.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      user_id: user.id,
      log_date: today,
      meal_name: meal.meal_name || null,
      calories: parseInt(meal.calories, 10) || 0,
      proteins: parseFloat(meal.proteins) || 0,
      carbs: parseFloat(meal.carbs) || 0,
      fats: parseFloat(meal.fats) || 0,
      water: parseInt(meal.water, 10) || 0,
    }

    const { data, error: dbErr } = await supabase
      .from('nutrition_logs')
      .insert(payload)
      .select()
      .single()

    if (dbErr) {
      console.error(dbErr)
      setError('Erreur : ' + dbErr.message)
      setSaving(false)
      return
    }

    if (data) {
      setLogs((prev) => [...prev, data])
    }

    setMeal(EMPTY_MEAL)
    setSaving(false)
  }

  async function removeLog(id) {
    const { error: dbErr } = await supabase
      .from('nutrition_logs')
      .delete()
      .eq('id', id)

    if (dbErr) {
      console.error(dbErr)
      setError('Erreur : ' + dbErr.message)
      return
    }

    setLogs((prev) => prev.filter((log) => log.id !== id))
  }

  async function saveGoals() {
    const updated = {
      ...goals,
      ...goalDraft,
    }

    const payload = {
      user_id: user.id,
      calories: updated.calories,
      proteins: updated.proteins,
      carbs: updated.carbs,
      fats: updated.fats,
      water: updated.water,
    }

    const { error: dbErr } = await supabase
      .from('nutrition_goals')
      .upsert(payload)

    if (dbErr) {
      console.error(dbErr)
      setError('Erreur : ' + dbErr.message)
      return
    }

    setGoals(updated)
    setShowGoals(false)
    setGoalDraft({})
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 300,
          color: T.textDim,
          fontFamily: T.fontDisplay,
          fontSize: 11,
          letterSpacing: 3,
        }}
      >
        CHARGEMENT...
      </div>
    )
  }

  return (
    <PageWrap>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: T.fontDisplay,
              fontWeight: 900,
              fontSize: 34,
              color: T.text,
              lineHeight: 1,
            }}
          >
            NUTRITION
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              marginTop: 8,
            }}
          >
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
        </div>

        <Btn
          variant="secondary"
          onClick={() => {
            setShowGoals(!showGoals)
            setGoalDraft(goals)
          }}
        >
          {showGoals ? 'Fermer' : '⚙ Objectifs'}
        </Btn>
      </div>

      {showGoals ? (
        <Card style={{ border: `1px solid ${T.borderHi || T.border}` }}>
          <Label>Mes objectifs quotidiens</Label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 14,
            }}
          >
            <Input
              label="🔥 Calories"
              value={goalDraft.calories ?? goals.calories}
              onChange={(v) =>
                setGoalDraft((prev) => ({ ...prev, calories: parseInt(v, 10) || 0 }))
              }
              type="number"
              min="0"
            />

            <Input
              label="💪 Protéines"
              value={goalDraft.proteins ?? goals.proteins}
              onChange={(v) =>
                setGoalDraft((prev) => ({ ...prev, proteins: parseInt(v, 10) || 0 }))
              }
              type="number"
              min="0"
            />

            <Input
              label="⚡ Glucides"
              value={goalDraft.carbs ?? goals.carbs}
              onChange={(v) =>
                setGoalDraft((prev) => ({ ...prev, carbs: parseInt(v, 10) || 0 }))
              }
              type="number"
              min="0"
            />

            <Input
              label="🥑 Lipides"
              value={goalDraft.fats ?? goals.fats}
              onChange={(v) =>
                setGoalDraft((prev) => ({ ...prev, fats: parseInt(v, 10) || 0 }))
              }
              type="number"
              min="0"
            />

            <Input
              label="💧 Eau ml"
              value={goalDraft.water ?? goals.water}
              onChange={(v) =>
                setGoalDraft((prev) => ({ ...prev, water: parseInt(v, 10) || 0 }))
              }
              type="number"
              min="0"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn onClick={saveGoals}>Sauvegarder</Btn>
          </div>
        </Card>
      ) : null}

      <Card glow>
        <Label>Bilan du jour — {calPct}% de l'objectif calorique</Label>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Ring
              value={Math.round(totals.calories)}
              max={goals.calories || 1}
              color="#FF8A65"
              label={Math.round(totals.calories)}
              sublabel="kcal"
              size={130}
              stroke={10}
            />

            <Ring
              value={Math.round(totals.proteins)}
              max={goals.proteins || 1}
              color="#43E97B"
              label={Math.round(totals.proteins)}
              sublabel="prot"
              size={92}
              stroke={7}
            />

            <Ring
              value={Math.round(totals.carbs)}
              max={goals.carbs || 1}
              color="#5BA7FF"
              label={Math.round(totals.carbs)}
              sublabel="gluc"
              size={92}
              stroke={7}
            />

            <Ring
              value={Math.round(totals.fats)}
              max={goals.fats || 1}
              color="#FFC857"
              label={Math.round(totals.fats)}
              sublabel="lip"
              size={92}
              stroke={7}
            />
          </div>

          <div style={{ flex: 1, minWidth: 220, display: 'grid', gap: 14 }}>
            <MacroBar
              label="Hydratation"
              value={totals.water}
              max={goals.water || 2500}
              unit="ml"
              color="#26c6da"
            />
            <MacroBar
              label="Protéines"
              value={totals.proteins}
              max={goals.proteins || 180}
              unit="g"
              color="#43E97B"
            />
            <MacroBar
              label="Glucides"
              value={totals.carbs}
              max={goals.carbs || 280}
              unit="g"
              color="#5BA7FF"
            />
            <MacroBar
              label="Lipides"
              value={totals.fats}
              max={goals.fats || 80}
              unit="g"
              color="#FFC857"
            />
          </div>
        </div>
      </Card>

      <Card>
        <Label>Ajout rapide</Label>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {QUICK_FOODS.map((food) => (
            <button
              key={food.label}
              type="button"
              onClick={() => fillQuickFood(food)}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 999,
                border: `1px solid ${T.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: T.text,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {food.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Ajouter un repas / aliment</Label>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr repeat(5, 1fr)',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <Input
            label="Repas / aliment"
            value={meal.meal_name}
            onChange={(v) => updateMeal('meal_name', v)}
            placeholder="Ex : banane, riz, déjeuner..."
          />

          <Input
            label="🔥 Kcal"
            value={meal.calories}
            onChange={(v) => updateMeal('calories', v)}
            type="number"
            min="0"
            placeholder="650"
          />

          <Input
            label="💪 Prot. g"
            value={meal.proteins}
            onChange={(v) => updateMeal('proteins', v)}
            type="number"
            min="0"
            step="0.1"
            placeholder="45"
          />

          <Input
            label="⚡ Gluc. g"
            value={meal.carbs}
            onChange={(v) => updateMeal('carbs', v)}
            type="number"
            min="0"
            step="0.1"
            placeholder="80"
          />

          <Input
            label="🥑 Lip. g"
            value={meal.fats}
            onChange={(v) => updateMeal('fats', v)}
            type="number"
            min="0"
            step="0.1"
            placeholder="20"
          />

          <Input
            label="💧 Eau ml"
            value={meal.water}
            onChange={(v) => updateMeal('water', v)}
            type="number"
            min="0"
            placeholder="500"
          />
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 10,
              padding: '9px 14px',
              background: '#1a0808',
              border: '1px solid #ff3b5c44',
              borderRadius: 8,
              fontSize: 13,
              color: '#ff3b5c',
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn onClick={addMeal} disabled={saving}>
            {saving ? 'Ajout...' : 'Ajouter'}
          </Btn>
        </div>
      </Card>

      {logs.length > 0 ? (
        <Card>
          <Label>Repas enregistrés aujourd'hui</Label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr repeat(5, 1fr) 28px',
                gap: 8,
                padding: '0 4px 10px',
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              {['Repas', 'Kcal', 'Prot.', 'Gluc.', 'Lip.', 'Eau', ''].map((h, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: T.fontDisplay,
                    fontWeight: 700,
                    fontSize: 9,
                    letterSpacing: 2,
                    color: T.textDim,
                    textTransform: 'uppercase',
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr repeat(5, 1fr) 28px',
                  gap: 8,
                  padding: '10px 4px',
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <div style={{ fontSize: 13, color: T.text }}>
                  {log.meal_name || '—'}
                </div>

                <div style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: 14, color: '#FF8A65' }}>
                  {Math.round(toNumber(log.calories))}
                </div>

                <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: '#43E97B' }}>
                  {toNumber(log.proteins)}g
                </div>

                <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: '#5BA7FF' }}>
                  {toNumber(log.carbs)}g
                </div>

                <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: '#FFC857' }}>
                  {toNumber(log.fats)}g
                </div>

                <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: '#26c6da' }}>
                  {toNumber(log.water)}ml
                </div>

                <button
                  type="button"
                  onClick={() => removeLog(log.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: T.textDim,
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr repeat(5, 1fr) 28px',
                gap: 8,
                padding: '12px 4px 0',
                marginTop: 4,
              }}
            >
              <div
                style={{
                  fontFamily: T.fontDisplay,
                  fontWeight: 900,
                  fontSize: 10,
                  letterSpacing: 2,
                  color: T.textMid,
                  textTransform: 'uppercase',
                }}
              >
                Total
              </div>

              <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 15, color: '#FF8A65' }}>
                {Math.round(totals.calories)}
              </div>

              <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 15, color: '#43E97B' }}>
                {Math.round(totals.proteins)}g
              </div>

              <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 15, color: '#5BA7FF' }}>
                {Math.round(totals.carbs)}g
              </div>

              <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 15, color: '#FFC857' }}>
                {Math.round(totals.fats)}g
              </div>

              <div style={{ fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 15, color: '#26c6da' }}>
                {Math.round(totals.water)}ml
              </div>

              <div />
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <Label>Repas enregistrés aujourd'hui</Label>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge>Aucun aliment saisi</Badge>
            <Badge color={T.blue || '#5BA7FF'}>Ajoute manuellement tes aliments</Badge>
          </div>
        </Card>
      )}
    </PageWrap>
  )
}
