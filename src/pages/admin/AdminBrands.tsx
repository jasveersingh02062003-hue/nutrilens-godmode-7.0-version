import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Building2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { logAdminAction } from '@/lib/audit';
import { inr } from '@/lib/admin-metrics';
import { toast } from 'sonner';

interface Brand {
  id: string; brand_name: string; contact_email: string | null;
  status: string; balance: number; logo_url: string | null;
  created_at: string; updated_at: string;
}

export default function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campCounts, setCampCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand_name: '', contact_email: '', balance: 0 });

  const load = async () => {
    setLoading(true);
    const [b, c] = await Promise.all([
      supabase.from('brand_accounts').select('*').order('created_at', { ascending: false }),
      supabase.from('ad_campaigns').select('brand_id'),
    ]);
    const counts = new Map<string, number>();
    for (const r of (c.data ?? []) as { brand_id: string }[]) {
      counts.set(r.brand_id, (counts.get(r.brand_id) ?? 0) + 1);
    }
    setBrands((b.data ?? []) as Brand[]);
    setCampCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.brand_name.trim()) return toast.error('Brand name required');
    const { error, data } = await supabase
      .from('brand_accounts')
      .insert([{
        brand_name: form.brand_name.trim(),
        contact_email: form.contact_email.trim() || null,
        balance: Number(form.balance) || 0,
      }])
      .select()
      .single();
    if (error) return toast.error(error.message);
    await logAdminAction({ action: 'feedback_resolved', target_table: 'brand_accounts', metadata: { admin_action: 'brand_created', id: data?.id, name: form.brand_name } });
    toast.success('Brand created');
    setOpen(false);
    setForm({ brand_name: '', contact_email: '', balance: 0 });
    load();
  };

  const toggleStatus = async (b: Brand) => {
    const next = b.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('brand_accounts').update({ status: next }).eq('id', b.id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: 'feedback_resolved', target_table: 'brand_accounts', metadata: { admin_action: 'status_change', id: b.id, status: next } });
    toast.success(`Brand ${next}`);
    load();
  };

  const adjustBalance = async (b: Brand) => {
    const v = prompt(`New balance for ${b.brand_name} (current: ₹${b.balance}):`, String(b.balance));
    if (v == null) return;
    const num = Number(v);
    if (Number.isNaN(num)) return toast.error('Invalid number');
    const { error } = await supabase.from('brand_accounts').update({ balance: num }).eq('id', b.id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: 'feedback_resolved', target_table: 'brand_accounts', metadata: { admin_action: 'balance_adjusted', id: b.id, from: b.balance, to: num } });
    toast.success('Balance updated');
    load();
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="text-sm text-muted-foreground">{brands.length} brand accounts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New brand</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Onboard new brand</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Brand name</Label>
                <Input value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} placeholder="e.g. Yakult India" />
              </div>
              <div>
                <Label className="text-xs">Contact email</Label>
                <Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="ops@brand.com" />
              </div>
              <div>
                <Label className="text-xs">Initial balance (₹)</Label>
                <Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Brand</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Campaigns</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map(b => (
                <tr key={b.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{b.brand_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{b.id.slice(0, 8)}…</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.contact_email ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{inr(Number(b.balance))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{campCounts.get(b.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{b.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => adjustBalance(b)}>Balance</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleStatus(b)}>
                        {b.status === 'active' ? 'Suspend' : 'Activate'}
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/brands/${b.id}`}>Open <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!brands.length && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No brands yet — onboard your first one</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
