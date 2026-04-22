import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Search } from 'lucide-react';
import { logAdminAction } from '@/lib/audit';
import { toast } from 'sonner';

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
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) toast.error(error.message);
      setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  const actions = useMemo(() => Array.from(new Set(rows.map(r => r.action))).sort(), [rows]);
  const tables = useMemo(() => Array.from(new Set(rows.map(r => r.target_table).filter(Boolean) as string[])).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(r => {
      if (actionFilter !== 'all' && r.action !== actionFilter) return false;
      if (tableFilter !== 'all' && r.target_table !== tableFilter) return false;
      if (q && !(
        (r.actor_id ?? '').includes(q) ||
        (r.target_user_id ?? '').includes(q) ||
        r.action.includes(q) ||
        JSON.stringify(r.metadata ?? {}).toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [rows, search, actionFilter, tableFilter]);

  const exportCsv = async () => {
    const headers = ['created_at', 'actor_id', 'action', 'target_table', 'target_user_id', 'metadata'];
    const csv = [
      headers.join(','),
      ...filtered.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await logAdminAction({ action: 'csv_export', target_table: 'audit_logs', metadata: { row_count: filtered.length } });
    toast.success(`Exported ${filtered.length} events`);
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Super admin only · {filtered.length} of {rows.length} events</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
      </div>

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search actor, target, metadata..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger><SelectValue placeholder="Table" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="overflow-auto">
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
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.actor_id?.slice(0, 8) ?? '—'}…</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{r.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.target_table ?? '—'}
                      {r.target_user_id && <span className="font-mono ml-1">· {r.target_user_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono max-w-md truncate">
                      {r.metadata && Object.keys(r.metadata).length ? JSON.stringify(r.metadata) : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No matching events</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
