// src/lib/rtpProtocols.js
// Protocoles Retour au Jeu spécifiques par zone lésée — Rugby

export const RTP_ZONES = {
  genou: {
    label: 'Genou',
    emoji: '🦵',
    color: '#4d9fff',
    steps: [
      {
        step: 1, label: 'Rehab Étape 1', icon: '🛌',
        domaines: {
          muscu:   'Aucun travail musculaire sur le membre lésé · Travail membres sains',
          appuis:  'Mise en charge partielle si douleur · Appuis statiques',
          course:  '—',
          contact: '—',
        },
        criteres: [
          { key: 'douleur',  label: 'Douleur < 2/10 au repos' },
          { key: 'oedeme',   label: 'Pas d\'œdème visible' },
          { key: 'mobilite', label: 'Flexion > 90° sans douleur' },
        ],
        badge: 'Stabilisation',
      },
      {
        step: 2, label: 'Rehab Étape 2', icon: '🚴',
        domaines: {
          muscu:   'Quadriceps isométrique · Travail chaîne postérieure légère · Vélo sans résistance',
          appuis:  'Marche normale · Montée/descente escaliers · COD 45° < 60% Vmax',
          course:  '40% distance · 40% fitness · 60% Vmax en ligne droite',
          contact: '—',
        },
        criteres: [
          { key: 'force',   label: 'Force isométrique > 80% côté sain' },
          { key: 'douleur', label: 'Pas de douleur à l\'effort' },
          { key: 'flexion', label: 'Flexion complète' },
        ],
        badge: 'Mobilité Recouvrée',
      },
      {
        step: 3, label: 'Réathlé Étape 3', icon: '🏃',
        domaines: {
          muscu:   'Squat unilatéral · Leg press · Renforcement excentrique ischio · RPE 5-6',
          appuis:  'Stop & Go 90° < 70% Vmax · Sauts bimembres',
          course:  '60% distance · 80% fitness · 70% Vmax · Courbes larges',
          contact: 'Bouclier statique · Pas de plaquage',
        },
        criteres: [
          { key: 'isocin',       label: 'Test isocinétique > 85%' },
          { key: 'proprio',      label: 'Proprioception OK (Y-balance)' },
          { key: 'saut',         label: 'Single-leg hop > 85% côté sain' },
        ],
        badge: 'Force Fonctionnelle',
      },
      {
        step: 4, label: 'Réathlé Étape 4', icon: '⚽',
        domaines: {
          muscu:   'Chaîne fermée max · RPE 7-8 · Plyométrie légère unilatérale',
          appuis:  'RHIE 90° + COD 90° > 70% Vmax · Pivots rugbystiques',
          course:  '80% distance · 120% fitness · 80% Vmax · Sprints courts',
          contact: '1 contre 1 · 70% intensité · Plaquage au sol autorisé',
        },
        criteres: [
          { key: 'force',      label: 'Force > 90-95% côté sain' },
          { key: 'agilite',    label: 'Agilité T-test OK' },
          { key: 'confiance',  label: 'Confiance subjective > 8/10' },
        ],
        badge: 'Performance Rugby',
      },
      {
        step: 5, label: 'Retour Au Jeu', icon: '✅',
        domaines: {
          muscu:   'RPE > 8 · Puissance + explosivité rugby-specific',
          appuis:  '90° + 180° + courses courbes > 80% Vmax',
          course:  '100% distance · 120% fitness · 90-100% Vmax',
          contact: '100% contact (mêlée légère, ruck, plaquage haut)',
        },
        criteres: [
          { key: 'yoyo',      label: 'Test Yo-Yo validé' },
          { key: 'sprint',    label: 'Sprint 40m = valeur pré-blessure' },
          { key: 'plaquage',  label: 'Plaquage validé staff médical' },
          { key: 'confiance', label: 'Confiance 9-10/10' },
        ],
        badge: '🏆 Retour Complet',
      },
    ],
  },

  epaule: {
    label: 'Épaule',
    emoji: '💪',
    color: '#9d7dea',
    steps: [
      {
        step: 1, label: 'Rehab Étape 1', icon: '🛌',
        domaines: {
          muscu:   'Aucun travail bras lésé · Renforcement membres inférieurs',
          appuis:  'Éducatifs membres inférieurs uniquement',
          course:  'Marche · Vélo stationnaire bras au corps',
          contact: '—',
        },
        criteres: [
          { key: 'douleur',  label: 'Douleur < 2/10 au repos' },
          { key: 'oedeme',   label: 'Pas d\'œdème / ecchymose active' },
          { key: 'mobilite', label: 'Mobilité passive indolore' },
        ],
        badge: 'Stabilisation',
      },
      {
        step: 2, label: 'Rehab Étape 2', icon: '🚴',
        domaines: {
          muscu:   'Isométrique coiffe des rotateurs · Élastique léger en position basse · Scapulaire',
          appuis:  'Course normale · Appuis au sol avec bras lésé protégé',
          course:  '40% distance · 60% Vmax · Pas de mouvement bras',
          contact: '—',
        },
        criteres: [
          { key: 'force',    label: 'Force isométrique > 70% côté sain' },
          { key: 'mobilite', label: 'Élévation antérieure > 120°' },
          { key: 'douleur',  label: 'Pas de douleur à l\'effort léger' },
        ],
        badge: 'Mobilité Recouvrée',
      },
      {
        step: 3, label: 'Réathlé Étape 3', icon: '🏃',
        domaines: {
          muscu:   'Chaîne cinétique ouverte · Développé léger · Tirages · RPE 5-6',
          appuis:  'Chutes amortie avec bras · COD sans impact épaule',
          course:  '60% distance · 70% Vmax · Bras libres',
          contact: 'Sac de frappe bras tendu · Pas de choc direct épaule',
        },
        criteres: [
          { key: 'force',   label: 'Force > 85% côté sain' },
          { key: 'proprio', label: 'Proprioception OK' },
          { key: 'lancé',   label: 'Lancé léger indolore' },
        ],
        badge: 'Force Fonctionnelle',
      },
      {
        step: 4, label: 'Réathlé Étape 4', icon: '⚽',
        domaines: {
          muscu:   'Force maximale · RPE 7-8 · Exercices rugby-specific (portée, soutien)',
          appuis:  'Chutes latérales · Roulades · Contacts épaule progressive',
          course:  '80% distance · 80% Vmax · Duels sans contact épaule',
          contact: 'Plaquage haut progressif · Mêlée légère',
        },
        criteres: [
          { key: 'force',     label: 'Force > 90% côté sain' },
          { key: 'stabilite', label: 'Stabilité dynamique OK' },
          { key: 'confiance', label: 'Confiance > 8/10 au contact' },
        ],
        badge: 'Performance Rugby',
      },
      {
        step: 5, label: 'Retour Au Jeu', icon: '✅',
        domaines: {
          muscu:   'RPE > 8 · Explosivité · Plaquage technique validé',
          appuis:  'Toutes directions · Chutes libres',
          course:  '100% distance · 100% Vmax',
          contact: '100% contact · Mêlée · Ruck · Plaquage toutes hauteurs',
        },
        criteres: [
          { key: 'force',     label: 'Force symétrique bilatérale' },
          { key: 'plaquage',  label: 'Test plaquage validé' },
          { key: 'confiance', label: 'Confiance 9-10/10' },
        ],
        badge: '🏆 Retour Complet',
      },
    ],
  },

  ischio: {
    label: 'Ischio / Quadriceps',
    emoji: '🏃',
    color: '#ff7043',
    steps: [
      {
        step: 1, label: 'Rehab Étape 1', icon: '🛌',
        domaines: {
          muscu:   'Aucune tension ischio/quad · Gainage abdominal · Membres supérieurs',
          appuis:  'Marche sans boiterie · Vélo très léger',
          course:  '—',
          contact: '—',
        },
        criteres: [
          { key: 'douleur',  label: 'Douleur < 2/10 à la palpation' },
          { key: 'tension',  label: 'Pas de tension à la marche' },
          { key: 'oedeme',   label: 'Pas d\'œdème / hématome actif' },
        ],
        badge: 'Stabilisation',
      },
      {
        step: 2, label: 'Rehab Étape 2', icon: '🚴',
        domaines: {
          muscu:   'Ischio : Nordic curl excentrique léger · Quad : VMO · Vélo avec résistance modérée',
          appuis:  'Marche rapide · Éducatifs de course très lents',
          course:  '40% distance · 60% Vmax strict en ligne droite',
          contact: '—',
        },
        criteres: [
          { key: 'force',   label: 'Force concentrique > 70% côté sain' },
          { key: 'douleur', label: 'Pas de douleur à la contraction' },
          { key: 'svm',     label: 'Souplesse > 80% côté sain (sit-and-reach)' },
        ],
        badge: 'Mobilité Recouvrée',
      },
      {
        step: 3, label: 'Réathlé Étape 3', icon: '🏃',
        domaines: {
          muscu:   'Nordic curl · Leg curl · Hip thrust · RPE 5-6 · Renforcement excentrique progressif',
          appuis:  'Stop & Go < 70% Vmax · Changements de direction doux',
          course:  '60-70% Vmax · Accélérations progressives · Pas de sprint max',
          contact: 'Bouclier · Pas de plaquage',
        },
        criteres: [
          { key: 'isocin',  label: 'Test isocinétique > 85%' },
          { key: 'sprint',  label: 'Sprint 20m sans douleur' },
          { key: 'nordic',  label: 'Nordic curl 3×8 indolore' },
        ],
        badge: 'Force Fonctionnelle',
      },
      {
        step: 4, label: 'Réathlé Étape 4', icon: '⚽',
        domaines: {
          muscu:   'Force maximale · RPE 7-8 · Plyométrie · Sprints courts répétés',
          appuis:  'Pivots · Sprints avec changement de direction > 70% Vmax',
          course:  '80% distance · 90% Vmax · Accélérations balistiques',
          contact: '1v1 · Plaquage progressif',
        },
        criteres: [
          { key: 'force',     label: 'Force > 90-95% côté sain' },
          { key: 'sprint',    label: 'Sprint 40m symétrique' },
          { key: 'confiance', label: 'Confiance > 8/10' },
        ],
        badge: 'Performance Rugby',
      },
      {
        step: 5, label: 'Retour Au Jeu', icon: '✅',
        domaines: {
          muscu:   'RPE max · Explosivité · Sprints balistiques',
          appuis:  '100% Vmax · Toutes directions',
          course:  '100% distance · 100% Vmax · Sprints répétés',
          contact: '100% contact · Jeu complet',
        },
        criteres: [
          { key: 'yoyo',      label: 'Test Yo-Yo niveau pré-blessure' },
          { key: 'sprint',    label: 'Sprint 40m = valeur pré-blessure' },
          { key: 'confiance', label: 'Confiance 9-10/10' },
        ],
        badge: '🏆 Retour Complet',
      },
    ],
  },

  cheville: {
    label: 'Cheville',
    emoji: '🦶',
    color: '#3ecf8e',
    steps: [
      {
        step: 1, label: 'Rehab Étape 1', icon: '🛌',
        domaines: {
          muscu:   'Aucun appui douloureux · Renforcement membres supérieurs et non-lésés',
          appuis:  'Mise en charge partielle · Béquilles si nécessaire · Proprioception assise',
          course:  '—',
          contact: '—',
        },
        criteres: [
          { key: 'douleur',  label: 'Douleur < 2/10 à la mise en charge' },
          { key: 'oedeme',   label: 'Œdème en régression' },
          { key: 'mobilite', label: 'Flexion dorsale passive possible' },
        ],
        badge: 'Stabilisation',
      },
      {
        step: 2, label: 'Rehab Étape 2', icon: '🚴',
        domaines: {
          muscu:   'Mollet isométrique · Proprioception bipodal · Vélo sans résistance',
          appuis:  'Marche normale · Montée escaliers · Équilibre unipodal statique',
          course:  'Aquajogging · Marche rapide',
          contact: '—',
        },
        criteres: [
          { key: 'appui',   label: 'Appui unipodal 30s sans douleur' },
          { key: 'mobilite',label: 'Flexion dorsale = côté sain' },
          { key: 'force',   label: 'Force mollet > 80% côté sain' },
        ],
        badge: 'Mobilité Recouvrée',
      },
      {
        step: 3, label: 'Réathlé Étape 3', icon: '🏃',
        domaines: {
          muscu:   'Soulevé de mollet · Proprioception plateau instable · RPE 5-6',
          appuis:  'Sauts bipodaux · COD < 70% Vmax · Réceptions contrôlées',
          course:  '60% distance · 70% Vmax · Ligne droite + légères courbes',
          contact: 'Bouclier statique · Pas de chute sur cheville',
        },
        criteres: [
          { key: 'proprio',  label: 'Y-balance test > 90% côté sain' },
          { key: 'saut',     label: 'Single-leg hop OK' },
          { key: 'course',   label: 'Course 70% Vmax sans compensation' },
        ],
        badge: 'Force Fonctionnelle',
      },
      {
        step: 4, label: 'Réathlé Étape 4', icon: '⚽',
        domaines: {
          muscu:   'Force max · Plyométrie unipodal · RPE 7-8',
          appuis:  'COD 90° > 70% Vmax · Pivots · Sprints avec contacts',
          course:  '80% distance · 80% Vmax · Accélérations + décélérations',
          contact: '1v1 progressif · Plaquage bas limité',
        },
        criteres: [
          { key: 'force',     label: 'Force > 90% côté sain' },
          { key: 'proprio',   label: 'Proprioception dynamique OK' },
          { key: 'confiance', label: 'Confiance > 8/10' },
        ],
        badge: 'Performance Rugby',
      },
      {
        step: 5, label: 'Retour Au Jeu', icon: '✅',
        domaines: {
          muscu:   'RPE max · Explosivité · Sauts balistiques',
          appuis:  '100% Vmax · Tous types d\'appuis rugbystiques',
          course:  '100% distance · 100% Vmax',
          contact: '100% contact · Mêlée · Plaquage toutes hauteurs',
        },
        criteres: [
          { key: 'sprint',    label: 'Sprint 40m = pré-blessure' },
          { key: 'terrain',   label: 'Test terrain validé' },
          { key: 'confiance', label: 'Confiance 9-10/10' },
        ],
        badge: '🏆 Retour Complet',
      },
    ],
  },

  dos: {
    label: 'Dos / Lombaires',
    emoji: '🔷',
    color: '#fbbf24',
    steps: [
      {
        step: 1, label: 'Rehab Étape 1', icon: '🛌',
        domaines: {
          muscu:   'Aucune charge axiale · Gainage isométrique très léger en position antalgique',
          appuis:  'Marche douce · Vélo stationnaire position droite',
          course:  '—',
          contact: '—',
        },
        criteres: [
          { key: 'douleur',  label: 'Douleur < 2/10 à la marche' },
          { key: 'neuro',    label: 'Absence de signe neurologique' },
          { key: 'mobilite', label: 'Flexion tronc 50% sans douleur' },
        ],
        badge: 'Stabilisation',
      },
      {
        step: 2, label: 'Rehab Étape 2', icon: '🚴',
        domaines: {
          muscu:   'Gainage progressif · Bird-dog · Dead bug · Renforcement fessiers',
          appuis:  'Marche rapide · Éducatifs bas du corps sans flexion tronc forcée',
          course:  'Vélo · Aquajogging · Marche athlétique',
          contact: '—',
        },
        criteres: [
          { key: 'gainage',  label: 'Planche 60s sans douleur' },
          { key: 'mobilite', label: 'Flexion/extension tronc complète' },
          { key: 'douleur',  label: 'Pas de douleur à l\'effort modéré' },
        ],
        badge: 'Mobilité Recouvrée',
      },
      {
        step: 3, label: 'Réathlé Étape 3', icon: '🏃',
        domaines: {
          muscu:   'Soulevé de terre léger · Good morning · RPE 5-6 · Charges axiales progressives',
          appuis:  'Course légère · COD < 70% Vmax · Pas de choc lombaire',
          course:  '60% distance · 70% Vmax · Foulée souple',
          contact: 'Bouclier · Éviter les chocs en extension lombaire',
        },
        criteres: [
          { key: 'force',   label: 'Gainage dynamique OK · RPE 6 sans douleur' },
          { key: 'course',  label: 'Course 20min sans douleur' },
          { key: 'proprio', label: 'Contrôle lombaire dynamique OK' },
        ],
        badge: 'Force Fonctionnelle',
      },
      {
        step: 4, label: 'Réathlé Étape 4', icon: '⚽',
        domaines: {
          muscu:   'Force maximale · RPE 7-8 · Plyométrie contrôlée · Charges rugbystiques',
          appuis:  'Pivots · Contacts progressifs sans impact lombaire direct',
          course:  '80% distance · 80% Vmax · Sprints courts',
          contact: 'Mêlée légère · Plaquage sans réception lombaire',
        },
        criteres: [
          { key: 'force',     label: 'Force dos > 90% valeur initiale' },
          { key: 'sprint',    label: 'Sprint 20m × 5 sans douleur' },
          { key: 'confiance', label: 'Confiance > 8/10 au contact' },
        ],
        badge: 'Performance Rugby',
      },
      {
        step: 5, label: 'Retour Au Jeu', icon: '✅',
        domaines: {
          muscu:   'RPE max · Explosivité · Mêlée spécifique',
          appuis:  'Toutes directions · 100% intensité',
          course:  '100% distance · 100% Vmax',
          contact: '100% contact · Mêlée · Ruck · Plaquage complet',
        },
        criteres: [
          { key: 'terrain',   label: 'Test terrain spécifique rugby validé' },
          { key: 'melee',     label: 'Mêlée validée par préparateur' },
          { key: 'confiance', label: 'Confiance 9-10/10' },
        ],
        badge: '🏆 Retour Complet',
      },
    ],
  },

  generique: {
    label: 'Générique',
    emoji: '⚡',
    color: '#ff4566',
    steps: [
      {
        step: 1, label: 'Rehab Étape 1', icon: '🛌',
        domaines: {
          muscu:   'Aucun travail musculaire sur zone lésée · Compensation membres sains',
          appuis:  'Éducatifs simples (marche, appuis statiques)',
          course:  '—',
          contact: '—',
        },
        criteres: [
          { key: 'douleur',  label: 'Douleur < 2/10' },
          { key: 'oedeme',   label: 'Pas d\'œdème' },
          { key: 'mobilite', label: 'Mobilité complète' },
        ],
        badge: 'Stabilisation',
      },
      {
        step: 2, label: 'Rehab Étape 2', icon: '🚴',
        domaines: {
          muscu:   'Travail compensatoire · Pas de pattern lésé',
          appuis:  'Éducatifs COD 45° < 60% Vmax',
          course:  '40% distance · 40% fitness · 60% Vmax',
          contact: '—',
        },
        criteres: [
          { key: 'force',   label: 'Force > 80% côté sain' },
          { key: 'douleur', label: 'Pas de douleur à l\'effort' },
        ],
        badge: 'Mobilité Recouvrée',
      },
      {
        step: 3, label: 'Réathlé Étape 3', icon: '🏃',
        domaines: {
          muscu:   'Chaîne cinétique ouverte · Isométrique + concentrique · RPE 5-6',
          appuis:  'Stop & Go 90° < 70% Vmax',
          course:  '60% distance · 80% fitness · 70% Vmax',
          contact: 'Bouclier + boudin 50% intensité (pas de plaquage)',
        },
        criteres: [
          { key: 'isocin',  label: 'Test isocinétique > 85%' },
          { key: 'proprio', label: 'Proprioception OK' },
          { key: 'rpe',     label: 'RPE contrôlé' },
        ],
        badge: 'Force Fonctionnelle',
      },
      {
        step: 4, label: 'Réathlé Étape 4', icon: '⚽',
        domaines: {
          muscu:   'Chaîne fermée max · RPE 6-7 · Plyométrie légère',
          appuis:  'RHIE 90° + COD 90° > 70% Vmax',
          course:  '80% distance · 120% fitness · 80% Vmax',
          contact: '1v1 · 70% intensité · Plaquage au sol autorisé',
        },
        criteres: [
          { key: 'force',     label: 'Force > 90-95%' },
          { key: 'agilite',   label: 'Agilité OK' },
          { key: 'confiance', label: 'Confiance subjective > 8/10' },
        ],
        badge: 'Performance Rugby',
      },
      {
        step: 5, label: 'Retour Au Jeu', icon: '✅',
        domaines: {
          muscu:   'Travail > RPE 8 · Puissance + explosivité rugby-specific',
          appuis:  '90° + 180° + courses courbes > 80% Vmax',
          course:  '100% distance · 120% fitness · 90-100% Vmax',
          contact: '100% contact (mêlée légère, ruck, plaquage haut)',
        },
        criteres: [
          { key: 'yoyo',      label: 'Test terrain validé (Yo-Yo, sprint, plaquage)' },
          { key: 'confiance', label: 'Confiance 9-10/10' },
        ],
        badge: '🏆 Retour Complet',
      },
    ],
  },
}

export const ZONE_OPTIONS = Object.entries(RTP_ZONES).map(([key, z]) => ({
  key,
  label: z.label,
  emoji: z.emoji,
  color: z.color,
}))

export function getProtocol(zone) {
  return RTP_ZONES[zone] || RTP_ZONES.generique
}
