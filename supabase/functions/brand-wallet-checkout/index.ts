// Brand wallet self-serve top-up. Creates a Paddle one-time checkout URL
// for a brand owner to add credit to their advertising wallet.
//
// Flow:
//   1. Brand owner clicks "Top Up" → frontend calls this fn with brand_id + amount_inr.
//   2. We verify caller is an owner of that brand.
//   3. We open a Paddle checkout with customData = { brand_id, amount_inr, type: 'brand_topup' }.
//   4. payments-webhook handles transaction.completed for type='brand_topup'
//      and credits the wallet via apply_brand_transaction(...).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';

const BodySchema = z.object({
  brand_id: z.string().uuid(),
  amount_inr: z.number().int().min(500).max(1_000_000), // ₹500 min, ₹10L max
  environment: z.enum(['sandbox', 'live']).default('sandbox'),
});

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Authn
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_body', details: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const { brand_id, amount_inr, environment } = parsed.data;

  // Authz: caller must be an OWNER of this brand (not just any member).
  const { data: membership } = await userClient
    .from('brand_members')
    .select('role')
    .eq('brand_id', brand_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || (membership as any).role !== 'owner') {
    return new Response(JSON.stringify({ error: 'not_brand_owner' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Build Paddle checkout
  try {
    const paddle = getPaddleClient(environment as PaddleEnv);
    const txn = await paddle.transactions.create({
      items: [{
        // Use a price object inline for ad-hoc amount (no pre-created price).
        // Paddle expects amount in minor units (paise for INR).
        price: {
          description: `NutriLens Ad Wallet Top-up — ₹${amount_inr.toLocaleString('en-IN')}`,
          name: 'Ad Wallet Top-up',
          unitPrice: { amount: String(amount_inr * 100), currencyCode: 'INR' },
          taxMode: 'account_setting',
          quantity: { minimum: 1, maximum: 1 },
        },
        quantity: 1,
      }] as any,
      customData: {
        type: 'brand_topup',
        brand_id,
        amount_inr,
        user_id: user.id,
      },
      customer: { email: user.email ?? undefined } as any,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        checkout_url: (txn as any).checkout?.url ?? null,
        transaction_id: (txn as any).id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('[brand-wallet-checkout] paddle error', e);
    return new Response(
      JSON.stringify({ error: 'paddle_error', message: e?.message ?? 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
