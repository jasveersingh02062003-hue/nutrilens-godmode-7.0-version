import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Download, Search, Loader2 } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { logAdminAction, maskEmail } from '@/lib/audit';
import { toast } from 'sonner';

interface ProfileRow {
  id: string;
  name: string | null;
  city: string | null;
  goal: string | null;
  gender: string | null;
  weight_kg: number | null;
  daily_calories: number | null;
  onboarding_complete: boolean | null;
  created_at: string | null;
}

export default function AdminUsers() {
  const { isSuperAdmin } = useAdminRole();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, city, goal, gender, weight_kg, daily_calories, onboarding_complete, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) toast.error(error.message);
      setRows((data ?? []) as ProfileRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r =>
      (r.name ?? '').toLowerCase().includes(q) ||
      (r.city ?? '').toLowerCase().includes(q) ||
      r.id.includes(q),
    );
  }, [rows, search]);

  const handleReveal = async (userId: string) => {
    if (!isSuperAdmin) {
      toast.error('Super admin only');
      return;
    }
    setRevealedIds(s => new Set(s).add(userId));
    await logAdminAction({
      action: 'pii_reveal',
      target_table: 'profiles',
      target_user_id: userId,
    });
  };

  const handleExport = async () => {
    if (!isSuperAdmin) {
      toast.error('Super admin only');
      return;
    }
    const headers = ['id', 'name', 'city', 'goal', 'gender', 'weight_kg', 'daily_calories', 'created_at'];
    const csv = [
      headers.join(','),
      ...filtered.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrilens-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await logAdminAction({
      action: 'csv_export',
      target_table: 'profiles',
      metadata: { row_count: filtered.length },
    });
    toast.success(`Exported ${filtered.length} users`);
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {rows.length}</p>
        </div>
        <Button onClick={handleExport} disabled={!isSuperAdmin} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV {!isSuperAdmin && '(super admin)'}
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, city, or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Goal</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Cal/day</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">PII</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const revealed = revealedIds.has(r.id);
                return (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name || 'Unnamed'}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {revealed ? r.id : `${r.id.slice(0, 8)}…`}
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.city || '—'}</td>
                    <td className="px-4 py-3">{r.goal || '—'}</td>
                    <td className="px-4 py-3">{r.weight_kg ? `${r.weight_kg} kg` : '—'}</td>
                    <td className="px-4 py-3">{r.daily_calories || '—'}</td>
                    <td className="px-4 py-3">
                      {r.onboarding_complete
                        ? <Badge variant="secondary" className="text-[10px]">Active</Badge>
                        : <Badge variant="outline" className="text-[10px]">Onboarding</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!isSuperAdmin || revealed}
                        onClick={() => handleReveal(r.id)}
                        className="h-7 px-2"
                      >
                        {revealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
