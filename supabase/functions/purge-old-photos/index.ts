// AUTH: PUBLIC cron — daily 03:00 IST. Optional PURGE_PHOTOS_SECRET shared-secret header. Service role.
// Cron-style sweep: delete meal photos older than 90 days from the
// `meal-photos` storage bucket. Triggered via pg_cron (daily 03:00 IST)
// or manually with a shared-secret header.
//
// Why: photos accumulate fast (avg ~80KB per meal × 3 meals/day × users).
// 90-day retention is plenty for the FoodArchive UX while keeping storage cost
// predictable. Users on Premium can upgrade retention later if requested.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

const RETENTION_DAYS = 90;
const BUCKET = "meal-photos";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const cors = buildCorsHeaders(req);

  // Optional shared-secret guard (set PURGE_PHOTOS_SECRET as a Supabase secret;
  // pg_cron must pass it in x-cron-secret header). Allowed without secret in dev.
  const expected = Deno.env.get("PURGE_PHOTOS_SECRET");
  if (expected) {
    const got = req.headers.get("x-cron-secret");
    if (got !== expected) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000);
  const cutoffIso = cutoff.toISOString();

  let scanned = 0;
  let deleted = 0;
  const errors: string[] = [];

  try {
    // Bucket layout: `{userId}/{photoId}.jpg`. Iterate users (folders) at root.
    const { data: userFolders, error: rootErr } = await supabase
      .storage
      .from(BUCKET)
      .list("", { limit: 1000, offset: 0 });

    if (rootErr) throw rootErr;

    for (const folder of userFolders ?? []) {
      // Each entry at root should be a folder (user UUID).
      if (!folder.name) continue;

      let offset = 0;
      const PAGE = 100;

      // Page through this user's photos.
      while (true) {
        const { data: files, error: listErr } = await supabase
          .storage
          .from(BUCKET)
          .list(folder.name, {
            limit: PAGE,
            offset,
            sortBy: { column: "created_at", order: "asc" },
          });

        if (listErr) {
          errors.push(`list ${folder.name}: ${listErr.message}`);
          break;
        }
        if (!files || files.length === 0) break;

        scanned += files.length;

        const stale = files
          .filter((f) => {
            // Storage list returns `created_at` (ISO). Older than cutoff = delete.
            const created = f.created_at ?? f.updated_at;
            return created && created < cutoffIso;
          })
          .map((f) => `${folder.name}/${f.name}`);

        if (stale.length > 0) {
          const { error: delErr } = await supabase.storage
            .from(BUCKET)
            .remove(stale);
          if (delErr) {
            errors.push(`delete ${folder.name}: ${delErr.message}`);
          } else {
            deleted += stale.length;
          }
        }

        if (files.length < PAGE) break;
        offset += PAGE;
      }
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message, scanned, deleted }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      retention_days: RETENTION_DAYS,
      cutoff: cutoffIso,
      scanned,
      deleted,
      errors,
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
