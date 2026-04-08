import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Validate required fields
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

    // Verify campaign is active
    const { data: campaign, error: campError } = await supabase
      .from("ad_campaigns")
      .select("id, status, budget_total, budget_spent, pricing_model, cpc_rate, cpm_rate")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign || campaign.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Campaign not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Budget check
    if (campaign.budget_total > 0 && campaign.budget_spent >= campaign.budget_total) {
      return new Response(
        JSON.stringify({ error: "Campaign budget exhausted" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          JSON.stringify({ ok: true, deduplicated: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log impression
      await supabase.from("ad_impressions").insert({
        campaign_id,
        creative_id: creative_id || campaign_id, // fallback
        placement_slot: placement_slot || "unknown",
        user_id,
      });

      // Deduct budget for CPM model (per impression, charge rate/1000)
      if (campaign.pricing_model === "cpm" && campaign.cpm_rate > 0) {
        const cost = campaign.cpm_rate / 1000;
        await supabase
          .from("ad_campaigns")
          .update({ budget_spent: campaign.budget_spent + cost })
          .eq("id", campaign_id);
      }
    }

    if (event_type === "click") {
      // Log click
      await supabase.from("ad_clicks").insert({
        campaign_id,
        user_id,
      });

      // Deduct budget for CPC model
      if (campaign.pricing_model === "cpc" && campaign.cpc_rate > 0) {
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
      JSON.stringify({ ok: true, event_type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
