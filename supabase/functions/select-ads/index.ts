// Server-side ad selection. Replaces client-side eligibility logic so
// budget/diet/category filtering and the impression log can't be bypassed
// by a tampered client. Returns at most one creative per call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";


interface Body {
  placement_slot: string;
  user_id: string;
  category?: string;
  diet?: "veg" | "nonveg" | "all";
  city?: string;
  log_impression?: boolean;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as Body;
    if (!body.placement_slot || !body.user_id) {
      return new Response(JSON.stringify({ error: "placement_slot and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Pull eligible campaigns + their first active creative + brand name + targeting
    const { data: campaigns, error } = await supabase
      .from("ad_campaigns")
      .select(
        `id, campaign_name, placement_slot, budget_total, budget_spent,
         pes_score, target_diet, target_categories, status,
         brand_accounts!inner(id, brand_name, status),
         ad_creatives!inner(id, image_url, headline, subtitle, cta_text, cta_url, format, is_active),
         ad_targeting(cities, meal_context, max_user_budget, min_protein_gap)`,
      )
      .eq("status", "active")
      .eq("placement_slot", body.placement_slot)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("pes_score", { ascending: false })
      .limit(20);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-pause overspent campaigns atomically (Phase 9)
    const overspent = (campaigns ?? []).filter(
      (c: any) => Number(c.budget_total) > 0 && Number(c.budget_spent) >= Number(c.budget_total),
    );
    if (overspent.length > 0) {
      await supabase
        .from("ad_campaigns")
        .update({ status: "paused" })
        .in("id", overspent.map((c: any) => c.id));
    }

    const eligible = (campaigns ?? []).filter((c: any) => {
      const brand = Array.isArray(c.brand_accounts) ? c.brand_accounts[0] : c.brand_accounts;
      if (!brand || brand.status !== "active") return false;
      if (Number(c.budget_total) > 0 && Number(c.budget_spent) >= Number(c.budget_total)) return false;
      if (body.diet && c.target_diet !== "all" && c.target_diet !== body.diet) return false;
      if (body.category && c.target_categories?.length && !c.target_categories.includes(body.category)) return false;
      const targeting = Array.isArray(c.ad_targeting) ? c.ad_targeting[0] : c.ad_targeting;
      if (body.city && targeting?.cities?.length && !targeting.cities.includes(body.city)) return false;
      const creatives = Array.isArray(c.ad_creatives) ? c.ad_creatives : [c.ad_creatives];
      return creatives.some((cr: any) => cr?.is_active);
    });

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ ad: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Weighted pick by pes_score
    const weights = eligible.map((c: any) => Math.max(1, Number(c.pes_score) || 1));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let pick = eligible[0] as any;
    for (let i = 0; i < eligible.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pick = eligible[i];
        break;
      }
    }

    const brand = Array.isArray(pick.brand_accounts) ? pick.brand_accounts[0] : pick.brand_accounts;
    const creatives = Array.isArray(pick.ad_creatives) ? pick.ad_creatives : [pick.ad_creatives];
    const creative = creatives.find((c: any) => c?.is_active) ?? creatives[0];

    const ad = {
      campaignId: pick.id,
      creativeId: creative.id,
      brandName: brand?.brand_name ?? "Sponsored",
      headline: creative.headline,
      subtitle: creative.subtitle,
      imageUrl: creative.image_url,
      ctaText: creative.cta_text || "Learn More",
      ctaUrl: creative.cta_url,
      pesScore: pick.pes_score,
      format: creative.format,
      placementSlot: pick.placement_slot,
      targetDiet: pick.target_diet,
      targetCategories: pick.target_categories ?? [],
    };

    // Optionally log impression atomically (5-min dedupe per user/campaign)
    if (body.log_impression) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("ad_impressions")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", ad.campaignId)
        .eq("user_id", body.user_id)
        .gte("created_at", fiveMinAgo);

      if (!count) {
        await supabase.from("ad_impressions").insert({
          campaign_id: ad.campaignId,
          creative_id: ad.creativeId,
          placement_slot: ad.placementSlot,
          user_id: body.user_id,
        });
        if (pick.pricing_model === "cpm" && Number(pick.cpm_rate) > 0) {
          await supabase
            .from("ad_campaigns")
            .update({ budget_spent: Number(pick.budget_spent) + Number(pick.cpm_rate) / 1000 })
            .eq("id", ad.campaignId);
        }
      }
    }

    return new Response(JSON.stringify({ ad }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
