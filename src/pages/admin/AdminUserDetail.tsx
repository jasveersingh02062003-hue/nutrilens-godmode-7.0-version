import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Loader2, MessageSquare, Trophy, Utensils, Droplet, Pill, Scale, RefreshCw,
  CalendarPlus, IndianRupee,
} from 'lucide-react';
import { logAdminAction } from '@/lib/audit';
import { useAdminRole } from '@/hooks/useAdminRole';
import { daysAgoISO } from '@/lib/admin-metrics';
import { toast } from 'sonner';

interface Profile {
  id: string; name: string | null; city: string | null; goal: string | null;
  gender: string | null; age: number | null; height_cm: number | null;
  weight_kg: number | null; target_weight: number | null; daily_calories: number | null;
  daily_protein: number | null; conditions: any; health_conditions: any;
  onboarding_complete: boolean | null; created_at: string | null;
}

interface DailyLog { log_date: string; log_data: any; }
interface WeightLog { log_date: string; weight: number; unit: string; }
interface WaterLog { log_date: string; cups: number; }
interface SuppLog { log_date: string; supplements: any; }
interface Plan { id: string; plan_type: string; status: string; start_date: string; end_date: string; }
interface Achievement { achievement_key: string; unlocked_at: string | null; }
interface ChatMsg { id: string; role: string; content: string; created_at: string; }

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminRole();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [waters, setWaters] = useState<WaterLog[]>([]);
  const [supps, setSupps] = useState<SuppLog[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [achs, setAchs] = useState<Achievement[]>([]);
  const [chats, setChats] = useState<ChatMsg[]>([]);

  // Action modal state
  const [extendPlan, setExtendPlan] = useState<Plan | null>(null);
  const [extendDays, setExtendDays] = useState('7');
  const [refundPlan, setRefundPlan] = useState<Plan | null>(null);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const since = daysAgoISO(30);
      logAdminAction({ action: 'user_view', target_table: 'profiles', target_user_id: id });

      const [pr, dl, wl, wat, sup, pl, ac, ch] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('daily_logs').select('log_date, log_data').eq('user_id', id).gte('log_date', since).order('log_date', { ascending: false }),
        supabase.from('weight_logs').select('log_date, weight, unit').eq('user_id', id).gte('log_date', since).order('log_date', { ascending: false }),
        supabase.from('water_logs').select('log_date, cups').eq('user_id', id).gte('log_date', since).order('log_date', { ascending: false }),
        supabase.from('supplement_logs').select('log_date, supplements').eq('user_id', id).gte('log_date', since).order('log_date', { ascending: false }),
        supabase.from('event_plans').select('id, plan_type, status, start_date, end_date').eq('user_id', id).order('start_date', { ascending: false }),
        supabase.from('user_achievements').select('achievement_key, unlocked_at').eq('user_id', id).order('unlocked_at', { ascending: false }),
        supabase.from('monika_conversations').select('id, role, content, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
      ]);

      setProfile(pr.data as Profile | null);
      setLogs((dl.data ?? []) as DailyLog[]);
      setWeights((wl.data ?? []) as WeightLog[]);
      setWaters((wat.data ?? []) as WaterLog[]);
      setSupps((sup.data ?? []) as SuppLog[]);
      setPlans((pl.data ?? []) as Plan[]);
      setAchs((ac.data ?? []) as Achievement[]);
      setChats((ch.data ?? []) as ChatMsg[]);
      setLoading(false);
    })();
  }, [id]);

  const resetOnboarding = async () => {
    if (!isSuperAdmin) return toast.error('Super admin only');
    if (!id) return;
    const reason = prompt('Reason for resetting onboarding:');
    if (!reason) return;
    const { error } = await supabase.from('profiles').update({ onboarding_complete: false }).eq('id', id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      action: 'onboarding_reset',
      target_table: 'profiles',
      target_user_id: id,
      metadata: { reason },
    });
    toast.success('Onboarding reset');
  };

  const confirmExtend = async () => {
    if (!extendPlan || !id) return;
    const days = parseInt(extendDays, 10);
    if (!days || days < 1 || days > 365) return toast.error('Days must be 1–365');
    const newEnd = new Date(extendPlan.end_date);
    newEnd.setDate(newEnd.getDate() + days);
    const newEndStr = newEnd.toISOString().slice(0, 10);
    const { error } = await supabase
      .from('event_plans')
      .update({ end_date: newEndStr, status: 'active' })
      .eq('id', extendPlan.id);
    if (error) return toast.error(error.message);
    setPlans(plans.map(p => p.id === extendPlan.id ? { ...p, end_date: newEndStr, status: 'active' } : p));
    await logAdminAction({
      action: 'plan_extend',
      target_table: 'event_plans',
      target_user_id: id,
      metadata: { plan_id: extendPlan.id, plan_type: extendPlan.plan_type, days, new_end_date: newEndStr },
    });
    toast.success(`Plan extended by ${days} days`);
    setExtendPlan(null);
  };

  const confirmRefund = async () => {
    if (!refundPlan || !id) return;
    if (refundReason.trim().length < 5) return toast.error('Reason must be at least 5 characters');
    const { error } = await supabase
      .from('event_plans')
      .update({ status: 'refunded' })
      .eq('id', refundPlan.id);
    if (error) return toast.error(error.message);
    setPlans(plans.map(p => p.id === refundPlan.id ? { ...p, status: 'refunded' } : p));
    await logAdminAction({
      action: 'plan_refund',
      target_table: 'event_plans',
      target_user_id: id,
      metadata: { plan_id: refundPlan.id, plan_type: refundPlan.plan_type, reason: refundReason.trim() },
    });
    toast.success('Plan marked as refunded · audit logged');
    setRefundPlan(null);
    setRefundReason('');
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    );
  }
  if (!profile) {
    return <div className="p-8"><p className="text-muted-foreground">User not found</p></div>;
  }

  const totalMeals = logs.reduce((s, l) => s + (Array.isArray(l.log_data?.meals) ? l.log_data.meals.length : 0), 0);

  return (
    <div className="p-8 max-w-6xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to users
      </Button>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{profile.name || 'Unnamed user'}</h1>
          <p className="text-xs text-muted-foreground font-mono">{profile.id}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {profile.city && <Badge variant="outline" className="text-[10px]">{profile.city}</Badge>}
            {profile.gender && <Badge variant="outline" className="text-[10px]">{profile.gender}</Badge>}
            {profile.age && <Badge variant="outline" className="text-[10px]">{profile.age}y</Badge>}
            {profile.goal && <Badge variant="secondary" className="text-[10px]">{profile.goal}</Badge>}
            <Badge variant={profile.onboarding_complete ? 'default' : 'outline'} className="text-[10px]">
              {profile.onboarding_complete ? 'Onboarded' : 'In onboarding'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetOnboarding} disabled={!isSuperAdmin}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset onboarding
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : '—'} />
        <Stat label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : '—'} />
        <Stat label="Target" value={profile.target_weight ? `${profile.target_weight} kg` : '—'} />
        <Stat label="Daily kcal" value={profile.daily_calories?.toString() ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard icon={Utensils} title="Last 30 days · Meals" value={`${totalMeals} meals · ${logs.length} active days`}>
          <div className="space-y-1 max-h-64 overflow-y-auto text-xs">
            {logs.slice(0, 14).map(l => {
              const meals = Array.isArray(l.log_data?.meals) ? l.log_data.meals : [];
              return (
                <div key={l.log_date} className="flex justify-between border-b border-border/40 py-1">
                  <span className="text-muted-foreground">{l.log_date}</span>
                  <span className="font-medium">{meals.length} meals</span>
                </div>
              );
            })}
            {logs.length === 0 && <p className="text-muted-foreground py-2">No meal logs</p>}
          </div>
        </SectionCard>

        <SectionCard icon={Scale} title="Weight log" value={`${weights.length} entries`}>
          <div className="space-y-1 max-h-64 overflow-y-auto text-xs">
            {weights.slice(0, 14).map(w => (
              <div key={w.log_date} className="flex justify-between border-b border-border/40 py-1">
                <span className="text-muted-foreground">{w.log_date}</span>
                <span className="font-medium tabular-nums">{w.weight} {w.unit}</span>
              </div>
            ))}
            {weights.length === 0 && <p className="text-muted-foreground py-2">No weight logs</p>}
          </div>
        </SectionCard>

        <SectionCard icon={Droplet} title="Water" value={`${waters.length} days`}>
          <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
            {waters.slice(0, 10).map(w => (
              <div key={w.log_date} className="flex justify-between border-b border-border/40 py-1">
                <span className="text-muted-foreground">{w.log_date}</span>
                <span className="font-medium">{w.cups} cups</span>
              </div>
            ))}
            {waters.length === 0 && <p className="text-muted-foreground py-2">No water logs</p>}
          </div>
        </SectionCard>

        <SectionCard icon={Pill} title="Supplements" value={`${supps.length} days`}>
          <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
            {supps.slice(0, 10).map(s => {
              const list = Array.isArray(s.supplements) ? s.supplements : [];
              return (
                <div key={s.log_date} className="flex justify-between border-b border-border/40 py-1">
                  <span className="text-muted-foreground">{s.log_date}</span>
                  <span className="font-medium">{list.length} taken</span>
                </div>
              );
            })}
            {supps.length === 0 && <p className="text-muted-foreground py-2">No supplement logs</p>}
          </div>
        </SectionCard>
      </div>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Plan history & achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Plans</p>
            {plans.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
            <div className="space-y-1">
              {plans.map(p => {
                const isActionable = p.status !== 'refunded';
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-xs border-b border-border/40 py-1">
                    <span className="font-medium truncate">{p.plan_type}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{p.start_date} → {p.end_date}</span>
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-[9px]">{p.status}</Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5"
                        disabled={!isSuperAdmin || !isActionable}
                        onClick={() => { setExtendDays('7'); setExtendPlan(p); }}
                        title="Extend plan"
                      >
                        <CalendarPlus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5"
                        disabled={!isSuperAdmin || !isActionable}
                        onClick={() => { setRefundReason(''); setRefundPlan(p); }}
                        title="Mark as refunded"
                      >
                        <IndianRupee className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Achievements</p>
            {achs.length === 0 && <p className="text-xs text-muted-foreground">None unlocked</p>}
            <div className="flex gap-1 flex-wrap">
              {achs.map(a => (
                <Badge key={a.achievement_key} variant="outline" className="text-[10px]">{a.achievement_key}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Monika chat (last 50)</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {chats.length === 0 && <p className="text-xs text-muted-foreground">No conversations</p>}
          {chats.map(m => (
            <div key={m.id} className={`text-xs p-2 rounded ${m.role === 'user' ? 'bg-muted' : 'bg-primary/5'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[9px]">{m.role}</Badge>
                <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Extend plan dialog */}
      <Dialog open={!!extendPlan} onOpenChange={(o) => !o && setExtendPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend plan</DialogTitle>
            <DialogDescription>
              {extendPlan?.plan_type} · current end date {extendPlan?.end_date}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="extend-days" className="text-xs">Add days</Label>
            <Input
              id="extend-days"
              type="number"
              min={1}
              max={365}
              value={extendDays}
              onChange={e => setExtendDays(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExtendPlan(null)}>Cancel</Button>
            <Button onClick={confirmExtend}>Extend & log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund plan dialog */}
      <Dialog open={!!refundPlan} onOpenChange={(o) => !o && setRefundPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark plan as refunded</DialogTitle>
            <DialogDescription>
              {refundPlan?.plan_type} · this updates plan status only. Process the actual payment refund in your payment provider separately.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="refund-reason" className="text-xs">Reason (min 5 chars)</Label>
            <Textarea
              id="refund-reason"
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              placeholder="Customer requested cancellation, ticket #..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefundPlan(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRefund}>Mark refunded & log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums mt-1">{value}</p>
    </Card>
  );
}

function SectionCard({ icon: Icon, title, value, children }: { icon: any; title: string; value: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{value}</span>
      </div>
      {children}
    </Card>
  );
}
