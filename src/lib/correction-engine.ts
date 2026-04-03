// ============================================
// Correction Engine — Core computation functions
// Re-exports from calorie-correction.ts for clean imports
// ============================================

export {
  type DailyBalanceEntry,
  type AdjustmentSource,
  type MonthlyStats,
  computeDailyCalories,
  computeAdjustmentMap,
  computeProjectedAdjustmentMap,
  computeAdjustedTarget,
  computeBreakdownForDate,
  computeDinnerSummary,
  getDailyBalances,
  getMonthlyStats,
  getWeekendPattern,
  finalizeDay,
  recomputeCalorieEngine,
  clearEngineCache,
  syncDailyBalance,
  getEffectiveDate,
  validateAdjustmentIntegrity,
} from '@/lib/calorie-correction';
