// ============================================
// NutriLens AI – localStorage → Cloud Migration
// One-time migration on login. Idempotent via flag.
// ============================================

import { supabase } from '@/integrations/supabase/client';

const MIGRATED_FLAG = 'nutrilens_cloud_migrated';
const LOG_KEY_PREFIX = 'nutrilens_log_';

/**
 * Migrate all localStorage data to cloud tables.
 * Called once on login. Idempotent — skips if already migrated.
 */
export async function migrateLocalDataToCloud(): Promise<{ migrated: boolean; counts: Record<string, number> }> {
  if (localStorage.getItem(MIGRATED_FLAG)) {
    return { migrated: false, counts: {} };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { migrated: false, counts: {} };

  const userId = session.user.id;
  const counts = { weight: 0, water: 0, supplements: 0 };

  try {
    // Scan all daily log keys
    const logKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOG_KEY_PREFIX)) logKeys.push(key);
    }

    // Batch arrays for upserts
    const weightRows: any[] = [];
    const waterRows: any[] = [];
    const supplementRows: any[] = [];

    for (const key of logKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const log = JSON.parse(raw);
        const logDate = key.replace(LOG_KEY_PREFIX, '');

        // Weight
        if (log.weight != null && log.weight > 0) {
          weightRows.push({
            user_id: userId,
            log_date: logDate,
            weight: log.weight,
            unit: log.weightUnit || 'kg',
          });
        }

        // Water
        if (log.waterCups > 0) {
          waterRows.push({
            user_id: userId,
            log_date: logDate,
            cups: log.waterCups,
          });
        }

        // Supplements
        if (log.supplements?.length > 0) {
          supplementRows.push({
            user_id: userId,
            log_date: logDate,
            supplements: log.supplements,
          });
        }
      } catch {
        // Skip malformed entries
      }
    }

    // Upsert in batches of 100
    if (weightRows.length > 0) {
      for (let i = 0; i < weightRows.length; i += 100) {
        const batch = weightRows.slice(i, i + 100);
        const { error } = await supabase
          .from('weight_logs' as any)
          .upsert(batch, { onConflict: 'user_id,log_date' } as any);
        if (!error) counts.weight += batch.length;
      }
    }

    if (waterRows.length > 0) {
      for (let i = 0; i < waterRows.length; i += 100) {
        const batch = waterRows.slice(i, i + 100);
        const { error } = await supabase
          .from('water_logs' as any)
          .upsert(batch, { onConflict: 'user_id,log_date' } as any);
        if (!error) counts.water += batch.length;
      }
    }

    if (supplementRows.length > 0) {
      for (let i = 0; i < supplementRows.length; i += 100) {
        const batch = supplementRows.slice(i, i + 100);
        const { error } = await supabase
          .from('supplement_logs' as any)
          .upsert(batch, { onConflict: 'user_id,log_date' } as any);
        if (!error) counts.supplements += batch.length;
      }
    }

    // Set flag
    localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
    console.log('[CloudMigration] Complete:', counts);
    return { migrated: true, counts };
  } catch (e) {
    console.error('[CloudMigration] Error:', e);
    return { migrated: false, counts };
  }
}
