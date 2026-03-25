// ============================================
// Calendar Helpers — Pure functions for future day planning
// Past = stored, Future = computed live
// ============================================

import type { CalorieBankState, AdjustmentSource } from '@/lib/calorie-correction';

interface ProfileLike {
  dailyCalories?: number;
  dailyProtein?: number;
  dailyCarbs?: number;
  dailyFat?: number;
}

export interface FutureDayPlan {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  adjustment: number;
  adjustedTarget: number;
}

export type DayStatus = 'on-track' | 'partial' | 'off-track' | 'no-data';

export interface AdjustmentBreakdownEntry {
  sourceDate: string;
  surplus: number;
  appliedAdjustment: number;
}

/**
 * Compute the adjusted plan for a future date.
 * Protein stays fixed; remaining calories split 75% carbs / 25% fat.
 */
export function getFutureDayPlan(
  date: string,
  profile: ProfileLike | null,
  state: CalorieBankState
): FutureDayPlan {
  const baseTarget = profile?.dailyCalories || 1600;
  const proteinTarget = profile?.dailyProtein || 60;

  const planEntry = state.adjustmentPlan.find(e => e.date === date);
  const adjustment = planEntry?.adjust || 0;
  const adjustedTarget = Math.max(0, baseTarget + adjustment);

  // Protein stays locked
  const protein = proteinTarget;
  const proteinCal = protein * 4;
  const remaining = Math.max(0, adjustedTarget - proteinCal);

  // 75% carbs, 25% fat from remaining
  const carbs = Math.round((remaining * 0.75) / 4);
  const fats = Math.round((remaining * 0.25) / 9);

  return {
    calories: Math.round(adjustedTarget),
    protein,
    carbs,
    fats,
    adjustment,
    adjustedTarget: Math.round(adjustedTarget),
  };
}

/**
 * Day status based on actual vs adjusted target.
 */
export function getDayStatus(actual: number, adjustedTarget: number): DayStatus {
  if (actual === 0) return 'no-data';
  const ratio = Math.abs(actual - adjustedTarget) / adjustedTarget;
  if (ratio <= 0.1) return 'on-track';
  if (ratio <= 0.2) return 'partial';
  return 'off-track';
}

/**
 * Get the breakdown of which past days caused the adjustment for a given date.
 */
export function getAdjustmentBreakdownForDate(
  date: string,
  state: CalorieBankState
): AdjustmentBreakdownEntry[] {
  const sourceMap = state.adjustmentSources.find(s => s.targetDate === date);
  if (!sourceMap) return [];
  return sourceMap.sources.map(s => ({
    sourceDate: s.sourceDate,
    surplus: s.surplus,
    appliedAdjustment: s.appliedAdjustment,
  }));
}

/**
 * Get human-readable explanation of adjustments for a date.
 */
export function getExplanationMessage(breakdown: AdjustmentBreakdownEntry[]): string | null {
  if (breakdown.length === 0) return null;

  const lines = breakdown.map(b => {
    const dayName = new Date(b.sourceDate + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const direction = b.surplus > 0 ? 'over' : 'under';
    return `${dayName}: ${Math.abs(b.surplus)} kcal ${direction} target`;
  });

  return lines.join('\n');
}
