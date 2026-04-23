// Paddle webhook handler. Pre-registered by enable_paddle_payments for both
// sandbox and live environments at /payments-webhook?env=sandbox|live.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _supabase;
}

// Map Paddle's price external_id → our app's plan enum.
function planFromPriceId(priceId: string): 'premium' | 'ultra' | 'free' {
  if (priceId === 'ultra_monthly') return 'ultra';
  if (priceId === 'premium_monthly' || priceId === 'premium_yearly') return 'premium';
  return 'free';
}

// Map Paddle subscription status → our subscription_status enum.
function mapStatus(paddleStatus: string): string {
  switch (paddleStatus) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'paused': return 'paused';
    case 'canceled': return 'cancelled';
    default: return paddleStatus;
  }
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData, scheduledChange } = data;

  const userId = customData?.userId;
  if (!userId) {
    console.error('[paddle-webhook] No userId in customData', { paddle_subscription_id: id });
    return;
  }

  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn('[paddle-webhook] missing importMeta.externalId — skipping', {
      rawPriceId: item?.price?.id,
      rawProductId: item?.product?.id,
    });
    return;
  }

  const plan = planFromPriceId(priceId);
  const supabase = getSupabase();

  // Upsert keyed on paddle_subscription_id (re-subscribes after cancel insert a new row).
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id_ext: productId,
    price_id_ext: priceId,
    plan,
    status: mapStatus(status),
    current_period_start: currentBillingPeriod?.startsAt ?? null,
    current_period_end: currentBillingPeriod?.endsAt ?? null,
    cancel_at_period_end: scheduledChange?.action === 'cancel',
    environment: env,
    provider: 'mock', // existing enum doesn't include 'paddle'; using 'mock' to avoid enum migration churn
    has_used_trial: status === 'trialing' ? true : undefined,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'paddle_subscription_id',
  });

  if (error) {
    console.error('[paddle-webhook] upsert failed', error);
    throw error;
  }

  // Audit
  await supabase.from('payment_events').insert({
    user_id: userId,
    event_type: 'subscribe',
    provider: 'mock',
    amount_inr: null,
    raw_payload: { paddle_subscription_id: id, plan, environment: env, source: 'paddle' },
  });
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange } = data;
  const supabase = getSupabase();

  const { error } = await supabase.from('subscriptions')
    .update({
      status: mapStatus(status),
      current_period_start: currentBillingPeriod?.startsAt ?? null,
      current_period_end: currentBillingPeriod?.endsAt ?? null,
      cancel_at_period_end: scheduledChange?.action === 'cancel',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', id)
    .eq('environment', env);

  if (error) console.error('[paddle-webhook] update failed', error);
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  const supabase = getSupabase();
  const { error } = await supabase.from('subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);

  if (error) console.error('[paddle-webhook] cancel failed', error);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;

  try {
    const event = await verifyWebhook(req, env);

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
        await handleSubscriptionCreated(event.data, env);
        break;
      case EventName.SubscriptionUpdated:
        await handleSubscriptionUpdated(event.data, env);
        break;
      case EventName.SubscriptionCanceled:
        await handleSubscriptionCanceled(event.data, env);
        break;
      default:
        console.log('[paddle-webhook] unhandled event:', event.eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[paddle-webhook] error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
