import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crown, TrendingUp, TrendingDown, Sparkles, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { bucketByDay, daysAgoISO, inr } from '@/lib/admin-metrics';

interface SubRow {
  user_id: string;
  plan: 'free' | 'premium' | 'ultra';
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  trial_end: string | null;
  created_at: string;
}
interface PaymentRow {
  id: string;
  user_id: string;
  event_type: string;
  amount_inr: number | null;
  created_at: string;
}

const MONTHLY_PRICE = 149;
const YEARLY_PRICE = 1499;

export default function AdminSubscriptions() {
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  useEffect(() => {
    (async () => {
      const [subsRes, payRes] = await Promise.all([
        supabase.from('subscriptions').select('user_id, plan, status, cancel_at_period_end, current_period_end, trial_end, created_at'),
        supabase.from('payment_events').select('id, user_id, event_type, amount_inr, created_at').gte('created_at', daysAgoISO(30)).order('created_at', { ascending: false }),
      ]);
      setSubs((subsRes.data ?? []) as SubRow[]);
      setPayments((payRes.data ?? []) as PaymentRow[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const paying = subs.filter(s => s.plan !== 'free' && s.status === 'active');
  const trialing = subs.filter(s => s.status === 'trialing');
  const cancelling = subs.filter(s => s.cancel_at_period_end && s.status === 'active');
  const ultra = subs.filter(s => s.plan === 'ultra' && s.status === 'active');

  // Estimate MRR: each active premium = ₹149/mo (yearly amortized = ₹125/mo, but mock can't tell, so use last payment amount)
  // For now, count active paying users × monthly equivalent
  const mrr = paying.length * MONTHLY_PRICE;
  const arr = mrr * 12;

  const subscribeEvents = payments.filter(p => p.event_type === 'subscribe');
  const cancelEvents = payments.filter(p => p.event_type === 'cancel' || p.event_type === 'admin_cancel');
  const monthRevenue = subscribeEvents.reduce((s, p) => s + (p.amount_inr ?? 0), 0);

  // Daily buckets last 30d
  const subDays = bucketByDay(subscribeEvents.map(p => p.created_at), 30);
  const cancelDays = bucketByDay(cancelEvents.map(p => p.created_at), 30);
  const chart = subDays.map((sub, i) => ({
    day: daysAgoISO(29 - i).slice(5),
    Subscribed: sub,
    Cancelled: cancelDays[i],
  }));

  const totalUsers = subs.length;
  const conversionPct = totalUsers ? Math.round((paying.length / totalUsers) * 1000) / 10 : 0;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="w-6 h-6 text-primary" /> Subscriptions
        </h1>
        <p className="text-sm text-muted-foreground">Live MRR/ARR · trial funnel · churn (mock payments)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="MRR" value={inr(mrr)} sub={`${paying.length} active payers`} icon={TrendingUp} />
        <KPI label="ARR" value={inr(arr)} sub="Annualized run-rate" icon={Sparkles} />
        <KPI label="Trial users" value={String(trialing.length)} sub="Currently in 3-day trial" icon={Users} />
        <KPI label="Cancelling" value={String(cancelling.length)} sub="Will not auto-renew" icon={TrendingDown} dim />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total users</p>
          <p className="text-xl font-bold tabular-nums mt-1">{totalUsers}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversion</p>
          <p className="text-xl font-bold tabular-nums mt-1">{conversionPct}%</p>
          <p className="text-[10px] text-muted-foreground">Free → Paid</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ultra users</p>
          <p className="text-xl font-bold tabular-nums mt-1">{ultra.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">30d revenue</p>
          <p className="text-xl font-bold tabular-nums mt-1">{inr(monthRevenue)}</p>
        </Card>
      </div>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-bold mb-3">Subscribe vs cancel · last 30 days</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Subscribed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cancelled" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-bold mb-3">Recent payment events</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {payments.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">No events yet</p>
          )}
          {payments.slice(0, 50).map(p => (
            <div key={p.id} className="flex items-center justify-between text-xs border-b border-border/40 py-2">
              <Badge variant="outline" className="text-[9px]">{p.event_type}</Badge>
              <span className="font-mono text-[10px] text-muted-foreground truncate flex-1 px-2">{p.user_id.slice(0, 8)}…</span>
              <span className="font-medium tabular-nums w-16 text-right">{p.amount_inr ? `₹${p.amount_inr}` : '—'}</span>
              <span className="text-muted-foreground text-[10px] w-32 text-right">{new Date(p.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function KPI({ label, value, sub, icon: Icon, dim }: { label: string; value: string; sub?: string; icon: any; dim?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${dim ? 'text-destructive' : 'text-primary'}`} />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </Card>
  );
}
