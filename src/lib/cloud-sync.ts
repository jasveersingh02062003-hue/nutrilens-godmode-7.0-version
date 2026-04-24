// ============================================
// Cloud Sync Helpers — typed upsert wrappers
// Online: write directly. Offline / failure: enqueue to IndexedDB outbox
// and replay on reconnect via outbox-replay.
// ============================================

import type { SupplementEntry } from '@/lib/store';
import { enqueue, type OutboxKind } from '@/lib/offline-outbox';

type TableName = 'weight_logs' | 'water_logs' | 'supplement_logs';

const KIND_BY_TABLE: Record<TableName, OutboxKind> = {
  weight_logs: 'weight_log',
  water_logs: 'water_log',
  supplement_logs: 'supplement_log',
};

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/**
 * Direct (online) upsert. Returns true on success, false on failure.
 */
export async function performTableUpsert(
  table: TableName,
  payload: Record<string, unknown>,
  conflictColumns: string
): Promise<boolean> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const row = { ...payload, user_id: session.user.id };
    const { error } = await (supabase.from(table) as any).upsert(row, { onConflict: conflictColumns });
    if (error) {
      console.error(`[sync] ${table} failed:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[sync] ${table} error:`, e);
    return false;
  }
}

/**
 * Fire-and-forget upsert. Falls back to outbox when offline or on failure.
 */
async function syncToTable(
  table: TableName,
  payload: Record<string, unknown>,
  conflictColumns: string,
  conflictKey: string
): Promise<void> {
  if (!isOnline()) {
    await enqueue({ kind: KIND_BY_TABLE[table], payload: { table, payload, conflictColumns }, conflictKey });
    return;
  }
  const ok = await performTableUpsert(table, payload, conflictColumns);
  if (!ok) {
    await enqueue({ kind: KIND_BY_TABLE[table], payload: { table, payload, conflictColumns }, conflictKey });
  }
}

/** Sync weight to cloud */
export function syncWeight(date: string, weight: number, unit: string): void {
  void syncToTable('weight_logs', { log_date: date, weight, unit }, 'user_id,log_date', `weight_log:${date}`);
}

/** Sync water cups to cloud */
export function syncWater(date: string, cups: number): void {
  void syncToTable('water_logs', { log_date: date, cups }, 'user_id,log_date', `water_log:${date}`);
}

/** Sync supplements to cloud */
export function syncSupplements(date: string, supplements: SupplementEntry[]): void {
  void syncToTable('supplement_logs', { log_date: date, supplements }, 'user_id,log_date', `supplement_log:${date}`);
}
