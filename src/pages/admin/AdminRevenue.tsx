import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { bucketByDay, daysAgoISO, inr, todayISO } from '@/lib/admin-metrics';

const PLAN_PRICE_INR: Record<string, number> = {
  madhavan_reset: 1499,
  sugar_cut: 999,
  gym_sprint: 1299,
  celebrity_transformation: 2499,
  wedding_glow: 1999,
};
const planPrice = (t: string) => PLAN_PRICE_INR[t] ?? 999;

interface Plan { id: string; user_id: string; plan_type: string; status: string; start_date: string; end_date: string; created_at: string | null; }
interface Loaded {
  byType: { type: string; active: number; revenue: number }[];
  daily: { day: string; revenue: number }[];
  arpu: number;
  arppu: number;
  churnRisk: { user_id: string; plan_type: string; daysSinceLog: number }[];
}

export default function AdminRevenue() {
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [plansRes, logsRes, profilesCntRes] = await Promise.all([
        supabase.from('event_plans').select('id, user_id, plan_type, status, start_date, end_date, created_at'),
        supabase.from('daily_logs').select('user_id, log_date').gte('log_date', daysAgoISO(7)),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);
      const plans = (plansRes.data ?? []) as Plan[];
      const logs = (logsRes.data ?? []) as { user_id: string; log_date: string }[];
      const totalUsers = profilesCntRes.count ?? 0;

      // By type
      const typeMap = new Map<string, { active: number; revenue: number }>();
      for (const p of plans) {
        if (!typeMap.has(p.plan_type)) typeMap.set(p.plan_type, { active: 0, revenue: 0 });
        const slot = typeMap.get(p.plan_type)!;
        if (p.status === 'active') slot.active++;
        slot.revenue += planPrice(p.plan_type);
      }
      const byType = Array.from(typeMap.entries()).map(([type, v]) => ({ type, ...v }));

      // Daily revenue last 30 days
      const buckets = bucketByDay(plans.map(p => p.created_at), 30);
      const daily = buckets.map((c, i) => ({
        day: daysAgoISO(29 - i).slice(5),
        revenue: c * 1500, // approx
      }));

      // Churn risk: users with active plan and no log in 3+ days
      const lastLogDay = new Map<string, string>();
      for (const l of logs) {
        const cur = lastLogDay.get(l.user_id);
        if (!cur || l.log_date > cur) lastLogDay.set(l.user_id, l.log_date);
      }
      const today = todayISO();
      const activePlans = plans.filter(p => p.status === 'active');
      const churnRisk = activePlans
        .map(p => {
          const last = lastLogDay.get(p.user_id);
          const days = last
            ? Math.floor((new Date(today).getTime() - new Date(last).getTime()) / 86400000)
            : 999;
          return { user_id: p.user_id, plan_type: p.plan_type, daysSinceLog: days };
        })
        .filter(r => r.daysSinceLog > 3)
        .sort((a, b) => b.daysSinceLog - a.daysSinceLog)
        .slice(0, 20);

      const totalRevenue = plans.reduce((s, p) => s + planPrice(p.plan_type), 0);
      const payingUsers = new Set(plans.map(p => p.user_id)).size;
      const arpu = totalUsers ? Math.round(totalRevenue / totalUsers) : 0;
      const arppu = payingUsers ? Math.round(totalRevenue / payingUsers) : 0;

      setData({ byType, daily, arpu, arppu, churnRisk });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-sm text-muted-foreground">Plan revenue (mock prices) · ARPU · churn risk</p>
      </div>

      {loading || !data ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ARPU</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{inr(data.arpu)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">all users</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ARPPU</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{inr(data.arppu)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">paying only</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active plans</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{data.byType.reduce((s, b) => s + b.active, 0)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Churn risk</p>
              <p className="text-2xl font-bold tabular-nums mt-1 text-destructive">{data.churnRisk.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">no log 3d+</p>
            </Card>
          </div>

          <Card className="p-4 mb-4">
            <h3 className="text-sm font-bold mb-3">Revenue (last 30d, ₹)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-bold mb-3">By plan type</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr><th className="text-left py-1">Plan</th><th className="text-right">Active</th><th className="text-right">Revenue</th></tr>
                </thead>
                <tbody>
                  {data.byType.map(r => (
                    <tr key={r.type} className="border-t border-border">
                      <td className="py-2 font-medium">{r.type}</td>
                      <td className="py-2 text-right tabular-nums">{r.active}</td>
                      <td className="py-2 text-right tabular-nums">{inr(r.revenue)}</td>
                    </tr>
                  ))}
                  {!data.byType.length && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No plans yet</td></tr>}
                </tbody>
              </table>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Churn risk</h3>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {data.churnRisk.map(r => (
                  <div key={r.user_id} className="flex items-center justify-between text-xs border-b border-border/40 py-1">
                    <span className="font-mono">{r.user_id.slice(0, 8)}…</span>
                    <Badge variant="outline" className="text-[10px]">{r.plan_type}</Badge>
                    <span className="text-destructive font-bold tabular-nums">{r.daysSinceLog}d</span>
                  </div>
                ))}
                {!data.churnRisk.length && <p className="text-xs text-muted-foreground py-2">No active plans at risk 🎉</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
