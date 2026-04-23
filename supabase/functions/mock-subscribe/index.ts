// Dev-only mock subscription flip. Lets us test paid-tier flows end-to-end
// without a real payment processor. Gated by DEV_MOCK_PAYMENTS env var.
// When Razorpay/Stripe is wired in, this fn is replaced by the real webhook.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  plan: z.enum(["premium", "ultra"]),
  duration_days: z.number().int().min(1).max(366).default(30),
  payment_method_type: z.enum(["upi", "card", "netbanking", "wallet"]).optional(),
  payment_method_display: z.string().max(120).optional(),
  amount_paise: z.number().int().min(0).max(100_000_00).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Hard gate: only allow when explicitly enabled
  if (Deno.env.get("DEV_MOCK_PAYMENTS") !== "true") {
    return new Response(
      JSON.stringify({ error: "mock_payments_disabled" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Authn
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_body", details: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const { plan, duration_days, payment_method_type, payment_method_display, amount_paise } = parsed.data;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const start = new Date();
  const end = new Date(start.getTime() + duration_days * 24 * 60 * 60 * 1000);

  // Find the most recent subscription for this user (any status). The
  // subscriptions table doesn't have a unique constraint on user_id (it
  // supports multiple rows per user for re-subscribes/plan changes), so
  // we update-or-insert manually instead of relying on upsert/onConflict.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sub: any = null;
  let subErr: any = null;

  if (existing?.id) {
    const { data, error } = await admin
      .from("subscriptions")
      .update({
        plan,
        status: "active",
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        cancel_at_period_end: false,
        provider: "mock",
        provider_subscription_id: `mock_${crypto.randomUUID()}`,
        environment: "live",
      })
      .eq("id", existing.id)
      .select()
      .single();
    sub = data;
    subErr = error;
  } else {
    const { data, error } = await admin
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan,
        status: "active",
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        cancel_at_period_end: false,
        provider: "mock",
        provider_subscription_id: `mock_${crypto.randomUUID()}`,
        environment: "live",
      })
      .select()
      .single();
    sub = data;
    subErr = error;
  }

  if (subErr) {
    return new Response(JSON.stringify({ error: "db_error", message: subErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const inferredAmount = amount_paise ?? (plan === "ultra" ? 49900 : (duration_days >= 300 ? 149900 : 14900));
  const receiptId = `MOCK-${Date.now().toString(36).toUpperCase()}`;

  await admin.from("payment_events").insert({
    user_id: user.id,
    subscription_id: sub.id,
    event_type: "subscribe",
    provider: "mock",
    provider_event_id: receiptId,
    amount_inr: Math.round(inferredAmount / 100),
    raw_payload: {
      plan,
      duration_days,
      mock: true,
      payment_method_type: payment_method_type ?? null,
      payment_method_display: payment_method_display ?? null,
      receipt_id: receiptId,
      amount_paise: inferredAmount,
    },
  });

  return new Response(
    JSON.stringify({
      ok: true,
      subscription: sub,
      receipt: {
        id: receiptId,
        plan,
        duration_days,
        amount_paise: inferredAmount,
        amount_inr: Math.round(inferredAmount / 100),
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        payment_method_type: payment_method_type ?? null,
        payment_method_display: payment_method_display ?? null,
        provider: "mock",
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
