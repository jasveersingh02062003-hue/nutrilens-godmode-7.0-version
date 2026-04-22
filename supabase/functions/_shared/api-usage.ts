// Shared cost-logging helper for Lovable Cloud edge functions.
// Inserts a row into api_usage so the admin Cost dashboard can compute
// today's spend, MTD spend, cost-per-MAU, and profit/loss.
//
// All edge functions are deployed with the SERVICE_ROLE key available, which
// bypasses RLS — so this works regardless of the caller's role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Cost constants in INR per unit. Tweak these as vendor pricing changes.
// Sources:
//  - Lovable AI Gateway: ~$0.075 / 1M input + $0.30 / 1M output for gemini-2.5-flash
//    Approx ₹0.000025 per token (input) — we use a flat blended rate per request for simplicity.
//  - Firecrawl: ~$0.001 / page → ~₹0.085 / page
export const COST_INR = {
  // Lovable AI — blended ₹/1K tokens
  "lovable-ai-flash": 0.05,        // gemini-2.5-flash & similar
  "lovable-ai-pro":   0.30,        // gemini-2.5-pro / gpt-5
  "lovable-ai-nano":  0.02,        // gpt-5-nano / flash-lite
  "lovable-ai-vision": 0.08,       // image inputs blended
  // Firecrawl
  "firecrawl-page":   0.085,
  // Default fallback
  "default":          0.01,
} as const;

export type Vendor =
  | "lovable-ai"
  | "firecrawl"
  | "supabase-storage"
  | "other";

interface LogParams {
  vendor: Vendor;
  endpoint: string;            // e.g. "analyze-food", "monika-chat"
  units: number;               // tokens, pages, requests — vendor-specific
  costInr: number;             // pre-computed total cost in INR
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

let _client: ReturnType<typeof createClient> | null = null;
function client() {
  if (_client) return _client;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

/**
 * Fire-and-forget log of one external API call. Never throws — failures are
 * logged to console only so they can't break the user-facing function.
 */
export async function logApiUsage(p: LogParams): Promise<void> {
  try {
    const c = client();
    const { error } = await c.from("api_usage").insert({
      vendor: p.vendor,
      units: p.units,
      cost_inr: Number(p.costInr.toFixed(4)),
      metadata: {
        endpoint: p.endpoint,
        user_id: p.userId ?? null,
        ...(p.metadata ?? {}),
      },
    });
    if (error) console.error("[api-usage] insert failed:", error.message);
  } catch (e) {
    console.error("[api-usage] exception:", e);
  }
}

/**
 * Estimate INR cost for a Lovable AI gateway call given a model and token usage.
 * Falls back to the flash rate if the model isn't recognised.
 */
export function estimateLovableAiCost(
  model: string,
  totalTokens: number,
): number {
  const m = model.toLowerCase();
  let rate = COST_INR["lovable-ai-flash"];
  if (m.includes("pro") || m.includes("gpt-5") && !m.includes("nano") && !m.includes("mini"))
    rate = COST_INR["lovable-ai-pro"];
  else if (m.includes("nano") || m.includes("lite") || m.includes("mini"))
    rate = COST_INR["lovable-ai-nano"];
  else if (m.includes("vision") || m.includes("image"))
    rate = COST_INR["lovable-ai-vision"];
  return (totalTokens / 1000) * rate;
}
