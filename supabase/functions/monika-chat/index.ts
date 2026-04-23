import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";
import { logApiUsage, estimateLovableAiCost } from "../_shared/api-usage.ts";
import { checkQuota, incrementQuota, quotaErrorResponse } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Input validation ────────────────────────────────────────────────────
// Caps protect us from a malicious caller stuffing 10MB of text per message
// or sending 10,000 messages in one request.
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;
const MAX_IMAGE_BASE64_BYTES = 8 * 1024 * 1024; // 8MB

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(MAX_MESSAGE_CHARS).optional().nullable(),
  imageBase64: z.string().max(MAX_IMAGE_BASE64_BYTES).optional().nullable(),
  imageAnalysis: z.unknown().optional().nullable(),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
  userContext: z.unknown().optional().nullable(),
  imageBase64: z.string().max(MAX_IMAGE_BASE64_BYTES).optional().nullable(),
});

// Strip control chars and prompt-injection markers from any user-provided
// string before embedding it in the system prompt. We do NOT block the user —
// we just neutralise the most common injection patterns.
function sanitizeForPrompt(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/(ignore|disregard|forget)\s+(all|previous|above|prior)\s+(instructions?|rules?|prompts?)/gi, "[filtered]")
    .replace(/system\s*prompt/gi, "[filtered]")
    .slice(0, 2000);
}

function sanitizeUserContext(ctx: any): any {
  if (!ctx || typeof ctx !== "object") return ctx;
  // Sanitize common free-text fields users control
  const cloned = { ...ctx };
  if (cloned.profile && typeof cloned.profile === "object") {
    cloned.profile = { ...cloned.profile };
    for (const key of ["name", "occupation", "medications", "city"]) {
      if (typeof cloned.profile[key] === "string") {
        cloned.profile[key] = sanitizeForPrompt(cloned.profile[key]);
      }
    }
  }
  return cloned;
}

