export const SEANCES = {
  "Pectoraux / Triceps": [
    "Développé couché barre", "Développé incliné haltères", "Écarté poulies",
    "Dips lestés", "Barre au front (EZ)", "Extension corde poulie", "Pompes serrées / Dips",
  ],
  "Dos / Biceps": [
    "Soulevé de terre", "Tirage horizontal barre", "Tirage vertical prise large",
    "Rowing haltère unilatéral", "Curl barre EZ", "Curl marteau câble", "Curl concentration haltère",
  ],
  "Jambes": [
    "Squat barre", "Presse à cuisses", "Leg curl couché",
    "Fentes haltères", "Extensions mollets debout", "Extensions mollets assis", "Hip thrust",
  ],
  "Épaules": [
    "Développé militaire barre", "Développé militaire haltères",
    "Élévations latérales câbles", "Oiseau (poulie basse)", "Shrugs haltères", "Face pull",
  ],
}

export const ALL_EXERCISES = [...new Set(Object.values(SEANCES).flat())]

export const T = {
  // Dark premium with clearer hierarchy
  bg:           '#08111b',
  bgAlt:        '#0d1726',
  surface:      'rgba(15, 23, 38, 0.96)',
  card:         'rgba(17, 25, 40, 0.88)',
  cardHover:    'rgba(22, 32, 52, 0.94)',
  border:       'rgba(148, 163, 184, 0.16)',
  borderHi:     'rgba(148, 163, 184, 0.28)',
  borderFocus:  'rgba(96, 165, 250, 0.42)',
  accent:       '#4f8cff',
  accentDim:    '#3e78f2',
  accentLight:  '#8db5ff',
  accentGlow:   'rgba(79, 140, 255, 0.10)',
  accentGlowMd: 'rgba(79, 140, 255, 0.18)',
  accentGlowSm: 'rgba(79, 140, 255, 0.05)',
  blue:         '#60a5fa',
  blueGlow:     'rgba(96,165,250,0.12)',
  orange:       '#fb923c',
  orangeGlow:   'rgba(251,146,60,0.12)',
  purple:       '#a78bfa',
  purpleGlow:   'rgba(167,139,250,0.12)',
  cyan:         '#22d3ee',
  cyanGlow:     'rgba(34,211,238,0.12)',
  text:         '#f8fafc',
  textMid:      '#cbd5e1',
  textDim:      '#94a3b8',
  textSub:      '#64748b',
  danger:       '#f43f5e',
  dangerGlow:   'rgba(244,63,94,0.14)',
  warn:         '#f59e0b',
  warnGlow:     'rgba(245,158,11,0.14)',
  success:      '#22c55e',
  fontDisplay:  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  fontBody:     "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  shadowSm:     '0 8px 22px rgba(2, 8, 23, 0.22)',
  shadowMd:     '0 14px 38px rgba(2, 8, 23, 0.28)',
  shadowLg:     '0 24px 68px rgba(2, 8, 23, 0.34)',
  shadowGlow:   '0 0 28px rgba(79,140,255,0.12)',
  shadowGlowMd: '0 0 44px rgba(79,140,255,0.18)',
  radiusSm:     10,
  radius:       14,
  radiusLg:     20,
  radiusXl:     26,
  radiusFull:   999,
}

export const CHART_COLORS = ['#4f8cff','#22c55e','#fb923c','#f59e0b','#a78bfa','#22d3ee']

export const SEANCE_ICONS = {
  "Pectoraux / Triceps": "⚡",
  "Dos / Biceps":        "🏹",
  "Jambes":              "🔥",
  "Épaules":             "⚔️",
}

export const MACRO_CONFIG = {
  calories: { label: 'Calories',    unit: 'kcal', color: '#22c55e', icon: '🔥' },
  proteins: { label: 'Protéines',   unit: 'g',    color: '#60a5fa', icon: '💪' },
  carbs:    { label: 'Glucides',    unit: 'g',    color: '#f59e0b', icon: '⚡' },
  fats:     { label: 'Lipides',     unit: 'g',    color: '#a78bfa', icon: '🥑' },
  water:    { label: 'Hydratation', unit: 'ml',   color: '#22d3ee', icon: '💧' },
}
