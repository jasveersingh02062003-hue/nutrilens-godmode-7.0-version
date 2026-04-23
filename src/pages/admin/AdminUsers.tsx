import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Eye, EyeOff, Download, Search, Loader2, Hash, ExternalLink, Bookmark, Trash2 } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { logAdminAction } from '@/lib/audit';
import { daysAgoISO } from '@/lib/admin-metrics';
import { sha256Hex, normalizeEmail } from '@/lib/hashing';
import { listSegments, saveSegment, deleteSegment, SavedSegment } from '@/lib/admin-segments';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ProfileRow {
  id: string;
  name: string | null;
  city: string | null;
  goal: string | null;
  gender: string | null;
  age: number | null;
  weight_kg: number | null;
  daily_calories: number | null;
  onboarding_complete: boolean | null;
  created_at: string | null;
  marketing_consent: boolean;
}

type SubInfo = {
  plan: 'free' | 'premium' | 'ultra';
  status: 'active' | 'trialing' | 'cancelled' | 'expired' | 'past_due';
  cancel_at_period_end: boolean;
  current_period_end: string | null;
};

function subBadge(s?: SubInfo) {
  if (!s || s.plan === 'free') return { label: 'Free', variant: 'outline' as const };
  if (s.status === 'trialing') return { label: 'Trial', variant: 'secondary' as const };
  if (s.cancel_at_period_end) return { label: `${s.plan === 'ultra' ? 'Ultra' : 'Pro'} · cancelling`, variant: 'outline' as const };
  if (s.status === 'cancelled' || s.status === 'expired') return { label: 'Lapsed', variant: 'outline' as const };
  return { label: s.plan === 'ultra' ? 'Ultra' : 'Pro', variant: 'default' as const };
}

const AGE_BANDS = [
  { label: 'All ages', value: 'all' },
  { label: '< 25', value: 'lt25' },
  { label: '25-34', value: '25-34' },
  { label: '35-44', value: '35-44' },
  { label: '45+', value: 'gte45' },
];

function bandFor(age: number | null) {
  if (age == null) return null;
  if (age < 25) return 'lt25';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  return 'gte45';
}

