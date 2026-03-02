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
  bg:           '#030305',
  bgAlt:        '#060810',
  surface:      '#0a0d14',
  card:         '#0f1219',
  cardHover:    '#131720',
  border:       '#161d2b',
  borderHi:     '#1f2d42',
  borderFocus:  '#2a3f5f',
  accent:       '#39e07a',
  accentDim:    '#22a355',
  accentGlow:   'rgba(57,224,122,0.12)',
  accentGlowSm: 'rgba(57,224,122,0.07)',
  blue:         '#4da6ff',
  blueGlow:     'rgba(77,166,255,0.1)',
  orange:       '#ff7043',
  orangeGlow:   'rgba(255,112,67,0.1)',
  purple:       '#a78bfa',
  purpleGlow:   'rgba(167,139,250,0.1)',
  text:         '#eef1f6',
  textMid:      '#7a8fa8',
  textDim:      '#2d3d52',
  danger:       '#ff3b5c',
  warn:         '#ffb020',
  fontDisplay:  "'Barlow Condensed', sans-serif",
  fontBody:     "'Barlow', sans-serif",
  shadowSm:     '0 2px 12px rgba(0,0,0,0.4)',
  shadowMd:     '0 4px 24px rgba(0,0,0,0.6)',
  shadowLg:     '0 8px 48px rgba(0,0,0,0.7)',
  shadowGlow:   '0 0 40px rgba(57,224,122,0.1)',
  shadowGlowMd: '0 0 60px rgba(57,224,122,0.15)',
  radius:       8,
  radiusLg:     14,
  radiusXl:     20,
}

export const CHART_COLORS = ['#39e07a','#4da6ff','#ff7043','#ffb020','#a78bfa','#26c6da']

export const SEANCE_ICONS = {
  "Pectoraux / Triceps": "⚡",
  "Dos / Biceps":        "🏹",
  "Jambes":              "🔥",
  "Épaules":             "⚔️",
}

export const MACRO_CONFIG = {
  calories: { label: 'Calories',    unit: 'kcal', color: '#39e07a', icon: '🔥' },
  proteins: { label: 'Protéines',   unit: 'g',    color: '#4da6ff', icon: '💪' },
  carbs:    { label: 'Glucides',    unit: 'g',    color: '#ffb020', icon: '⚡' },
  fats:     { label: 'Lipides',     unit: 'g',    color: '#a78bfa', icon: '🥑' },
  water:    { label: 'Hydratation', unit: 'ml',   color: '#26c6da', icon: '💧' },
}
