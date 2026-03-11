function roundWeight(value) {
  return Math.round(value * 2) / 2
}

export function computeProgression(history, repTarget = 8) {

  if (!history || history.length === 0) return null

  const last = history[0]

  const weight = Number(last.weight || 0)
  const reps = Number(last.reps || 0)
  const rpe = Number(last.rpe || 8)

  let suggestedWeight = weight
  let suggestedReps = reps
  let reason = "Maintien"

  // progression facile
  if (rpe <= 7) {
    suggestedWeight = roundWeight(weight * 1.03)
    reason = "Charge augmentée (séance facile)"
  }

  // progression reps
  else if (rpe <= 8.5 && reps < repTarget) {
    suggestedReps = reps + 1
    reason = "Ajout d'une répétition"
  }

  // progression charge
  else if (rpe <= 8.5 && reps >= repTarget) {
    suggestedWeight = roundWeight(weight * 1.025)
    reason = "Charge augmentée"
  }

  // maintien
  else if (rpe <= 9.3) {
    reason = "Consolidation"
  }

  // fatigue
  else {
    suggestedWeight = roundWeight(weight * 0.95)
    reason = "Fatigue détectée (deload léger)"
  }

  return {
    weight: suggestedWeight,
    reps: suggestedReps,
    reason
  }
}