import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Loader2, ArrowLeft, ExternalLink, ShieldCheck, X, Check, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { inr } from '@/lib/admin-metrics';

interface Intake {
  id: string;
  brand_name: string;
  legal_entity: string | null;
  gstin: string | null;
  fssai_license: string | null;
  contact_name: string;
  contact_email: string;
  phone: string | null;
  website: string | null;
  monthly_budget_inr: number | null;
  categories: string[] | null;
  top_skus: string | null;
  price_range: string | null;
  zepto_url: string | null;
  blinkit_url: string | null;
  instamart_url: string | null;
  amazon_url: string | null;
  notes: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const CHECKS = [
  { key: 'gst', label: 'GSTIN verified on gst.gov.in' },
  { key: 'fssai', label: 'FSSAI license active on foscos.fssai.gov.in' },
  { key: 'qc', label: 'At least 1 quick-commerce listing live' },
  { key: 'label', label: 'Nutrition label honest (claims match ingredients)' },
  { key: 'pes', label: 'Product PES score ≥ 30 (not junk in disguise)' },
  { key: 'reputation', label: 'No FSSAI penalties / safety complaints' },
];

export default function AdminBrandIntakeDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from('brand_intake').select('*').eq('id', id).maybeSingle();
    setIntake(data as Intake | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const allChecked = CHECKS.every(c => checks[c.key]);
  const amazonOnly = intake && !intake.zepto_url && !intake.blinkit_url && !intake.instamart_url && !!intake.amazon_url;
  const decided = intake && intake.status !== 'new' && intake.status !== 'in_review';

  const approve = async () => {
    if (!intake) return;
    if (!allChecked) { toast.error('Tick all 6 verification checks first'); return; }
    if (amazonOnly) { toast.error('Amazon-only brands are not eligible'); return; }
    setBusy(true);
    const { data: brandId, error } = await supabase.rpc('approve_brand_intake', {
      p_intake_id: intake.id,
      p_initial_balance: Number(initialBalance) || 0,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Approved · brand ${String(brandId).slice(0, 8)}…`);
    nav(`/admin/brands/${brandId}`);
  };

  const reject = async () => {
    if (!intake) return;
    if (!reason.trim()) { toast.error('A rejection reason is required'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('reject_brand_intake', {
      p_intake_id: intake.id,
      p_reason: reason.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Application rejected');
    load();
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!intake) return <div className="p-8 text-sm text-muted-foreground">Application not found.</div>;

  return (
    <div className="p-8 max-w-5xl">
      <Link to="/admin/brand-intake" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3 h-3" /> Applications
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{intake.brand_name}</h1>
          {intake.legal_entity && <p className="text-sm text-muted-foreground">{intake.legal_entity}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            Submitted {new Date(intake.created_at).toLocaleString()}
          </p>
        </div>
        <Badge
          variant={
            intake.status === 'approved' ? 'default'
            : intake.status === 'rejected' ? 'destructive'
            : 'secondary'
          }
        >
          {intake.status}
        </Badge>
      </div>

      {amazonOnly && (
        <Card className="p-3 mb-4 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Amazon-only listing</p>
              <p className="text-xs text-muted-foreground">3-4 day delivery kills impulse purchase. Auto-reject recommended.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Application data</h3>
          <dl className="text-sm space-y-2">
            <Row label="Contact">{intake.contact_name} · <span className="text-muted-foreground">{intake.contact_email}</span></Row>
            <Row label="Phone">{intake.phone ?? '—'}</Row>
            <Row label="Website">
              {intake.website ? <a href={intake.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{intake.website}</a> : '—'}
            </Row>
            <Row label="GSTIN">{intake.gstin ?? '—'}</Row>
            <Row label="FSSAI">{intake.fssai_license ?? '—'}</Row>
            <Row label="Categories">{intake.categories?.join(', ') || '—'}</Row>
            <Row label="Top SKUs">{intake.top_skus ?? '—'}</Row>
            <Row label="Price range">{intake.price_range ?? '—'}</Row>
            <Row label="Monthly budget">{intake.monthly_budget_inr ? inr(Number(intake.monthly_budget_inr)) : '—'}</Row>
          </dl>
          {intake.notes && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Brand pitch</p>
              <p className="text-sm whitespace-pre-wrap">{intake.notes}</p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Quick-commerce listings</h3>
          <div className="space-y-2">
            <QcLink label="Zepto" url={intake.zepto_url} />
            <QcLink label="Blinkit" url={intake.blinkit_url} />
            <QcLink label="Instamart" url={intake.instamart_url} />
            <QcLink label="Amazon (fallback)" url={intake.amazon_url} amazon />
          </div>
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quick lookups</p>
            <a href="https://services.gst.gov.in/services/searchtp" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              Verify GSTIN on gst.gov.in <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://foscos.fssai.gov.in/" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              Verify FSSAI on foscos.fssai.gov.in <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </Card>
      </div>

      {/* Decision panel */}
      {decided ? (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">Decision</h3>
          <p className="text-sm">
            Status: <Badge variant={intake.status === 'approved' ? 'default' : 'destructive'}>{intake.status}</Badge>
            {intake.reviewed_at && <span className="text-xs text-muted-foreground ml-2">on {new Date(intake.reviewed_at).toLocaleString()}</span>}
          </p>
          {intake.rejection_reason && (
            <div className="mt-3 p-3 rounded-md bg-muted text-sm">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Rejection reason</p>
              {intake.rejection_reason}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> 6-point verification</h3>
          <ul className="space-y-2 mb-4">
            {CHECKS.map(c => (
              <li key={c.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  id={c.key}
                  checked={!!checks[c.key]}
                  onChange={e => setChecks(s => ({ ...s, [c.key]: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor={c.key} className="cursor-pointer">{c.label}</label>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label className="text-xs">Initial wallet balance (₹)</Label>
              <Input type="number" value={initialBalance || ''} onChange={e => setInitialBalance(Number(e.target.value))} placeholder="0" />
              <Button onClick={approve} className="w-full" disabled={busy || !allChecked || !!amazonOnly}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Approve & onboard
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rejection reason</Label>
              <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="What's missing or disqualifying?" />
              <Button variant="destructive" onClick={reject} className="w-full" disabled={busy || !reason.trim()}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                Reject
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}

function QcLink({ label, url, amazon }: { label: string; url: string | null; amazon?: boolean }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/40">
        <span>{label}</span>
        <Badge variant="outline" className="text-[10px]">not provided</Badge>
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between text-sm p-2 rounded-md border border-border hover:bg-muted/50"
    >
      <span className="truncate">{label}</span>
      <span className="flex items-center gap-1 shrink-0 ml-2">
        {amazon && <Badge variant="outline" className="text-[10px]">fallback</Badge>}
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
      </span>
    </a>
  );
}
