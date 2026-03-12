import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap } from '../components/UI'
import { NAV_IMAGES, STAT_IMAGES } from '../lib/navImages'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  glass:   'rgba(12,16,24,0.72)',
  border:  'rgba(255,255,255,0.07)',
  borderHi:'rgba(255,255,255,0.13)',
  text:    '#edf2f7',
  sub:     '#7a8fa6',
  dim:     '#3d4f61',
  accent:  '#3ecf8e',
  blue:    '#4d9fff',
  orange:  '#ff7043',
  purple:  '#9d7dea',
  yellow:  '#fbbf24',
}

const GLASS_CARD = {
  background: C.glass,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${C.border}`,
  borderRadius: 20,
}

function greet() {
  const h = new Date().getHours()
  if (h < 6)  return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function todayISO() { return new Date().toISOString().split('T')[0] }

function fmt(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function goalLabel(g) {
  const v = String(g || '').toLowerCase().replace(/[_-]/g, ' ')
  if (v.includes('mass') || v.includes('body') || v.includes('bulk') || v.includes('prise')) return 'Prise de masse'
  if (v.includes('perte') || v.includes('cut') || v.includes('loss') || v.includes('poids')) return 'Perte de poids'
  if (v.includes('athlet') || v.includes('perf') || v.includes('sport')) return 'Performance'
  if (v.includes('maintien') || v.includes('maint')) return 'Maintien'
  if (v.includes('recomp')) return 'Recomposition'
  return g ? g.replace(/_/g, ' ') : 'Objectif'
}

// ─── SVG icon helper ──────────────────────────────────────────────────────────

function SvgIcon({ d, color, size = 20 }) {
  // Split multi-path strings (e.g. dumbbell) into separate <path> elements
  const paths = d.split(/(?=M)/).filter(Boolean)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p.trim()} />)}
    </svg>
  )
}

const ICONS = {
  target:  "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  flash:   "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  fire:    "M12 2c0 0-5.5 4.5-5.5 9.5a5.5 5.5 0 0011 0C17.5 6.5 12 2 12 2z",
  chart:   "M18 20V10M12 20V4M6 20v-6",
  food:    "M12 2a10 10 0 100 20 10 10 0 000-20zM8 12h8M12 8v8",
  recipe:  "M12 2a10 10 0 100 20A10 10 0 0012 2zM8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32",
  dumbbell:"M6.5 6.5h11M6.5 17.5h11M3 9.5h2v5H3zM19 9.5h2v5h-2zM6.5 3v3M6.5 18v3M17.5 3v3M17.5 18v3",
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ name, goalType, todayProgram }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), 30); return () => clearTimeout(t) }, [])
  const img = NAV_IMAGES['hero-athlete']

  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden', position: 'relative',
      minHeight: 200,
      opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(18px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      {img && (
        <img src={img} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 25%',
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: img
          ? 'linear-gradient(90deg, rgba(7,9,14,0.93) 0%, rgba(7,9,14,0.72) 55%, rgba(7,9,14,0.35) 100%)'
          : 'linear-gradient(135deg, rgba(12,16,24,0.98), rgba(7,9,14,0.98))',
      }} />

      <div style={{ position: 'relative', padding: '30px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: C.accent, marginBottom: 10, fontFamily: "'DM Sans',sans-serif" }}>{greet()}</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-1.2px' }}>
            {name?.split(' ')[0] || 'Athlète'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 8, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}>
            {todayProgram ? `Séance prévue : ${todayProgram}` : "Aucun programme prévu aujourd'hui."}
          </div>
        </div>
        {goalType && (
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, padding: '6px 14px', background: 'rgba(62,207,142,0.12)', border: '1px solid rgba(62,207,142,0.3)', borderRadius: 20, fontFamily: "'DM Sans',sans-serif", flexShrink: 0, backdropFilter: 'blur(8px)' }}>
            {goalLabel(goalType)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stat block ───────────────────────────────────────────────────────────────

function StatBlock({ label, value, color, iconPath, delay = 0, sub }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t) }, [delay])
  const iconImg = STAT_IMAGES[label]

  return (
    <div style={{
      ...GLASS_CARD,
      borderRadius: 16, position: 'relative', overflow: 'hidden',
      border: `1px solid ${color}20`,
      opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(12px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      padding: '16px',
    }}>
      {/* Glow fond */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: `${color}08`, filter: 'blur(30px)', pointerEvents: 'none' }} />
      {/* Ligne couleur bas */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />

      {/* Icône illustrée OU icône SVG fallback */}
      {iconImg ? (
        <div style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden', marginBottom: 12, border: `1px solid ${color}25` }}>
          <img src={iconImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}25`, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
          <SvgIcon d={iconPath} color={color} size={16} />
        </div>
      )}

      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 11, color: C.sub, marginTop: 5, fontFamily: "'DM Sans',sans-serif" }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color, fontWeight: 700, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── Macro ring ───────────────────────────────────────────────────────────────

