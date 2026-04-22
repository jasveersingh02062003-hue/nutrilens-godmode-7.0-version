import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingDown, TrendingUp, IndianRupee, Loader2, Save, Plus } from 'lucide-react';
import { todayISO, daysAgoISO, inr } from '@/lib/admin-metrics';
import { toast } from 'sonner';

interface CostConstant {
  id: string;
  vendor: string;
  monthly_cost_inr: number;
  notes: string | null;
}

interface UsageRow {
  vendor: string;
  cost_inr: number;
  created_at: string;
  metadata: any;
}

const PLAN_PRICE_INR: Record<string, number> = {
  madhavan_reset: 1499,
  sugar_cut: 999,
  gym_sprint: 1299,
  celebrity_transformation: 2499,
  wedding_glow: 1999,
};

export default function AdminCosts() {
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [constants, setConstants] = useState<CostConstant[]>([]);
  const [revenueMtd, setRevenueMtd] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [mau, setMau] = useState(0);
  const [loading, setLoading] = useState(true);

  // Add-constant form
  const [newVendor, setNewVendor] = useState('');
  const [newCost, setNewCost] = useState('');

  const monthStart = (() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); })();

  const load = async () => {
    setLoading(true);
    const [u, c, plans, dau30] = await Promise.all([
      supabase.from('api_usage').select('vendor, cost_inr, created_at, metadata').gte('created_at', monthStart).order('created_at', { ascending: false }),
      supabase.from('cost_constants').select('*').order('vendor'),
      supabase.from('event_plans').select('plan_type, status, created_at').gte('created_at', monthStart),
      supabase.from('daily_logs').select('user_id, log_date').gte('log_date', daysAgoISO(30)),
    ]);
    setUsage((u.data ?? []) as UsageRow[]);
    setConstants((c.data ?? []) as CostConstant[]);

    const mtdRev = (plans.data ?? []).reduce((s, p: any) => s + (PLAN_PRICE_INR[p.plan_type] ?? 999), 0);
    const todayStr = todayISO();
    const todayRev = (plans.data ?? [])
      .filter((p: any) => (p.created_at ?? '').slice(0, 10) === todayStr)
      .reduce((s, p: any) => s + (PLAN_PRICE_INR[p.plan_type] ?? 999), 0);
    setRevenueMtd(mtdRev);
    setRevenueToday(todayRev);

    const uniq = new Set((dau30.data ?? []).map((r: any) => r.user_id));
    setMau(uniq.size);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const today = todayISO();
  const todayUsage = usage.filter(r => (r.created_at ?? '').slice(0, 10) === today);
  const todayCost = todayUsage.reduce((s, r) => s + Number(r.cost_inr ?? 0), 0);
  const mtdCost = usage.reduce((s, r) => s + Number(r.cost_inr ?? 0), 0);

  const fixedMonthly = constants.reduce((s, c) => s + Number(c.monthly_cost_inr ?? 0), 0);
  const totalMtdCost = mtdCost + (fixedMonthly * (new Date().getDate() / 30));

  const profitToday = revenueToday - todayCost - (fixedMonthly / 30);
  const profitMtd = revenueMtd - totalMtdCost;
  const costPerMau = mau > 0 ? totalMtdCost / mau : 0;

  // Top users by AI cost (group by metadata.user_id)
  const userCosts = new Map<string, number>();
  for (const r of usage) {
    const uid = r.metadata?.user_id ?? 'unknown';
    userCosts.set(uid, (userCosts.get(uid) ?? 0) + Number(r.cost_inr ?? 0));
  }
  const topUsers = Array.from(userCosts.entries())
    .filter(([k]) => k !== 'unknown' && k !== null)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Vendor breakdown
  const byVendor = new Map<string, number>();
  for (const r of usage) byVendor.set(r.vendor, (byVendor.get(r.vendor) ?? 0) + Number(r.cost_inr ?? 0));

  const saveConstant = async (id: string, monthly: number) => {
    const { error } = await supabase.from('cost_constants').update({ monthly_cost_inr: monthly }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
    load();
  };
  const addConstant = async () => {
    if (!newVendor.trim() || !newCost) return;
    const { error } = await supabase.from('cost_constants').insert([{
      vendor: newVendor.trim(),
      monthly_cost_inr: Number(newCost),
    }]);
    if (error) { toast.error(error.message); return; }
    setNewVendor(''); setNewCost('');
    toast.success('Added');
    load();
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          Costs & Profit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live API spend + fixed monthly costs vs subscription revenue.
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard label="API spend today" value={inr(todayCost)} sub={`${todayUsage.length} calls`} icon={IndianRupee} />
        <KpiCard label="API spend MTD" value={inr(mtdCost)} sub={`${usage.length} calls this month`} icon={TrendingDown} />
        <KpiCard
          label="Profit today"
          value={inr(profitToday)}
          sub={`Rev ${inr(revenueToday)} − Cost ${inr(todayCost + fixedMonthly/30)}`}
          icon={profitToday >= 0 ? TrendingUp : TrendingDown}
          tone={profitToday >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          label="Profit MTD"
          value={inr(profitMtd)}
          sub={`Cost/MAU ${inr(costPerMau)}`}
          icon={profitMtd >= 0 ? TrendingUp : TrendingDown}
          tone={profitMtd >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Vendor breakdown + top users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Vendor breakdown (MTD)</h3>
          {byVendor.size === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No API usage logged yet this month.</div>
          ) : (
            <div className="space-y-2">
              {Array.from(byVendor.entries()).sort((a, b) => b[1] - a[1]).map(([v, c]) => (
                <div key={v} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{v}</span>
                  <span className="font-mono">{inr(c)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Top users by AI cost (MTD)</h3>
          {topUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No per-user data yet.</div>
          ) : (
            <div className="space-y-2">
              {topUsers.map(([uid, c]) => (
                <div key={uid} className="flex justify-between items-center text-xs">
                  <span className="font-mono truncate max-w-[60%]">{uid}</span>
                  <span className="font-mono font-semibold">{inr(c)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Fixed monthly costs editor */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Fixed monthly costs</h3>
        <div className="space-y-2">
          {constants.map(c => (
            <ConstantRow key={c.id} c={c} onSave={(v) => saveConstant(c.id, v)} />
          ))}
          {constants.length === 0 && (
            <div className="text-xs text-muted-foreground">No fixed costs configured. Add Supabase, WhatsApp, hosting etc. below.</div>
          )}
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Input placeholder="Vendor (e.g. Supabase Pro)" value={newVendor} onChange={e => setNewVendor(e.target.value)} className="flex-1" />
          <Input type="number" placeholder="₹ / month" value={newCost} onChange={e => setNewCost(e.target.value)} className="w-32" />
          <Button onClick={addConstant} size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Total fixed: <span className="font-mono font-semibold">{inr(fixedMonthly)}/mo</span>
          {' '}(≈ {inr(fixedMonthly / 30)}/day)
        </div>
      </Card>
    </div>
  );
}

function ConstantRow({ c, onSave }: { c: CostConstant; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(c.monthly_cost_inr));
  const dirty = Number(v) !== c.monthly_cost_inr;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm flex-1 font-medium">{c.vendor}</span>
      <Input type="number" value={v} onChange={e => setV(e.target.value)} className="w-32 h-8" />
      <Button size="sm" variant={dirty ? 'default' : 'outline'} disabled={!dirty} onClick={() => onSave(Number(v))}>
        <Save className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, tone }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'positive' | 'negative';
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className={`w-4 h-4 ${tone === 'positive' ? 'text-emerald-500' : tone === 'negative' ? 'text-destructive' : 'text-muted-foreground'}`} />
      </div>
      <div className={`text-2xl font-bold mt-1 ${tone === 'negative' ? 'text-destructive' : ''}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}
