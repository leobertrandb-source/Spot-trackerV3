// URLs des images stockées dans Supabase Storage ui-assets
const BASE = 'https://owwbxjuextcgzhsasegz.supabase.co/storage/v1/object/public/ui-assets'

const BASE_STATS = 'https://owwbxjuextcgzhsasegz.supabase.co/storage/v1/object/public/ui-assets'

export const STAT_IMAGES = {
  'Objectif':             `${BASE_STATS}/stats/objectif.jpg`,
  "Calories aujourd'hui": `${BASE_STATS}/stats/calories.jpg`,
  'Séances récentes':     `${BASE_STATS}/stats/seances.jpg`,
  'Programme du jour':    `${BASE_STATS}/stats/programme.jpg`,
  'session-icon':         `${BASE_STATS}/stats/session-icon.jpg`,
}

export const NAV_IMAGES = {
  // Navigation sidebar — fichiers confirmés dans nav/
  '/coach':                        `${BASE}/nav/dashboard-coach.jpg`,
  '/coach/clients':                `${BASE}/nav/clients.jpg`,
  '/programmes':                   `${BASE}/nav/programmes.jpg`,
  '/exercices':                    `${BASE}/nav/exercices.jpg`,
  '/mon-espace':                   `${BASE}/nav/mon-espace.jpg`,
  '/entrainement/aujourdhui':      `${BASE}/nav/progression.jpg`,   // fallback — seance-jour.jpg manquant
  '/entrainement/libre':           `${BASE}/nav/programmes.jpg`,    // fallback — seance-libre.jpg manquant
  '/progression':                  `${BASE}/nav/progression.jpg`,
  '/nutrition/macros':             `${BASE}/nav/nutrition.jpg`,
  '/nutrition/recettes':           `${BASE}/nav/recettes.jpg`,
  '/nutrition/plan':               `${BASE}/nav/plan-repas.jpg`,

  // Dashboard sections — fichiers confirmés dans dashboard/
  'hero-coach':       `${BASE}/dashboard/hero-athlete.jpg`,         // fallback — hero-coach.jpg manquant
  'hero-athlete':     `${BASE}/dashboard/hero-athlete.jpg`,
  'workout-card':     `${BASE}/dashboard/workout-card.jpg`,
  'nutrition-card':   `${BASE}/dashboard/nutrition-card.jpg`,
  'progression-card': `${BASE}/dashboard/progression-card.jpg`,
}

export function getNavImage(key) {
  return NAV_IMAGES[key] || null
}
