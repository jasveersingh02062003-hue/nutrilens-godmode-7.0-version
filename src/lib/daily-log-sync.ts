// Cloud sync service for daily logs
import { supabase } from '@/integrations/supabase/client';
import type { DailyLog } from '@/lib/store';

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

      const { error } = await supabase.from('daily_logs' as any).upsert({
        user_id: session.user.id,
        log_date: log.date,
        log_data: log as any,
      }, { onConflict: 'user_id,log_date' } as any);

      if (error) {
        console.error('Daily log sync failed:', error);
      }
    } catch (e) {
      console.error('Daily log sync error:', e);
    }
  }, 1500);
}

/**
 * Restore recent daily logs from the cloud into localStorage.
 * Called once on login to hydrate local state.
 */
export async function restoreLogsFromCloud(days: number = 14): Promise<number> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return 0;

    // Calculate cutoff date
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_logs' as any)
      .select('log_date, log_data')
      .eq('user_id', session.user.id)
      .gte('log_date', cutoffStr)
      .order('log_date', { ascending: false });

    if (error) {
      console.error('Failed to restore logs from cloud:', error);
      return 0;
    }

    if (!data || data.length === 0) return 0;

    let restored = 0;
    for (const row of data as any[]) {
      const logDate = row.log_date as string;
      const logData = row.log_data as any;
      if (logDate && logData) {
        // Only overwrite if local doesn't exist or cloud is newer
        const localKey = LOG_KEY_PREFIX + logDate;
        const localData = localStorage.getItem(localKey);

        if (!localData) {
          // No local data — restore from cloud
          localStorage.setItem(localKey, JSON.stringify(logData));
          restored++;
        }
      }
    }

    return restored;
  } catch (e) {
    console.error('Unexpected error restoring logs:', e);
    return 0;
  }
}
