import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory dedupe (per-instance) — DB check is the strict guard
const recentEvents = new Map<string, number>();
const DEDUPE_WINDOW_MS = 30_000;

function recentKey(userId: string, campaignId: string, eventType: string) {
  return `${userId}:${campaignId}:${eventType}`;
}

function pruneRecent() {
  const cutoff = Date.now() - DEDUPE_WINDOW_MS;
  for (const [k, t] of recentEvents) {
    if (t < cutoff) recentEvents.delete(k);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { event_type, campaign_id, creative_id, placement_slot, user_id, product_id, conversion_type } = body;

    if (!event_type || !campaign_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event_type, campaign_id, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["impression", "click", "conversion"].includes(event_type)) {
      return new Response(
        JSON.stringify({ error: "event_type must be 'impression', 'click', or 'conversion'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ----- FRAUD GUARDS -----
    pruneRecent();
    const memKey = recentKey(user_id, campaign_id, event_type);
    const lastSeen = recentEvents.get(memKey);
    if (lastSeen && Date.now() - lastSeen < DEDUPE_WINDOW_MS) {
      return new Response(
        JSON.stringify({ ok: true, deduplicated: true, reason: "memory_dedupe" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    recentEvents.set(memKey, Date.now());

    // Verify campaign + load fraud config
    const { data: campaign, error: campError } = await supabase
      .from("ad_campaigns")
      .select("id, status, budget_total, budget_spent, pricing_model, cpc_rate, cpm_rate, daily_click_cap")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign || campaign.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Campaign not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.budget_total > 0 && campaign.budget_spent >= campaign.budget_total) {
      return new Response(
        JSON.stringify({ error: "Campaign budget exhausted" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let isSuspicious = false;
    let suspiciousReason: string | null = null;

    if (event_type === "impression") {
      // Rate limit: max 1 impression per user per campaign per 5 minutes
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("ad_impressions")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("user_id", user_id)
        .gte("created_at", fiveMinAgo);

      if (count && count > 0) {
        return new Response(
          JSON.stringify({ ok: true, deduplicated: true, reason: "db_dedupe" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("ad_impressions").insert({
        campaign_id,
        creative_id: creative_id || campaign_id,
        placement_slot: placement_slot || "unknown",
        user_id,
        is_suspicious: false,
      });

      if (campaign.pricing_model === "cpm" && campaign.cpm_rate > 0) {
        const cost = campaign.cpm_rate / 1000;
        await supabase
          .from("ad_campaigns")
          .update({ budget_spent: campaign.budget_spent + cost })
          .eq("id", campaign_id);
      }
    }

    if (event_type === "click") {
      const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      // Click-bomb: > 5 clicks/min per user across all ads
      const { count: clicksLastMin } = await supabase
        .from("ad_clicks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .gte("created_at", oneMinAgo);

      if ((clicksLastMin ?? 0) >= 5) {
        isSuspicious = true;
        suspiciousReason = "rate_limit_per_minute";
      }

      // Daily cap per user per campaign
      const dailyCap = campaign.daily_click_cap ?? 10;
      const { count: clicksTodayThisCampaign } = await supabase
        .from("ad_clicks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("campaign_id", campaign_id)
        .gte("created_at", startOfDay.toISOString());

      if ((clicksTodayThisCampaign ?? 0) >= dailyCap) {
        isSuspicious = true;
        suspiciousReason = suspiciousReason ?? "daily_cap_per_campaign";
      }

      await supabase.from("ad_clicks").insert({
        campaign_id,
        user_id,
        is_suspicious: isSuspicious,
      });

      // Only deduct budget for legitimate clicks
      if (!isSuspicious && campaign.pricing_model === "cpc" && campaign.cpc_rate > 0) {
        await supabase
          .from("ad_campaigns")
          .update({ budget_spent: campaign.budget_spent + campaign.cpc_rate })
          .eq("id", campaign_id);
      }
    }

    if (event_type === "conversion") {
      await supabase.from("ad_conversions").insert({
        campaign_id,
        user_id,
        conversion_type: conversion_type || "add_to_plan",
        product_id: product_id || null,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        event_type,
        suspicious: isSuspicious,
        reason: suspiciousReason,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
