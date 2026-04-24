import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, ChevronRight } from 'lucide-react';
import { inr } from '@/lib/admin-metrics';

interface IntakeRow {
  id: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  monthly_budget_inr: number | null;
  status: string;
  created_at: string;
  zepto_url: string | null;
  blinkit_url: string | null;
  instamart_url: string | null;
  amazon_url: string | null;
}

export default function AdminBrandIntake() {
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const load = async () => {
    setLoading(true);
    let q = supabase.from('brand_intake').select('*').order('created_at', { ascending: false });
    if (tab === 'pending') q = q.in('status', ['new', 'in_review']);
    else if (tab === 'approved') q = q.eq('status', 'approved');
    else if (tab === 'rejected') q = q.eq('status', 'rejected');
    const { data } = await q;
    setRows((data ?? []) as IntakeRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const tabs: Array<{ id: typeof tab; label: string }> = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="w-5 h-5" /> Brand applications</h1>
        <p className="text-sm text-muted-foreground">Review new brands before onboarding. GSTIN, FSSAI and quick-commerce verification.</p>
      </div>

      <div className="flex gap-1 mb-4 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Brand</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-left">QC presence</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const qc = [r.zepto_url && 'Z', r.blinkit_url && 'B', r.instamart_url && 'I'].filter(Boolean).join(' · ') || '—';
                const amazonOnly = !r.zepto_url && !r.blinkit_url && !r.instamart_url && !!r.amazon_url;
                return (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.brand_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>{r.contact_name}</div>
                      <div className="text-muted-foreground">{r.contact_email}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.monthly_budget_inr ? inr(Number(r.monthly_budget_inr)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={amazonOnly ? 'text-destructive font-medium' : ''}>
                        {amazonOnly ? 'Amazon only ⚠️' : qc}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          r.status === 'approved' ? 'default'
                          : r.status === 'rejected' ? 'destructive'
                          : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/brand-intake/${r.id}`}>Review <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No applications in this view.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
