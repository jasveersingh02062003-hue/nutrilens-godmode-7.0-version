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

  // Detect past_due → active recovery so we can fire a "payment recovered" email.
  let wasPastDue = false;
  let userId: string | null = null;
  let recipientEmail: string | null = null;

  if (status === 'active') {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('user_id, status')
      .eq('paddle_subscription_id', id)
      .eq('environment', env)
      .maybeSingle();
    if (existing && (existing as any).status === 'past_due') {
      wasPastDue = true;
      userId = (existing as any).user_id as string;
    }
  }

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

  // Recovery: mark dunning event as resolved + send "payment recovered" email.
  if (wasPastDue && userId) {
    await supabase
      .from('dunning_events')
      .update({ recovered_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('paddle_subscription_id', id)
      .is('recovered_at', null);

    // Look up the user's email (auth.users via admin API)
    try {
      const { data: userRow } = await (supabase as any).auth.admin.getUserById(userId);
      recipientEmail = userRow?.user?.email ?? null;
    } catch (e) {
      console.warn('[paddle-webhook] could not look up user email for recovery', e);
    }

    if (recipientEmail) {
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'payment-recovered',
            recipientEmail,
            idempotencyKey: `payment-recovered-${id}-${new Date().toISOString().slice(0, 10)}`,
          },
        });
      } catch (e) {
        // Email infra might not be configured yet — log but don't fail the webhook.
        console.warn('[paddle-webhook] payment-recovered email failed (email infra may not be set up)', e);
      }
    }
  }
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

async function handleTransactionPaymentFailed(data: any, env: PaddleEnv) {
  // Paddle event: transaction.payment_failed. Fired when a renewal charge
  // fails. Paddle handles its own retry schedule; we just notify the user
  // and record the attempt for analytics + the in-app banner.
  const supabase = getSupabase();
  const { customerId, subscriptionId, payments } = data;

  if (!subscriptionId) {
    console.log('[paddle-webhook] payment_failed without subscriptionId — likely one-off charge, ignoring');
    return;
  }

  // Find the user via existing subscription row
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id, paddle_customer_id, paddle_subscription_id')
    .eq('paddle_subscription_id', subscriptionId)
    .eq('environment', env)
    .maybeSingle();

  if (!sub) {
    console.warn('[paddle-webhook] payment_failed for unknown subscription', subscriptionId);
    return;
  }

  const userId = (sub as any).user_id as string;
  const failureReason: string | null = payments?.[0]?.errorCode ?? payments?.[0]?.status ?? null;

  // Count prior attempts to set attempt_number
  const { count } = await supabase
    .from('dunning_events')
    .select('id', { count: 'exact', head: true })
    .eq('paddle_subscription_id', subscriptionId)
    .is('recovered_at', null);

  const attemptNumber = (count ?? 0) + 1;

  // Record the dunning event
  const { data: insertedRows, error: insertErr } = await supabase
    .from('dunning_events')
    .insert({
      user_id: userId,
      paddle_subscription_id: subscriptionId,
      paddle_customer_id: customerId ?? (sub as any).paddle_customer_id,
      attempt_number: attemptNumber,
      failure_reason: failureReason,
      raw_payload: { environment: env, source: 'paddle' },
    })
    .select('id')
    .limit(1);

  if (insertErr) {
    console.error('[paddle-webhook] dunning insert failed', insertErr);
  }
  const dunningId = insertedRows?.[0]?.id;

  // Look up email + send notification
  let recipientEmail: string | null = null;
  try {
    const { data: userRow } = await (supabase as any).auth.admin.getUserById(userId);
    recipientEmail = userRow?.user?.email ?? null;
  } catch (e) {
    console.warn('[paddle-webhook] could not look up user email for dunning', e);
  }

  if (recipientEmail) {
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'payment-failed',
          recipientEmail,
          idempotencyKey: `payment-failed-${subscriptionId}-attempt-${attemptNumber}`,
          templateData: { attemptNumber, failureReason: failureReason ?? 'card_declined' },
        },
      });

      if (dunningId) {
        await supabase
          .from('dunning_events')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', dunningId);
      }
    } catch (e) {
      // Email infra might not be set up yet — webhook still succeeds (banner UX still works)
      console.warn('[paddle-webhook] payment-failed email failed (email infra may not be set up)', e);
    }
  }

  // Also flip the subscription status to past_due (Paddle does this too via
  // subscription.updated, but doing it here gives us instant banner UX).
  await supabase.from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('paddle_subscription_id', subscriptionId)
    .eq('environment', env);
}

// Brand wallet self top-up handler. Triggered when a brand owner completes
// a Paddle checkout created by `brand-wallet-checkout`. Idempotent via
// reference = paddle_transaction_id.
async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const supabase = getSupabase();
  const customData = data?.customData ?? {};
  if (customData?.type !== 'brand_topup') return; // not our event

  const brandId = customData?.brand_id as string | undefined;
  const amountInr = Number(customData?.amount_inr ?? 0);
  const txnId = data?.id as string | undefined;
  if (!brandId || !amountInr || !txnId) {
    console.warn('[paddle-webhook] brand_topup missing fields', { brandId, amountInr, txnId });
    return;
  }

  // Idempotency: if a brand_transactions row with this reference already exists, skip.
  const { data: existing } = await supabase
    .from('brand_transactions')
    .select('id')
    .eq('reference', txnId)
    .maybeSingle();
  if (existing) {
    console.log('[paddle-webhook] brand_topup already credited', txnId);
    return;
  }

  const { error } = await supabase.rpc('apply_brand_transaction', {
    p_brand_id: brandId,
    p_amount: amountInr,
    p_type: 'topup',
    p_reference: txnId,
    p_notes: `Self-serve top-up via Paddle (${env})`,
  });
  if (error) {
    console.error('[paddle-webhook] brand_topup credit failed', error);
    return;
  }

  // Notify brand members
  const { data: members } = await supabase
    .from('brand_members')
    .select('user_id')
    .eq('brand_id', brandId);
  if (members?.length) {
    await supabase.from('notifications').insert(
      (members as any[]).map((m) => ({
        user_id: m.user_id,
        audience: 'brand',
        brand_id: brandId,
        kind: 'wallet_topped_up',
        title: 'Wallet topped up',
        body: `₹${amountInr.toLocaleString('en-IN')} credited to your ad wallet.`,
        link_url: '/brand/billing',
        metadata: { amount_inr: amountInr, paddle_txn_id: txnId },
      })),
    );
  }
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
      case EventName.TransactionPaymentFailed:
        await handleTransactionPaymentFailed(event.data, env);
        break;
      case EventName.TransactionCompleted:
        await handleTransactionCompleted(event.data, env);
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
