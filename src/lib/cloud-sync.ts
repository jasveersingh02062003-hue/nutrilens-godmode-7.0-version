// ============================================
// Cloud Sync Helpers — typed upsert wrappers
// Eliminates `as any` casts in store.ts
// ============================================

import type { SupplementEntry } from '@/lib/store';

type TableName = 'weight_logs' | 'water_logs' | 'supplement_logs';

/**
 * Fire-and-forget upsert to a Supabase table with error logging.
 * Wraps the common pattern: get session → upsert → log errors.
 */
async function syncToTable(
  table: TableName,
  payload: Record<string, unknown>,
  conflictColumns: string
): Promise<void> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const row = { ...payload, user_id: session.user.id };
    const { error } = await (supabase.from(table) as any).upsert(row, { onConflict: conflictColumns });
    if (error) console.error(`[sync] ${table} failed:`, error.message);
  } catch (e) {
    console.error(`[sync] ${table} error:`, e);
  }
}

/** Sync weight to cloud */
export function syncWeight(date: string, weight: number, unit: string): void {
  syncToTable('weight_logs', { log_date: date, weight, unit }, 'user_id,log_date');
}

/** Sync water cups to cloud */
export function syncWater(date: string, cups: number): void {
  syncToTable('water_logs', { log_date: date, cups }, 'user_id,log_date');
}

/** Sync supplements to cloud */
export function syncSupplements(date: string, supplements: SupplementEntry[]): void {
  syncToTable('supplement_logs', { log_date: date, supplements }, 'user_id,log_date');
}
