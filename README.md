# Le Spot Training 🏋️

Application de suivi fitness pour coach et athlètes — **ProSportConcept**.

## Stack
- React 18 + React Router
- Supabase (auth, base de données, RLS)
- Recharts (graphiques)
- Déployable sur Vercel

## Installation

```bash
npm install
```

Crée un fichier `.env` à partir de `.env.example` et remplis tes clés Supabase :

```
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=xxxx
```

## Migrations Supabase

Exécute dans cet ordre dans le SQL Editor de Supabase :
1. `MIGRATION_PROGRAMMES.sql`
2. `MIGRATION_NUTRITION.sql`

## Démarrage

```bash
npm start
```

## Build production

```bash
npm run build
```

## Fonctionnalités

- 🏋️ **Aujourd'hui** — Programme assigné par le coach + saisie de séance
- 🥗 **Nutrition** — Suivi macros/calories/hydratation avec rings animés
- ✦ **Séance libre** — Saisie manuelle hors programme
- 📊 **Historique** — Toutes les séances avec détail des séries
- 📈 **Progression** — Courbes de performance par exercice
- 🎯 **Vue Coach** — Tableau de bord de suivi des athlètes
- 📋 **Programmes** — Builder de programmes avec assignation par date
