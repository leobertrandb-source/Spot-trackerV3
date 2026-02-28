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
  // Colors
  bg:       '#050507',
  surface:  '#0c0e13',
  card:     '#111520',
  border:   '#1a2235',
  borderHi: '#243047',
  accent:   '#43d17a',
  accentDim:'#2a8a4e',
  accentGlow:'rgba(67,209,122,0.15)',
  text:     '#f0f2f5',
  textMid:  '#8896a8',
  textDim:  '#3d4f63',
  danger:   '#ff4757',
  warn:     '#ffa502',
  blue:     '#3b9eff',

  // Fonts
  fontDisplay: "'Barlow Condensed', sans-serif",
  fontBody:    "'Barlow', sans-serif",

  // Shadows
  shadowCard:  '0 4px 24px rgba(0,0,0,0.5)',
  shadowGlow:  '0 0 40px rgba(67,209,122,0.12)',
  shadowGlowSm:'0 0 20px rgba(67,209,122,0.08)',

  // Radii
  radius:   10,
  radiusLg: 16,
  radiusSm: 7,
}

export const CHART_COLORS = ['#43d17a','#3b9eff','#ff6b6b','#ffd93d','#c77dff','#ff9f43']

export const SEANCE_ICONS = {
  "Pectoraux / Triceps": "⚡",
  "Dos / Biceps":        "🏹",
  "Jambes":              "🔥",
  "Épaules":             "⚔️",
}
