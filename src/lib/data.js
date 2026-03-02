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
  bg:           '#0d0f12',
  bgAlt:        '#111318',
  surface:      '#151820',
  card:         '#1a1e27',
  cardHover:    '#1f2430',
  border:       '#252b38',
  borderHi:     '#2e3748',
  borderFocus:  '#39e07a55',
  accent:       '#39e07a',
  accentDim:    '#27a858',
  accentLight:  '#5ee896',
  accentGlow:   'rgba(57,224,122,0.10)',
  accentGlowMd: 'rgba(57,224,122,0.18)',
  accentGlowSm: 'rgba(57,224,122,0.06)',
  blue:         '#4d9fff',
  blueGlow:     'rgba(77,159,255,0.10)',
  orange:       '#ff7043',
  orangeGlow:   'rgba(255,112,67,0.10)',
  purple:       '#9d7dea',
  purpleGlow:   'rgba(157,125,234,0.10)',
  cyan:         '#26d4e8',
  cyanGlow:     'rgba(38,212,232,0.10)',
  text:         '#f0f3f8',
  textMid:      '#8a9ab5',
  textDim:      '#3d4f68',
  textSub:      '#5a6e88',
  danger:       '#ff4566',
  dangerGlow:   'rgba(255,69,102,0.12)',
  warn:         '#f5a623',
  warnGlow:     'rgba(245,166,35,0.10)',
  success:      '#39e07a',
  fontDisplay:  "'Barlow Condensed', sans-serif",
  fontBody:     "'Barlow', sans-serif",
  shadowSm:     '0 1px 8px rgba(0,0,0,0.35)',
  shadowMd:     '0 4px 20px rgba(0,0,0,0.50)',
  shadowLg:     '0 8px 40px rgba(0,0,0,0.65)',
  shadowGlow:   '0 0 32px rgba(57,224,122,0.12)',
  shadowGlowMd: '0 0 50px rgba(57,224,122,0.20)',
  radiusSm:     6,
  radius:       10,
  radiusLg:     16,
  radiusXl:     22,
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
