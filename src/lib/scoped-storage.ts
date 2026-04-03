// ============================================
// NutriLens AI – User-Scoped localStorage
// ============================================
// Prevents data leakage between accounts by prefixing
// localStorage keys with the authenticated user's ID.
//
// Usage:
//   import { scopedGet, scopedSet, scopedRemove, setScopedUserId } from '@/lib/scoped-storage';
//
// Call setScopedUserId(userId) once after login.
// All scoped reads/writes then namespace automatically.

let _currentUserId: string | null = null;

/** Set the current user ID for scoped storage. Call on login. */
export function setScopedUserId(userId: string | null) {
  _currentUserId = userId;
}

/** Get the current scoped user ID */
export function getScopedUserId(): string | null {
  return _currentUserId;
}

function prefixKey(key: string): string {
  if (!_currentUserId) return key; // fallback to global if no user yet
  return `u_${_currentUserId.slice(0, 8)}_${key}`;
}

// ---- Core API ----

export function scopedGet(key: string): string | null {
  return localStorage.getItem(prefixKey(key));
}

export function scopedSet(key: string, value: string): void {
  localStorage.setItem(prefixKey(key), value);
}

export function scopedRemove(key: string): void {
  localStorage.removeItem(prefixKey(key));
}

// ---- JSON helpers ----

export function scopedGetJSON<T = unknown>(key: string, fallback: T): T {
  try {
    const raw = scopedGet(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function scopedSetJSON(key: string, value: unknown): void {
  scopedSet(key, JSON.stringify(value));
}

// ---- Cleanup on logout ----

/** Remove all scoped keys for a specific user ID */
export function clearScopedData(userId: string) {
  const prefix = `u_${userId.slice(0, 8)}_`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  // Also clear legacy un-scoped nutrilens_ keys
  const legacyKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('nutrilens_') && !key.startsWith('nutrilens_splash_shown')) {
      legacyKeys.push(key);
    }
  }
  legacyKeys.forEach(k => localStorage.removeItem(k));
}
