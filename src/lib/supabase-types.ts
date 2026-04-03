// ============================================
// Supabase Upsert Payload Types
// Properly typed payloads to eliminate `as any` casts
// ============================================

/** Payload for weight_logs upsert */
export interface WeightLogUpsert {
  user_id: string;
  log_date: string;
  weight: number;
  unit: string;
}

/** Payload for water_logs upsert */
export interface WaterLogUpsert {
  user_id: string;
  log_date: string;
  cups: number;
}

/** Payload for supplement_logs upsert */
export interface SupplementLogUpsert {
  user_id: string;
  log_date: string;
  supplements: unknown;
}

/** Payload for daily_logs upsert */
export interface DailyLogUpsert {
  user_id: string;
  log_date: string;
  log_data: unknown;
}

/** Upsert options with onConflict */
export interface UpsertOptions {
  onConflict: string;
}
