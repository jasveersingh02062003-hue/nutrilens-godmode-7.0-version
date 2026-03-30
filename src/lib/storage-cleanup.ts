// ============================================
// NutriLens AI – localStorage Cleanup Service
// Prevents quota overflow by pruning old keys.
// ============================================

import { toLocalDateKey } from './store';

// Keys that are safe to delete after their retention period
const SHORT_RETENTION_PREFIXES = [
  'nutrilens_redistributed_',
  'nutrilens_exercise_adj_',
  'nutrilens_smart_adj_log_',
  'nutrilens_recovery_dismissed_',
  'nutrilens_summary_shown_',
  'nutrilens_exercise_carry_',
  'nutrilens_recovery_snack_',
  'nutrilens_adjustments_',
  'nutrilens_skipped_',
  'calorie_toast_',
  'nutrilens_fresh_start_',
  'nutrilens_overeat_carry',
];

const LOG_PREFIX = 'nutrilens_log_';

// Retention periods in days
const SHORT_RETENTION_DAYS = 90;
const LOG_RETENTION_DAYS = 365;

/** Extract YYYY-MM-DD date from a key if it ends with one */
function extractDateFromKey(key: string): string | null {
  const match = key.match(/(\d{4}-\d{2}-\d{2})(_details)?$/);
  return match ? match[1] : null;
}

/** Get localStorage usage in bytes (approximate) */
export function getLocalStorageUsageBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += key.length + (localStorage.getItem(key)?.length || 0);
    }
  }
  return total * 2; // UTF-16 = 2 bytes per char
}

/** Get localStorage usage in MB */
export function getLocalStorageUsageMB(): number {
  return getLocalStorageUsageBytes() / (1024 * 1024);
}

/** Run cleanup of old localStorage keys */
export function runStorageCleanup(): { deletedKeys: number; freedBytes: number } {
  const now = new Date();
  let deletedKeys = 0;
  let freedBytes = 0;

  const shortCutoff = new Date(now);
  shortCutoff.setDate(shortCutoff.getDate() - SHORT_RETENTION_DAYS);
  const shortCutoffStr = toLocalDateKey(shortCutoff);

  const logCutoff = new Date(now);
  logCutoff.setDate(logCutoff.getDate() - LOG_RETENTION_DAYS);
  const logCutoffStr = toLocalDateKey(logCutoff);

  const keysToDelete: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Check short-retention prefixes
    for (const prefix of SHORT_RETENTION_PREFIXES) {
      if (key.startsWith(prefix)) {
        const date = extractDateFromKey(key);
        if (date && date < shortCutoffStr) {
          keysToDelete.push(key);
        }
        break;
      }
    }

    // Check daily log keys (longer retention)
    if (key.startsWith(LOG_PREFIX)) {
      const date = extractDateFromKey(key);
      if (date && date < logCutoffStr) {
        keysToDelete.push(key);
      }
    }
  }

  for (const key of keysToDelete) {
    const val = localStorage.getItem(key);
    freedBytes += ((key.length + (val?.length || 0)) * 2);
    localStorage.removeItem(key);
    deletedKeys++;
  }

  return { deletedKeys, freedBytes };
}

/** Check if storage is near capacity and warn */
export function checkStorageHealth(): { healthy: boolean; usageMB: number; warning?: string } {
  const usageMB = getLocalStorageUsageMB();
  if (usageMB > 4) {
    return { healthy: false, usageMB, warning: `Storage usage high (${usageMB.toFixed(1)}MB/5MB). Old data cleaned automatically.` };
  }
  if (usageMB > 3) {
    return { healthy: true, usageMB, warning: `Storage at ${usageMB.toFixed(1)}MB. Approaching limit.` };
  }
  return { healthy: true, usageMB };
}

/** Run cleanup on app launch — safe to call multiple times */
export function initStorageCleanup(): void {
  const lastCleanup = localStorage.getItem('nutrilens_last_cleanup');
  const today = toLocalDateKey();
  
  // Only run once per day
  if (lastCleanup === today) return;
  
  const result = runStorageCleanup();
  localStorage.setItem('nutrilens_last_cleanup', today);
  
  if (result.deletedKeys > 0) {
    console.log(`[StorageCleanup] Removed ${result.deletedKeys} old keys, freed ~${(result.freedBytes / 1024).toFixed(1)}KB`);
  }

  // If still high after cleanup, do aggressive pruning
  const health = checkStorageHealth();
  if (!health.healthy) {
    // Reduce short retention to 30 days
    const aggressiveCutoff = new Date();
    aggressiveCutoff.setDate(aggressiveCutoff.getDate() - 30);
    const cutoffStr = toLocalDateKey(aggressiveCutoff);

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      for (const prefix of SHORT_RETENTION_PREFIXES) {
        if (key.startsWith(prefix)) {
          const date = extractDateFromKey(key);
          if (date && date < cutoffStr) {
            localStorage.removeItem(key);
          }
          break;
        }
      }
    }
  }
}
