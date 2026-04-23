import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { logApiUsage, estimateLovableAiCost } from "../_shared/api-usage.ts";
import { checkQuota, incrementQuota, quotaErrorResponse } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_IMAGE_BASE64_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_TEXT_CHARS = 2000;

const RequestSchema = z.object({
  imageBase64: z.string().max(MAX_IMAGE_BASE64_BYTES).optional().nullable(),
  textDescription: z.string().max(MAX_TEXT_CHARS).optional().nullable(),
}).refine(
  (d) => Boolean(d.imageBase64) || Boolean(d.textDescription),
  { message: "Either imageBase64 or textDescription is required." },
);

const SYSTEM_PROMPT = `You are NutriLens AI, an expert nutritionist specializing in Indian food analysis with deep knowledge of IFCT2017 (Indian Food Composition Tables).

Given a photo or description of a meal, perform the following:

1. Identify ALL food items present. For mixed dishes (e.g., biryani, thali, combo plates), list every component separately (rice, chicken, vegetables, raita, papad, chutney, pickle, etc.).
2. For each item, estimate:
   - name (common English or Hindi name, e.g., "Paneer Butter Masala" or "Roti")
   - quantity (numeric, e.g., 2)
   - unit (choose the most natural: g, ml, cup, bowl, piece, slice, katori, glass, plate, tablespoon)
   - estimatedWeightGrams (estimated total weight in grams for the given quantity)
   - confidence (0–100, how certain you are about identification and portion)
   - calories, protein, carbs, fat, fiber (per the estimated portion, using IFCT2017 data where possible)
3. Provide total nutrition for the entire meal.
4. Give a health score (1–10) and a brief actionable suggestion.
5. **Predict the source of this meal** based on visual cues (plate type, background, packaging, presentation style):
   - category: one of "home", "restaurant", "street_food", "packaged", "fast_food", "office", "other"
   - confidence: 0–100 (how certain you are)
   - reason: brief explanation of why you predicted this source
6. **Predict the cooking method** based on visual cues (golden/crispy surface = fried, grill marks = grilled, broth/liquid = boiled, dry roasted = baked, etc.):
   - method: one of "fried", "air_fried", "grilled", "baked", "boiled_steamed", "sauteed", "raw"
   - confidence: 0–100
   - reason: brief explanation

Use these standard Indian portion references for weight estimation:
- 1 roti / chapati = 40g
- 1 paratha (plain) = 80g, stuffed paratha = 100g
- 1 naan = 90g
- 1 puri = 30g
- 1 bowl dal (250ml katori) = 150g
- 1 bowl rice (250ml katori) = 150g
- 1 plate rice (full) = 300g
- 1 cup cooked vegetables / sabzi = 100g
- 1 katori sabzi = 100g
- 1 piece chicken curry (with bone) = 100g
- 1 piece chicken curry (boneless) = 80g
- 1 piece fish curry = 100g
- 1 egg (boiled/fried) = 60g
- 1 idli = 50g
- 1 dosa (plain) = 100g, masala dosa = 150g
- 1 vada = 50g
- 1 samosa = 100g
- 1 pakora/bhajia = 30g
- 1 glass milk (250ml) = 250ml
- 1 cup yogurt/curd = 200g
- 1 cup raita = 150g
- 1 tablespoon ghee = 15g
- 1 tablespoon oil = 15g
- 1 tablespoon chutney = 20g
- 1 papad = 15g
- 1 gulab jamun = 40g
- 1 ladoo = 30g
- 1 piece barfi = 25g
- 1 cup chai with milk = 150ml
- 1 bowl biryani = 250g
- 1 plate poha/upma = 200g

Important rules:
- If multiple rotis/chapatis are visible, count them individually.
- For thali-style meals, list each katori/bowl separately.
- For biryani, estimate rice and protein components separately if visible.
- Round calories to nearest integer, macros to 1 decimal place.
- Be conservative with oil/ghee estimates unless visibly oily.

You MUST return ONLY valid JSON (no markdown, no explanation, no backticks) with this exact structure:
{
  "mealName": "string",
  "confidence": 85,
  "foodItems": [
    {
      "name": "string",
      "quantity": 1,
      "unit": "piece",
      "estimatedWeightGrams": 40,
      "confidence": 90,
      "calories": 106,
      "protein": 3.5,
      "carbs": 18,
      "fat": 1.5,
      "fiber": 4.6
    }
  ],
  "totalNutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0
  },
  "healthScore": 7,
  "suggestions": "Brief actionable tip.",
  "sourcePrediction": {
    "category": "home",
    "confidence": 75,
    "reason": "Home-style plate and setting"
  },
  "cookingMethodPrediction": {
    "method": "fried",
    "confidence": 80,
    "reason": "Golden crispy surface visible"
  }
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Auth + quota check
    const { result: quota, userClient } = await checkQuota(req, "analyze-food");
    if (!quota.ok) return quotaErrorResponse(quota, corsHeaders);

    // 2. Validate input
    let body: unknown;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { imageBase64, textDescription } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          { type: "text", text: "Analyze this meal photo. Identify every food item with accurate portion weight estimation in grams. Use IFCT2017 nutrition data for Indian foods. Also predict the source of this meal (home, restaurant, street food, etc.) based on visual cues." },
        ],
      });
    } else if (textDescription) {
      messages.push({
        role: "user",
        content: `Analyze this meal description and identify all food items with accurate portion weight estimation: "${textDescription.replace(/[`$]/g, "")}". Use IFCT2017 nutrition data for Indian foods. Also predict the likely source (home, restaurant, street food, etc.).`,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Cost telemetry — fire-and-forget
    const totalTokens = data.usage?.total_tokens ?? 0;
    void logApiUsage({
      vendor: "lovable-ai",
      endpoint: "analyze-food",
      units: totalTokens,
      costInr: estimateLovableAiCost("google/gemini-2.5-flash-vision", totalTokens || 1500),
      metadata: { hasImage: !!imageBase64, model: "gemini-2.5-flash" },
    });
    // Quota: only count successful calls so failures don't burn the user's allowance
    if (userClient) void incrementQuota(userClient, "analyze-food");
    
    // Extract JSON from the response (handle potential markdown wrapping)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    let result;
    try {
      result = JSON.parse(jsonStr.trim());
    } catch {
      result = { error: "Failed to parse AI response", raw: content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-food error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
