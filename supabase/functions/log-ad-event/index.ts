import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";


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

const BodySchema = z.object({
  event_type: z.enum(["impression", "click", "conversion"]),
  campaign_id: z.string().uuid(),
  creative_id: z.string().uuid().optional(),
  placement_slot: z.string().max(64).optional(),
  product_id: z.string().max(128).optional(),
  conversion_type: z.string().max(64).optional(),
});

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // SECURITY: Derive user_id from verified JWT — never trust request body.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user_id = claimsData.claims.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event_type, campaign_id, creative_id, placement_slot, product_id, conversion_type } = parsed.data;

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

      if (campaign.pricing_model === "cpm" && campaign.cpm_rate && campaign.cpm_rate > 0) {
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
      if (!isSuspicious && campaign.pricing_model === "cpc" && campaign.cpc_rate && campaign.cpc_rate > 0) {
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
