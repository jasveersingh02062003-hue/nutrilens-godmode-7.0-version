// Cloud sync service for daily logs — NO date limit
// Uses optimistic locking via upsert_daily_log RPC to prevent multi-device data loss.
// When offline or on failure, queues to IndexedDB outbox for replay.
import { supabase } from '@/integrations/supabase/client';
import type { DailyLog } from '@/lib/store';
import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { enqueue } from '@/lib/offline-outbox';

const LOG_KEY_PREFIX = 'nutrilens_log_';

let syncTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
// Track last-known server updated_at per log_date for optimistic locking
const lastKnownUpdatedAt: Record<string, string> = {};

export function rememberLogVersion(logDate: string, updatedAt: string | null) {
  if (updatedAt) lastKnownUpdatedAt[logDate] = updatedAt;
}

/**
 * Merge two daily logs. Server wins on conflicting meal IDs; local wins on entries
 * server doesn't have. Non-array fields prefer the newer (local) version.
 */
function mergeDailyLogs(server: any, local: any): any {
  if (!server) return local;
  if (!local) return server;
  const merged: any = { ...server, ...local };
  // Merge meals by id (server wins on conflict — assumes server is canonical)
  const serverMeals = Array.isArray(server.meals) ? server.meals : [];
  const localMeals = Array.isArray(local.meals) ? local.meals : [];
  const seen = new Set<string>();
  const out: any[] = [];
  for (const m of serverMeals) {
    if (m?.id) { seen.add(m.id); out.push(m); }
  }
  for (const m of localMeals) {
    if (m?.id && !seen.has(m.id)) out.push(m);
  }
  merged.meals = out;
  return merged;
}

export async function performSync(log: DailyLog, attempt = 0): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const expected = lastKnownUpdatedAt[log.date] ?? null;

  const { data, error } = await (supabase.rpc as any)('upsert_daily_log', {
    p_log_date: log.date,
    p_log_data: log,
    p_expected_updated_at: expected,
  });

  if (error) {
    // Conflict: server has a newer version — fetch, merge, retry once
    const isConflict = error.code === 'P0409' || /CONFLICT/i.test(error.message ?? '');
    if (isConflict && attempt === 0) {
      const { data: fresh } = await (supabase
        .from('daily_logs') as any)
        .select('log_data, updated_at')
        .eq('user_id', session.user.id)
        .eq('log_date', log.date)
        .maybeSingle();
      if (fresh) {
        rememberLogVersion(log.date, fresh.updated_at);
        const merged = mergeDailyLogs(fresh.log_data, log);
        scopedSet(LOG_KEY_PREFIX + log.date, JSON.stringify(merged));
        return performSync(merged as DailyLog, attempt + 1);
      }
    }
    console.error('Daily log sync failed:', error);
    return;
  }

  // RPC returns rows; capture fresh updated_at
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.updated_at) rememberLogVersion(log.date, row.updated_at);
}

/**
 * Debounced sync of a daily log to the cloud using optimistic locking.
 * Called automatically whenever saveDailyLog is used.
 */
export function syncDailyLogToCloud(log: DailyLog) {
  const key = log.date;
  if (syncTimeouts[key]) clearTimeout(syncTimeouts[key]);

  syncTimeouts[key] = setTimeout(async () => {
    if (!isOnline()) {
      await enqueue({
        kind: 'daily_log',
        payload: { log },
        conflictKey: `daily_log:${log.date}`,
      });
      return;
    }
    try {
      await performSync(log);
    } catch (e) {
      console.error('Daily log sync error:', e);
      // Queue for replay
      await enqueue({
        kind: 'daily_log',
        payload: { log },
        conflictKey: `daily_log:${log.date}`,
      });
    }
  }, 1500);
}

/**
 * Restore ALL daily logs from the cloud into localStorage.
 * Fetches in paginated batches of 500 to handle large histories.
 * Only overwrites local if cloud version is newer or local doesn't exist.
 */
export async function restoreLogsFromCloud(): Promise<number> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return 0;

    let restored = 0;
    let offset = 0;
    const batchSize = 500;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await (supabase
        .from('daily_logs') as any)
        .select('log_date, log_data, updated_at')
        .eq('user_id', session.user.id)
        .order('log_date', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Failed to restore logs from cloud:', error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of data as any[]) {
        const logDate = row.log_date as string;
        const logData = row.log_data as any;
        if (!logDate || !logData) continue;

        // Track server version for optimistic locking on next write
        if (row.updated_at) rememberLogVersion(logDate, row.updated_at);

        const localKey = LOG_KEY_PREFIX + logDate;
        const localData = scopedGet(localKey);

        if (!localData) {
          // No local data — restore from cloud
          scopedSet(localKey, JSON.stringify(logData));
          restored++;
        } else {
          // Compare updated_at if available
          try {
            const local = JSON.parse(localData);
            const cloudUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
            const localUpdated = local._updatedAt ? new Date(local._updatedAt).getTime() : 0;
            if (cloudUpdated > localUpdated) {
              scopedSet(localKey, JSON.stringify(logData));
              restored++;
            }
          } catch (e) {
            console.warn('[daily-log-sync] Parse error during restore:', e);
          }
        }
      }

      if (data.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    }

    return restored;
  } catch (e) {
    console.error('Unexpected error restoring logs:', e);
    return 0;
  }
}
