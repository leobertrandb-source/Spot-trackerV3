/**
 * SMART PROGRESSION ENGINE
 * Analyse plusieurs semaines d'historique pour proposer
 * une surcharge progressive intelligente (reps ou charge)
 */

function roundWeight(value) {
  return Math.round(value * 2) / 2
}

/**
 * Groupe les sets par semaine ISO
 */
function groupByWeek(sets) {
  const weeks = {}
  for (const s of sets) {
    const date = new Date(s.session_date || s.created_at || Date.now())
    // Numéro de semaine ISO : année + semaine
    const jan4 = new Date(date.getFullYear(), 0, 4)
    const weekNum = Math.ceil(((date - jan4) / 86400000 + jan4.getDay() + 1) / 7)
    const key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
    if (!weeks[key]) weeks[key] = []
    weeks[key].push(s)
  }
  // Retourne du plus récent au plus ancien
  return Object.entries(weeks)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([week, sets]) => ({ week, sets }))
}

/**
 * Calcule les stats d'une liste de sets :
 * - volume total (kg × reps)
 * - meilleur set (plus lourd)
 * - RPE moyen
 * - reps moyens sur le meilleur poids
 */
function weekStats(sets) {
  if (!sets || sets.length === 0) return null

  const totalVolume = sets.reduce((sum, s) => {
    return sum + Number(s.weight || 0) * Number(s.reps || 0)
  }, 0)

  const avgRpe = sets
    .filter(s => Number(s.rpe) > 0)
    .reduce((sum, s, _, arr) => sum + Number(s.rpe) / arr.length, 0)

  // Meilleur set = celui avec le poids le plus élevé
  const bestSet = sets.reduce((best, s) => {
    return Number(s.weight || 0) > Number(best.weight || 0) ? s : best
  }, sets[0])

  // Pour le poids dominant, calcule les reps moyens
  const topWeight = Number(bestSet.weight || 0)
  const setsAtTopWeight = sets.filter(s => Math.abs(Number(s.weight || 0) - topWeight) < 1)
  const avgRepsAtTopWeight = setsAtTopWeight.reduce(
    (sum, s, _, arr) => sum + Number(s.reps || 0) / arr.length, 0
  )

  return {
    totalVolume,
    avgRpe: avgRpe || null,
    topWeight,
    avgRepsAtTopWeight: Math.round(avgRepsAtTopWeight),
    setsCount: sets.length,
    bestSet,
  }
}

/**
 * Détecte la tendance sur les 3 dernières semaines :
 * PROGRESSIVE | STABLE | STAGNANT | DELOAD_NEEDED
 */
function detectTrend(weeklyStats) {
  if (weeklyStats.length < 2) return 'FIRST_TIME'

  const [w1, w2, w3] = weeklyStats // w1 = plus récent

  if (!w1 || !w2) return 'INSUFFICIENT_DATA'

  const volChange1 = w1.totalVolume - w2.totalVolume
  const weightChange1 = w1.topWeight - w2.topWeight

  // Stagnation sur 3 semaines
  if (w3) {
    const vol3Same =
      Math.abs(w1.totalVolume - w2.totalVolume) < w1.totalVolume * 0.03 &&
      Math.abs(w2.totalVolume - w3.totalVolume) < w2.totalVolume * 0.03
    if (vol3Same) return 'STAGNANT'
  }

  // RPE en hausse = fatigue
  if (w1.avgRpe && w2.avgRpe && w1.avgRpe - w2.avgRpe > 0.8) return 'FATIGUE'

  // Progression régulière
  if (volChange1 > 0 || weightChange1 > 0) return 'PROGRESSIVE'

  // Légère baisse
  if (volChange1 < -w1.totalVolume * 0.05) return 'SLIGHT_DECLINE'

  return 'STABLE'
}

/**
 * Choisit la meilleure stratégie de progression :
 * - REPS_FIRST  : augmente les reps avant la charge (débutant / pas au rep target)
 * - WEIGHT_JUMP : augmente la charge (atteint le rep target)
 * - DELOAD      : réduction de charge
 * - HOLD        : maintenir
 */
