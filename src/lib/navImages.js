const BASE = 'https://owwbxjuextcgzhsasegz.supabase.co/storage/v1/object/public/ui-assets'

// Icônes stat blocks
export const STAT_IMAGES = {
  'Objectif':             `${BASE}/icons/objectif.png`,
  "Calories aujourd'hui": `${BASE}/icons/calories.png`,
  'Séances récentes':     `${BASE}/icons/seances.png`,
  'Programme du jour':    `${BASE}/icons/programme.png`,
  'session-icon':         `${BASE}/icons/session.png`,
}

// Icônes sidebar nav
export const NAV_IMAGES = {
  '/coach':                       `${BASE}/nav-icons/dashboard.png`,
  '/coach/clients':               `${BASE}/nav-icons/clients.png`,
  '/programmes':                  `${BASE}/nav-icons/programmes.png`,
  '/exercices':                   `${BASE}/nav-icons/exercices.png`,
  '/mon-espace':                  `${BASE}/nav-icons/mon-espace.png`,
  '/entrainement/aujourdhui':     `${BASE}/nav-icons/seance-jour.png`,
  '/entrainement/libre':          `${BASE}/nav-icons/seance-libre.png`,
  '/progression':                 `${BASE}/nav-icons/progression.png`,
  '/nutrition/macros':            `${BASE}/nav-icons/nutrition.png`,
  '/nutrition/recettes':          `${BASE}/nav-icons/recettes.png`,
  '/nutrition/plan':              `${BASE}/nav-icons/plan-repas.png`,

  // Dashboard hero + cards
  'hero-coach':                   `${BASE}/dashboard/hero-athlete.jpg`,
  'hero-athlete':                 `${BASE}/dashboard/hero-athlete.jpg`,
  'workout-card':                 `${BASE}/dashboard/workout-card.jpg`,
  'nutrition-card':               `${BASE}/dashboard/nutrition-card.jpg`,
  'progression-card':             `${BASE}/dashboard/progression-card.jpg`,
}

export function getNavImage(key) {
  return NAV_IMAGES[key] || null
}
