// ============================================
// Correction Modes — User-controlled intensity
// Re-exports from calorie-correction.ts for clean imports
// ============================================

export { 
  type CorrectionMode,
  getCorrectionMode,
  setCorrectionMode,
  computeMaxDailyAdjustment,
  computeSafeSpreadDays,
  getModeImpactPreview,
} from '@/lib/calorie-correction';
