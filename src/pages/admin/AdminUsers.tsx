import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Download, Search, Loader2, Hash, ExternalLink } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { logAdminAction } from '@/lib/audit';
import { md5Hex, daysAgoISO } from '@/lib/admin-metrics';
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
  const { isSuperAdmin } = useAdminRole();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set());

  // filters
  const [city, setCity] = useState('all');
  const [gender, setGender] = useState('all');
  const [ageBand, setAgeBand] = useState('all');
  const [goal, setGoal] = useState('all');
  const [signupWindow, setSignupWindow] = useState('all');
  const [activity, setActivity] = useState('all'); // active7 | inactive7 | inactive30 | all

  useEffect(() => {
    (async () => {
      const [profilesRes, recentLogsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, city, goal, gender, age, weight_kg, daily_calories, onboarding_complete, created_at, marketing_consent')
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase
          .from('daily_logs')
          .select('user_id')
          .gte('log_date', daysAgoISO(7)),
      ]);
      if (profilesRes.error) toast.error(profilesRes.error.message);
      setRows((profilesRes.data ?? []) as ProfileRow[]);
      setActiveUserIds(new Set((recentLogsRes.data ?? []).map((r: any) => r.user_id)));
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(rows.map(r => r.city).filter(Boolean) as string[])).sort(),
    [rows]
  );
  const goals = useMemo(
    () => Array.from(new Set(rows.map(r => r.goal).filter(Boolean) as string[])).sort(),
    [rows]
  );

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
      return true;
    });
  }, [rows, search, city, gender, goal, ageBand, signupWindow, activity, activeUserIds]);

  const handleReveal = async (userId: string) => {
    if (!isSuperAdmin) return toast.error('Super admin only');
    const reason = prompt('Reason for revealing PII (e.g. support ticket #123):');
    if (!reason) return;
    setRevealedIds(s => new Set(s).add(userId));
    await logAdminAction({
      action: 'pii_reveal',
      target_table: 'profiles',
      target_user_id: userId,
      metadata: { reason },
    });
    toast.success('PII revealed · audit logged');
  };

  const handleExport = async () => {
    if (!isSuperAdmin) return toast.error('Super admin only');
    const headers = ['id', 'name', 'city', 'goal', 'gender', 'age', 'weight_kg', 'daily_calories', 'created_at'];
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
      metadata: { row_count: filtered.length, filters: { city, gender, goal, ageBand, signupWindow, activity } },
    });
    toast.success(`Exported ${filtered.length} users`);
  };

  const handleMetaExport = async () => {
    if (!isSuperAdmin) return toast.error('Super admin only');
    // Get auth.users emails via admin lookup not available client-side.
    // Instead: hash user IDs + names so brand can match offline. Real Meta CAPI needs email/phone — note this as v1.
    const consenting = filtered.filter(r => r.marketing_consent);
    if (!consenting.length) return toast.error('No users have marketing consent');
    const lines = await Promise.all(
      consenting.map(async r => {
        const namePart = (r.name ?? '').trim().toLowerCase();
        const hash = await md5Hex(namePart || r.id);
        return `${hash},${r.city ?? ''},${r.gender ?? ''},${r.age ?? ''}`;
      })
    );
    const csv = ['hashed_name,city,gender,age', ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meta-custom-audience-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await logAdminAction({
      action: 'csv_export',
      target_table: 'profiles',
      metadata: { meta_audience: true, row_count: consenting.length },
    });
    toast.success(`Exported ${consenting.length} consenting users`);
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {rows.length} matching</p>
        </div>
        <div className="flex gap-2">
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
                            onClick={() => handleReveal(r.id)}
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
    </div>
  );
}
