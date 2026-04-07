-- MIGRATION_CLUBS.sql
-- Ajoute la personnalisation visuelle (logo + couleur) à la table gyms.
-- Chaque gym/club peut ainsi avoir son identité visuelle propre dans l'app.

ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS logo_url   text,
  ADD COLUMN IF NOT EXISTS color      text DEFAULT '#3ecf8e',
  ADD COLUMN IF NOT EXISTS name       text;

-- Mettre à jour le slug comme nom de fallback si name est null
-- UPDATE gyms SET name = slug WHERE name IS NULL;

-- RLS : les coaches peuvent lire leur propre gym
-- (policy déjà en place via gym_id sur profiles)
