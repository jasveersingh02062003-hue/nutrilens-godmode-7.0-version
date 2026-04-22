import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole, type StaffRole } from '@/hooks/useAdminRole';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, ShieldAlert, Search } from 'lucide-react';
import { logAdminAction } from '@/lib/audit';
import { maskEmail } from '@/lib/audit';
import { toast } from 'sonner';

const ASSIGNABLE_ROLES: StaffRole[] = ['owner', 'super_admin', 'admin', 'marketer', 'support', 'brand_manager'];

interface StaffRow {
  user_id: string;
  email: string | null;
  name: string | null;
  roles: StaffRole[];
}

export default function AdminStaff() {
  const { isOwner, isLoading: roleLoading } = useAdminRole();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('support');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('user_id, role');
    const ids = Array.from(new Set((roleRows ?? []).map(r => r.user_id)));
    if (!ids.length) { setRows([]); setLoading(false); return; }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', ids);
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
    const grouped = new Map<string, StaffRow>();
    for (const r of roleRows ?? []) {
      const existing = grouped.get(r.user_id);
      if (existing) {
        existing.roles.push(r.role as StaffRole);
      } else {
        const p = profileMap.get(r.user_id);
        grouped.set(r.user_id, {
          user_id: r.user_id,
          email: null,
          name: p?.name ?? null,
          roles: [r.role as StaffRole],
        });
      }
    }
    setRows(Array.from(grouped.values()));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addRole = async () => {
    if (!isOwner) { toast.error('Owner permission required'); return; }
    if (!newEmail.trim()) { toast.error('Enter user ID or email'); return; }
    setAdding(true);
    try {
      // Resolve user by id (uuid pattern) or by exact name match in profiles
      let userId = newEmail.trim();
      if (!/^[0-9a-f-]{36}$/i.test(userId)) {
        toast.error('Paste the user UUID (find it on the Users page)');
        setAdding(false);
        return;
      }
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: newRole }]);
      if (error) throw error;
      await logAdminAction({
        action: 'role_change',
        target_user_id: userId,
        metadata: { added: newRole },
      });
      toast.success(`Granted ${newRole}`);
      setNewEmail('');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to add role');
    } finally {
      setAdding(false);
    }
  };

  const revokeRole = async (userId: string, role: StaffRole) => {
    if (!isOwner) { toast.error('Owner permission required'); return; }
    if (!confirm(`Revoke "${role}" from this user?`)) return;
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);
    if (error) { toast.error(error.message); return; }
    await logAdminAction({
      action: 'role_change',
      target_user_id: userId,
      metadata: { removed: role },
    });
    toast.success(`Revoked ${role}`);
    load();
  };

  if (roleLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  const filtered = rows.filter(r =>
    !query.trim() ||
    r.user_id.toLowerCase().includes(query.toLowerCase()) ||
    (r.name?.toLowerCase().includes(query.toLowerCase()) ?? false)
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          Staff & Roles
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isOwner
            ? 'Assign or revoke staff roles. Every change is written to the audit log.'
            : 'Read-only — only owners can modify staff roles.'}
        </p>
      </div>

      {isOwner && (
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold">Grant role</div>
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="User UUID (from Users page)"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="flex-1 font-mono text-xs"
            />
            <Select value={newRole} onValueChange={(v) => setNewRole(v as StaffRole)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addRole} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Grant
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: open the Users page, click a user, copy their UUID from the URL.
          </p>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or UUID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} staff member{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No staff yet.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(row => (
              <div key={row.user_id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{row.name ?? '(no name)'}</div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate">{row.user_id}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {row.roles.map(r => (
                      <Badge key={r} variant="secondary" className="text-[10px]">
                        {r}
                        {isOwner && (
                          <button
                            onClick={() => revokeRole(row.user_id, r)}
                            className="ml-1.5 hover:text-destructive"
                            aria-label={`Revoke ${r}`}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
