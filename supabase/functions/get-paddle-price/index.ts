// AUTH: JWT required (validated via getClaims). Stateless price-id lookup; no DB writes.
// Resolves a human-readable price external_id (e.g. "premium_monthly") to a
// Paddle internal price ID (e.g. "pri_..."). The internal ID differs between
// sandbox and live, so the client must pass its environment.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";


Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Auth check — must be a logged-in user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const priceId: string | undefined = body?.priceId;
    const environment: PaddleEnv = body?.environment === 'live' ? 'live' : 'sandbox';

    if (!priceId || typeof priceId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing priceId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await gatewayFetch(environment, `/prices?external_id=${encodeURIComponent(priceId)}`);
    const data = await res.json();
    if (!res.ok || !data?.data?.length) {
      console.error('[get-paddle-price] not found', { priceId, environment, status: res.status });
      return new Response(JSON.stringify({ error: 'Price not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ paddleId: data.data[0].id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[get-paddle-price] error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
