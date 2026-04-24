import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { bucketByDay, daysAgoISO, inr } from '@/lib/admin-metrics';
import { toast } from 'sonner';

interface Campaign {
  id: string; campaign_name: string; brand_id: string; status: string;
  budget_total: number; budget_spent: number; pricing_model: string;
  start_date: string; end_date: string;
}

interface Imp { campaign_id: string; placement_slot: string; created_at: string; }
interface Click { campaign_id: string; created_at: string; }
interface Conv { campaign_id: string; conversion_type: string; }
interface Brand { id: string; brand_name: string; }

interface FunnelRow {
  id: string;
  name: string;
  brand: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  spend: number;
  budget: number;
  cpm: number;
  cpc: number;
  status: string;
}

export default function AdminAds() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [daily, setDaily] = useState<{ day: string; impressions: number; clicks: number }[]>([]);
  const [totals, setTotals] = useState({ imp: 0, clk: 0, cnv: 0, spend: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'active'>('all');
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [c, b, i30, k30, n30] = await Promise.all([
      supabase.from('ad_campaigns').select('*'),
      supabase.from('brand_accounts').select('id, brand_name'),
      supabase.from('ad_impressions').select('campaign_id, placement_slot, created_at').gte('created_at', daysAgoISO(30)),
      supabase.from('ad_clicks').select('campaign_id, created_at').gte('created_at', daysAgoISO(30)),
      supabase.from('ad_conversions').select('campaign_id, conversion_type').gte('created_at', daysAgoISO(30)),
    ]);

    const camps = (c.data ?? []) as Campaign[];
    const brands = (b.data ?? []) as Brand[];
    const imps = (i30.data ?? []) as Imp[];
    const clks = (k30.data ?? []) as Click[];
    const cnvs = (n30.data ?? []) as Conv[];
    const brandMap = new Map(brands.map(x => [x.id, x.brand_name]));

    const impByCamp = new Map<string, number>();
    const clkByCamp = new Map<string, number>();
    const cnvByCamp = new Map<string, number>();
    for (const x of imps) impByCamp.set(x.campaign_id, (impByCamp.get(x.campaign_id) ?? 0) + 1);
    for (const x of clks) clkByCamp.set(x.campaign_id, (clkByCamp.get(x.campaign_id) ?? 0) + 1);
    for (const x of cnvs) cnvByCamp.set(x.campaign_id, (cnvByCamp.get(x.campaign_id) ?? 0) + 1);

    const funnel: FunnelRow[] = camps.map(c => {
      const impressions = impByCamp.get(c.id) ?? 0;
      const clicks = clkByCamp.get(c.id) ?? 0;
      const conversions = cnvByCamp.get(c.id) ?? 0;
      const spend = Number(c.budget_spent ?? 0);
      return {
        id: c.id,
        name: c.campaign_name,
        brand: brandMap.get(c.brand_id) ?? '—',
        impressions, clicks, conversions,
        ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
        cvr: clicks ? +(conversions / clicks * 100).toFixed(2) : 0,
        spend,
        budget: Number(c.budget_total ?? 0),
        cpm: impressions ? +(spend / (impressions / 1000)).toFixed(2) : 0,
        cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
        status: c.status,
      };
    });

    const impSpark = bucketByDay(imps.map(x => x.created_at), 30);
    const clkSpark = bucketByDay(clks.map(x => x.created_at), 30);
    const dailyRows = impSpark.map((v, i) => ({
      day: daysAgoISO(29 - i).slice(5),
      impressions: v,
      clicks: clkSpark[i],
    }));

    setCampaigns(camps);
    setRows(funnel);
    setDaily(dailyRows);
    setTotals({
      imp: imps.length,
      clk: clks.length,
      cnv: cnvs.length,
      spend: camps.reduce((s, c) => s + Number(c.budget_spent ?? 0), 0),
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const review = async (id: string, decision: 'approve' | 'reject') => {
    setReviewing(id);
    const { error } = await supabase.rpc('review_campaign', { p_campaign_id: id, p_decision: decision, p_reason: null });
    setReviewing(null);
    if (error) { toast.error(error.message); return; }
    toast.success(decision === 'approve' ? 'Campaign approved' : 'Campaign rejected');
    load();
  };

  const pendingCount = rows.filter(r => r.status === 'pending_review').length;
  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter);


  const overallCTR = totals.imp ? (totals.clk / totals.imp * 100).toFixed(2) : '0.00';
  const overallCVR = totals.clk ? (totals.cnv / totals.clk * 100).toFixed(2) : '0.00';

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ads</h1>
        <p className="text-sm text-muted-foreground">Funnel · CPM/CPC · brand ROI · last 30 days</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Card className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Impressions</p><p className="text-xl font-bold tabular-nums mt-1">{totals.imp.toLocaleString()}</p></Card>
            <Card className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Clicks</p><p className="text-xl font-bold tabular-nums mt-1">{totals.clk.toLocaleString()}</p></Card>
            <Card className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversions</p><p className="text-xl font-bold tabular-nums mt-1">{totals.cnv.toLocaleString()}</p></Card>
            <Card className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">CTR · CVR</p><p className="text-xl font-bold tabular-nums mt-1">{overallCTR}% · {overallCVR}%</p></Card>
            <Card className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total spend</p><p className="text-xl font-bold tabular-nums mt-1">{inr(totals.spend)}</p></Card>
          </div>

          <Card className="p-4 mb-4">
            <h3 className="text-sm font-bold mb-3">Daily impressions vs clicks</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="impressions" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="clicks" fill="hsl(var(--secondary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground mr-2">Filter:</span>
              {(['all','pending_review','active'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2 py-1 rounded ${filter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {f === 'pending_review' ? `Pending review${pendingCount ? ` (${pendingCount})` : ''}` : f}
                </button>
              ))}
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-left">Campaign</th>
                    <th className="px-3 py-3 text-left">Brand</th>
                    <th className="px-3 py-3 text-right">Imp</th>
                    <th className="px-3 py-3 text-right">Clk</th>
                    <th className="px-3 py-3 text-right">Cnv</th>
                    <th className="px-3 py-3 text-right">CTR</th>
                    <th className="px-3 py-3 text-right">Spend</th>
                    <th className="px-3 py-3 text-right">Util</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const util = r.budget ? Math.round((r.spend / r.budget) * 100) : 0;
                    const isPending = r.status === 'pending_review';
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium truncate max-w-[160px]">
                          <a href={`/admin/ads/${r.id}`} className="text-primary hover:underline">{r.name}</a>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{r.brand}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.impressions.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.clicks}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.conversions}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.ctr}%</td>
                        <td className="px-3 py-2 text-right tabular-nums">{inr(r.spend)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span className={util > 90 ? 'text-destructive font-bold' : util > 50 ? 'text-amber-500' : ''}>{util}%</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={r.status === 'active' ? 'default' : isPending ? 'secondary' : 'outline'} className="text-[10px]">{r.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isPending ? (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" className="h-7 px-2" disabled={reviewing === r.id} onClick={() => review(r.id, 'approve')}>
                                <Check className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2" disabled={reviewing === r.id} onClick={() => review(r.id, 'reject')}>
                                <X className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <a href={`/admin/ads/${r.id}`} className="text-xs text-muted-foreground hover:text-foreground">View</a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No campaigns in this view.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
