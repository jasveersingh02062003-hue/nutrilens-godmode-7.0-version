import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ListChecks, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { todayISO, daysAgoISO } from '@/lib/admin-metrics';

interface CheckItem {
  label: string;
  doneToday: boolean;
  hint?: string;
}

interface ChecklistGroup {
  title: string;
  cadence: 'Daily' | 'Weekly' | 'Monthly';
  items: CheckItem[];
}

export default function AdminOps() {
  const [groups, setGroups] = useState<ChecklistGroup[] | null>(null);

  useEffect(() => {
    (async () => {
      const today = todayISO();
      const week = daysAgoISO(7);
      const month = daysAgoISO(30);

      const [audits, feedback, scrapes, costs] = await Promise.all([
        supabase.from('audit_logs').select('action, created_at').gte('created_at', month),
        supabase.from('feedback').select('id, status').eq('status', 'open'),
        supabase.from('city_prices').select('updated_at').order('updated_at', { ascending: false }).limit(1),
        supabase.from('api_usage').select('created_at').gte('created_at', today).limit(1),
      ]);

      const actionsToday = (audits.data ?? []).filter((a: any) => (a.created_at ?? '').slice(0, 10) === today).map((a: any) => a.action);
      const actionsWeek = (audits.data ?? []).filter((a: any) => (a.created_at ?? '') >= week).map((a: any) => a.action);
      const lastScrape = (scrapes.data ?? [])[0]?.updated_at ?? '';

      const g: ChecklistGroup[] = [
        {
          title: 'Daily', cadence: 'Daily', items: [
            { label: 'Reviewed open feedback', doneToday: actionsToday.includes('feedback_resolved'), hint: `${(feedback.data ?? []).length} open` },
            { label: 'Checked API costs', doneToday: (costs.data ?? []).length > 0, hint: 'auto-logged' },
            { label: 'Price scrape ran today', doneToday: lastScrape.slice(0, 10) === today, hint: lastScrape ? `last: ${lastScrape.slice(0, 10)}` : 'never' },
            { label: 'Reviewed new signups (PII access)', doneToday: actionsToday.includes('pii_reveal') },
          ],
        },
        {
          title: 'Weekly', cadence: 'Weekly', items: [
            { label: 'Exported a marketing segment', doneToday: actionsWeek.includes('csv_export') || actionsWeek.includes('meta_audience_export') },
            { label: 'Saved a new audience segment', doneToday: actionsWeek.includes('segment_save') },
            { label: 'Reviewed a brand KYC', doneToday: actionsWeek.includes('brand_kyc_review') },
            { label: 'Topped up a brand wallet', doneToday: actionsWeek.includes('brand_wallet_topup') },
          ],
        },
        {
          title: 'Monthly', cadence: 'Monthly', items: [
            { label: 'Updated fixed cost constants', doneToday: false, hint: 'Costs page → edit values' },
            { label: 'Reviewed staff role assignments', doneToday: (audits.data ?? []).some((a: any) => a.action === 'role_change') },
            { label: 'Refunded plans (if any)', doneToday: actionsWeek.includes('plan_refund') },
            { label: 'Audit-log spot check', doneToday: false, hint: 'super-admin only' },
          ],
        },
      ];
      setGroups(g);
    })();
  }, []);

  if (!groups) return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListChecks className="w-6 h-6 text-primary" />
          Ops Checklist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Driven by the audit log — actions performed in admin tools tick these off automatically.
        </p>
      </div>
      {groups.map(g => (
        <Card key={g.title} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">{g.title}</h3>
            <span className="text-xs text-muted-foreground">
              {g.items.filter(i => i.doneToday).length} / {g.items.length}
            </span>
          </div>
          <div className="space-y-2">
            {g.items.map(item => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                {item.doneToday
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className={item.doneToday ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                {item.hint && <span className="text-[11px] text-muted-foreground ml-auto">{item.hint}</span>}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