export default function AdminUsers() {
  const { isSuperAdmin, isAdmin, isMarketer, isSupport } = useAdminRole();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set());
  const [subs, setSubs] = useState<Map<string, SubInfo>>(new Map());
  const [planFilter, setPlanFilter] = useState('all'); // all | paying | trial | free
  const [segments, setSegments] = useState<SavedSegment[]>(() => listSegments());
  // Marketers/support read PII-masked rows via RPC; admins read full table directly
  const useMaskedView = (isMarketer || isSupport) && !isAdmin;

  // Reveal modal state
  const [revealTarget, setRevealTarget] = useState<ProfileRow | null>(null);
  const [revealReason, setRevealReason] = useState('');

  // Save segment modal
  const [segOpen, setSegOpen] = useState(false);
  const [segName, setSegName] = useState('');

  // filters
  const [city, setCity] = useState('all');
  const [gender, setGender] = useState('all');
  const [ageBand, setAgeBand] = useState('all');
  const [goal, setGoal] = useState('all');
  const [signupWindow, setSignupWindow] = useState('all');
  const [activity, setActivity] = useState('all'); // active7 | inactive7 | all

  useEffect(() => {
    (async () => {
      const recentLogsPromise = supabase
        .from('daily_logs')
        .select('user_id')
        .gte('log_date', daysAgoISO(7));

      let profileRows: ProfileRow[] = [];
      let profileError: any = null;

      if (useMaskedView) {
        const { data, error } = await (supabase.rpc as any)('get_masked_profiles');
        profileError = error;
        // Map masked shape → ProfileRow shape (sensitive fields blank)
        profileRows = ((data ?? []) as any[]).map((r) => ({
          id: r.id,
          name: r.first_name ?? null,
          city: r.city ?? null,
          goal: r.goal ?? null,
          gender: r.gender ?? null,
          age: null, // exact age hidden — age_range available in r.age_range
          weight_kg: null,
          daily_calories: null,
          onboarding_complete: r.onboarding_complete ?? null,
          created_at: r.created_at ?? null,
          marketing_consent: r.marketing_consent ?? false,
        }));
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, city, goal, gender, age, weight_kg, daily_calories, onboarding_complete, created_at, marketing_consent')
          .order('created_at', { ascending: false })
          .limit(2000);
        profileError = error;
        profileRows = (data ?? []) as ProfileRow[];
      }

      const recentLogsRes = await recentLogsPromise;
      if (profileError) toast.error(profileError.message);
      setRows(profileRows);
      setActiveUserIds(new Set((recentLogsRes.data ?? []).map((r: any) => r.user_id)));

      // Subscription overlay (admins only — RLS denies marketers)
      if (!useMaskedView) {
        const { data: subRows } = await supabase
          .from('subscriptions')
          .select('user_id, plan, status, cancel_at_period_end, current_period_end');
        const map = new Map<string, SubInfo>();
        (subRows ?? []).forEach((r: any) => map.set(r.user_id, {
          plan: r.plan, status: r.status,
          cancel_at_period_end: r.cancel_at_period_end,
          current_period_end: r.current_period_end,
        }));
        setSubs(map);
      }

      setLoading(false);
    })();
  }, [useMaskedView]);

  const cities = useMemo(
    () => Array.from(new Set(rows.map(r => r.city).filter(Boolean) as string[])).sort(),
    [rows]
  );
  const goals = useMemo(
    () => Array.from(new Set(rows.map(r => r.goal).filter(Boolean) as string[])).sort(),
    [rows]
  );

  const currentFilters = { search, city, gender, ageBand, goal, signupWindow, activity };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const cutoffMap: Record<string, string> = {
      '7d': daysAgoISO(7), '30d': daysAgoISO(30), '90d': daysAgoISO(90),
    };
    const cutoff = cutoffMap[signupWindow];

    return rows.filter(r => {
      if (q && !(
        (r.name ?? '').toLowerCase().includes(q) ||
        (r.city ?? '').toLowerCase().includes(q) ||
        r.id.includes(q)
      )) return false;
      if (city !== 'all' && r.city !== city) return false;
      if (gender !== 'all' && r.gender !== gender) return false;
      if (goal !== 'all' && r.goal !== goal) return false;
      if (ageBand !== 'all' && bandFor(r.age) !== ageBand) return false;
      if (cutoff && (r.created_at ?? '').slice(0, 10) < cutoff) return false;
      if (activity === 'active7' && !activeUserIds.has(r.id)) return false;
      if (activity === 'inactive7' && activeUserIds.has(r.id)) return false;
      if (planFilter !== 'all') {
        const s = subs.get(r.id);
        const plan = s?.plan ?? 'free';
        const status = s?.status ?? 'active';
        if (planFilter === 'paying' && plan === 'free') return false;
        if (planFilter === 'trial' && status !== 'trialing') return false;
        if (planFilter === 'free' && plan !== 'free') return false;
      }
      return true;
    });
  }, [rows, search, city, gender, goal, ageBand, signupWindow, activity, activeUserIds, planFilter, subs]);

  const requestReveal = (r: ProfileRow) => {
    if (!isSuperAdmin) return toast.error('Super admin only');
    setRevealReason('');
    setRevealTarget(r);
  };

  const confirmReveal = async () => {
    if (!revealTarget) return;
    if (revealReason.trim().length < 5) {
      return toast.error('Reason must be at least 5 characters');
    }
    setRevealedIds(s => new Set(s).add(revealTarget.id));
    await logAdminAction({
      action: 'pii_reveal',
      target_table: 'profiles',
      target_user_id: revealTarget.id,
      metadata: { reason: revealReason.trim() },
    });
    toast.success('PII revealed · audit logged');
    setRevealTarget(null);
  };

  const downloadBlob = (text: string, filename: string, type: string) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!isSuperAdmin) return toast.error('Super admin only');
    const headers = ['id', 'name', 'city', 'goal', 'gender', 'age', 'weight_kg', 'daily_calories', 'created_at'];
    const csv = [
      headers.join(','),
      ...filtered.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(',')),
    ].join('\n');
    downloadBlob(csv, `nutrilens-users-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    await logAdminAction({
      action: 'csv_export',
      target_table: 'profiles',
      metadata: { row_count: filtered.length, filters: currentFilters },
    });
    toast.success(`Exported ${filtered.length} users`);
  };

  const handleMetaExport = async () => {
    if (!isSuperAdmin) return toast.error('Super admin only');
    const consenting = filtered.filter(r => r.marketing_consent);
    if (!consenting.length) return toast.error('No users with marketing consent in this filter');

    // Try to fetch emails via service-role admin endpoint. If not available
    // (no edge function set up yet) we fall back to hashing user_id so the
    // export is still well-formed for manual matching.
    let emailMap: Record<string, string> = {};
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-emails', {
        body: { user_ids: consenting.map(r => r.id) },
      });
      if (!error && data?.emails) emailMap = data.emails as Record<string, string>;
    } catch {
      // edge function not deployed yet — silent fallback
    }

    const hashedRows = await Promise.all(
      consenting.map(async r => {
        const email = emailMap[r.id];
        const hashed = email
          ? await sha256Hex(normalizeEmail(email))
          : await sha256Hex(`uid:${r.id}`); // fallback marker
        return hashed;
      })
    );
    const csv = ['email_sha256', ...hashedRows].join('\n');
    downloadBlob(csv, `meta-custom-audience-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');

    const usedEmails = Object.keys(emailMap).length;
    await logAdminAction({
      action: 'meta_audience_export',
      target_table: 'profiles',
      metadata: {
        row_count: consenting.length,
        with_email: usedEmails,
        with_id_fallback: consenting.length - usedEmails,
        filters: currentFilters,
      },
    });
    toast.success(
      `Exported ${consenting.length} (${usedEmails} email-hashed, ${consenting.length - usedEmails} id-hashed)`
    );
  };

  const openSaveSegment = () => {
    if (!filtered.length) return toast.error('No users in current filter');
    setSegName('');
    setSegOpen(true);
  };

  const confirmSaveSegment = async () => {
    if (segName.trim().length < 2) return toast.error('Name required');
    const seg = saveSegment({
      name: segName.trim(),
      filters: currentFilters,
      count_at_save: filtered.length,
    });
    setSegments(listSegments());
    await logAdminAction({
      action: 'segment_save',
      target_table: 'profiles',
      metadata: { name: seg.name, row_count: filtered.length, filters: currentFilters },
    });
    toast.success(`Saved segment "${seg.name}"`);
    setSegOpen(false);
  };

  const applySegment = (seg: SavedSegment) => {
    const f = seg.filters as any;
    setSearch(f.search ?? '');
    setCity(f.city ?? 'all');
    setGender(f.gender ?? 'all');
    setAgeBand(f.ageBand ?? 'all');
    setGoal(f.goal ?? 'all');
    setSignupWindow(f.signupWindow ?? 'all');
    setActivity(f.activity ?? 'all');
    toast.success(`Loaded "${seg.name}"`);
  };

  const removeSegment = (id: string) => {
    deleteSegment(id);
    setSegments(listSegments());
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {rows.length} matching</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Bookmark className="w-4 h-4 mr-2" />
                Segments {segments.length > 0 && `(${segments.length})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Saved segments</DropdownMenuLabel>
              {segments.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">No segments saved yet.</div>
              )}
              {segments.map(s => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => applySegment(s)}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">{s.count_at_save} users · {new Date(s.created_at).toLocaleDateString()}</div>
                  </div>
                  <Trash2
                    className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); removeSegment(s.id); }}
                  />
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openSaveSegment}>
                <Bookmark className="w-3.5 h-3.5 mr-2" /> Save current filters…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleMetaExport} disabled={!isSuperAdmin} variant="outline" size="sm">
            <Hash className="w-4 h-4 mr-2" />
            Meta audience CSV
          </Button>
          <Button onClick={handleExport} disabled={!isSuperAdmin} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV {!isSuperAdmin && '(super)'}
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, city, or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={goal} onValueChange={setGoal}>
            <SelectTrigger><SelectValue placeholder="Goal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All goals</SelectItem>
              {goals.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ageBand} onValueChange={setAgeBand}>
            <SelectTrigger><SelectValue placeholder="Age band" /></SelectTrigger>
            <SelectContent>
              {AGE_BANDS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={signupWindow} onValueChange={setSignupWindow}>
            <SelectTrigger><SelectValue placeholder="Signup window" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activity} onValueChange={setActivity}>
            <SelectTrigger><SelectValue placeholder="Activity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any activity</SelectItem>
              <SelectItem value="active7">Active last 7d</SelectItem>
              <SelectItem value="inactive7">Inactive 7d+</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="paying">Paying (Pro/Ultra)</SelectItem>
              <SelectItem value="trial">Trialing</SelectItem>
              <SelectItem value="free">Free only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Goal</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Cal/day</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const revealed = revealedIds.has(r.id);
                  const recentlyActive = activeUserIds.has(r.id);
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
                      <td className="px-4 py-3">{r.age ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{r.daily_calories || '—'}</td>
                      <td className="px-4 py-3">
                        {recentlyActive
                          ? <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Active 7d" />
                          : <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/30" title="Inactive" />}
                      </td>
                      <td className="px-4 py-3">
                        {r.onboarding_complete
                          ? <Badge variant="secondary" className="text-[10px]">Active</Badge>
                          : <Badge variant="outline" className="text-[10px]">Onboarding</Badge>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!isSuperAdmin || revealed}
                            onClick={() => requestReveal(r)}
                            className="h-7 px-2"
                            title="Reveal full PII (logged)"
                          >
                            {revealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/users/${r.id}`)}
                            className="h-7 px-2"
                            title="Open 360° view"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No users match filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reveal-with-reason modal */}
      <Dialog open={!!revealTarget} onOpenChange={(o) => !o && setRevealTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reveal user PII</DialogTitle>
            <DialogDescription>
              This action is logged to the audit trail. Provide a reason (e.g. support ticket #, compliance request).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">User</Label>
              <p className="text-sm font-mono text-muted-foreground">{revealTarget?.id}</p>
            </div>
            <div>
              <Label htmlFor="reveal-reason" className="text-xs">Reason (min 5 chars)</Label>
              <Textarea
                id="reveal-reason"
                value={revealReason}
                onChange={e => setRevealReason(e.target.value)}
                placeholder="Support ticket #1234 — user requested account deletion"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevealTarget(null)}>Cancel</Button>
            <Button onClick={confirmReveal}>Reveal & log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save segment modal */}
      <Dialog open={segOpen} onOpenChange={setSegOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current filters as segment</DialogTitle>
            <DialogDescription>
              Captures {filtered.length} matching users. You can re-apply these filters anytime.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="seg-name" className="text-xs">Segment name</Label>
            <Input
              id="seg-name"
              value={segName}
              onChange={e => setSegName(e.target.value)}
              placeholder="e.g. Inactive Mumbai women, weight-loss"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSegOpen(false)}>Cancel</Button>
            <Button onClick={confirmSaveSegment}>Save segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
