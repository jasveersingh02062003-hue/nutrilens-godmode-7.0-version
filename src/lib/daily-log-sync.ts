// Cloud sync service for daily logs — NO date limit
import { supabase } from '@/integrations/supabase/client';
import type { DailyLog } from '@/lib/store';
import { scopedGet, scopedSet } from '@/lib/scoped-storage';

const LOG_KEY_PREFIX = 'nutrilens_log_';

let syncTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

/**
 * Debounced sync of a daily log to the cloud.
 * Called automatically whenever saveDailyLog is used.
 */
export function syncDailyLogToCloud(log: DailyLog) {
  const key = log.date;
  if (syncTimeouts[key]) clearTimeout(syncTimeouts[key]);

  syncTimeouts[key] = setTimeout(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await (supabase.from('daily_logs') as any).upsert({
        user_id: session.user.id,
        log_date: log.date,
        log_data: log,
      }, { onConflict: 'user_id,log_date' });

      if (error) {
        console.error('Daily log sync failed:', error);
      }
    } catch (e) {
      console.error('Daily log sync error:', e);
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

        const localKey = LOG_KEY_PREFIX + logDate;
        const localData = localStorage.getItem(localKey);

        if (!localData) {
          // No local data — restore from cloud
          localStorage.setItem(localKey, JSON.stringify(logData));
          restored++;
        } else {
          // Compare updated_at if available
          try {
            const local = JSON.parse(localData);
            const cloudUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
            const localUpdated = local._updatedAt ? new Date(local._updatedAt).getTime() : 0;
            if (cloudUpdated > localUpdated) {
              localStorage.setItem(localKey, JSON.stringify(logData));
              restored++;
            }
          } catch {
            // Keep local on parse error
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
