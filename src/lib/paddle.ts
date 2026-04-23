// Paddle client SDK loader + price resolver.
// The client token is shipped in the browser bundle by Vite — this is by design.
// Test token lives in .env.development; live token in .env.production.
// Security model: the Lovable preview is auth-gated, so the test token is not
// publicly exposed. Webhook signatures + RLS prevent fake subscription writes.
import { supabase } from '@/integrations/supabase/client';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Paddle: any;
  }
}

export type PaddleEnv = 'sandbox' | 'live';

/** Single source of truth for which Paddle environment the client is in.
 *  Derived from the token prefix so it stays correct after the build-time swap. */
export function getPaddleEnvironment(): PaddleEnv {
  return clientToken?.startsWith('test_') ? 'sandbox' : 'live';
}

/** True when a Paddle client token is configured. */
export function isPaddleConfigured(): boolean {
  return !!clientToken;
}

let paddleInitialized = false;
let initPromise: Promise<void> | null = null;

export function initializePaddle(): Promise<void> {
  if (paddleInitialized) return Promise.resolve();
  if (initPromise) return initPromise;

  if (!clientToken) {
    return Promise.reject(new Error('VITE_PAYMENTS_CLIENT_TOKEN is not set'));
  }

  initPromise = new Promise<void>((resolve, reject) => {
    // If already loaded by a prior call, just initialize.
    if (window.Paddle) {
      try {
        const paddleJsEnv = getPaddleEnvironment() === 'sandbox' ? 'sandbox' : 'production';
        window.Paddle.Environment.set(paddleJsEnv);
        window.Paddle.Initialize({ token: clientToken });
        paddleInitialized = true;
        resolve();
      } catch (e) {
        reject(e);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      try {
        const paddleJsEnv = getPaddleEnvironment() === 'sandbox' ? 'sandbox' : 'production';
        window.Paddle.Environment.set(paddleJsEnv);
        window.Paddle.Initialize({ token: clientToken });
        paddleInitialized = true;
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(script);
  });

  return initPromise;
}

/** Resolve a human-readable price ID (e.g. "premium_monthly") to a Paddle
 *  internal price ID (e.g. "pri_..."). */
export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  const { data, error } = await supabase.functions.invoke('get-paddle-price', {
    body: { priceId, environment },
  });
  if (error || !data?.paddleId) {
    throw new Error(`Failed to resolve Paddle price for "${priceId}"`);
  }
  return data.paddleId as string;
}

export interface OpenCheckoutOptions {
  priceId: 'premium_monthly' | 'premium_yearly' | 'ultra_monthly' | string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  successUrl?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

/** Opens the Paddle overlay checkout for the given price ID. */
export async function openPaddleCheckout(opts: OpenCheckoutOptions): Promise<void> {
  await initializePaddle();
  const paddlePriceId = await getPaddlePriceId(opts.priceId);

  // Wire callbacks via eventCallback (Paddle.js v2 pattern) — re-init each call.
  if (opts.onSuccess || opts.onClose) {
    window.Paddle.Initialize({
      token: clientToken!,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventCallback: (event: any) => {
        if (event?.name === 'checkout.completed') opts.onSuccess?.();
        if (event?.name === 'checkout.closed') opts.onClose?.();
      },
    });
  }

  window.Paddle.Checkout.open({
    items: [{ priceId: paddlePriceId, quantity: opts.quantity ?? 1 }],
    customer: opts.customerEmail ? { email: opts.customerEmail } : undefined,
    customData: opts.userId ? { userId: opts.userId } : undefined,
    settings: {
      displayMode: 'overlay',
      successUrl: opts.successUrl || `${window.location.origin}/profile?checkout=success`,
      allowLogout: false,
      variant: 'one-page',
    },
  });
}
