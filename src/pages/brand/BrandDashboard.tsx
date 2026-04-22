import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { inr, daysAgoISO } from '@/lib/admin-metrics';
import { Link } from 'react-router-dom';

interface BrandLite { id: string; brand_name: string; balance: number; status: string; }
interface CampLite { id: string; campaign_name: string; status: string; budget_total: number; budget_spent: number; }

export default function BrandDashboard() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<BrandLite[]>([]);
  const [camps, setCamps] = useState<CampLite[]>([]);
  const [stats, setStats] = useState({ imp: 0, clk: 0, cnv: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: members } = await supabase.from('brand_members').select('brand_id').eq('user_id', user.id);
      const ids = (members ?? []).map((m: any) => m.brand_id);
      if (!ids.length) {
        setLoading(false);
        return;
      }
      const [b, c] = await Promise.all([
        supabase.from('brand_accounts').select('id, brand_name, balance, status').in('id', ids),
        supabase.from('ad_campaigns').select('id, campaign_name, status, budget_total, budget_spent').in('brand_id', ids),
      ]);
      setBrands((b.data ?? []) as BrandLite[]);
      setCamps((c.data ?? []) as CampLite[]);
      const campIds = (c.data ?? []).map((x: any) => x.id);
      if (campIds.length) {
        const since = daysAgoISO(30);
        const [imp, clk, cnv] = await Promise.all([
          supabase.from('ad_impressions').select('id', { count: 'exact', head: true }).in('campaign_id', campIds).gte('created_at', since),
          supabase.from('ad_clicks').select('id', { count: 'exact', head: true }).in('campaign_id', campIds).gte('created_at', since),
          supabase.from('ad_conversions').select('id', { count: 'exact', head: true }).in('campaign_id', campIds).gte('created_at', since),
        ]);
        setStats({ imp: imp.count ?? 0, clk: clk.count ?? 0, cnv: cnv.count ?? 0 });
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const ctr = stats.imp ? ((stats.clk / stats.imp) * 100).toFixed(2) : '0.00';
  const cvr = stats.clk ? ((stats.cnv / stats.clk) * 100).toFixed(2) : '0.00';
  const totalBalance = brands.reduce((s, b) => s + Number(b.balance), 0);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Brand portal</h1>
      <p className="text-sm text-muted-foreground mb-6">{brands.map(b => b.brand_name).join(' · ') || 'No brands linked'}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wallet</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{inr(totalBalance)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Impressions (30d)</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{stats.imp.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CTR</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{ctr}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CVR</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{cvr}%</p>
        </Card>
      </div>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-bold mb-3">Campaigns</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr><th className="text-left py-1">Name</th><th className="text-left">Status</th><th className="text-right">Spend</th><th className="text-right">Budget</th><th className="text-right">Util</th></tr>
          </thead>
          <tbody>
            {camps.map(c => {
              const util = c.budget_total ? Math.round((Number(c.budget_spent) / Number(c.budget_total)) * 100) : 0;
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2 font-medium">{c.campaign_name}</td>
                  <td className="py-2"><Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{c.status}</Badge></td>
                  <td className="py-2 text-right tabular-nums">{inr(Number(c.budget_spent))}</td>
                  <td className="py-2 text-right tabular-nums">{inr(Number(c.budget_total))}</td>
                  <td className="py-2 text-right tabular-nums">{util}%</td>
                </tr>
              );
            })}
            {!camps.length && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">No campaigns yet</td></tr>}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Need to launch a new campaign? <Link to="/admin/ads" className="text-primary underline">Contact your account manager</Link>.
        Self-serve campaign creation coming soon.
      </p>
    </div>
  );
}