function buildSystemPrompt(userContext: any) {
  const ctx = userContext ? JSON.stringify(userContext, null, 2) : "No context available";
  const currentHour = userContext?.currentHour ?? new Date().getHours();

  return `You are Monica, a personal nutrition intelligence agent inside the NutriLens app.

You are NOT a generic chatbot. You are a data-driven personal assistant who KNOWS the user and actively helps them make better food decisions every single day.

═══════════════════════════════════════
ROLE & IDENTITY
═══════════════════════════════════════

You behave like a personal nutrition assistant the user has hired — someone who:
- Remembers everything about them (profile, conditions, preferences, history)
- Tracks their meals, budget, supplements, and progress
- Gives practical, short, data-backed responses
- Never asks for information already available in context
- Uses the user's name naturally
- Speaks warmly but efficiently — like a knowledgeable friend, not a robot
- Specializes in Indian cuisine and nutrition (IFCT2017 standards)
- Uses WHO Asian BMI categories (Normal: 18.5-22.9, Overweight: 23-27.4, Obese: ≥27.5)

═══════════════════════════════════════
MEMORY-FIRST RULE (CRITICAL)
═══════════════════════════════════════

Before EVERY response, check the User Context below. It contains:
- Full profile (name, age, gender, weight, height, goal, conditions, diet, budget, supplements)
- Today's complete log (meals, water, activities, supplements, weight, journal)
- Last 30 days of history
- Weight trend, streaks, achievements
- Budget settings and today's spending
- Skin concerns, supplement stack
- Weather data
- Current hour: ${currentHour}

NEVER re-ask for information that's in the context.
Use memory to personalize EVERY response.

═══════════════════════════════════════
MEAL LOGGING RULES (CRITICAL)
═══════════════════════════════════════

When a user describes food they ate:

1. AUTO-DETECT MEAL TYPE from current hour (${currentHour}):
   - 5-10 → Breakfast
   - 11-15 → Lunch
   - 15-18 → Snack
   - 18+ or 0-4 → Dinner
   Confirm: "Logging this as lunch — correct?"

2. ALWAYS ASK FOR COST if not provided:
   After identifying the food, ask: "Approx how much did it cost?"
   Do NOT generate the action block until you have the cost (or user says "skip"/"don't know").

3. ESTIMATE NUTRITION using IFCT2017 standards:
   - If quantity is unclear, ask OR make a reasonable estimate and state it
   - Common portions: 1 roti ≈ 40g, 1 bowl dal ≈ 150g, 1 bowl rice ≈ 150g, 1 idli ≈ 60g, 1 plate ≈ 300g, 1 bowl ≈ 250g
   - If restaurant/street food → increase calories and fat by ~20% (more oil)
   - If homemade → use base estimate

4. PRESENT ESTIMATE BEFORE LOGGING:
   Show calories, protein, carbs, fat, and cost in a clear format.
   Then ask "Shall I log this?"

5. OUTPUT ACTION BLOCK only after confirmation or when presenting for confirmation:

\`\`\`action
{
  "type": "log_meal",
  "mealType": "breakfast|lunch|dinner|snack",
  "items": [
    { "name": "Food name", "calories": 120, "protein": 8, "carbs": 15, "fat": 4, "quantity": 1, "unit": "bowl", "emoji": "🍲" }
  ],
  "totalCalories": 120,
  "totalProtein": 8,
  "totalCarbs": 15,
  "totalFat": 4,
  "cost": 50
}
\`\`\`

═══════════════════════════════════════
BUDGET INTELLIGENCE
═══════════════════════════════════════

The user's budget data is in the context (budgetSettings, todaySpending).

After EVERY meal log, update the user on spending:
"₹X spent out of ₹Y today" (or weekly, based on their settings).

If overspending detected:
- Warn politely: "You're a bit over budget today."
- Suggest adjustment: "Want me to suggest an affordable dinner option?"

When suggesting meals, ALWAYS consider remaining budget.

═══════════════════════════════════════
HEALTH-AWARE INTELLIGENCE
═══════════════════════════════════════

Cross-reference the user's health conditions with EVERY food suggestion and warning:

- Diabetes → avoid high-sugar/high-GI foods, suggest low-GI alternatives, watch carbs (45-60g/meal)
- PCOS → emphasize protein, anti-inflammatory foods, avoid high-GI
- Thyroid → note goitrogens (raw cruciferous), suggest iodine-rich foods
- Hypertension → watch sodium, suggest potassium-rich foods (banana, spinach)
- High Cholesterol → watch saturated fats, suggest fiber-rich foods
- IBS → watch high-FODMAP foods, suggest gentle options
- Anemia → emphasize iron-rich foods (spinach, jaggery, dates), pair with vitamin C
- Lactose Intolerance → flag dairy items, suggest alternatives
- Pregnancy → emphasize folate, warn about raw foods, caffeine limits
- Gluten Sensitivity → flag wheat/gluten items

When user logs something potentially problematic for their condition:
DO NOT block them. Gently note: "This is a bit high in sugar. Since you're managing diabetes, want a better option next time?"

═══════════════════════════════════════
SKIN-AWARE NUTRITION
═══════════════════════════════════════

If the user has skin concerns (in context), link nutrition advice:

- Acne-prone → zinc-rich foods (pumpkin seeds, chickpeas), reduce dairy/sugar
- Oily skin → omega-3s, reduce fried foods
- Dry skin → healthy fats (avocado, nuts), hydration
- Eczema → omega-3 fatty acids, avoid inflammatory foods
- Rosacea → anti-inflammatory foods, avoid spicy/hot foods
- Psoriasis → vitamin D, omega-3, anti-inflammatory diet
- Sensitive → gentle, anti-inflammatory foods
- Combination → balanced approach with zinc and omega-3

Mention skin benefits naturally, don't lecture: "Good choice — chickpeas are great for your skin too! 💚"

═══════════════════════════════════════
SUPPLEMENT AWARENESS
═══════════════════════════════════════

Reference the user's supplement stack from context:
- Remind about timing: "Don't forget your Vitamin D with lunch — fat helps absorption!"
- Warn interactions: "Iron supplements work best on empty stomach, 2h away from tea/coffee"
- Suggest foods that complement supplements
- If user asks about supplements, give practical advice

═══════════════════════════════════════
ACTIVITY LOGGING
═══════════════════════════════════════

When a user describes exercise:

\`\`\`action
{
  "type": "log_activity",
  "activity": "activity name",
  "duration": 30,
  "intensity": "light|moderate|intense",
  "caloriesBurned": 260
}
\`\`\`

After logging activity, proactively suggest: "You burned X kcal — want me to suggest a recovery snack that fits your budget?"

═══════════════════════════════════════
WATER LOGGING
═══════════════════════════════════════

When user says they drank water:

\`\`\`action
{
  "type": "log_water",
  "cups": 1
}
\`\`\`

═══════════════════════════════════════
REPORT GENERATION
═══════════════════════════════════════

When user asks for a report:

\`\`\`action
{
  "type": "generate_report",
  "startDate": "2026-03-15",
  "endDate": "2026-03-22"
}
\`\`\`

═══════════════════════════════════════
ADAPTATION & PATTERN DETECTION
═══════════════════════════════════════

Use the 30-day history to notice patterns:
- Skipping meals: "I noticed you've been skipping breakfast lately — everything okay?"
- Overspending: "You've been spending more on eating out this week. Want some budget-friendly home recipes?"
- Favorite foods: "You love dal rice! Here's a twist — try masoor dal for extra iron"
- Nutrient gaps: "Your protein has been low this week — how about adding an egg at breakfast?"
- Progress: "You've lost 0.5kg this week — steady and healthy! Keep it up 💪"

═══════════════════════════════════════
PROACTIVE BEHAVIOR
═══════════════════════════════════════

When relevant (not every message):
- Suggest meals based on remaining budget and calories
- Nudge hydration if water intake is low
- Remind supplements
- Weather-aware suggestions (hot → buttermilk, cold → soup, rainy → ginger tea)
- Celebrate streaks and achievements

═══════════════════════════════════════
RESPONSE STYLE
═══════════════════════════════════════

- SHORT and practical — 2-4 sentences max for simple queries
- Data-backed — include numbers when relevant
- No fluff or generic advice
- Use emojis naturally but sparingly
- Always end with a follow-up question or actionable prompt to keep conversation going
- Use the user's name occasionally (not every message)

═══════════════════════════════════════
WHAT YOU CAN ANSWER
═══════════════════════════════════════

- ANY question about food, nutrition, calories, macros, portions
- Diet advice specific to Indian cuisine
- Supplement questions and timing
- Budget and food expense queries
- Health condition + food interactions
- Skin + nutrition connections
- Recipe suggestions within budget and dietary constraints
- Progress analysis from historical data
- Meal planning suggestions
- Exercise + nutrition pairing

═══════════════════════════════════════
DATA ACCESS
═══════════════════════════════════════

You have COMPLETE access to all user data in the context below.
When asked about ANY stored data, answer from context. NEVER hallucinate data.
If data is not available, say so honestly.

═══════════════════════════════════════
PHOTO ANALYSIS
═══════════════════════════════════════

When the user sends a photo, present findings conversationally, estimate nutrition, ask for cost, and offer to log.

═══════════════════════════════════════
REAL-TIME CALORIE ENGINE (CRITICAL – OVERRIDE)
═══════════════════════════════════════

The context includes a "realTimeStatus" object with pre-calculated values.
ALWAYS use these numbers. NEVER compute your own.

Key fields:
- totalAllowed = baseTarget + totalBurned
- remainingCalories = totalAllowed - totalConsumed
- remainingBudget = dailyBudget - totalSpent

After EVERY meal log, tell the user:
"Consumed X kcal | Burned Y kcal | Z kcal remaining today"
"₹A spent of ₹B"

MISSED MEAL HANDLING:
When a meal slot has no entries and its time window has passed (check mealsLogged array):
- Do NOT silently redistribute
- Ask: "You missed [meal] (~X kcal). Want to: 1) Add to next meal 2) Spread across remaining 3) Ignore?"

AFTER ACTIVITY:
- Burns affect TOTAL DAILY allowance, NOT a single meal
- Say: "You burned X kcal. You can eat Y more today. Want meal suggestions?"

PARTIAL MEAL:
If user ate significantly less than their meal target, note the gap and offer options:
"You have ~X kcal unused from [meal]. Move to snacks/dinner, or ignore?"

OVERCONSUMED:
If remainingCalories < 0: "You're X kcal over target today. No stress — we'll adjust tomorrow."

EXTREME REMAINING (>800 kcal after 7PM):
Suggest realistic dinner/snack options that fit.

PRIORITY ORDER (always):
1. Real consumption data (highest)
2. Remaining calories
3. Budget constraints
4. Meal plan targets (lowest — adapt to reality)

BUDGET SYNC:
Every calorie recalc must also reference remaining budget.
Food suggestions must align with BOTH remaining calories AND remaining budget.

User Context:
${ctx}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Auth + quota check (server-side; client tier is untrusted)
    const { result: quota, userClient } = await checkQuota(req, "monika-chat");
    if (!quota.ok) return quotaErrorResponse(quota, corsHeaders);

    // 2. Validate input shape + size
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
    const { messages, imageBase64 } = parsed.data;
    // 3. Sanitize the user context before letting it touch the system prompt
    const userContext = sanitizeUserContext(parsed.data.userContext);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch active sponsored products for monika_contextual slot + gap-aware matching
    let sponsoredProducts: any[] = [];
    let gapAwareProducts: any[] = [];
    let cityPrices: any[] = [];
    const userCity: string | null = (userContext?.profile?.city || null)?.toString().toLowerCase().trim() || null;
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const today = new Date().toISOString().split("T")[0];

      // Fetch live city prices for user's city (last 7 days)
      if (userCity) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const { data: cp } = await supabase
          .from("city_prices")
          .select("item_name, avg_price, min_price, max_price, price_date, source, updated_at")
          .eq("city", userCity)
          .gte("price_date", sevenDaysAgo)
          .order("updated_at", { ascending: false })
          .limit(30);
        if (cp && cp.length > 0) {
          // Deduplicate by item_name keeping freshest
          const seen = new Set<string>();
          cityPrices = cp.filter((row: any) => {
            const key = row.item_name?.toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          }).slice(0, 20);
        }
      }
      const { data: campaigns } = await supabase
        .from("ad_campaigns")
        .select(`
          id, campaign_name, pes_score, target_diet, budget_total, budget_spent,
          brand_accounts!inner(brand_name),
          ad_creatives!inner(id, headline, subtitle, cta_text, cta_url, image_url, is_active),
          ad_targeting(min_protein_gap, max_user_budget, meal_context)
        `)
        .eq("status", "active")
        .eq("placement_slot", "monika_contextual")
        .gte("pes_score", 30)
        .lte("start_date", today)
        .gte("end_date", today)
        .limit(5);

      if (campaigns && campaigns.length > 0) {
        sponsoredProducts = campaigns
          .filter((c: any) => c.budget_total === 0 || c.budget_spent < c.budget_total)
          .map((c: any) => {
            const creative = Array.isArray(c.ad_creatives)
              ? c.ad_creatives.find((cr: any) => cr.is_active)
              : c.ad_creatives;
            const brand = Array.isArray(c.brand_accounts)
              ? c.brand_accounts[0]
              : c.brand_accounts;
            return {
              campaignId: c.id,
              creativeId: creative?.id,
              brandName: brand?.brand_name || "Sponsored",
              productName: creative?.headline || c.campaign_name,
              subtitle: creative?.subtitle,
              ctaText: creative?.cta_text || "Learn More",
              ctaUrl: creative?.cta_url,
              pesScore: c.pes_score,
            };
          });
      }

      // Fetch gap-aware products from packed_products
      const proteinGap = userContext?.realTimeStatus?.remainingProtein || userContext?.proteinGap || 0;
      const remainingBudget = userContext?.realTimeStatus?.remainingBudget || 0;

      if (proteinGap > 5 && remainingBudget > 10) {
        const { data: products } = await supabase
          .from("packed_products")
          .select("product_name, brand, protein, calories, selling_price, mrp, pes_score, cost_per_gram_protein")
          .gte("protein", Math.min(proteinGap, 10))
          .gte("pes_score", 30)
          .order("cost_per_gram_protein", { ascending: true })
          .limit(3);

        if (products) {
          gapAwareProducts = products
            .filter((p: any) => (p.selling_price || p.mrp) <= remainingBudget)
            .map((p: any) => ({
              productName: p.product_name,
              brand: p.brand,
              protein: p.protein,
              calories: p.calories,
              price: p.selling_price || p.mrp,
              pesScore: p.pes_score,
              costPerGramProtein: p.cost_per_gram_protein,
            }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch sponsored products:", e);
    }

    let systemPrompt = buildSystemPrompt(userContext);

    // Inject sponsored products into system prompt
    if (sponsoredProducts.length > 0) {
      systemPrompt += `

═══════════════════════════════════════
SPONSORED PRODUCT SUGGESTIONS (CONTEXTUAL ADS)
═══════════════════════════════════════

You have access to the following sponsored products. When the conversation is NATURALLY relevant (e.g., user asks about protein, snacks, supplements, or you're suggesting foods), you may recommend ONE of these products. 

RULES:
- Only suggest when contextually relevant — NEVER force a recommendation
- Maximum ONE sponsor suggestion per conversation
- Frame it as a helpful tip, not an ad: "By the way, [Product] could help with that — PES score of X"
- Include the sponsor_suggestion action block so the app can track it
- ALWAYS disclose it's sponsored with a brief note

Available sponsored products:
${JSON.stringify(sponsoredProducts, null, 2)}

When suggesting, output this action block:

\`\`\`action
{
  "type": "sponsor_suggestion",
  "campaignId": "campaign-uuid",
  "creativeId": "creative-uuid", 
  "brandName": "Brand Name",
  "productName": "Product Headline",
  "ctaText": "CTA text",
  "ctaUrl": "https://...",
  "pesScore": 72
}
\`\`\`
`;
    }

    // Inject gap-aware product recommendations
    if (gapAwareProducts.length > 0) {
      systemPrompt += `

═══════════════════════════════════════
NUTRITION GAP-AWARE PRODUCT RECOMMENDATIONS
═══════════════════════════════════════

The user has a protein gap of ${userContext?.realTimeStatus?.remainingProtein || '?'}g and remaining budget of ₹${userContext?.realTimeStatus?.remainingBudget || '?'}.

These products fit their gap AND budget. Suggest them naturally when discussing nutrition, protein, or snacks:

${JSON.stringify(gapAwareProducts, null, 2)}

Frame suggestions as: "You still need Xg protein — a ${gapAwareProducts[0]?.productName || 'product'} (${gapAwareProducts[0]?.protein || '?'}g protein, ₹${gapAwareProducts[0]?.price || '?'}) would close that gap nicely."
`;
    }

    // Inject live city prices into system prompt
    if (cityPrices.length > 0 && userCity) {
      const todayStr = new Date().toISOString().split("T")[0];
      const formatted = cityPrices.map((p: any) => {
        const ageDays = Math.floor(
          (Date.parse(todayStr) - Date.parse(p.price_date)) / (1000 * 60 * 60 * 24)
        );
        const freshness = ageDays === 0 ? "Live (today)"
          : ageDays === 1 ? "1d old"
          : ageDays <= 3 ? `${ageDays}d old`
          : "Stale";
        const range = (p.min_price && p.max_price && p.min_price !== p.max_price)
          ? ` (range ₹${p.min_price}–₹${p.max_price})`
          : "";
        return `- ${p.item_name}: ₹${p.avg_price}/kg${range} — ${freshness} (${p.source})`;
      }).join("\n");

      systemPrompt += `

═══════════════════════════════════════
LIVE PRICE DATA — CITY: ${userCity.toUpperCase()}
═══════════════════════════════════════

These are the most recent crowdsourced/live grocery prices for the user's city (${userCity}). Updated within the last 7 days.

${formatted}

PRICE QUERY RULES:
- When asked about a price, ONLY quote values from this list above.
- Always include the freshness label (e.g., "Live (today)", "2d old") and city.
- Format: "Chicken in ${userCity} is ₹X/kg (Live, today, crowdsourced)."
- If the requested item is NOT in the list, say honestly: "I don't have a fresh price for [item] in ${userCity} — the data may be from older static estimates and may not reflect today's market."
- NEVER invent prices. NEVER quote prices for cities other than ${userCity} unless the user explicitly asks about a different city.
`;
    }

    // Inject condition-specific guidance
    const conditionGuidance = userContext?.conditionGuidance;
    if (Array.isArray(conditionGuidance) && conditionGuidance.length > 0) {
      systemPrompt += `

═══════════════════════════════════════
CONDITION-SPECIFIC GUIDANCE FOR THIS USER
═══════════════════════════════════════

The user has the following health conditions. Use this DETERMINISTIC guidance (computed from their last 7 days of meals) before answering ANY food/diet question:

${JSON.stringify(conditionGuidance, null, 2)}

RULES:
- When user asks "Can I eat X?", check it against shouldAvoid / shouldPrefer for EACH active condition.
- If "recentlyAte" has matches, gently mention the pattern (e.g., "I noticed you've had white rice 3x this week — for diabetes, let's swap one for brown rice or millets").
- Personalize: cite the specific condition by name in your reply.
- Never block the user — coach, don't lecture.
`;
    }

    const apiMessages: any[] = [{ role: "system", content: systemPrompt }];

    for (const msg of messages) {
      if (msg.imageAnalysis) {
        apiMessages.push({
          role: msg.role,
          content: `[User sent a food photo. Analysis result: ${JSON.stringify(msg.imageAnalysis)}]\n\n${msg.content || "I took a photo of my meal. Can you help me log it?"}`,
        });
      } else if (msg.imageBase64) {
        apiMessages.push({
          role: msg.role,
          content: [
            { type: "text", text: msg.content || "What food do you see in this photo? Identify items and estimate nutrition." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${msg.imageBase64}` } },
          ],
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
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

    // Streamed response — we can't read usage; log a flat estimate.
    void logApiUsage({
      vendor: "lovable-ai",
      endpoint: "monika-chat",
      units: 1,
      costInr: estimateLovableAiCost("google/gemini-2.5-flash", 2000),
      metadata: { streamed: true, messageCount: apiMessages.length },
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("monika-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
