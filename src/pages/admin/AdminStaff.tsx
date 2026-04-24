import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole, type StaffRole } from '@/hooks/useAdminRole';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Trash2, ShieldAlert, Search, Mail } from 'lucide-react';
import { logAdminAction } from '@/lib/audit';
import { toast } from 'sonner';

const ASSIGNABLE_ROLES: StaffRole[] = ['owner', 'super_admin', 'admin', 'marketer', 'support', 'brand_manager'];

interface StaffRow {
  user_id: string;
  email: string | null;
  name: string | null;
  roles: StaffRole[];
}

export default function AdminStaff() {
  const { isOwner, isSuperAdmin, isLoading: roleLoading } = useAdminRole();
  const canManage = isOwner || isSuperAdmin;
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [resolved, setResolved] = useState<{ user_id: string; email: string; name: string | null } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [newRole, setNewRole] = useState<StaffRole>('support');
  const [adding, setAdding] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{ userId: string; role: StaffRole; email: string | null } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_staff_with_emails');
    if (error) {
      toast.error(error.message);
      setRows([]); setLoading(false); return;
    }
    const grouped = new Map<string, StaffRow>();
    for (const r of (data ?? []) as Array<{ user_id: string; email: string | null; name: string | null; role: StaffRole }>) {
      const existing = grouped.get(r.user_id);
      if (existing) existing.roles.push(r.role);
      else grouped.set(r.user_id, { user_id: r.user_id, email: r.email, name: r.name, roles: [r.role] });
    }
    setRows(Array.from(grouped.values()));
    setLoading(false);
  };

  useEffect(() => { if (canManage) load(); else setLoading(false); }, [canManage]);

  const resolveEmail = async () => {
    const email = emailInput.trim();
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    setResolving(true);
    setResolved(null);
    try {
      const { data, error } = await supabase.rpc('lookup_user_by_email', { p_email: email });
      if (error) throw error;
      const row = (data ?? [])[0] as { user_id: string; email: string; name: string | null } | undefined;
      if (!row) {
        toast.error('No user with that email');
        return;
      }
      setResolved(row);
    } catch (e: any) {
      toast.error(e.message ?? 'Lookup failed');
    } finally {
      setResolving(false);
    }
  };

  const addRole = async () => {
    if (!resolved) { toast.error('Look up a user first'); return; }
    setAdding(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: resolved.user_id, role: newRole }]);
      if (error) throw error;
      await logAdminAction({
        action: 'role_change',
        target_user_id: resolved.user_id,
        metadata: { added: newRole, email: resolved.email },
      });
      toast.success(`Granted ${newRole} to ${resolved.email}`);
      setEmailInput('');
      setResolved(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to add role');
    } finally {
      setAdding(false);
    }
  };

  const revokeRole = async () => {
    if (!confirmRevoke) return;
    const { userId, role, email } = confirmRevoke;
    setConfirmRevoke(null);
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);
    if (error) { toast.error(error.message); return; }
    await logAdminAction({
      action: 'role_change',
      target_user_id: userId,
      metadata: { removed: role, email },
    });
    toast.success(`Revoked ${role}`);
    load();
  };

  if (roleLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  if (!canManage) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-6 text-center">
          <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <h2 className="font-semibold">Owner access required</h2>
          <p className="text-sm text-muted-foreground mt-1">Only owners and super-admins can manage staff roles.</p>
        </Card>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(r =>
    !q ||
    r.user_id.toLowerCase().includes(q) ||
    (r.email?.toLowerCase().includes(q) ?? false) ||
    (r.name?.toLowerCase().includes(q) ?? false)
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          Staff & Roles
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign or revoke staff roles. Every change is written to the audit log.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">Grant role by email</div>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="user@example.com"
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setResolved(null); }}
              onKeyDown={e => { if (e.key === 'Enter') resolveEmail(); }}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={resolveEmail} disabled={resolving}>
            {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
            Find user
          </Button>
        </div>

        {resolved && (
          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-3">
            <div>
              <div className="text-sm font-medium">{resolved.name || '(no name)'}</div>
              <div className="text-xs text-muted-foreground">{resolved.email}</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{resolved.user_id}</div>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Select value={newRole} onValueChange={(v) => setNewRole(v as StaffRole)}>
                <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addRole} disabled={adding} className="md:ml-auto">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Grant {newRole}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or UUID..."
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
              <div key={row.user_id} className="flex items-start justify-between p-3 border border-border rounded-lg gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{row.name ?? '(no name)'}</div>
                  <div className="text-xs text-muted-foreground truncate">{row.email ?? '(no email)'}</div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{row.user_id}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {row.roles.map(r => (
                      <Badge key={r} variant="secondary" className="text-[10px]">
                        {r}
                        <button
                          onClick={() => setConfirmRevoke({ userId: row.user_id, role: r, email: row.email })}
                          className="ml-1.5 hover:text-destructive"
                          aria-label={`Revoke ${r}`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog open={!!confirmRevoke} onOpenChange={(open) => !open && setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke role?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{confirmRevoke?.role}</strong> from <strong>{confirmRevoke?.email ?? confirmRevoke?.userId}</strong>.
              They will lose access to that role immediately. This is logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revokeRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
