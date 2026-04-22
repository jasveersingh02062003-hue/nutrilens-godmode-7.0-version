// Nightly cron: pause overspent campaigns and flag low-CTR campaigns into
// the feedback queue for admin attention. Triggered via pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary = { paused: 0, low_ctr_alerts: 0, expired: 0 };

  try {
    // 1. Auto-pause overspent
    const { data: overspent } = await supabase
      .from("ad_campaigns")
      .select("id, campaign_name, budget_total, budget_spent, brand_id")
      .eq("status", "active")
      .gt("budget_total", 0);

    const toPause = (overspent ?? []).filter(
      (c: any) => Number(c.budget_spent) >= Number(c.budget_total),
    );
    if (toPause.length > 0) {
      await supabase
        .from("ad_campaigns")
        .update({ status: "paused" })
        .in("id", toPause.map((c: any) => c.id));
      summary.paused = toPause.length;
    }

    // 2. Expire campaigns past end_date
    const today = new Date().toISOString().slice(0, 10);
    const { data: expired } = await supabase
      .from("ad_campaigns")
      .update({ status: "completed" })
      .eq("status", "active")
      .lt("end_date", today)
      .select("id");
    summary.expired = expired?.length ?? 0;

    // 3. Low-CTR alerting (< 0.3% over last 7d, min 500 impressions)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: activeCamps } = await supabase
      .from("ad_campaigns")
      .select("id, campaign_name, brand_id")
      .eq("status", "active");

    for (const camp of activeCamps ?? []) {
      const [{ count: imps }, { count: clks }] = await Promise.all([
        supabase.from("ad_impressions").select("id", { count: "exact", head: true })
          .eq("campaign_id", camp.id).gte("created_at", sevenDaysAgo),
        supabase.from("ad_clicks").select("id", { count: "exact", head: true })
          .eq("campaign_id", camp.id).gte("created_at", sevenDaysAgo),
      ]);
      if ((imps ?? 0) >= 500) {
        const ctr = ((clks ?? 0) / (imps ?? 1)) * 100;
        if (ctr < 0.3) {
          // Find a brand_member to attribute the feedback to (else skip).
          const { data: member } = await supabase
            .from("brand_members")
            .select("user_id")
            .eq("brand_id", camp.brand_id)
            .limit(1)
            .maybeSingle();
          if (member?.user_id) {
            await supabase.from("feedback").insert({
              user_id: member.user_id,
              message: `[AUTO] Low CTR alert: "${camp.campaign_name}" — ${ctr.toFixed(2)}% over 7 days (${imps} imps, ${clks} clicks). Consider refreshing creative.`,
              status: "open",
            });
            summary.low_ctr_alerts++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message, summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
