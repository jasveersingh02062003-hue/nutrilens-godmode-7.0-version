import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Users, Activity, TrendingUp, MessageSquare, FileText, DollarSign } from 'lucide-react';

interface KPIs {
  totalUsers: number;
  signupsToday: number;
  active7d: number;
  activePlans: number;
  openFeedback: number;
  apiSpend: number;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = todayISO();
        const sevenDaysAgo = daysAgoISO(7);

        const [usersRes, todayRes, activeRes, plansRes, feedbackRes, apiRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today),
          supabase.from('daily_logs').select('user_id').gte('log_date', sevenDaysAgo),
          supabase.from('event_plans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('api_usage').select('cost_inr').gte('created_at', sevenDaysAgo),
        ]);

        const uniqueActive = new Set((activeRes.data ?? []).map((r: any) => r.user_id)).size;
        const apiSpend = (apiRes.data ?? []).reduce((sum: number, r: any) => sum + Number(r.cost_inr || 0), 0);

        setKpis({
          totalUsers: usersRes.count ?? 0,
          signupsToday: todayRes.count ?? 0,
          active7d: uniqueActive,
          activePlans: plansRes.count ?? 0,
          openFeedback: feedbackRes.count ?? 0,
          apiSpend,
        });
      } catch (e) {
        console.error('[AdminDashboard]', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = kpis ? [
    { label: 'Total users', value: kpis.totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Signups today', value: kpis.signupsToday, icon: TrendingUp, color: 'text-secondary' },
    { label: 'Active (7d)', value: kpis.active7d, icon: Activity, color: 'text-green-500' },
    { label: 'Active plans', value: kpis.activePlans, icon: FileText, color: 'text-blue-500' },
    { label: 'Open feedback', value: kpis.openFeedback, icon: MessageSquare, color: 'text-orange-500' },
    { label: 'API spend (7d)', value: `₹${kpis.apiSpend.toFixed(2)}`, icon: DollarSign, color: 'text-purple-500' },
  ] : [];

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-8">Operational overview of NutriLens</p>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 h-24 animate-pulse bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {cards.map(c => (
            <Card key={c.label} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</div>
                  <div className="text-3xl font-bold mt-2">{c.value}</div>
                </div>
                <c.icon className={`w-8 h-8 ${c.color}`} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
