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
  // Apple-minimal, dark + green (subtle borders, soft depth)
  bg:           '#050607',
  bgAlt:        '#080a0d',
  surface:      'rgba(12, 14, 18, 0.92)',
  card:         'rgba(18, 22, 28, 0.72)',
  cardHover:    'rgba(22, 27, 34, 0.82)',
  border:       'rgba(255,255,255,0.08)',
  borderHi:     'rgba(255,255,255,0.14)',
  borderFocus:  'rgba(57,224,122,0.35)',
  accent:       '#39e07a',
  accentDim:    '#2dcf6d',
  accentLight:  '#5ee896',
  accentGlow:   'rgba(57,224,122,0.08)',
  accentGlowMd: 'rgba(57,224,122,0.14)',
  accentGlowSm: 'rgba(57,224,122,0.05)',
  blue:         '#4d9fff',
  blueGlow:     'rgba(77,159,255,0.10)',
  orange:       '#ff7043',
  orangeGlow:   'rgba(255,112,67,0.10)',
  purple:       '#9d7dea',
  purpleGlow:   'rgba(157,125,234,0.10)',
  cyan:         '#26d4e8',
  cyanGlow:     'rgba(38,212,232,0.10)',
  text:         '#f5f7fa',
  textMid:      '#a7b0c0',
  textDim:      '#586579',
  textSub:      '#7b8799',
  danger:       '#ff4566',
  dangerGlow:   'rgba(255,69,102,0.12)',
  warn:         '#f5a623',
  warnGlow:     'rgba(245,166,35,0.10)',
  success:      '#39e07a',
  fontDisplay:  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  fontBody:     "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  shadowSm:     '0 1px 10px rgba(0,0,0,0.35)',
  shadowMd:     '0 10px 30px rgba(0,0,0,0.45)',
  shadowLg:     '0 18px 55px rgba(0,0,0,0.55)',
  shadowGlow:   '0 0 28px rgba(57,224,122,0.10)',
  shadowGlowMd: '0 0 44px rgba(57,224,122,0.16)',
  radiusSm:     10,
  radius:       12,
  radiusLg:     18,
  radiusXl:     24,
  radiusFull:   999,
}

export const CHART_COLORS = ['#39e07a','#4d9fff','#ff7043','#f5a623','#9d7dea','#26d4e8']

export const SEANCE_ICONS = {
  "Pectoraux / Triceps": "⚡",
  "Dos / Biceps":        "🏹",
  "Jambes":              "🔥",
  "Épaules":             "⚔️",
}

export const MACRO_CONFIG = {
  calories: { label: 'Calories',    unit: 'kcal', color: '#39e07a', icon: '🔥' },
  proteins: { label: 'Protéines',   unit: 'g',    color: '#4d9fff', icon: '💪' },
  carbs:    { label: 'Glucides',    unit: 'g',    color: '#f5a623', icon: '⚡' },
  fats:     { label: 'Lipides',     unit: 'g',    color: '#9d7dea', icon: '🥑' },
  water:    { label: 'Hydratation', unit: 'ml',   color: '#26d4e8', icon: '💧' },
}
