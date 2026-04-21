import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Pause, Play, CheckCircle, BarChart3, Eye, MousePointer, Shield, Sparkles, Trash2, Barcode, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface BrandAccount {
  id: string;
  brand_name: string;
  contact_email: string | null;
  logo_url: string | null;
  balance: number;
  status: string;
}

interface Campaign {
  id: string;
  brand_id: string;
  campaign_name: string;
  placement_slot: string;
  budget_total: number;
  budget_spent: number;
  pricing_model: string;
  cpc_rate: number;
  cpm_rate: number;
  pes_score: number;
  target_categories: string[];
  target_diet: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  brand_accounts?: { brand_name: string };
}

interface CampaignStats {
  impressions: number;
  clicks: number;
  ctr: number;
}

const PLACEMENT_SLOTS = [
  { key: 'hero_banner', label: '🏠 Hero Banner (P1)' },
  { key: 'category_promoted', label: '📂 Category Promoted (P2)' },
  { key: 'search_boost', label: '🔍 Search Boost (P3)' },
  { key: 'compare_sidebar', label: '⚖️ Compare Sidebar (P4)' },
  { key: 'post_meal_nudge', label: '🍽️ Post-Meal Nudge (P5)' },
  { key: 'dashboard_protein_nudge', label: '💪 Dashboard Protein Nudge (P6)' },
  { key: 'dashboard_smart_pick', label: '⭐ Dashboard Smart Pick (P7)' },
  { key: 'post_meal_suggestion', label: '✅ Post-Meal Suggestion (P8)' },
  { key: 'monika_contextual', label: '🤖 Monika Chat Contextual (P9)' },
];

const PRICING_MODELS = [
  { key: 'fixed', label: 'Fixed Duration' },
  { key: 'cpm', label: 'CPM (per 1000 views)' },
  { key: 'cpc', label: 'CPC (per click)' },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/15 text-green-700',
  draft: 'bg-muted text-muted-foreground',
  paused: 'bg-amber-500/15 text-amber-700',
  completed: 'bg-blue-500/15 text-blue-700',
};

function PesBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500/15 text-green-700 border-green-500/20'
    : score >= 50 ? 'bg-amber-500/15 text-amber-700 border-amber-500/20'
    : score >= 30 ? 'bg-orange-500/15 text-orange-700 border-orange-500/20'
    : 'bg-red-500/15 text-red-700 border-red-500/20';

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${color}`}>
      <Shield className="w-2.5 h-2.5" /> PES {score}
    </span>
  );
}

export default function AdAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'campaigns' | 'create_brand' | 'create_campaign'>('campaigns');
  const [seedingBarcodes, setSeedingBarcodes] = useState(false);
  const [brandForm, setBrandForm] = useState({ brand_name: '', contact_email: '', logo_url: '' });
  const [campaignForm, setCampaignForm] = useState({
    brand_id: '',
    campaign_name: '',
    placement_slot: 'hero_banner',
    budget_total: 5000,
    pricing_model: 'fixed',
    cpc_rate: 10,
    cpm_rate: 150,
    pes_score: 50,
    target_diet: 'all',
    target_categories: '' as string,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    headline: '',
    subtitle: '',
    image_url: '',
    cta_text: 'Learn More',
    cta_url: '',
    format: 'native',
  });

  // Admin role check
  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ['admin-role-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch brands
  const { data: brands = [] } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => {
      const { data } = await supabase.from('brand_accounts').select('*');
      return (data || []) as BrandAccount[];
    },
  });

  // Fetch all campaigns (active ones visible via RLS)
  const { data: campaigns = [] } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_campaigns')
        .select('*, brand_accounts(brand_name)')
        .order('created_at', { ascending: false });
      return (data || []) as Campaign[];
    },
  });

  // Fetch stats for all campaigns
  const { data: statsMap = {} } = useQuery({
    queryKey: ['admin-stats', campaigns.map(c => c.id).join(',')],
    enabled: campaigns.length > 0,
    queryFn: async () => {
      const map: Record<string, CampaignStats> = {};
      for (const c of campaigns) {
        const { count: impressions } = await supabase
          .from('ad_impressions')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', c.id);
        const { count: clicks } = await supabase
          .from('ad_clicks')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', c.id);
        const imp = impressions || 0;
        const clk = clicks || 0;
        map[c.id] = { impressions: imp, clicks: clk, ctr: imp > 0 ? (clk / imp) * 100 : 0 };
      }
      return map;
    },
    staleTime: 30000,
  });

  // Auth guards (after all hooks)
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">Sign in required</p>
          <button onClick={() => navigate('/auth')} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Sign In</button>
        </div>
      </div>
    );
  }

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-foreground">Access Denied</p>
          <p className="text-xs text-muted-foreground">You need admin privileges to access this page.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold">Go Home</button>
        </div>
      </div>
    );
  }

  const handleCreateBrand = async () => {
    if (!brandForm.brand_name.trim()) { toast.error('Brand name required'); return; }
    const { error } = await supabase.from('brand_accounts').insert({
      brand_name: brandForm.brand_name,
      contact_email: brandForm.contact_email || null,
      logo_url: brandForm.logo_url || null,
    });
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success('Brand created!');
    setBrandForm({ brand_name: '', contact_email: '', logo_url: '' });
    setView('campaigns');
    queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.brand_id || !campaignForm.campaign_name || !campaignForm.headline) {
      toast.error('Fill brand, campaign name, and headline'); return;
    }
    if (campaignForm.pes_score < 30) {
      toast.error('PES score must be ≥ 30 (Quality Gate)'); return;
    }

    // Create campaign
    const { data: camp, error: campErr } = await supabase.from('ad_campaigns').insert({
      brand_id: campaignForm.brand_id,
      campaign_name: campaignForm.campaign_name,
      placement_slot: campaignForm.placement_slot,
      budget_total: campaignForm.budget_total,
      budget_spent: 0,
      pricing_model: campaignForm.pricing_model,
      cpc_rate: campaignForm.cpc_rate,
      cpm_rate: campaignForm.cpm_rate,
      pes_score: campaignForm.pes_score,
      target_diet: campaignForm.target_diet,
      target_categories: campaignForm.target_categories ? campaignForm.target_categories.split(',').map(s => s.trim()) : [],
      start_date: campaignForm.start_date,
      end_date: campaignForm.end_date,
      status: 'active',
    }).select('id').single();

    if (campErr || !camp) { toast.error('Failed: ' + (campErr?.message || 'Unknown')); return; }

    // Create creative
    await supabase.from('ad_creatives').insert({
      campaign_id: camp.id,
      headline: campaignForm.headline,
      subtitle: campaignForm.subtitle || null,
      image_url: campaignForm.image_url || null,
      cta_text: campaignForm.cta_text,
      cta_url: campaignForm.cta_url || null,
      format: campaignForm.format,
      is_active: true,
    });

    toast.success('Campaign created & active!');
    setView('campaigns');
    queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
  };

  const toggleCampaignStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase.from('ad_campaigns').update({ status: newStatus }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
    toast.success(`Campaign ${newStatus}`);
  };

  const seedBarcodesFromOFF = async () => {
    if (seedingBarcodes) return;
    setSeedingBarcodes(true);
    const t = toast.loading('Looking up barcodes via Open Food Facts… (~1s per product)');
    try {
      const { data, error } = await supabase.functions.invoke('seed-barcodes-off');
      if (error) throw error;
      const s = (data as any)?.summary;
      toast.success(
        s ? `Backfill done: ${s.found} matched · ${s.missed} not found · ${s.errors} errors (of ${s.total})`
          : 'Backfill complete',
        { id: t, duration: 8000 }
      );
    } catch (e: any) {
      toast.error(`Backfill failed: ${e?.message || 'unknown error'}`, { id: t });
    } finally {
      setSeedingBarcodes(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-foreground">Ad Campaign Manager</h1>
            <p className="text-[10px] text-muted-foreground">{campaigns.length} campaigns · {brands.length} brands</p>
          </div>
          <button onClick={() => setView('create_brand')} className="px-2.5 py-1.5 rounded-lg bg-muted text-[10px] font-semibold text-foreground">+ Brand</button>
          <button onClick={() => setView('create_campaign')} className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold">+ Campaign</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
        <AnimatePresence mode="wait">
          {view === 'campaigns' && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-card border border-border text-center">
                  <BarChart3 className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{campaigns.filter(c => c.status === 'active').length}</p>
                  <p className="text-[9px] text-muted-foreground">Active</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border text-center">
                  <Eye className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{Object.values(statsMap).reduce((s, v) => s + v.impressions, 0)}</p>
                  <p className="text-[9px] text-muted-foreground">Impressions</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border text-center">
                  <MousePointer className="w-4 h-4 text-accent mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{Object.values(statsMap).reduce((s, v) => s + v.clicks, 0)}</p>
                  <p className="text-[9px] text-muted-foreground">Clicks</p>
                </div>
              </div>

              {/* Campaign list */}
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No campaigns yet</p>
                  <button onClick={() => setView('create_campaign')} className="text-xs text-primary font-semibold mt-2">Create your first campaign →</button>
                </div>
              ) : (
                campaigns.map((c) => {
                  const stats = statsMap[c.id] || { impressions: 0, clicks: 0, ctr: 0 };
                  const budgetPct = c.budget_total > 0 ? (c.budget_spent / c.budget_total) * 100 : 0;
                  const brandName = (c as any).brand_accounts?.brand_name || 'Unknown';

                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-card border border-border space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{c.campaign_name}</p>
                          <p className="text-[10px] text-muted-foreground">{brandName} · {PLACEMENT_SLOTS.find(s => s.key === c.placement_slot)?.label}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <PesBadge score={c.pes_score} />
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                            {c.status}
                          </span>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground">{stats.impressions}</p>
                          <p className="text-[8px] text-muted-foreground">Views</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground">{stats.clicks}</p>
                          <p className="text-[8px] text-muted-foreground">Clicks</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground">{stats.ctr.toFixed(1)}%</p>
                          <p className="text-[8px] text-muted-foreground">CTR</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground">₹{c.budget_spent.toFixed(0)}</p>
                          <p className="text-[8px] text-muted-foreground">Spent</p>
                        </div>
                      </div>

                      {/* Budget bar */}
                      {c.budget_total > 0 && (
                        <div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-0.5">₹{c.budget_spent.toFixed(0)} / ₹{c.budget_total} ({budgetPct.toFixed(0)}%)</p>
                        </div>
                      )}

                      {/* Date range */}
                      <p className="text-[9px] text-muted-foreground">{c.start_date} → {c.end_date} · {c.pricing_model.toUpperCase()} · Diet: {c.target_diet}</p>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleCampaignStatus(c.id, c.status)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-muted text-xs font-semibold text-foreground"
                        >
                          {c.status === 'active' ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Activate</>}
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {view === 'create_brand' && (
            <motion.div key="brand-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-sm font-bold text-foreground">Add New Brand</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Brand Name *</label>
                  <input value={brandForm.brand_name} onChange={e => setBrandForm(p => ({ ...p, brand_name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" placeholder="e.g. Yoga Bar" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Contact Email</label>
                  <input value={brandForm.contact_email} onChange={e => setBrandForm(p => ({ ...p, contact_email: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" placeholder="brand@email.com" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Logo URL</label>
                  <input value={brandForm.logo_url} onChange={e => setBrandForm(p => ({ ...p, logo_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setView('campaigns')} className="flex-1 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground">Cancel</button>
                <button onClick={handleCreateBrand} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Create Brand</button>
              </div>
            </motion.div>
          )}

          {view === 'create_campaign' && (
            <motion.div key="campaign-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-sm font-bold text-foreground">Create Campaign</h2>

              {brands.length === 0 && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-[11px] text-destructive">
                  No brands yet. <button onClick={() => setView('create_brand')} className="font-bold underline">Create a brand first →</button>
                </div>
              )}

              <div className="space-y-3">
                {/* Brand select */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Brand *</label>
                  <select value={campaignForm.brand_id} onChange={e => setCampaignForm(p => ({ ...p, brand_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground">
                    <option value="">Select brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Campaign Name *</label>
                  <input value={campaignForm.campaign_name} onChange={e => setCampaignForm(p => ({ ...p, campaign_name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" placeholder="e.g. Protein Bar Launch" />
                </div>

                {/* Placement + Pricing */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Placement</label>
                    <select value={campaignForm.placement_slot} onChange={e => setCampaignForm(p => ({ ...p, placement_slot: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-xs text-foreground">
                      {PLACEMENT_SLOTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Pricing</label>
                    <select value={campaignForm.pricing_model} onChange={e => setCampaignForm(p => ({ ...p, pricing_model: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-xs text-foreground">
                      {PRICING_MODELS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Budget + PES */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Budget (₹)</label>
                    <input type="number" value={campaignForm.budget_total} onChange={e => setCampaignForm(p => ({ ...p, budget_total: +e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">PES Score *</label>
                    <input type="number" min={30} max={100} value={campaignForm.pes_score} onChange={e => setCampaignForm(p => ({ ...p, pes_score: +e.target.value }))} className={`w-full px-3 py-2 rounded-xl bg-muted border text-sm text-foreground ${campaignForm.pes_score < 30 ? 'border-destructive' : 'border-border'}`} />
                    {campaignForm.pes_score < 30 && <p className="text-[9px] text-destructive mt-0.5">Min PES 30 required (Quality Gate)</p>}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Start Date</label>
                    <input type="date" value={campaignForm.start_date} onChange={e => setCampaignForm(p => ({ ...p, start_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-xs text-foreground" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">End Date</label>
                    <input type="date" value={campaignForm.end_date} onChange={e => setCampaignForm(p => ({ ...p, end_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-xs text-foreground" />
                  </div>
                </div>

                {/* Diet targeting */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Target Diet</label>
                  <div className="flex gap-2">
                    {['all', 'veg', 'nonveg'].map(d => (
                      <button key={d} onClick={() => setCampaignForm(p => ({ ...p, target_diet: d }))} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold ${campaignForm.target_diet === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {d === 'all' ? 'All' : d === 'veg' ? '🥬 Veg' : '🍗 Non-Veg'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <h3 className="text-xs font-bold text-foreground mb-2">Creative</h3>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Headline *</label>
                  <input value={campaignForm.headline} onChange={e => setCampaignForm(p => ({ ...p, headline: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" placeholder="e.g. Try Yoga Bar — 20g Protein" />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Subtitle</label>
                  <input value={campaignForm.subtitle} onChange={e => setCampaignForm(p => ({ ...p, subtitle: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" placeholder="Best-selling protein bar in India" />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Image URL</label>
                  <input value={campaignForm.image_url} onChange={e => setCampaignForm(p => ({ ...p, image_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" placeholder="https://..." />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">CTA Text</label>
                    <input value={campaignForm.cta_text} onChange={e => setCampaignForm(p => ({ ...p, cta_text: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">CTA URL</label>
                    <input value={campaignForm.cta_url} onChange={e => setCampaignForm(p => ({ ...p, cta_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground" placeholder="https://..." />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setView('campaigns')} className="flex-1 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground">Cancel</button>
                <button onClick={handleCreateCampaign} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Launch Campaign</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
