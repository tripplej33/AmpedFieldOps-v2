export interface RiskRating {
  score: number
  level: 'Low' | 'Medium' | 'High' | 'Critical'
  colorClass: string
  bgClass: string
  borderClass: string
}

export const LIKELIHOOD_LEVELS = [
  { value: 1, label: '1 - Rare' },
  { value: 2, label: '2 - Unlikely' },
  { value: 3, label: '3 - Possible' },
  { value: 4, label: '4 - Likely' },
  { value: 5, label: '5 - Almost Certain' },
]

export const CONSEQUENCE_LEVELS = [
  { value: 1, label: '1 - Insignificant' },
  { value: 2, label: '2 - Minor' },
  { value: 3, label: '3 - Moderate' },
  { value: 4, label: '4 - Major' },
  { value: 5, label: '5 - Catastrophic' },
]

export function calculateRiskRating(likelihood: number, consequence: number): RiskRating {
  const safeL = Math.min(5, Math.max(1, likelihood || 1))
  const safeC = Math.min(5, Math.max(1, consequence || 1))
  const score = safeL * safeC

  if (score >= 20) {
    return {
      score,
      level: 'Critical',
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/15',
      borderClass: 'border-red-500/40',
    }
  }

  if (score >= 12) {
    return {
      score,
      level: 'High',
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-500/15',
      borderClass: 'border-orange-500/40',
    }
  }

  if (score >= 6) {
    return {
      score,
      level: 'Medium',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/15',
      borderClass: 'border-amber-500/40',
    }
  }

  return {
    score,
    level: 'Low',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/40',
  }
}
