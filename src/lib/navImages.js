// URLs des images stockées dans Supabase Storage ui-assets
const BASE = 'https://owwbxjuextcgzhsasegz.supabase.co/storage/v1/object/public/ui-assets'

// Icônes illustrées pour les stat blocks (générées par DALL-E 3)
export const STAT_IMAGES = {
  'Objectif':             `${BASE}/icons/objectif.png`,
  "Calories aujourd'hui": `${BASE}/icons/calories.png`,
  'Séances récentes':     `${BASE}/icons/seances.png`,
  'Programme du jour':    `${BASE}/icons/programme.png`,
  'session-icon':         `${BASE}/icons/session.png`,
}

// Images de navigation (sidebar + dashboards)
export const NAV_IMAGES = {
  '/coach':                       `${BASE}/nav/dashboard-coach.jpg`,
  '/coach/clients':               `${BASE}/nav/clients.jpg`,
  '/programmes':                  `${BASE}/nav/programmes.jpg`,
  '/exercices':                   `${BASE}/nav/exercices.jpg`,
  '/mon-espace':                  `${BASE}/nav/mon-espace.jpg`,
  '/entrainement/aujourdhui':     `${BASE}/nav/seance-jour.jpg`,
  '/entrainement/libre':          `${BASE}/nav/seance-libre.jpg`,
  '/progression':                 `${BASE}/nav/progression.jpg`,
  '/nutrition/macros':            `${BASE}/nav/nutrition.jpg`,
  '/nutrition/recettes':          `${BASE}/nav/recettes.jpg`,
  '/nutrition/plan':              `${BASE}/nav/plan-repas.jpg`,
  'hero-coach':                   `${BASE}/dashboard/hero-athlete.jpg`,
  'hero-athlete':                 `${BASE}/dashboard/hero-athlete.jpg`,
  'workout-card':                 `${BASE}/dashboard/workout-card.jpg`,
  'nutrition-card':               `${BASE}/dashboard/nutrition-card.jpg`,
  'progression-card':             `${BASE}/dashboard/progression-card.jpg`,
}

export function getNavImage(key) {
  return NAV_IMAGES[key] || null
}
