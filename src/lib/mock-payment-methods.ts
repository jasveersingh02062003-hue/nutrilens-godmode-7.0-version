// Local-only stub for "saved payment methods" until a real provider is wired.
// When Razorpay/Stripe is added, replace these calls with reads from the
// `payment_methods` table (already created with RLS).

import { supabase } from '@/integrations/supabase/client';

export type PaymentMethodType = 'upi' | 'card' | 'netbanking' | 'wallet';

export interface SavedPaymentMethod {
  id: string;
  user_id: string;
  type: PaymentMethodType;
  display_name: string;
  is_default: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function listSavedMethods(): Promise<SavedPaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[payment-methods] list failed', error.message);
    return [];
  }
  return (data ?? []) as SavedPaymentMethod[];
}

export async function saveMockMethod(input: {
  type: PaymentMethodType;
  display_name: string;
  metadata?: Record<string, unknown>;
}): Promise<SavedPaymentMethod | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // De-dupe by display_name to avoid clutter
  const { data: existing } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('user_id', user.id)
    .eq('display_name', input.display_name)
    .maybeSingle();
  if (existing?.id) return null;

  const { data, error } = await supabase
    .from('payment_methods')
    .insert([{
      user_id: user.id,
      type: input.type,
      display_name: input.display_name,
      is_default: false,
      metadata: input.metadata ?? {},
    }])
    .select()
    .single();
  if (error) {
    console.warn('[payment-methods] save failed', error.message);
    return null;
  }
  return data as SavedPaymentMethod;
}

export function maskUpi(vpa: string): string {
  const [user, handle] = vpa.split('@');
  if (!user || !handle) return vpa;
  const masked = user.length <= 2 ? '**' : `${user.slice(0, 2)}${'*'.repeat(Math.max(2, user.length - 2))}`;
  return `${masked}@${handle}`;
}
