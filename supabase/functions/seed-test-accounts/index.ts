// Owner-only seeder that creates 13 QA personas with auth users + roles + brand setup.
// All accounts share the password defined below for easy testing.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_PASSWORD = 'TestPass123!';

interface PersonaSpec {
  key: string;
  email: string;
  name: string;
  kind: 'consumer' | 'admin' | 'brand';
  role?: string;          // user_roles.role for admin/brand_manager
  brandRole?: 'owner' | 'manager'; // brand_members.role
  plan?: 'free' | 'premium' | 'ultra';
  status?: 'active' | 'trialing' | 'cancelled';
  age?: number;
  notes?: string;
}

const PERSONAS: PersonaSpec[] = [
  // Consumers
  { key: 'C1', email: 'c1.free@nutrilens.test',  name: 'Priya Free',     kind: 'consumer', plan: 'free',    age: 26, notes: 'Free tier' },
  { key: 'C2', email: 'c2.pro@nutrilens.test',   name: 'Rahul Pro',      kind: 'consumer', plan: 'premium', status: 'active', age: 32 },
  { key: 'C3', email: 'c3.ultra@nutrilens.test', name: 'Anjali Ultra',   kind: 'consumer', plan: 'ultra',   status: 'active', age: 29 },
  { key: 'C4', email: 'c4.event@nutrilens.test', name: 'Karan Event',    kind: 'consumer', plan: 'premium', status: 'active', age: 35 },
  { key: 'C5', email: 'c5.minor@nutrilens.test', name: 'Aarav Minor',    kind: 'consumer', plan: 'free',    age: 16, notes: 'Minor — should be blocked' },
  // Admins
  { key: 'A1', email: 'a1.owner@nutrilens.test',  name: 'Owner Admin',  kind: 'admin', role: 'owner' },
  { key: 'A2', email: 'a2.super@nutrilens.test',  name: 'Super Admin',  kind: 'admin', role: 'super_admin' },
  { key: 'A3', email: 'a3.admin@nutrilens.test',  name: 'Ops Admin',    kind: 'admin', role: 'admin' },
  { key: 'A4', email: 'a4.marketer@nutrilens.test', name: 'Growth Lead', kind: 'admin', role: 'marketer' },
  { key: 'A5', email: 'a5.support@nutrilens.test', name: 'Support Rep', kind: 'admin', role: 'support' },
  // Brands
  { key: 'B1', email: 'b1.applicant@nutrilens.test', name: 'Brand Applicant', kind: 'brand', brandRole: 'owner', notes: 'Has no brand_members yet' },
  { key: 'B2', email: 'b2.brand-owner@nutrilens.test', name: 'MuscleBlaze Owner', kind: 'brand', brandRole: 'owner' },
  { key: 'B3', email: 'b3.brand-member@nutrilens.test', name: 'MuscleBlaze Junior', kind: 'brand', brandRole: 'manager' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is owner/super_admin via their JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);
    const roles = (callerRoles ?? []).map((r: any) => r.role);
    if (!roles.includes('owner') && !roles.includes('super_admin')) {
      return new Response(JSON.stringify({ error: 'Owner or super_admin required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const created: any[] = [];
    const skipped: any[] = [];
    let brandId: string | null = null;

    // Ensure test brand exists for B2/B3
    const { data: existingBrand } = await admin
      .from('brand_accounts')
      .select('id')
      .eq('brand_name', 'MuscleBlaze (Test)')
      .maybeSingle();

    if (existingBrand) {
      brandId = existingBrand.id;
    } else {
      const { data: newBrand, error: brandErr } = await admin
        .from('brand_accounts')
        .insert({
          brand_name: 'MuscleBlaze (Test)',
          contact_email: 'b2.brand-owner@nutrilens.test',
          status: 'active',
          balance: 10000,
          gstin: '29ABCDE1234F1Z5',
        })
        .select('id')
        .single();
      if (brandErr) throw brandErr;
      brandId = newBrand.id;
    }

    for (const p of PERSONAS) {
      // Check if user already exists
      const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existingUser = existing.users.find((u) => u.email?.toLowerCase() === p.email.toLowerCase());

      let userId: string;
      if (existingUser) {
        userId = existingUser.id;
        skipped.push({ key: p.key, email: p.email, reason: 'already exists', user_id: userId });
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: p.email,
          password: TEST_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: p.name, test_persona: p.key },
        });
        if (createErr) {
          skipped.push({ key: p.key, email: p.email, reason: createErr.message });
          continue;
        }
        userId = newUser.user!.id;
        created.push({ key: p.key, email: p.email, user_id: userId });
      }

      // Profile updates (age, name, onboarding)
      await admin.from('profiles').upsert({
        id: userId,
        name: p.name,
        age: p.age ?? null,
        onboarding_complete: p.kind === 'consumer' && p.key !== 'C5',
      }, { onConflict: 'id' });

      // Subscription for consumers
      if (p.kind === 'consumer' && p.plan && p.plan !== 'free') {
        await admin.from('subscriptions').upsert({
          user_id: userId,
          plan: p.plan,
          status: p.status ?? 'active',
          provider: 'mock',
          environment: 'live',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        }, { onConflict: 'user_id' });
      }

      // Admin roles
      if (p.kind === 'admin' && p.role) {
        await admin.from('user_roles').upsert({ user_id: userId, role: p.role as any })
          .select(); // ignore conflict via RLS-bypass
      }

      // Brand membership (B2 owner, B3 manager). B1 deliberately has no membership.
      if (p.kind === 'brand' && brandId && p.brandRole && p.key !== 'B1') {
        const { data: existingMember } = await admin
          .from('brand_members')
          .select('id')
          .eq('brand_id', brandId)
          .eq('user_id', userId)
          .maybeSingle();
        if (!existingMember) {
          await admin.from('brand_members').insert({
            brand_id: brandId,
            user_id: userId,
            role: p.brandRole,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      password: TEST_PASSWORD,
      brand_id: brandId,
      created,
      skipped,
      personas: PERSONAS.map(p => ({ key: p.key, email: p.email, name: p.name, kind: p.kind, role: p.role, brandRole: p.brandRole, plan: p.plan, notes: p.notes })),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('seed-test-accounts error:', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
