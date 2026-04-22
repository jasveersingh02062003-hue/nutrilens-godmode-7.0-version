import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'pii_reveal'
  | 'csv_export'
  | 'meta_audience_export'
  | 'segment_save'
  | 'user_view'
  | 'feedback_resolved'
  | 'admin_login'
  | 'role_change'
  | 'plan_extend'
  | 'plan_refund'
  | 'onboarding_reset'
  | 'brand_kyc_review'
  | 'brand_wallet_topup';

interface AuditPayload {
  action: AuditAction;
  target_table?: string;
  target_user_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log write. RLS requires actor_id = auth.uid().
 */
export async function logAdminAction(payload: AuditPayload): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { error } = await supabase.from('audit_logs').insert([{
      actor_id: session.user.id,
      action: payload.action,
      target_table: payload.target_table ?? null,
      target_user_id: payload.target_user_id ?? null,
      metadata: (payload.metadata ?? {}) as any,
    }]);
    if (error) console.error('[audit]', error.message);
  } catch (e) {
    console.error('[audit] failed', e);
  }
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}
