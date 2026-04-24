// Cron-style sweep: expire subscriptions whose period has ended.
// Flips status to 'expired' and plan to 'free' for any active/trialing row
// where current_period_end < now() AND cancel_at_period_end = true,
// OR trial ended (status='trialing' AND trial_end < now()).
// Schedule via pg_cron later; for now invoke manually or via UptimeRobot.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";


Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req);
  if (pre) return pre;

  // Simple shared-secret guard (set EXPIRE_SUBSCRIPTIONS_SECRET as a secret;
  // caller must pass it in x-cron-secret header). If the secret isn't set,
  // we still allow the call (dev convenience) but log a warning.
  const expected = Deno.env.get("EXPIRE_SUBSCRIPTIONS_SECRET");
  if (expected) {
    const got = req.headers.get("x-cron-secret");
    if (got !== expected) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const nowIso = new Date().toISOString();

  // 1) Cancelled-at-period-end subs whose period has now ended
  const { data: expiredSubs, error: e1 } = await admin
    .from("subscriptions")
    .update({
      status: "expired",
      plan: "free",
      cancel_at_period_end: false,
    })
    .in("status", ["active", "trialing"])
    .lt("current_period_end", nowIso)
    .eq("cancel_at_period_end", true)
    .select("id, user_id");

  if (e1) {
    return new Response(JSON.stringify({ error: "expire_failed", message: e1.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2) Trials whose trial_end has passed (regardless of cancel flag)
  const { data: expiredTrials, error: e2 } = await admin
    .from("subscriptions")
    .update({
      status: "expired",
      plan: "free",
    })
    .eq("status", "trialing")
    .lt("trial_end", nowIso)
    .select("id, user_id");

  if (e2) {
    return new Response(JSON.stringify({ error: "trial_expire_failed", message: e2.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Audit
  const events = [
    ...(expiredSubs ?? []).map((s) => ({
      user_id: s.user_id,
      subscription_id: s.id,
      event_type: "expired",
      provider: "mock",
      raw_payload: { reason: "period_ended" },
    })),
    ...(expiredTrials ?? []).map((s) => ({
      user_id: s.user_id,
      subscription_id: s.id,
      event_type: "trial_ended",
      provider: "mock",
      raw_payload: { reason: "trial_period_ended" },
    })),
  ];
  if (events.length > 0) {
    await admin.from("payment_events").insert(events);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      expired_subscriptions: expiredSubs?.length ?? 0,
      expired_trials: expiredTrials?.length ?? 0,
      ts: nowIso,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
