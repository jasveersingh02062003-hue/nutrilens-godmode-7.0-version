import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import { daysAgoISO } from '@/lib/admin-metrics';

interface Cohort {
  week: string;
  size: number;
  d1: number;
  d3: number;
  d7: number;
  d14: number;
  d30: number;
}

function startOfWeek(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function AdminRetention() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [funnel, setFunnel] = useState<{ stage: string; count: number; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = daysAgoISO(60);
      const [profilesRes, logsRes, plansRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at, onboarding_complete').gte('created_at', since).limit(5000),
        supabase.from('daily_logs').select('user_id, log_date').gte('log_date', since),
        supabase.from('event_plans').select('user_id'),
      ]);

      const profiles = profilesRes.data ?? [];
      const logs = logsRes.data ?? [];
      const plans = plansRes.data ?? [];

      // Build user → first log date
      const firstLog = new Map<string, string>();
      for (const l of logs as any[]) {
        const cur = firstLog.get(l.user_id);
        if (!cur || l.log_date < cur) firstLog.set(l.user_id, l.log_date);
      }
      const userLogDates = new Map<string, Set<string>>();
      for (const l of logs as any[]) {
        if (!userLogDates.has(l.user_id)) userLogDates.set(l.user_id, new Set());
        userLogDates.get(l.user_id)!.add(l.log_date);
      }

      // Cohort: signup week
      const cohortMap = new Map<string, { ids: string[]; signups: Map<string, string> }>();
      for (const p of profiles as any[]) {
        if (!p.created_at) continue;
        const w = startOfWeek(p.created_at.slice(0, 10));
        if (!cohortMap.has(w)) cohortMap.set(w, { ids: [], signups: new Map() });
        cohortMap.get(w)!.ids.push(p.id);
        cohortMap.get(w)!.signups.set(p.id, p.created_at.slice(0, 10));
      }

      const cohortRows: Cohort[] = [];
      for (const [week, info] of cohortMap.entries()) {
        const row: Cohort = { week, size: info.ids.length, d1: 0, d3: 0, d7: 0, d14: 0, d30: 0 };
        for (const uid of info.ids) {
          const signup = info.signups.get(uid)!;
          const dates = userLogDates.get(uid);
          if (!dates) continue;
          const targets = [1, 3, 7, 14, 30] as const;
          for (const n of targets) {
            // active on day N or later within window
            for (const d of dates) {
              const diff = diffDays(signup, d);
              if (diff >= n - 1 && diff <= n + 1) {
                if (n === 1) row.d1++;
                else if (n === 3) row.d3++;
                else if (n === 7) row.d7++;
                else if (n === 14) row.d14++;
                else if (n === 30) row.d30++;
                break;
              }
            }
          }
        }
        cohortRows.push(row);
      }
      cohortRows.sort((a, b) => a.week.localeCompare(b.week));
      setCohorts(cohortRows.slice(-8));

      // Activation funnel
      const total = profiles.length;
      const onboarded = profiles.filter((p: any) => p.onboarding_complete).length;
      const firstMeal = new Set(firstLog.keys()).size;
      const active7d = (() => {
        let n = 0;
        for (const [uid, dates] of userLogDates.entries()) if (dates.size >= 7) n++;
        return n;
      })();
      const paid = new Set(plans.map((p: any) => p.user_id)).size;

      const stages = [
        { stage: 'Signup', count: total },
        { stage: 'Onboarded', count: onboarded },
        { stage: '1st meal logged', count: firstMeal },
        { stage: '7-day active', count: active7d },
        { stage: 'Paid plan', count: paid },
      ];
      setFunnel(stages.map(s => ({ ...s, pct: total ? Math.round((s.count / total) * 100) : 0 })));

      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Retention</h1>
        <p className="text-sm text-muted-foreground">Day-N cohorts (last 8 weeks) · activation funnel</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Card className="p-4 mb-4">
            <h3 className="text-sm font-bold mb-4">Day-N retention by signup week</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cohorts} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: string, p: any) => {
                      const size = p.payload?.size ?? 0;
                      return [`${v} (${size ? Math.round((Number(v) / size) * 100) : 0}%)`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="d1" name="D1" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="d3" name="D3" stroke="hsl(var(--secondary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="d7" name="D7" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="d14" name="D14" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="d30" name="D30" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Each line = number of users active on that day post-signup. Cohort size shown in tooltip.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-bold mb-4">Activation funnel</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-3">
              {funnel.map(f => (
                <div key={f.stage} className="text-center">
                  <p className="text-xs font-bold tabular-nums">{f.count}</p>
                  <p className="text-[10px] text-muted-foreground">{f.pct}%</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
