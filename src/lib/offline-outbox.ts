// ============================================
// Offline Outbox — IndexedDB queue for cloud writes
// Queues writes when offline; replays when back online.
// Items older than 7 days are auto-purged with a user warning.
// ============================================

import { openDB, type IDBPDatabase } from 'idb';

export type OutboxKind = 'daily_log' | 'weight_log' | 'water_log' | 'supplement_log';

export interface OutboxItem {
  id?: number;
  kind: OutboxKind;
  payload: any;            // raw payload (e.g. { log_date, log, ... })
  conflictKey: string;     // dedupe key (e.g. "daily_log:2026-04-24")
  createdAt: number;       // ms epoch
  attempts: number;
  lastError?: string;
}

const DB_NAME = 'nutrilens-outbox';
const STORE = 'queue';
const DB_VERSION = 1;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PURGE_FLAG_KEY = 'nutrilens_outbox_purged_warning';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('conflictKey', 'conflictKey', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

/** Add or replace (by conflictKey) an item in the outbox. */
export async function enqueue(item: Omit<OutboxItem, 'id' | 'createdAt' | 'attempts'>): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE, 'readwrite');
    const idx = tx.store.index('conflictKey');
    // Remove any existing entry with the same conflictKey (replace-on-write)
    let cursor = await idx.openCursor(IDBKeyRange.only(item.conflictKey));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.store.add({
      ...item,
      createdAt: Date.now(),
      attempts: 0,
    } as OutboxItem);
    await tx.done;
    notifyChange();
  } catch (e) {
    console.error('[outbox] enqueue failed:', e);
  }
}

/** Get all pending items, oldest first. */
export async function getAll(): Promise<OutboxItem[]> {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex(STORE, 'createdAt');
    return all as OutboxItem[];
  } catch (e) {
    console.error('[outbox] getAll failed:', e);
    return [];
  }
}

/** Count of pending items. */
export async function count(): Promise<number> {
  try {
    const db = await getDB();
    return await db.count(STORE);
  } catch {
    return 0;
  }
}

export async function remove(id: number): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE, id);
    notifyChange();
  } catch (e) {
    console.error('[outbox] remove failed:', e);
  }
}

export async function updateAttempt(id: number, error?: string): Promise<void> {
  try {
    const db = await getDB();
    const item = (await db.get(STORE, id)) as OutboxItem | undefined;
    if (!item) return;
    item.attempts = (item.attempts ?? 0) + 1;
    item.lastError = error;
    await db.put(STORE, item);
  } catch (e) {
    console.error('[outbox] updateAttempt failed:', e);
  }
}

/**
 * Purge items older than 7 days. Returns the number purged.
 * Sets a localStorage flag so the UI can warn the user once.
 */
export async function purgeStale(): Promise<number> {
  try {
    const db = await getDB();
    const cutoff = Date.now() - MAX_AGE_MS;
    const tx = db.transaction(STORE, 'readwrite');
    const idx = tx.store.index('createdAt');
    let cursor = await idx.openCursor(IDBKeyRange.upperBound(cutoff));
    let purged = 0;
    while (cursor) {
      await cursor.delete();
      purged++;
      cursor = await cursor.continue();
    }
    await tx.done;
    if (purged > 0) {
      try { localStorage.setItem(PURGE_FLAG_KEY, String(Date.now())); } catch {}
      notifyChange();
    }
    return purged;
  } catch (e) {
    console.error('[outbox] purgeStale failed:', e);
    return 0;
  }
}

/** Returns timestamp of last purge warning, if any (and clears it on read). */
export function consumePurgeWarning(): number | null {
  try {
    const v = localStorage.getItem(PURGE_FLAG_KEY);
    if (!v) return null;
    localStorage.removeItem(PURGE_FLAG_KEY);
    return Number(v) || null;
  } catch {
    return null;
  }
}

// ---- Change notifier (for the badge) ----
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyChange() {
  listeners.forEach(l => { try { l(); } catch {} });
}