function chooseStrategy({ trend, lastWeek, repTarget = 10 }) {
  if (!lastWeek) return { type: 'NO_DATA' }

  const { topWeight, avgRepsAtTopWeight, avgRpe } = lastWeek

  // Fatigue ou RPE trop élevé → deload
  if (trend === 'FATIGUE' || (avgRpe && avgRpe >= 9.5)) {
    return {
      type: 'DELOAD',
      suggestedWeight: roundWeight(topWeight * 0.9),
      suggestedReps: Math.max(avgRepsAtTopWeight - 1, 6),
      confidence: 'high',
    }
  }

  // Stagnation sans fatigue → boost reps OU deload léger pour relancer
  if (trend === 'STAGNANT') {
    if (avgRepsAtTopWeight < repTarget - 1) {
      return {
        type: 'REPS_FIRST',
        suggestedWeight: topWeight,
        suggestedReps: avgRepsAtTopWeight + 2, // double boost pour sortir de la stagnation
        confidence: 'medium',
      }
    } else {
      return {
        type: 'WEIGHT_JUMP',
        suggestedWeight: roundWeight(topWeight * 1.03), // +3% pour casser la stagnation
        suggestedReps: repTarget - 1,
        confidence: 'medium',
      }
    }
  }

  // Progression active : continuer sur la lancée
  if (trend === 'PROGRESSIVE') {
    if (avgRepsAtTopWeight < repTarget) {
      return {
        type: 'REPS_FIRST',
        suggestedWeight: topWeight,
        suggestedReps: avgRepsAtTopWeight + 1,
        confidence: 'high',
      }
    } else {
      return {
        type: 'WEIGHT_JUMP',
        suggestedWeight: roundWeight(topWeight * 1.025),
        suggestedReps: Math.max(repTarget - 1, 6),
        confidence: 'high',
      }
    }
  }

  // RPE facile → on peut monter
  if (avgRpe && avgRpe <= 7) {
    return {
      type: 'WEIGHT_JUMP',
      suggestedWeight: roundWeight(topWeight * 1.03),
      suggestedReps: avgRepsAtTopWeight,
      confidence: 'high',
    }
  }

  // RPE moyen et reps pas au target → ajouter une rep
  if (avgRepsAtTopWeight < repTarget) {
    return {
      type: 'REPS_FIRST',
      suggestedWeight: topWeight,
      suggestedReps: avgRepsAtTopWeight + 1,
      confidence: 'medium',
    }
  }

  // Stable et au target → légère hausse de charge
  if (avgRpe && avgRpe <= 8.5) {
    return {
      type: 'WEIGHT_JUMP',
      suggestedWeight: roundWeight(topWeight * 1.025),
      suggestedReps: Math.max(repTarget - 1, 6),
      confidence: 'medium',
    }
  }

  // Maintien
  return {
    type: 'HOLD',
    suggestedWeight: topWeight,
    suggestedReps: avgRepsAtTopWeight,
    confidence: 'low',
  }
}

/**
 * Génère un message explicatif pour le client
 */
function buildMessage(trend, strategy, weeklyStats) {
  const w = weeklyStats[0]
  const weeksCount = weeklyStats.length

  const trendLabel = {
    PROGRESSIVE: '📈 Progression régulière',
    STABLE: '⚖️ Stabilité',
    STAGNANT: '⚠️ Stagnation détectée',
    FATIGUE: '🔴 Fatigue détectée',
    SLIGHT_DECLINE: '📉 Légère baisse',
    FIRST_TIME: '🆕 Premier enregistrement',
    INSUFFICIENT_DATA: '📊 Peu de données',
  }[trend] || '—'

  const strategyMessages = {
    REPS_FIRST: `Ajoute une répétition avant d'augmenter la charge — tu n'as pas encore atteint ton objectif de reps.`,
    WEIGHT_JUMP: `Tu maîtrises le poids actuel : monte la charge légèrement.`,
    DELOAD: `Ton corps a besoin de récupérer. Réduis la charge cette semaine.`,
    HOLD: `Consolide bien la technique à ce niveau avant de progresser.`,
    NO_DATA: `Commence par une séance pour avoir des suggestions personnalisées.`,
  }[strategy.type] || ''

  const weeksLabel = weeksCount === 1 ? '1 semaine' : `${weeksCount} semaines`

  return {
    trend,
    trendLabel,
    advice: strategyMessages,
    analysisLabel: `Analyse sur ${weeksLabel} d'historique`,
  }
}

/**
 * FONCTION PRINCIPALE
 * @param {Array} history - Sets triés du plus récent au plus ancien, avec session_date
 * @param {number} repTarget - Objectif de reps
 * @returns {Object} suggestion complète
 */
export function computeSmartProgression(history, repTarget = 10) {
  if (!history || history.length === 0) return null

  const weeks = groupByWeek(history)
  if (!weeks.length) return null

  const weeklyStats = weeks.map(w => weekStats(w.sets)).filter(Boolean)
  const trend = detectTrend(weeklyStats)
  const lastWeek = weeklyStats[0]

  const strategy = chooseStrategy({ trend, lastWeek, repTarget })

  if (strategy.type === 'NO_DATA') return null

  const message = buildMessage(trend, strategy, weeklyStats)

  return {
    weight: strategy.suggestedWeight ?? lastWeek.topWeight,
    reps: strategy.suggestedReps ?? lastWeek.avgRepsAtTopWeight,
    confidence: strategy.confidence,
    strategy: strategy.type,
    trend,
    trendLabel: message.trendLabel,
    advice: message.advice,
    analysisLabel: message.analysisLabel,
    weeksAnalyzed: weeks.length,
    // données brutes de la dernière semaine pour affichage
    lastWeight: lastWeek.topWeight,
    lastReps: lastWeek.avgRepsAtTopWeight,
    lastRpe: lastWeek.avgRpe ? Math.round(lastWeek.avgRpe * 10) / 10 : null,
    lastVolume: Math.round(lastWeek.totalVolume),
  }
}
