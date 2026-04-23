// Shared server-side AI quota enforcement.
//
// Used by every edge function that calls the Lovable AI Gateway. Counts each
// successful call per (user, day, endpoint) in the `ai_usage_quota` table and
// rejects requests once the user's tier limit is hit. This is the only thing
// standing between us and a five-figure overnight AI bill from a malicious
// user spoofing client-side limits.
//
// Tier limits per day, per endpoint:
//   free   — 5 monika messages, 2 food scans, 3 receipt scans
//   premium / ultra — generous caps to prevent runaway scripts but not
//                     restrict normal use

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type QuotaEndpoint =
  | "monika-chat"
  | "analyze-food"
  | "scan-receipt";

export type QuotaTier = "free" | "premium" | "ultra";

// Per-day caps. Set generous ceilings on paid tiers to deter abuse without
// breaking normal usage.
const LIMITS: Record<QuotaEndpoint, Record<QuotaTier, number>> = {
  "monika-chat":  { free: 5,   premium: 200, ultra: 500 },
  "analyze-food": { free: 2,   premium: 100, ultra: 300 },
  "scan-receipt": { free: 3,   premium: 60,  ultra: 200 },
};

export interface QuotaCheckResult {
  ok: boolean;
  tier: QuotaTier;
  limit: number;
  used: number;          // count BEFORE this call
  remaining: number;     // limit - used (clamped at 0)
  message?: string;      // populated when ok=false
  status?: number;       // HTTP status to return when ok=false
}

/**
 * Verify the caller's auth, look up their tier, and check today's usage.
 * Caller should reject with `result.status` and `result.message` when ok=false.
 */
export async function checkQuota(
  req: Request,
  endpoint: QuotaEndpoint,
): Promise<{ result: QuotaCheckResult; userId: string | null; userClient: ReturnType<typeof createClient> | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      result: {
        ok: false, tier: "free", limit: 0, used: 0, remaining: 0,
        status: 401,
        message: "Authentication required.",
      },
      userId: null,
      userClient: null,
    };
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // User-scoped client so RPCs see auth.uid()
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return {
      result: {
        ok: false, tier: "free", limit: 0, used: 0, remaining: 0,
        status: 401,
        message: "Invalid or expired token.",
      },
      userId: null,
      userClient: null,
    };
  }
  const userId = userData.user.id;

  // Resolve tier server-side via get_my_active_plan RPC. Closes FB-2:
  // a malicious client can't spoof their tier because the edge fn doesn't
  // trust client-side state — it asks the DB.
  let tier: QuotaTier = "free";
  try {
    const { data: planRow } = await userClient.rpc("get_my_active_plan");
    const row = Array.isArray(planRow) ? planRow[0] : planRow;
    const isActiveOrTrial = row?.status === "active" || row?.status === "trialing";
    if (isActiveOrTrial && (row?.plan === "premium" || row?.plan === "ultra")) {
      tier = row.plan as QuotaTier;
    }
  } catch (e) {
    console.error("[ai-quota] get_my_active_plan failed, defaulting to free:", e);
  }
  const limit = LIMITS[endpoint][tier];

  // Read current count without mutating
  const { data: usedData, error: usedErr } = await userClient
    .rpc("get_ai_quota", { p_endpoint: endpoint });
  if (usedErr) {
    console.error("[ai-quota] get_ai_quota failed:", usedErr.message);
    // Fail open on read error so quota infra issues don't break the app,
    // but log loudly so we notice.
    return {
      result: { ok: true, tier, limit, used: 0, remaining: limit },
      userId,
      userClient,
    };
  }
  const used: number = (usedData as number) ?? 0;

  if (used >= limit) {
    return {
      result: {
        ok: false, tier, limit, used, remaining: 0,
        status: 429,
        message: `Daily limit reached (${used}/${limit}). Upgrade for more.`,
      },
      userId,
      userClient,
    };
  }

  return {
    result: { ok: true, tier, limit, used, remaining: limit - used },
    userId,
    userClient,
  };
}

/**
 * Atomically increment the user's counter. Call AFTER a successful AI call
 * so failed/rejected requests don't burn quota. Fire-and-forget; never throws.
 */
export async function incrementQuota(
  userClient: ReturnType<typeof createClient>,
  endpoint: QuotaEndpoint,
): Promise<void> {
  try {
    const { error } = await userClient.rpc("increment_ai_quota", { p_endpoint: endpoint });
    if (error) console.error("[ai-quota] increment failed:", error.message);
  } catch (e) {
    console.error("[ai-quota] increment exception:", e);
  }
}

/**
 * Convenience: build a 429 Response from a failed quota check.
 */
export function quotaErrorResponse(result: QuotaCheckResult, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: result.message ?? "Quota exceeded",
      tier: result.tier,
      limit: result.limit,
      used: result.used,
      remaining: result.remaining,
      upgradeRequired: result.tier === "free",
    }),
    {
      status: result.status ?? 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
