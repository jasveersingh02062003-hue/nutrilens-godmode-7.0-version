import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface AuditRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_user_id: string | null;
  metadata: any;
  created_at: string;
}

export default function AdminAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (!error) setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Audit Logs</h1>
      <p className="text-sm text-muted-foreground mb-6">Super admin only · last 300 events</p>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.actor_id?.slice(0, 8) ?? '—'}…</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">{r.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.target_table ?? '—'}
                    {r.target_user_id && <span className="font-mono ml-1">· {r.target_user_id.slice(0, 8)}…</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono max-w-xs truncate">
                    {r.metadata && Object.keys(r.metadata).length ? JSON.stringify(r.metadata) : '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No audit events yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
