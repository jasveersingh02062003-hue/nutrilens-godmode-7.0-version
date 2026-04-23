// Resend receipt — stub.
// Real email delivery wires in on email-provider day. For now this just
// records an audit row so admins can see the action was taken.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { event_id, target_user_id } = await req.json();
    const authHeader = req.headers.get('Authorization') ?? '';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const actor = userData?.user?.id;
    if (!actor) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('audit_logs').insert({
      actor_id: actor,
      action: 'receipt_resend_requested',
      target_table: 'payment_events',
      target_user_id: target_user_id ?? null,
      metadata: { event_id, note: 'Stub — real email delivery wires in on email-provider day.' },
    });

    return new Response(JSON.stringify({ ok: true, queued: true, note: 'Stub. Email will send once provider is configured.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
