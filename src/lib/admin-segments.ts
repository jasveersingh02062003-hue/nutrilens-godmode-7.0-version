// Local-only segment store. Lets admins save filter combos as named segments
// without needing a backend table for v1. Stored in localStorage under a key
// the admin owns. Future: move to a `user_segments` table.

export interface SavedSegment {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  created_at: string;
  count_at_save: number;
}

const KEY = 'nutrilens.admin.segments.v1';

export function listSegments(): SavedSegment[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedSegment[]) : [];
  } catch {
    return [];
  }
}

export function saveSegment(seg: Omit<SavedSegment, 'id' | 'created_at'>): SavedSegment {
  const next: SavedSegment = {
    ...seg,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  const all = listSegments();
  all.unshift(next);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
  return next;
}

export function deleteSegment(id: string): void {
  const all = listSegments().filter(s => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}
