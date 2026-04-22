import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Pause, Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { bucketByDay, daysAgoISO, inr } from '@/lib/admin-metrics';
import { logAdminAction } from '@/lib/audit';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  campaign_name: string;
  brand_id: string;
  status: string;
  budget_total: number;
  budget_spent: number;
  pricing_model: string;
  cpm_rate: number | null;
  cpc_rate: number | null;
  start_date: string;
  end_date: string;
  placement_slot: string;
  target_diet: string;
  target_categories: string[] | null;
}

interface Creative {
  id: string;
  headline: string;
  subtitle: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  is_active: boolean;
}

export default function AdminAdDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [brandName, setBrandName] = useState('');
  const [daily, setDaily] = useState<{ day: string; impressions: number; clicks: number }[]>([]);
  const [totals, setTotals] = useState({ imp: 0, clk: 0, cnv: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [c, cr, i, k, n] = await Promise.all([
      supabase.from('ad_campaigns').select('*').eq('id', id).single(),
      supabase.from('ad_creatives').select('*').eq('campaign_id', id),
      supabase.from('ad_impressions').select('campaign_id, created_at').eq('campaign_id', id).gte('created_at', daysAgoISO(30)),
      supabase.from('ad_clicks').select('campaign_id, created_at').eq('campaign_id', id).gte('created_at', daysAgoISO(30)),
      supabase.from('ad_conversions').select('campaign_id').eq('campaign_id', id).gte('created_at', daysAgoISO(30)),
    ]);
    if (c.data) {
      setCampaign(c.data as Campaign);
      const b = await supabase.from('brand_accounts').select('brand_name').eq('id', c.data.brand_id).maybeSingle();
      setBrandName(b.data?.brand_name ?? '—');
    }
    setCreatives((cr.data ?? []) as Creative[]);
    const impDaily = bucketByDay(i.data ?? [], 30);
    const clkDaily = bucketByDay(k.data ?? [], 30);
    setDaily(impDaily.map((row, idx) => ({
      day: row.day.slice(5),
      impressions: row.count,
      clicks: clkDaily[idx]?.count ?? 0,
    })));
    setTotals({
      imp: i.data?.length ?? 0,
      clk: k.data?.length ?? 0,
      cnv: n.data?.length ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const toggle = async () => {
    if (!campaign) return;
    setSaving(true);
    const next = campaign.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('ad_campaigns').update({ status: next }).eq('id', campaign.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await logAdminAction({ action: 'plan_extend', target_table: 'ad_campaigns', metadata: { campaign_id: campaign.id, status: next } });
    toast.success(`Campaign ${next}`);
    setSaving(false);
    load();
  };

  if (loading || !campaign) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const ctr = totals.imp ? (totals.clk / totals.imp) * 100 : 0;
  const cvr = totals.clk ? (totals.cnv / totals.clk) * 100 : 0;
  const utilization = campaign.budget_total > 0 ? (campaign.budget_spent / campaign.budget_total) * 100 : 0;
  const daysTotal = Math.max(1, Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / 86400000));
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - Date.now()) / 86400000));
  const dailyTarget = campaign.budget_total / daysTotal;
  const todaySpend = campaign.budget_spent / Math.max(1, daysTotal - daysLeft);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin/ads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> All campaigns
        </Link>
        <Button onClick={toggle} disabled={saving} variant={campaign.status === 'active' ? 'outline' : 'default'}>
          {campaign.status === 'active' ? <><Pause className="w-4 h-4 mr-2" />Pause</> : <><Play className="w-4 h-4 mr-2" />Resume</>}
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{campaign.campaign_name}</h1>
        <p className="text-sm text-muted-foreground">{brandName} · {campaign.placement_slot} · <Badge variant="outline">{campaign.status}</Badge></p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Impressions (30d)</p><p className="text-2xl font-semibold">{totals.imp.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Clicks · CTR</p><p className="text-2xl font-semibold">{totals.clk.toLocaleString()}</p><p className="text-xs text-muted-foreground">{ctr.toFixed(2)}%</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Conversions · CVR</p><p className="text-2xl font-semibold">{totals.cnv.toLocaleString()}</p><p className="text-xs text-muted-foreground">{cvr.toFixed(2)}%</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Spend / Budget</p><p className="text-2xl font-semibold">{inr(campaign.budget_spent)}</p><p className="text-xs text-muted-foreground">of {inr(campaign.budget_total)} ({utilization.toFixed(0)}%)</p></Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Pacing</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-muted-foreground">Daily target</p><p className="font-semibold">{inr(dailyTarget)}/day</p></div>
          <div><p className="text-muted-foreground">Avg spend/day</p><p className="font-semibold">{inr(todaySpend)}</p></div>
          <div><p className="text-muted-foreground">Days remaining</p><p className="font-semibold">{daysLeft}</p></div>
        </div>
        {todaySpend > dailyTarget * 1.2 && (
          <p className="text-xs text-destructive mt-2">⚠ Pacing 20%+ above daily target — will exhaust early.</p>
        )}
        {todaySpend < dailyTarget * 0.5 && campaign.status === 'active' && (
          <p className="text-xs text-amber-600 mt-2">Underspending — campaign may not deliver full budget.</p>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Daily performance</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="clicks" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Creatives ({creatives.length})</h3>
        <div className="space-y-3">
          {creatives.map((c) => (
            <div key={c.id} className="flex gap-3 p-3 border border-border rounded-lg">
              {c.image_url && <img src={c.image_url} alt={c.headline} className="w-20 h-20 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium">{c.headline}</p>
                {c.subtitle && <p className="text-sm text-muted-foreground">{c.subtitle}</p>}
                <p className="text-xs text-muted-foreground mt-1">CTA: {c.cta_text} → {c.cta_url ?? '—'}</p>
              </div>
              <Badge variant={c.is_active ? 'default' : 'outline'}>{c.is_active ? 'active' : 'off'}</Badge>
            </div>
          ))}
          {creatives.length === 0 && <p className="text-sm text-muted-foreground">No creatives.</p>}
        </div>
      </Card>
    </div>
  );
}
