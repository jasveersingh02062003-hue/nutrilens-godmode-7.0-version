// Lightweight liveness + DB readiness probe for UptimeRobot / external monitors.
// Returns 200 with JSON when the database round-trips successfully, 503 otherwise.
// Public (verify_jwt = false by default for Lovable-managed fns).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";


Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req);
  if (pre) return pre;

  const start = Date.now();
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    return new Response(
      JSON.stringify({ status: "error", reason: "missing_env" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    // Cheapest possible round-trip: count(*) head request on a tiny table.
    const { error } = await supabase
      .from("ad_placements")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        status: "ok",
        db: "ok",
        latency_ms: Date.now() - start,
        ts: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    // Log full error server-side, return generic message to caller to avoid
    // leaking schema/version details to public probes.
    console.error("[healthz] db check failed:", e instanceof Error ? e.message : String(e));
    return new Response(
      JSON.stringify({
        status: "error",
        db: "down",
        latency_ms: Date.now() - start,
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
