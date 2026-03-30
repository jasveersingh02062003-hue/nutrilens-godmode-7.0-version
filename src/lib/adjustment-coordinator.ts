// ============================================
// NutriLens AI – Unified Adjustment Coordinator
// Single entry point for all calorie adjustments.
// Prevents triple-counting across engines.
// ============================================

import { getProfile, getDailyLog, getDailyTotals, getTodayKey } from './store';
import {
  computeAdjustedTarget,
  getDailyBalances,
  getCorrectionMode,
} from './calorie-correction';
import { getExerciseAdjustments } from './exercise-adjustment';
import { getPendingCarryOver } from './redistribution-service';

export interface CoordinatedAdjustment {
  finalTarget: number;
  baseTarget: number;
  breakdown: {
    correction: number;       // from calorie carry-forward engine
    exercise: number;         // from exercise eat-back
    redistribution: number;   // from missed meal carry-over
  };
  cappedTotal: number;
}

/**
 * Get the coordinated calorie adjustment for a date.
 * Applies all three engines in priority order with a combined cap of ±25% TDEE.
 */
export function getCoordinatedAdjustment(date?: string): CoordinatedAdjustment {
  const p = getProfile();
  const targetDate = date || getTodayKey();
  const baseTarget = p?.dailyCalories || 1600;
  const tdee = p?.tdee || baseTarget;
  const maxCombined = Math.round(tdee * 0.25);

  // 1. Calorie correction (surplus/deficit spreading)
  const allBalances = getDailyBalances(baseTarget);
  const correctedTarget = computeAdjustedTarget(
    targetDate, baseTarget, allBalances, tdee, getCorrectionMode()
  );
  const correction = correctedTarget - baseTarget;

  // 2. Exercise eat-back adjustment
  let exercise = 0;
  try {
    const logs = getExerciseAdjustments(targetDate);
    exercise = logs.reduce((sum, l) => sum + (l.addedCalories || 0), 0);
  } catch {
    exercise = 0;
  }

  // 3. Redistribution carry-over
  let redistribution = 0;
  try {
    const carryOver = getPendingCarryOver();
    redistribution = carryOver?.calories || 0;
  } catch {
    redistribution = 0;
  }

  // Combined cap: never exceed ±25% of TDEE total across all sources
  let rawTotal = correction + exercise + redistribution;
  const cappedTotal = Math.max(-maxCombined, Math.min(maxCombined, rawTotal));

  // If capped, proportionally scale each source
  if (Math.abs(rawTotal) > Math.abs(cappedTotal) && rawTotal !== 0) {
    const scale = cappedTotal / rawTotal;
    return {
      finalTarget: Math.round(baseTarget + cappedTotal),
      baseTarget,
      breakdown: {
        correction: Math.round(correction * scale),
        exercise: Math.round(exercise * scale),
        redistribution: Math.round(redistribution * scale),
      },
      cappedTotal,
    };
  }

  return {
    finalTarget: Math.round(baseTarget + cappedTotal),
    baseTarget,
    breakdown: {
      correction,
      exercise,
      redistribution,
    },
    cappedTotal,
  };
}
