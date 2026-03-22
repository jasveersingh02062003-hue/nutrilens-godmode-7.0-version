// ============================================
// NutriLens AI – Weighted Calorie Burn Service
// Confidence-weighted burn with safety cap
// ============================================

import { ActivityEntry, BurnedData } from '@/lib/store';

/** Confidence weights by activity source/type */
const SOURCE_CONFIDENCE: Record<string, number> = {
  google_fit: 0.75,
  wearable: 0.75,
  manual: 0.5,
};

const TYPE_CONFIDENCE: Record<string, number> = {
  walking: 0.6,
  running: 0.8,
  cycling: 0.8,
  swimming: 0.8,
  gym: 0.7,
  yoga: 0.7,
  hiit: 0.8,
  dancing: 0.7,
  sports: 0.7,
  stairs: 0.7,
  'jump-rope': 0.8,
  other: 0.5,
};

const STEPS_CONFIDENCE = 0.6;
const SAFETY_CAP = 0.7; // max 70% of raw burn is usable

export interface BurnBreakdown {
  rawBurn: number;
  weightedBurn: number;
  effectiveBurn: number;   // after cap
  capApplied: boolean;
}

export type DayStatus = 'onTrack' | 'close' | 'over';

export interface NetCalorieResult {
  effectiveBurn: number;
  rawBurn: number;
  net: number;
  remaining: number;
  dayStatus: DayStatus;
  dayStatusLabel: string;
  dayStatusColor: string;
}

function getActivityConfidence(activity: ActivityEntry): number {
  const srcConf = SOURCE_CONFIDENCE[activity.source] ?? 0.5;
  const typeConf = TYPE_CONFIDENCE[activity.type] ?? 0.5;
  // Use the higher of the two as primary, blend slightly
  return Math.min(1, (srcConf + typeConf) / 2);
}

export function calculateBurnBreakdown(burned: BurnedData): BurnBreakdown {
  // Steps contribution
  const stepsWeighted = (burned.steps || 0) * STEPS_CONFIDENCE;
  const stepsRaw = burned.steps || 0;

  // Activities contribution
  let activitiesRaw = 0;
  let activitiesWeighted = 0;
  for (const act of (burned.activities || [])) {
    activitiesRaw += act.calories;
    activitiesWeighted += act.calories * getActivityConfidence(act);
  }

  const rawBurn = stepsRaw + activitiesRaw;
  const weightedBurn = Math.round(stepsWeighted + activitiesWeighted);
  const maxUsable = Math.round(rawBurn * SAFETY_CAP);
  const effectiveBurn = Math.min(weightedBurn, maxUsable);
  const capApplied = weightedBurn > maxUsable;

  return { rawBurn, weightedBurn, effectiveBurn, capApplied };
}

export function calculateNetCalories(
  eaten: number,
  burned: BurnedData,
  goal: number
): NetCalorieResult {
  const breakdown = calculateBurnBreakdown(burned);
  const net = eaten - breakdown.effectiveBurn;
  const remaining = goal - net;

  let dayStatus: DayStatus;
  let dayStatusLabel: string;
  let dayStatusColor: string;

  if (remaining > 100) {
    dayStatus = 'onTrack';
    dayStatusLabel = 'On track';
    dayStatusColor = 'text-status-ontrack';
  } else if (remaining >= -100) {
    dayStatus = 'close';
    dayStatusLabel = 'Close to limit';
    dayStatusColor = 'text-status-warning';
  } else {
    dayStatus = 'over';
    dayStatusLabel = 'Over target';
    dayStatusColor = 'text-status-danger';
  }

  return {
    effectiveBurn: breakdown.effectiveBurn,
    rawBurn: breakdown.rawBurn,
    net,
    remaining: Math.max(0, remaining),
    dayStatus,
    dayStatusLabel,
    dayStatusColor,
  };
}
