// ============================================
// Calendar Helpers — Pure functions for calendar UI
// Uses deterministic computation from calorie-correction
// ============================================

import { computeAdjustmentMap, computeBreakdownForDate, type DailyBalanceEntry, type AdjustmentSource } from '@/lib/calorie-correction';

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
  reason: string;        // e.g. "Ate +400 kcal over target"
  impactLabel: string;   // e.g. "→ -100 kcal today"
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

/**
 * Compute the adjusted plan for a future date.
 * Accepts a precomputed adjMap (Record<string, number>) instead of CalorieBankState.
 * Protein stays fixed; remaining calories split 75% carbs / 25% fat.
 */
export function getFutureDayPlan(
  date: string,
  profile: ProfileLike | null,
  adjMap: Record<string, number>
): FutureDayPlan {
  const baseTarget = profile?.dailyCalories || 1600;
  const proteinTarget = profile?.dailyProtein || 60;

  const adjustment = adjMap[date] || 0;
  const adjustedTarget = Math.round(clamp(baseTarget + adjustment, 1200, baseTarget * 1.15));

  // Protein stays locked
  const protein = proteinTarget;
  const proteinCal = protein * 4;
  const remaining = Math.max(0, adjustedTarget - proteinCal);

  // 75% carbs, 25% fat from remaining
  const carbs = Math.round((remaining * 0.75) / 4);
  const fats = Math.round((remaining * 0.25) / 9);

  return {
    calories: adjustedTarget,
    protein,
    carbs,
    fats,
    adjustment,
    adjustedTarget,
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
 * Delegates to the pure computeBreakdownForDate.
 */
export function getAdjustmentBreakdownForDate(
  targetDate: string,
  pastLogs: DailyBalanceEntry[],
  baseTarget: number
): AdjustmentBreakdownEntry[] {
  const sources = computeBreakdownForDate(targetDate, pastLogs, baseTarget);
  // Group by sourceDate to prevent duplicate entries in UI
  const grouped = new Map<string, AdjustmentBreakdownEntry>();
  for (const s of sources) {
    const existing = grouped.get(s.sourceDate);
    const direction = s.surplus > 0 ? 'over' : 'under';
    const reason = `Ate ${s.surplus > 0 ? '+' : ''}${Math.abs(s.surplus)} kcal ${direction} target`;
    const impactLabel = `→ ${s.appliedAdjustment > 0 ? '+' : ''}${s.appliedAdjustment} kcal`;
    if (existing) {
      existing.surplus = s.surplus;
      existing.appliedAdjustment += s.appliedAdjustment;
      existing.reason = reason;
      existing.impactLabel = `→ ${existing.appliedAdjustment > 0 ? '+' : ''}${existing.appliedAdjustment} kcal`;
    } else {
      grouped.set(s.sourceDate, {
        sourceDate: s.sourceDate,
        surplus: s.surplus,
        appliedAdjustment: s.appliedAdjustment,
        reason,
        impactLabel,
      });
    }
  }
  return Array.from(grouped.values());
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
