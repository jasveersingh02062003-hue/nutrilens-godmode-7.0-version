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
  duration_days: z.number().int().min(1).max(365).default(30),
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
  const { plan, duration_days } = parsed.data;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const start = new Date();
  const end = new Date(start.getTime() + duration_days * 24 * 60 * 60 * 1000);

  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .upsert({
      user_id: user.id,
      plan,
      status: "active",
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      cancel_at_period_end: false,
      provider: "mock",
      provider_subscription_id: `mock_${crypto.randomUUID()}`,
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (subErr) {
    return new Response(JSON.stringify({ error: "db_error", message: subErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin.from("payment_events").insert({
    user_id: user.id,
    subscription_id: sub.id,
    event_type: "subscribe",
    provider: "mock",
    provider_event_id: `mock_evt_${crypto.randomUUID()}`,
    amount_inr: plan === "ultra" ? 499 : 199,
    raw_payload: { plan, duration_days, mock: true },
  });

  return new Response(JSON.stringify({ ok: true, subscription: sub }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
