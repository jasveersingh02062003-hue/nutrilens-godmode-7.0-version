import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SeedPersona {
  key: string;
  email: string;
  name: string;
  kind: string;
  role?: string;
  brandRole?: string;
  plan?: string;
  notes?: string;
}

interface SeedResult {
  ok: boolean;
  password: string;
  brand_id?: string;
  created: Array<{ key: string; email: string; user_id: string }>;
  skipped: Array<{ key: string; email: string; reason: string; user_id?: string }>;
  personas: SeedPersona[];
}

export default function AdminSeedAccounts() {
  const { isOwner, isSuperAdmin, isLoading: roleLoading } = useAdminRole();
  const canSeed = isOwner || isSuperAdmin;
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  const runSeed = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-test-accounts', {
        body: {},
      });
      if (error) throw error;
      setResult(data as SeedResult);
      toast.success(`Seeded ${(data as SeedResult).created.length} new accounts`);
    } catch (e: any) {
      toast.error(e.message ?? 'Seeder failed');
    } finally {
      setRunning(false);
    }
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success('Email copied');
  };

  if (roleLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  if (!canSeed) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-6 text-center">
          <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <h2 className="font-semibold">Owner access required</h2>
          <p className="text-sm text-muted-foreground mt-1">Only owners and super-admins can seed test accounts.</p>
        </Card>
      </div>
    );
  }

  const personas = result?.personas ?? DEFAULT_PERSONAS;
  const createdMap = new Map((result?.created ?? []).map(c => [c.key, c]));
  const skippedMap = new Map((result?.skipped ?? []).map(s => [s.key, s]));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Seed Test Accounts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create 13 pre-configured QA personas (5 consumers, 5 admins, 3 brand users).
          Re-running is safe — existing accounts are skipped.
        </p>
      </div>

      <Card className="p-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-sm">Test password (all accounts)</div>
          <code className="text-xs font-mono">{result?.password ?? 'TestPass123!'}</code>
        </div>
        <Button onClick={runSeed} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {result ? 'Re-run seeder' : 'Run seeder'}
        </Button>
      </Card>

      <div className="grid gap-3">
        {(['consumer', 'admin', 'brand'] as const).map(group => (
          <div key={group}>
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{group}s</h2>
            <Card className="divide-y divide-border">
              {personas.filter(p => p.kind === group).map(p => {
                const created = createdMap.get(p.key);
                const skipped = skippedMap.get(p.key);
                return (
                  <div key={p.key} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{p.key}</Badge>
                        <span className="font-medium text-sm">{p.name}</span>
                        {p.role && <Badge variant="secondary" className="text-[10px]">{p.role}</Badge>}
                        {p.brandRole && <Badge variant="secondary" className="text-[10px]">brand:{p.brandRole}</Badge>}
                        {p.plan && p.plan !== 'free' && <Badge className="text-[10px]">{p.plan}</Badge>}
                      </div>
                      <button
                        onClick={() => copyEmail(p.email)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                      >
                        {p.email} <Copy className="w-3 h-3" />
                      </button>
                      {p.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5">{p.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {created && (
                        <span className="text-[11px] text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> created
                        </span>
                      )}
                      {skipped && (
                        <span className="text-[11px] text-muted-foreground" title={skipped.reason}>
                          {skipped.reason === 'already exists' ? 'exists' : 'skipped'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_PERSONAS: SeedPersona[] = [
  { key: 'C1', email: 'c1.free@nutrilens.test', name: 'Priya Free', kind: 'consumer', plan: 'free', notes: 'Free tier' },
  { key: 'C2', email: 'c2.pro@nutrilens.test', name: 'Rahul Pro', kind: 'consumer', plan: 'premium' },
  { key: 'C3', email: 'c3.ultra@nutrilens.test', name: 'Anjali Ultra', kind: 'consumer', plan: 'ultra' },
  { key: 'C4', email: 'c4.event@nutrilens.test', name: 'Karan Event', kind: 'consumer', plan: 'premium' },
  { key: 'C5', email: 'c5.minor@nutrilens.test', name: 'Aarav Minor', kind: 'consumer', plan: 'free', notes: 'Minor — should be blocked' },
  { key: 'A1', email: 'a1.owner@nutrilens.test', name: 'Owner Admin', kind: 'admin', role: 'owner' },
  { key: 'A2', email: 'a2.super@nutrilens.test', name: 'Super Admin', kind: 'admin', role: 'super_admin' },
  { key: 'A3', email: 'a3.admin@nutrilens.test', name: 'Ops Admin', kind: 'admin', role: 'admin' },
  { key: 'A4', email: 'a4.marketer@nutrilens.test', name: 'Growth Lead', kind: 'admin', role: 'marketer' },
  { key: 'A5', email: 'a5.support@nutrilens.test', name: 'Support Rep', kind: 'admin', role: 'support' },
  { key: 'B1', email: 'b1.applicant@nutrilens.test', name: 'Brand Applicant', kind: 'brand', notes: 'No brand membership yet' },
  { key: 'B2', email: 'b2.brand-owner@nutrilens.test', name: 'MuscleBlaze Owner', kind: 'brand', brandRole: 'owner' },
  { key: 'B3', email: 'b3.brand-member@nutrilens.test', name: 'MuscleBlaze Junior', kind: 'brand', brandRole: 'manager' },
];
