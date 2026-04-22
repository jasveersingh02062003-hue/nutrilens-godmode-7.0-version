import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface PlanRow {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string | null;
}

export default function AdminPlans() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('event_plans')
        .select('id, user_id, plan_type, status, start_date, end_date, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error) setRows((data ?? []) as PlanRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Event Plans</h1>
      <p className="text-sm text-muted-foreground mb-6">{rows.length} plans</p>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.plan_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{r.start_date}</td>
                  <td className="px-4 py-3">{r.end_date}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No plans</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
