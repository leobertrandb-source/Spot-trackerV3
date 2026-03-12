// AUTO-GENERATED — URLs des images stockées dans Supabase Storage ui-assets
const BASE = 'https://owwbxjuextcgzhsasegz.supabase.co/storage/v1/object/public/ui-assets'

export const NAV_IMAGES = {
  // Navigation sidebar
  '/coach':                        `${BASE}/nav/dashboard-coach.jpg`,
  '/coach/clients':                `${BASE}/nav/clients.jpg`,
  '/programmes':                   `${BASE}/nav/programmes.jpg`,
  '/exercices':                    `${BASE}/nav/exercices.jpg`,
  '/mon-espace':                   `${BASE}/nav/mon-espace.jpg`,
  '/entrainement/aujourdhui':      `${BASE}/nav/seance-jour.jpg`,
  '/entrainement/libre':           `${BASE}/nav/seance-libre.jpg`,
  '/progression':                  `${BASE}/nav/progression.jpg`,
  '/nutrition/macros':             `${BASE}/nav/nutrition.jpg`,
  '/nutrition/recettes':           `${BASE}/nav/recettes.jpg`,
  '/nutrition/plan':               `${BASE}/nav/plan-repas.jpg`,

  // Dashboard sections
  'hero-coach':       `${BASE}/dashboard/hero-coach.jpg`,
  'hero-athlete':     `${BASE}/dashboard/hero-athlete.jpg`,
  'workout-card':     `${BASE}/dashboard/workout-card.jpg`,
  'nutrition-card':   `${BASE}/dashboard/nutrition-card.jpg`,
  'progression-card': `${BASE}/dashboard/progression-card.jpg`,
}

export function getNavImage(key) {
  return NAV_IMAGES[key] || null
}
