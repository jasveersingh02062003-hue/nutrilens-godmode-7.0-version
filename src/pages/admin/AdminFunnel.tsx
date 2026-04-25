// Funnel Analytics Dashboard
// Reads from public.events (event_name + user_id + created_at) and public.subscriptions
// to produce a step-by-step conversion funnel: signup → onboarding_complete →
// first_meal_logged → 7-day retained → paywall_viewed → subscription_started.
//
// All math is done client-side after a single bounded query — no SQL functions
// needed. RLS already gates the events table to admins/marketers.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingDown, TrendingUp, Users, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { daysAgoISO, pctDelta } from '@/lib/admin-metrics';

type RangeKey = '7d' | '30d' | '90d';

const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90 };

interface Step {
  key: string;
  label: string;
  count: number;
  pctOfTop: number;
  pctOfPrev: number;
  dropoff: number; // users lost vs previous step
}

interface FunnelData {
  steps: Step[];
  windowUsers: number;
}

const STEP_DEFS: Array<{ key: string; label: string; event?: string; computed?: 'retained_7d' | 'subscribed' }> = [
  { key: 'signup',              label: 'Signup',              event: 'signup' },
  { key: 'onboarding_complete', label: 'Completed onboarding', event: 'onboarding_complete' },
  { key: 'first_meal_logged',   label: 'Logged first meal',   event: 'first_meal_logged' },
  { key: 'activated',           label: 'Activated (3 meals day 1)', event: 'activated' },
  { key: 'retained_7d',         label: 'Active after 7 days', computed: 'retained_7d' },
  { key: 'paywall_viewed',      label: 'Viewed paywall',      event: 'paywall_viewed' },
  { key: 'subscription_started',label: 'Started subscription',event: 'subscription_started' },
];

async function loadFunnel(days: number): Promise<FunnelData> {
  // Server-side aggregation. Returns one row per step (no PII, no raw events).
  // Replaces the previous client-side approach that pulled up to 120,000 rows
  // into the browser and risked OOM on large datasets.
  const { data: rows, error } = await supabase.rpc('get_funnel_counts', { p_days: days });
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const def of STEP_DEFS) counts[def.key] = 0;
  for (const r of (rows ?? []) as Array<{ step_key: string; user_count: number }>) {
    counts[r.step_key] = Number(r.user_count) || 0;
  }

  const top = counts['signup'] ?? 0;

  const steps: Step[] = STEP_DEFS.map((def, i) => {
    const c = counts[def.key];
    const prev = i === 0 ? c : counts[STEP_DEFS[i - 1].key];
    return {
      key: def.key,
      label: def.label,
      count: c,
      pctOfTop: top ? (c / top) * 100 : 0,
      pctOfPrev: prev ? (c / prev) * 100 : 0,
      dropoff: Math.max(0, prev - c),
    };
  });

  return { steps, windowUsers: top };
}

export default function AdminFunnel() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [data, setData] = useState<FunnelData | null>(null);
  const [prev, setPrev] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const days = RANGE_DAYS[range];
      // current + previous comparison window
      const [cur, prv] = await Promise.all([
        loadFunnel(days),
        loadFunnel(days * 2).then(d => {
          // Approximate prior period: subtract current-window distinct counts.
          // For an MVP this gives directional signal; exact split would need
          // two ranged queries which we can add later.
          const subSteps = d.steps.map((s, i) => ({
            ...s,
            count: Math.max(0, s.count - (data?.steps[i]?.count ?? 0)),
          }));
          return { ...d, steps: subSteps };
        }),
      ]);
      if (!cancelled) {
        setData(cur);
        setPrev(prv);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const biggestDropoff = useMemo(() => {
    if (!data) return null;
    let worst: Step | null = null;
    for (let i = 1; i < data.steps.length; i++) {
      const s = data.steps[i];
      if (!worst || s.dropoff > worst.dropoff) worst = s;
    }
    return worst;
  }, [data]);

  if (loading || !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chartData = data.steps.map(s => ({ name: s.label, value: s.count, pct: s.pctOfTop }));
  const palette = ['hsl(var(--primary))', 'hsl(var(--primary)/.85)', 'hsl(var(--primary)/.7)', 'hsl(var(--primary)/.55)', 'hsl(var(--primary)/.4)', 'hsl(var(--primary)/.25)'];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Funnel Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track where users drop off between signup and paid conversion.
          </p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Top callout */}
      {data.windowUsers === 0 ? (
        <Card className="p-6 border-dashed">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">No signup events in this window yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Once users start signing up, the funnel will populate automatically.
              </p>
            </div>
          </div>
        </Card>
      ) : biggestDropoff && (
        <Card className="p-4 bg-destructive/5 border-destructive/20">
          <div className="flex items-start gap-3">
            <TrendingDown className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                Biggest drop-off: <span className="text-destructive">{biggestDropoff.label}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lost {biggestDropoff.dropoff} users at this step ({(100 - biggestDropoff.pctOfPrev).toFixed(1)}% drop). Fix this first for the biggest impact.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Funnel chart */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Conversion funnel</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, _n, p: any) => [`${v} users (${p.payload.pct.toFixed(1)}%)`, 'Count']}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Step details */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Step-by-step breakdown</h2>
        <div className="space-y-1">
          {data.steps.map((s, i) => {
            const prevCount = prev?.steps[i]?.count ?? 0;
            const delta = pctDelta(s.count, prevCount);
            return (
              <div key={s.key} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <div className="w-6 h-6 rounded-full bg-muted text-xs font-medium flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium truncate">{s.label}</p>
                    <p className="text-sm font-semibold tabular-nums">{s.count.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-[11px] text-muted-foreground">
                      {s.pctOfTop.toFixed(1)}% of top
                    </p>
                    {i > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        <ChevronRight className="w-3 h-3 inline -mt-0.5" />
                        {s.pctOfPrev.toFixed(1)}% of prev step
                      </p>
                    )}
                    {delta !== null && Math.abs(delta) > 0.5 && (
                      <p className={`text-[11px] flex items-center gap-0.5 ${delta > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(delta).toFixed(0)}% vs prior
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Funnel reads from event logs (`signup`, `onboarding_complete`, `first_meal_logged`, `meal_logged`, `paywall_viewed`, `subscription_started`).
        Numbers are distinct users in the selected window. "Active after 7 days" counts users whose signup was in-window AND who returned ≥7 days later.
      </p>
    </div>
  );
}
