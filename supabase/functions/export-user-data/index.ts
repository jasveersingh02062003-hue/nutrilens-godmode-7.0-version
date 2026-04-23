// DPDP-compliant data export — user can download all their data as JSON.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth client to validate caller
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for unfiltered reads (we filter by user_id below)
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userId = user.id;

    // Per-user rate limit: max 3 exports/hour (DPDP allows access; this prevents abuse)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentExports } = await svc
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", userId)
      .eq("action", "data_export")
      .gte("created_at", oneHourAgo);

    if ((recentExports ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many export requests. Please try again in an hour." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } }
      );
    }

    const tables = [
      { name: "profiles", filter: "id" },
      { name: "daily_logs", filter: "user_id" },
      { name: "weight_logs", filter: "user_id" },
      { name: "water_logs", filter: "user_id" },
      { name: "supplement_logs", filter: "user_id" },
      { name: "consent_records", filter: "user_id" },
      { name: "ad_impressions", filter: "user_id" },
      { name: "ad_clicks", filter: "user_id" },
      { name: "ad_conversions", filter: "user_id" },
      { name: "event_plans", filter: "user_id" },
      { name: "user_achievements", filter: "user_id" },
      { name: "monika_conversations", filter: "user_id" },
      { name: "feedback", filter: "user_id" },
      { name: "price_alerts", filter: "user_id" },
      { name: "price_reports", filter: "user_id" },
    ];

    const exportPayload: Record<string, unknown> = {
      _manifest: {
        user_id: userId,
        email: user.email,
        exported_at: new Date().toISOString(),
        format: "json",
        tables: tables.map((t) => t.name),
        notice: "Per India DPDP Act 2023, this export contains all personal data we hold about you.",
      },
    };

    for (const t of tables) {
      const { data, error } = await svc
        .from(t.name)
        .select("*")
        .eq(t.filter, userId)
        .limit(10_000);
      exportPayload[t.name] = error ? { error: error.message } : (data ?? []);
    }

    // Audit log
    await svc.from("audit_logs").insert({
      actor_id: userId,
      target_user_id: userId,
      action: "data_export",
      target_table: "multiple",
      metadata: { tables: tables.map((t) => t.name) },
    });

    const filename = `nutrilens-data-export-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
