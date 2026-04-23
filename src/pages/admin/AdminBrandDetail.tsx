import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Upload, FileText, IndianRupee, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/audit';
import { inr } from '@/lib/admin-metrics';

interface Brand { id: string; brand_name: string; balance: number; status: string; contact_email: string | null; }
interface Doc { id: string; doc_type: string; storage_path: string; status: string; notes: string | null; created_at: string; }
interface Tx { id: string; type: string; amount: number; reference: string | null; notes: string | null; created_at: string; }
interface Member { id: string; user_id: string; role: string; created_at: string; }

export default function AdminBrandDetail() {
  const { id } = useParams<{ id: string }>();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [topup, setTopup] = useState({ amount: 0, reference: '', notes: '' });
  const [docType, setDocType] = useState('gst');
  const [memberEmail, setMemberEmail] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [b, d, t, m] = await Promise.all([
      supabase.from('brand_accounts').select('*').eq('id', id).maybeSingle(),
      supabase.from('brand_documents').select('*').eq('brand_id', id).order('created_at', { ascending: false }),
      supabase.from('brand_transactions').select('*').eq('brand_id', id).order('created_at', { ascending: false }),
      supabase.from('brand_members').select('*').eq('brand_id', id).order('created_at', { ascending: false }),
    ]);
    setBrand(b.data as Brand | null);
    setDocs((d.data ?? []) as Doc[]);
    setTxs((t.data ?? []) as Tx[]);
    setMembers((m.data ?? []) as Member[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const uploadDoc = async (file: File) => {
    if (!id) return;
    const path = `${id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('brand-kyc').upload(path, file);
    if (upErr) return toast.error(upErr.message);
    const { error: insErr } = await supabase
      .from('brand_documents')
      .insert([{ brand_id: id, doc_type: docType, storage_path: path }]);
    if (insErr) return toast.error(insErr.message);
    await logAdminAction({ action: 'brand_kyc_review', target_table: 'brand_documents', metadata: { brand_id: id, doc_type: docType, action: 'upload', path } });
    toast.success('Document uploaded');
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  const reviewDoc = async (doc: Doc, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('brand_documents').update({ status }).eq('id', doc.id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: 'brand_kyc_review', target_table: 'brand_documents', metadata: { doc_id: doc.id, status, brand_id: id } });
    toast.success(`Doc ${status}`);
    load();
  };

  const [topupBusy, setTopupBusy] = useState(false);

  const addTopup = async () => {
    if (!id || !brand) return;
    const amt = Number(topup.amount);
    if (!amt || amt <= 0) return toast.error('Enter a positive amount');
    setTopupBusy(true);
    const { data: txnId, error } = await supabase.rpc('apply_brand_transaction', {
      p_brand_id: id,
      p_amount: amt,
      p_type: 'topup',
      p_reference: topup.reference || null,
      p_notes: topup.notes || null,
    });
    setTopupBusy(false);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: 'brand_wallet_topup', target_table: 'brand_accounts', metadata: { brand_id: id, amount: amt, reference: topup.reference, txn_id: txnId } });
    toast.success(`Wallet topped up by ${inr(amt)} · txn ${String(txnId).slice(0, 8)}…`);
    setTopup({ amount: 0, reference: '', notes: '' });
    load();
  };

  const addMember = async () => {
    if (!id || !memberEmail.trim()) return;
    // Resolve email → user id via profiles? We don't store email there. Accept raw user UUID for simplicity.
    const v = memberEmail.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    if (!isUuid) return toast.error('Paste the user UUID (from /admin/users)');
    const { error } = await supabase.from('brand_members').insert([{ brand_id: id, user_id: v, role: 'manager' }]);
    if (error) return toast.error(error.message);
    toast.success('Member added');
    setMemberEmail('');
    load();
  };

  const removeMember = async (m: Member) => {
    const { error } = await supabase.from('brand_members').delete().eq('id', m.id);
    if (error) return toast.error(error.message);
    toast.success('Member removed');
    load();
  };

  const docUrl = async (path: string) => {
    const { data } = await supabase.storage.from('brand-kyc').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!brand) return <div className="p-8 text-sm text-muted-foreground">Brand not found</div>;

  return (
    <div className="p-8 max-w-5xl">
      <Link to="/admin/brands" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3 h-3" /> Brands
      </Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{brand.brand_name}</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">{brand.id}</p>
          <p className="text-xs text-muted-foreground">{brand.contact_email ?? '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wallet</p>
          <p className="text-3xl font-bold tabular-nums">{inr(Number(brand.balance))}</p>
          <Badge variant={brand.status === 'active' ? 'default' : 'secondary'} className="text-[10px] mt-1">{brand.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Wallet top-up</h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" value={topup.amount || ''} onChange={e => setTopup({ ...topup, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Reference (UTR / invoice no.)</Label>
              <Input value={topup.reference} onChange={e => setTopup({ ...topup, reference: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={topup.notes} onChange={e => setTopup({ ...topup, notes: e.target.value })} />
            </div>
            <Button onClick={addTopup} size="sm" className="w-full">Add to wallet</Button>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Upload className="w-4 h-4" /> KYC documents</h3>
          <div className="flex gap-2 mb-3">
            <select value={docType} onChange={e => setDocType(e.target.value)} className="text-xs border border-border rounded px-2 bg-background">
              <option value="gst">GST</option>
              <option value="pan">PAN</option>
              <option value="cin">CIN</option>
              <option value="agreement">Agreement</option>
              <option value="other">Other</option>
            </select>
            <input ref={fileRef} type="file" className="text-xs flex-1"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); }} />
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between text-xs border-b border-border/40 py-2">
                <button onClick={() => docUrl(d.storage_path)} className="flex items-center gap-2 hover:text-primary truncate">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="truncate">{d.doc_type}</span>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant={d.status === 'approved' ? 'default' : d.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[9px]">{d.status}</Badge>
                  {d.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5" onClick={() => reviewDoc(d, 'approved')}>✓</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5" onClick={() => reviewDoc(d, 'rejected')}>✕</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!docs.length && <p className="text-xs text-muted-foreground py-2">No documents yet</p>}
          </div>
        </Card>
      </div>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-bold mb-3">Transactions</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr><th className="text-left py-1">Date</th><th className="text-left">Type</th><th className="text-left">Reference</th><th className="text-right">Amount</th></tr>
          </thead>
          <tbody>
            {txs.map(t => (
              <tr key={t.id} className="border-t border-border">
                <td className="py-2 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="py-2"><Badge variant="outline" className="text-[10px]">{t.type}</Badge></td>
                <td className="py-2 text-xs text-muted-foreground">{t.reference ?? '—'}</td>
                <td className="py-2 text-right tabular-nums font-medium">{inr(Number(t.amount))}</td>
              </tr>
            ))}
            {!txs.length && <tr><td colSpan={4} className="py-3 text-center text-muted-foreground text-xs">No transactions</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Brand portal members</h3>
        <div className="flex gap-2 mb-3">
          <Input placeholder="User UUID (paste from /admin/users)" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} />
          <Button onClick={addMember} size="sm">Add</Button>
        </div>
        <div className="space-y-1">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between text-xs border-b border-border/40 py-2">
              <span className="font-mono">{m.user_id}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => removeMember(m)}>Remove</Button>
              </div>
            </div>
          ))}
          {!members.length && <p className="text-xs text-muted-foreground py-2">No members. Add a user UUID to give them brand-portal access.</p>}
        </div>
      </Card>
    </div>
  );
}
