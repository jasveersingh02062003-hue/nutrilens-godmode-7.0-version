// ============================================
// Correction Nudges — UI-facing query functions
// Re-exports from calorie-correction.ts for clean imports
// ============================================

export {
  type DayType,
  getAdjustedDailyTarget,
  getProteinTarget,
  getCarbTarget,
  getFatTarget,
  isTargetAdjusted,
  getAdherenceScore,
  getBalanceStreak,
  getTodayAdjustmentStatus,
  getDayType,
  setDayType,
  getAutoAdjust,
  setAutoAdjust,
  getAverageConfidence,
  getContextualMealToast,
  getDinnerNotificationSummary,
  getAdjustmentExplanation,
  getAdjustmentDetails,
  processEndOfDay,
  onCalorieBankUpdate,
  offCalorieBankUpdate,
} from '@/lib/calorie-correction';
