// ============================================
// Outbox Replay — drains the IndexedDB queue when online
// Triggered on app start, on `online` event, and after each enqueue.
// Uses exponential backoff on failure.
// ============================================

import { getAll, remove, updateAttempt, purgeStale, type OutboxItem } from '@/lib/offline-outbox';
import { performTableUpsert } from '@/lib/cloud-sync';
import { performSync as syncDailyLog } from '@/lib/daily-log-sync';

let isReplaying = false;
let backoffMs = 0;
let backoffTimer: ReturnType<typeof setTimeout> | null = null;

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

async function replayItem(item: OutboxItem): Promise<boolean> {
  try {
    if (item.kind === 'daily_log') {
      await syncDailyLog(item.payload.log);
      return true;
    }
    // weight_log / water_log / supplement_log
    const { table, payload, conflictColumns } = item.payload;
    return await performTableUpsert(table, payload, conflictColumns);
  } catch (e: any) {
    console.error('[outbox-replay] item failed:', item.kind, e?.message);
    return false;
  }
}

export async function replayOutbox(): Promise<void> {
  if (isReplaying || !isOnline()) return;
  isReplaying = true;
  try {
    // Purge stale items before each pass
    await purgeStale();

    const items = await getAll();
    if (items.length === 0) {
      backoffMs = 0;
      return;
    }

    let anyFailed = false;
    for (const item of items) {
      const ok = await replayItem(item);
      if (ok && item.id !== undefined) {
        await remove(item.id);
      } else if (item.id !== undefined) {
        await updateAttempt(item.id, 'replay failed');
        anyFailed = true;
      }
    }

    if (anyFailed) {
      // Exponential backoff: 5s → 10s → 30s → 60s (cap)
      backoffMs = Math.min(backoffMs === 0 ? 5_000 : backoffMs * 2, 60_000);
      if (backoffTimer) clearTimeout(backoffTimer);
      backoffTimer = setTimeout(() => { void replayOutbox(); }, backoffMs);
    } else {
      backoffMs = 0;
    }
  } finally {
    isReplaying = false;
  }
}

let initialized = false;
export function initOutboxReplay(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Replay on reconnect
  window.addEventListener('online', () => { void replayOutbox(); });

  // Initial drain (if anything was left over from last session)
  setTimeout(() => { void replayOutbox(); }, 2_000);
}
