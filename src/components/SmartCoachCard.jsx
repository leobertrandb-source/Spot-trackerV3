/**
 * SmartCoachCard.jsx
 * Composant "Coach Intelligent" à intégrer dans AujourdhuiPage et SaisiePage
 *
 * Usage :
 *   import SmartCoachCard from '../components/SmartCoachCard'
 *   <SmartCoachCard suggestion={suggestion} onApply={handleApply} loading={loading} />
 */

import { T } from '../lib/data'

const STRATEGY_COLORS = {
  REPS_FIRST:  { bg: 'rgba(77,159,255,0.10)', border: 'rgba(77,159,255,0.30)', accent: '#4d9fff' },
  WEIGHT_JUMP: { bg: 'rgba(57,224,122,0.08)', border: 'rgba(57,224,122,0.30)', accent: '#39e07a' },
  DELOAD:      { bg: 'rgba(255,69,102,0.08)', border: 'rgba(255,69,102,0.28)', accent: '#ff4566' },
  HOLD:        { bg: 'rgba(255,165,0,0.08)',  border: 'rgba(255,165,0,0.28)',  accent: '#ffa500' },
}

const CONFIDENCE_LABEL = {
  high:   { text: 'Confiance élevée', color: '#39e07a' },
  medium: { text: 'Confiance moyenne', color: '#ffa500' },
  low:    { text: 'À confirmer',       color: '#586579' },
}

function ProgressBar({ weeks, max = 8 }) {
  const pct = Math.min((weeks / max) * 100, 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <div style={{
        flex: 1, height: 4, borderRadius: 4,
        background: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 4,
          background: 'linear-gradient(90deg, #39e07a, #4d9fff)',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color: T.textDim, minWidth: 60 }}>
        {weeks} sem. analysées
      </span>
    </div>
  )
}

export default function SmartCoachCard({ suggestion, onApply, loading }) {
  // Responsive géré via flexWrap

  // État loading
  if (loading) {
    return (
      <div style={{
        marginTop: 12, padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: T.accent,
          animation: 'pulse 1.2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 13, color: T.textDim }}>
          Analyse de l'historique…
        </span>
      </div>
    )
  }

  // Pas de données
  if (!suggestion) {
    return (
      <div style={{
        marginTop: 12, padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Coach intelligent</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: T.textDim }}>
          Pas encore d'historique sur cet exercice. Enregistre ta première séance pour recevoir des suggestions personnalisées.
        </div>
      </div>
    )
  }

  const colors = STRATEGY_COLORS[suggestion.strategy] || STRATEGY_COLORS.HOLD
  const conf = CONFIDENCE_LABEL[suggestion.confidence] || CONFIDENCE_LABEL.low

  const formatW = (v) => {
    const n = Number(v || 0)
    return Number.isInteger(n) ? String(n) : n.toFixed(1)
  }

  return (
    <div style={{
      marginTop: 12,
      borderRadius: 16,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
      background: colors.bg,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px 10px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>🤖</span>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.2px' }}>
            Coach intelligent
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: conf.color,
          background: `${conf.color}18`,
          padding: '2px 8px',
          borderRadius: 20,
          border: `1px solid ${conf.color}40`,
        }}>
          {conf.text}
        </span>
      </div>

      {/* Tendance + analyse */}
      <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: T.textMid, fontWeight: 600 }}>
          {suggestion.trendLabel}
        </span>
        {suggestion.lastRpe && (
          <span style={{
            fontSize: 11, color: T.textDim,
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 7px', borderRadius: 10,
          }}>
            RPE dernier : {suggestion.lastRpe}
          </span>
        )}
      </div>

      <div style={{ padding: '0 16px 6px' }}>
        <ProgressBar weeks={suggestion.weeksAnalyzed || 1} />
      </div>

      {/* Suggestion principale */}
      <div style={{ padding: '10px 16px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10,
        }}>
          {/* Objectif suggéré */}
          <div>
            <div style={{ fontSize: 11, color: T.textDim, marginBottom: 2 }}>
              Objectif suggéré
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                fontSize: 26, fontWeight: 900,
                color: colors.accent,
                letterSpacing: '-1px',
                lineHeight: 1,
              }}>
                {formatW(suggestion.weight)} kg
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.textMid }}>
                × {suggestion.reps}
              </span>
            </div>
            {suggestion.lastWeight !== suggestion.weight && (
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                avant : {formatW(suggestion.lastWeight)} kg × {suggestion.lastReps}
              </div>
            )}
          </div>

          {/* Bouton appliquer */}
          {onApply && (
            <button
              onClick={onApply}
              style={{
                background: colors.accent,
                color: '#050607',
                border: 'none',
                borderRadius: 12,
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                letterSpacing: '-0.2px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Appliquer
            </button>
          )}
        </div>

        {/* Conseil */}
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          fontSize: 12,
          color: T.textMid,
          lineHeight: 1.5,
        }}>
          {suggestion.advice}
        </div>
      </div>
    </div>
  )
}
