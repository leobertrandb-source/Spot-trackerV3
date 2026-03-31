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
  // Dark premium — design system unifié Atlyo
  bg:           '#080d14',
  bgAlt:        '#0c1520',
  surface:      'rgba(12, 20, 34, 0.96)',
  card:         'rgba(14, 22, 38, 0.88)',
  cardHover:    'rgba(18, 28, 46, 0.94)',
  border:       'rgba(148, 163, 184, 0.14)',
  borderHi:     'rgba(148, 163, 184, 0.26)',
  borderFocus:  'rgba(62,207,142,0.35)',
  accent:       '#3ecf8e',
  accentDim:    '#2ab87a',
  accentLight:  '#7ee8bb',
  accentGlow:   'rgba(62,207,142,0.10)',
  accentGlowMd: 'rgba(62,207,142,0.18)',
  accentGlowSm: 'rgba(62,207,142,0.05)',
  blue:         '#60a5fa',
  blueGlow:     'rgba(96,165,250,0.12)',
  orange:       '#fb923c',
  orangeGlow:   'rgba(251,146,60,0.12)',
  purple:       '#a78bfa',
  purpleGlow:   'rgba(167,139,250,0.12)',
  cyan:         '#22d3ee',
  cyanGlow:     'rgba(34,211,238,0.12)',
  text:         '#f0f4f8',
  textMid:      '#c4d0e0',
  textDim:      '#8a9ab0',
  textSub:      '#566070',
  danger:       '#f43f5e',
  dangerGlow:   'rgba(244,63,94,0.14)',
  warn:         '#f59e0b',
  warnGlow:     'rgba(245,158,11,0.14)',
  success:      '#3ecf8e',
  fontDisplay:  "'DM Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, Helvetica, Arial, sans-serif",
  fontBody:     "'DM Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, Helvetica, Arial, sans-serif",
  shadowSm:     '0 4px 16px rgba(0, 0, 0, 0.28)',
  shadowMd:     '0 10px 32px rgba(0, 0, 0, 0.36)',
  shadowLg:     '0 20px 60px rgba(0, 0, 0, 0.44)',
  shadowGlow:   '0 0 28px rgba(62,207,142,0.14)',
  shadowGlowMd: '0 0 44px rgba(62,207,142,0.22)',
  radiusSm:     10,
  radius:       14,
  radiusLg:     20,
  radiusXl:     26,
  radiusFull:   999,
}

export const CHART_COLORS = ['#4f8cff','#3ecf8e','#fb923c','#f59e0b','#a78bfa','#22d3ee']

export const SEANCE_ICONS = {
  "Pectoraux / Triceps": "⚡",
  "Dos / Biceps":        "🏹",
  "Jambes":              "🔥",
  "Épaules":             "⚔️",
}

export const MACRO_CONFIG = {
  calories: { label: 'Calories',    unit: 'kcal', color: '#3ecf8e', icon: '🔥' },
  proteins: { label: 'Protéines',   unit: 'g',    color: '#60a5fa', icon: '💪' },
  carbs:    { label: 'Glucides',    unit: 'g',    color: '#f59e0b', icon: '⚡' },
  fats:     { label: 'Lipides',     unit: 'g',    color: '#a78bfa', icon: '🥑' },
  water:    { label: 'Hydratation', unit: 'ml',   color: '#22d3ee', icon: '💧' },
}