function MacroRing({ label, current, goal, color }) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  const r = 22, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div style={{ textAlign: 'center', display: 'grid', gap: 4 }}>
      <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto' }}>
        <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="30" cy="30" r={r} fill="none" stroke={`${color}18`} strokeWidth="5" />
          <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: "'DM Sans',sans-serif" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: "'DM Sans',sans-serif" }}>{Math.round(current)}g</div>
      <div style={{ fontSize: 10, color: C.dim }}>{label}</div>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, sub, color, iconPath, to, ctaLabel, children, delay = 0, imgKey }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t) }, [delay])
  const img = imgKey ? NAV_IMAGES[imgKey] : null

  return (
    <div style={{
      borderRadius: 20, display: 'grid', gap: 0, alignContent: 'start',
      position: 'relative', overflow: 'hidden',
      border: `1px solid ${C.border}`,
      opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(14px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      {/* Bandeau image en haut */}
      {img && (
        <div style={{ height: 110, position: 'relative', overflow: 'hidden' }}>
          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,9,14,0.1) 0%, rgba(7,9,14,0.85) 100%)' }} />
          {/* Label sur l'image */}
          <div style={{ position: 'absolute', bottom: 12, left: 16, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#fff' }}>{title}</div>
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '16px', background: C.glass, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', display: 'grid', gap: 14 }}>
        {!img && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}25`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <SvgIcon d={iconPath} color={color} size={16} />
              </div>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: C.text }}>{title}</div>
                {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{sub}</div>}
              </div>
            </div>
            {to && (
              <Link to={to} style={{ fontSize: 11, fontWeight: 700, color, textDecoration: 'none', padding: '5px 11px', borderRadius: 8, border: `1px solid ${color}25`, background: `${color}08`, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }}>
                {ctaLabel || 'Voir →'}
              </Link>
            )}
          </div>
        )}

        {img && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {sub && <div style={{ fontSize: 11, color: C.dim }}>{sub}</div>}
            {to && (
              <Link to={to} style={{ fontSize: 11, fontWeight: 700, color, textDecoration: 'none', padding: '4px 11px', borderRadius: 8, border: `1px solid ${color}25`, background: `${color}08`, whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
                {ctaLabel || 'Voir →'}
              </Link>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  )
}

// ─── Barre de progression ─────────────────────────────────────────────────────

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 1s ease' }} />
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GoalHomePage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)

  const [todayAssignment, setTodayAssignment]     = useState(null)
  const [nutritionGoals, setNutritionGoals]       = useState(null)
  const [todayLogs, setTodayLogs]                 = useState([])
  const [recentSessions, setRecentSessions]       = useState([])
  const [suggestedRecipe, setSuggestedRecipe]     = useState(null)

  const today = useMemo(() => todayISO(), [])

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    const [a, g, l, s, r] = await Promise.allSettled([
      supabase.from('assignments').select('*, programs(name, seance_type, program_exercises(*))').eq('athlete_id', user.id).eq('assigned_date', today).order('created_at', { ascending: false }).limit(1),
      supabase.from('nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', today),
      supabase.from('sessions').select('id, date, seance_type').eq('user_id', user.id).order('date', { ascending: false }).limit(6),
      supabase.from('recipes').select('id, title, name, description, image_url, calories, proteins').limit(30),
    ])
    if (a.status === 'fulfilled' && !a.value.error) setTodayAssignment(a.value.data?.[0] || null)
    if (g.status === 'fulfilled' && !g.value.error) setNutritionGoals(g.value.data || null)
    if (l.status === 'fulfilled' && !l.value.error) setTodayLogs(l.value.data || [])
    if (s.status === 'fulfilled' && !s.value.error) setRecentSessions(s.value.data || [])
    if (r.status === 'fulfilled' && !r.value.error) {
      const recipes = r.value.data || []
      setSuggestedRecipe(recipes.sort((a, b) => (b.proteins || 0) - (a.proteins || 0))[0] || null)
    }
    setLoading(false)
  }, [user?.id, today])

  useEffect(() => { load() }, [load])

  const nutri = useMemo(() => todayLogs.reduce((acc, l) => ({
    calories: acc.calories + Number(l.calories || 0),
    proteins: acc.proteins + Number(l.proteins || 0),
    carbs:    acc.carbs    + Number(l.carbs    || 0),
    fats:     acc.fats     + Number(l.fats     || 0),
  }), { calories: 0, proteins: 0, carbs: 0, fats: 0 }), [todayLogs])

  const goals = useMemo(() => ({
    cal:  Number(nutritionGoals?.calories  || nutritionGoals?.calories_target  || 0),
    prot: Number(nutritionGoals?.proteins  || nutritionGoals?.protein_target   || 0),
    carb: Number(nutritionGoals?.carbs     || nutritionGoals?.carbs_target     || 0),
    fat:  Number(nutritionGoals?.fats      || nutritionGoals?.fats_target      || 0),
  }), [nutritionGoals])

  const todayProg = todayAssignment?.programs || null
  const calPct = goals.cal > 0 ? Math.min(100, Math.round((nutri.calories / goals.cal) * 100)) : 0

  return (
    <PageWrap>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .ag-stats { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
        .ag-main  { display:grid; grid-template-columns:1fr; gap:14px; }
        @media(min-width:760px) { .ag-stats { grid-template-columns:repeat(4,1fr); } }
        @media(min-width:900px) { .ag-main  { grid-template-columns:repeat(2,1fr); } }
        @media(min-width:1100px){ .ag-main  { grid-template-columns:repeat(3,1fr); } }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 0 48px', display: 'grid', gap: 16 }}>

        <Hero
          name={profile?.full_name}
          goalType={profile?.goal_type}
          todayProgram={todayProg?.name}
        />

        {/* Stats */}
        <div className="ag-stats">
          <StatBlock label="Objectif" value={goalLabel(profile?.goal_type)} color={C.accent} iconPath={ICONS.target} delay={80} />
          <StatBlock label="Calories aujourd'hui" value={`${Math.round(nutri.calories)}`} sub={goals.cal ? `/ ${goals.cal} kcal` : null} color={C.orange} iconPath={ICONS.fire} delay={130} />
          <StatBlock label="Séances récentes" value={recentSessions.length} color={C.blue} iconPath={ICONS.chart} delay={180} sub={recentSessions[0] ? `Dernière le ${fmt(recentSessions[0].date)}` : null} />
          <StatBlock label="Programme du jour" value={todayProg ? 'Assigné' : 'Libre'} color={C.purple} iconPath={ICONS.dumbbell} delay={230} sub={todayProg?.seance_type || null} />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.dim, fontSize: 13 }}>Chargement...</div>
        ) : (
          <div className="ag-main">

            {/* Séance du jour */}
            <SectionCard title="Séance du jour" color={C.accent} iconPath={ICONS.dumbbell}
              to={todayProg ? '/entrainement/aujourdhui' : '/entrainement/libre'}
              ctaLabel={todayProg ? 'Démarrer' : 'Séance libre'} delay={300}
              sub={todayProg ? `${(todayProg.program_exercises || []).length} exercices` : "Aucun programme assigné"}
              imgKey="/entrainement/aujourdhui">

              {todayProg ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>{todayProg.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, padding: '3px 10px', background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 20, display: 'inline-block' }}>
                    {todayProg.seance_type}
                  </div>
                  <div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
                    {(todayProg.program_exercises || []).slice(0, 4).map((ex, i) => (
                      <div key={i} style={{ fontSize: 12, color: C.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />
                        {ex.sets_target}× {ex.exercise} {ex.reps_target ? `· ${ex.reps_target} reps` : ''}
                      </div>
                    ))}
                    {(todayProg.program_exercises || []).length > 4 && (
                      <div style={{ fontSize: 11, color: C.dim }}>+{(todayProg.program_exercises || []).length - 4} exercices</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
                  Ton coach n'a pas encore assigné de programme pour aujourd'hui. Lance une séance libre.
                </div>
              )}
            </SectionCard>

            {/* Nutrition */}
            <SectionCard title="Nutrition du jour" color={C.orange} iconPath={ICONS.food}
              to="/nutrition/macros" ctaLabel="Détails" delay={360}
              sub={`${Math.round(nutri.calories)} kcal${goals.cal ? ` / ${goals.cal}` : ''}`}
              imgKey="/nutrition/macros">

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.sub, fontFamily: "'DM Sans',sans-serif" }}>Calories</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.orange }}>{calPct}%</span>
                </div>
                <ProgressBar value={nutri.calories} max={goals.cal || nutri.calories || 1} color={C.orange} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: 8 }}>
                <MacroRing label="Prot." current={nutri.proteins} goal={goals.prot || 150} color={C.blue} />
                <MacroRing label="Gluc." current={nutri.carbs}    goal={goals.carb || 200} color={C.yellow} />
                <MacroRing label="Lip."  current={nutri.fats}     goal={goals.fat  || 70}  color={C.purple} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/nutrition/macros" style={{ flex: 1, height: 36, borderRadius: 10, border: '1px solid rgba(255,112,67,0.25)', background: 'rgba(255,112,67,0.08)', color: C.orange, fontWeight: 700, fontSize: 12, display: 'grid', placeItems: 'center', textDecoration: 'none', fontFamily: "'DM Sans',sans-serif" }}>
                  Saisir
                </Link>
                <Link to="/nutrition/plan" style={{ flex: 1, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.sub, fontWeight: 700, fontSize: 12, display: 'grid', placeItems: 'center', textDecoration: 'none', fontFamily: "'DM Sans',sans-serif" }}>
                  Plan repas
                </Link>
              </div>
            </SectionCard>

            {/* Progression */}
            <SectionCard title="Activité récente" color={C.blue} iconPath={ICONS.chart}
              to="/progression" ctaLabel="Progression" delay={420}
              sub={recentSessions.length > 0 ? `${recentSessions.length} dernières séances` : 'Aucune séance'}
              imgKey="/progression">

              {recentSessions.length === 0 ? (
                <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
                  Lance ta première séance pour commencer le suivi de ta progression.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {recentSessions.slice(0, 5).map((s, i) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.025)',
                      border: `1px solid ${C.border}`,
                      animation: 'fadeUp 0.4s ease both',
                      animationDelay: `${i * 40 + 500}ms`,
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative', border: '1px solid rgba(77,159,255,0.2)' }}>
                        {STAT_IMAGES['session-icon']
                          ? <img src={STAT_IMAGES['session-icon']} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', background: 'rgba(77,159,255,0.12)', display: 'grid', placeItems: 'center' }}><SvgIcon d={ICONS.dumbbell} color={C.blue} size={13} /></div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
                          {s.seance_type || 'Séance libre'}
                        </div>
                        <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>{fmt(s.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link to="/entrainement/libre" style={{
                display: 'block', height: 36, borderRadius: 10, border: '1px solid rgba(77,159,255,0.25)',
                background: 'rgba(77,159,255,0.08)', color: C.blue, fontWeight: 700, fontSize: 12,
                textDecoration: 'none', display: 'grid', placeItems: 'center',
                fontFamily: "'DM Sans',sans-serif",
              }}>
                Nouvelle séance
              </Link>
            </SectionCard>

            {/* Recette suggérée */}
            {suggestedRecipe && (
              <SectionCard title="Recette du jour" color={C.yellow} iconPath={ICONS.recipe}
                to="/nutrition/recettes" ctaLabel="Recettes" delay={480}
                sub={suggestedRecipe.calories ? `${suggestedRecipe.calories} kcal` : null}
                imgKey="/nutrition/recettes">

                {suggestedRecipe.image_url && (
                  <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
                    <img src={suggestedRecipe.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                    {suggestedRecipe.title || suggestedRecipe.name}
                  </div>
                  {suggestedRecipe.description && (
                    <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {suggestedRecipe.description}
                    </div>
                  )}
                </div>
                {suggestedRecipe.proteins > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>
                    {Math.round(suggestedRecipe.proteins)}g de protéines
                  </div>
                )}
              </SectionCard>
            )}

          </div>
        )}
      </div>
    </PageWrap>
  )
}
