import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/admin/StatCard';
import {
  Users, Activity, TrendingUp, FileText, MessageSquare, IndianRupee,
  Megaphone, Sparkles, AlertCircle, MapPin, Utensils, CheckCircle2,
} from 'lucide-react';
import { bucketByDay, daysAgoISO, pctDelta, sumField, todayISO, inr } from '@/lib/admin-metrics';

interface Loaded {
  signupsTotal: number;
  signupsSpark: number[];
  signupsDelta: number | null;

  dau: number;
  dauSpark: number[];
  dauDelta: number | null;

  mau: number;
  stickiness: number;

  onboardingPct: number;

  mealsPerActive: number;

  activePlans: number;
  newPlansToday: number;

  revenueToday: number;
  revenueSpark: number[];

  adRevenueToday: number;
  adRevenueSpark: number[];

  topCity: string;

  openFeedback: number;
}

const PLAN_PRICE_INR: Record<string, number> = {
  madhavan_reset: 1499,
  sugar_cut: 999,
  gym_sprint: 1299,
  celebrity_transformation: 2499,
  wedding_glow: 1999,
};
const planPrice = (t: string) => PLAN_PRICE_INR[t] ?? 999;

export default function AdminOverview() {
  const [d, setD] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = todayISO();
        const d7 = daysAgoISO(7);
        const d14 = daysAgoISO(14);
        const d30 = daysAgoISO(30);

        const [profilesAll, logs30, plans, feedbackOpen, apiUsage30] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, created_at, onboarding_complete, city')
            .order('created_at', { ascending: false })
            .limit(5000),
          supabase
            .from('daily_logs')
            .select('user_id, log_date, log_data')
            .gte('log_date', d30),
          supabase
            .from('event_plans')
            .select('id, status, plan_type, created_at, start_date'),
          supabase
            .from('feedback')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'open'),
          supabase
            .from('api_usage')
            .select('cost_inr, created_at')
            .gte('created_at', d30),
        ]);

        const profiles = profilesAll.data ?? [];
        const logs = logs30.data ?? [];
        const allPlans = plans.data ?? [];

        // Signups
        const signupsTotal = profiles.length;
        const signupsSpark = bucketByDay(profiles.map((p: any) => p.created_at), 14);
        const signupsLast7 = signupsSpark.slice(-7).reduce((a, b) => a + b, 0);
        const signupsPrev7 = signupsSpark.slice(-14, -7).reduce((a, b) => a + b, 0);
        const signupsDelta = pctDelta(signupsLast7, signupsPrev7);

        // DAU + MAU
        const todayLogs = logs.filter((l: any) => l.log_date === today);
        const dau = new Set(todayLogs.map((l: any) => l.user_id)).size;
        const last7Logs = logs.filter((l: any) => l.log_date >= d7);
        const mau = new Set(logs.map((l: any) => l.user_id)).size;
        const stickiness = mau ? Math.round((dau / mau) * 100) : 0;

        // DAU spark — distinct users per day across last 14d
        const dauSpark = (() => {
          const buckets: Map<string, Set<string>> = new Map();
          for (let i = 13; i >= 0; i--) buckets.set(daysAgoISO(i), new Set());
          for (const l of logs as any[]) {
            const day = l.log_date;
            const set = buckets.get(day);
            if (set) set.add(l.user_id);
          }
          return Array.from(buckets.values()).map(s => s.size);
        })();
        const dauPrev = dauSpark.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
        const dauCur = dauSpark.slice(-7).reduce((a, b) => a + b, 0) / 7;
        const dauDelta = pctDelta(dauCur, dauPrev);

        // Onboarding %
        const onboarded = profiles.filter((p: any) => p.onboarding_complete).length;
        const onboardingPct = signupsTotal ? Math.round((onboarded / signupsTotal) * 100) : 0;

        // Meals per active user (today)
        let mealsToday = 0;
        for (const l of todayLogs as any[]) {
          const meals = l.log_data?.meals;
          if (Array.isArray(meals)) mealsToday += meals.length;
        }
        const mealsPerActive = dau ? +(mealsToday / dau).toFixed(1) : 0;

        // Plans
        const activePlans = allPlans.filter((p: any) => p.status === 'active').length;
        const newPlansToday = allPlans.filter((p: any) => (p.created_at ?? '').slice(0, 10) === today).length;

        // Revenue today (mock from price map)
        const revenueToday = allPlans
          .filter((p: any) => (p.created_at ?? '').slice(0, 10) === today)
          .reduce((s: number, p: any) => s + planPrice(p.plan_type), 0);
        const revenueSpark = bucketByDay(allPlans.map((p: any) => p.created_at), 14)
          .map((c, i) => {
            // approximate: count * avg price (1500)
            return c * 1500;
          });

        // Ad revenue: api_usage cost as proxy (negative cost = revenue isn't tracked here, so use ad_campaigns budget_spent change)
        // For simplicity show api spend as a proxy stat
        const adRevenueToday = sumField(
          (apiUsage30.data ?? []).filter((r: any) => (r.created_at ?? '').slice(0, 10) === today) as any,
          'cost_inr'
        );
        const adRevenueSpark = bucketByDay(
          (apiUsage30.data ?? []).map((r: any) => r.created_at),
          14
        );

        // Top city
        const cityCounts = new Map<string, number>();
        for (const p of profiles as any[]) {
          if (!p.city) continue;
          cityCounts.set(p.city, (cityCounts.get(p.city) ?? 0) + 1);
        }
        const topCity = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

        setD({
          signupsTotal,
          signupsSpark,
          signupsDelta,
          dau,
          dauSpark,
          dauDelta,
          mau,
          stickiness,
          onboardingPct,
          mealsPerActive,
          activePlans,
          newPlansToday,
          revenueToday,
          revenueSpark,
          adRevenueToday,
          adRevenueSpark,
          topCity,
          openFeedback: feedbackOpen.count ?? 0,
        });
      } catch (e) {
        console.error('[AdminOverview]', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">Operational health · live snapshot · refreshed on load</p>
      </div>

      {loading || !d ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Total signups" value={d.signupsTotal} icon={Users} delta={d.signupsDelta} spark={d.signupsSpark} hint="last 14d" />
          <StatCard label="DAU" value={d.dau} icon={Activity} delta={d.dauDelta} spark={d.dauSpark} hint="active today" accent="text-green-500" />
          <StatCard label="MAU" value={d.mau} icon={TrendingUp} hint="last 30d distinct" accent="text-blue-500" />
          <StatCard label="Stickiness" value={`${d.stickiness}%`} icon={Sparkles} hint="DAU / MAU · 50%+ great" accent="text-purple-500" />

          <StatCard label="Onboarding %" value={`${d.onboardingPct}%`} icon={CheckCircle2} hint="completed onboarding" accent="text-emerald-500" />
          <StatCard label="Meals / active user" value={d.mealsPerActive} icon={Utensils} hint="today" accent="text-orange-500" />
          <StatCard label="Active plans" value={d.activePlans} icon={FileText} hint="paid event plans" accent="text-blue-500" />
          <StatCard label="New plans today" value={d.newPlansToday} icon={Sparkles} accent="text-pink-500" />

          <StatCard label="Revenue today" value={inr(d.revenueToday)} icon={IndianRupee} spark={d.revenueSpark} hint="mock until payments live" accent="text-green-600" />
          <StatCard label="API spend (today)" value={inr(d.adRevenueToday)} icon={Megaphone} spark={d.adRevenueSpark} hint="cost basis" accent="text-amber-500" />
          <StatCard label="Top city" value={d.topCity} icon={MapPin} hint="most signups" accent="text-cyan-500" />
          <StatCard label="Open feedback" value={d.openFeedback} icon={MessageSquare} hint="awaiting reply" accent="text-destructive" />
        </div>
      )}
    </div>
  );
}
