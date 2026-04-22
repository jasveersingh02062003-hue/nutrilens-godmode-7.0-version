import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { inr } from "@/lib/admin-metrics";

interface Brand { id: string; brand_name: string; balance: number; }
interface Tx {
  id: string;
  brand_id: string;
  type: string;
  amount: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export default function BrandBilling() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: members } = await supabase.from("brand_members").select("brand_id").eq("user_id", user.id);
      const ids = (members ?? []).map((m: any) => m.brand_id);
      if (!ids.length) {
        setLoading(false);
        return;
      }
      const [b, t] = await Promise.all([
        supabase.from("brand_accounts").select("id, brand_name, balance").in("id", ids),
        supabase.from("brand_transactions").select("*").in("brand_id", ids).order("created_at", { ascending: false }).limit(100),
      ]);
      setBrands((b.data ?? []) as Brand[]);
      setTxs((t.data ?? []) as Tx[]);
      setLoading(false);
    })();
  }, [user]);

  const exportInvoiceCsv = (brand: Brand) => {
    const month = new Date().toISOString().slice(0, 7);
    const monthTxs = txs.filter((tx) => tx.brand_id === brand.id && tx.created_at.startsWith(month));
    const total = monthTxs.reduce((s, t) => s + (t.type === "debit" ? -Number(t.amount) : Number(t.amount)), 0);
    const rows = [
      ["Invoice", brand.brand_name, month],
      [],
      ["Date", "Type", "Amount", "Reference", "Notes"],
      ...monthTxs.map((t) => [t.created_at.slice(0, 10), t.type, String(t.amount), t.reference ?? "", t.notes ?? ""]),
      [],
      ["Net", "", String(total)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brand.brand_name}-invoice-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Billing</h1>
      <p className="text-sm text-muted-foreground mb-6">Wallet balance and transaction history</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {brands.map((b) => (
          <Card key={b.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{b.brand_name}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{inr(Number(b.balance))}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wallet balance</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => exportInvoiceCsv(b)}>
              <Download className="w-3.5 h-3.5 mr-1" /> Invoice
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-bold mb-3">Recent transactions</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="text-left py-1">Date</th>
              <th className="text-left">Brand</th>
              <th className="text-left">Type</th>
              <th className="text-right">Amount</th>
              <th className="text-left">Reference</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => {
              const brand = brands.find((b) => b.id === t.brand_id);
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="py-2 text-xs text-muted-foreground">{t.created_at.slice(0, 10)}</td>
                  <td className="py-2">{brand?.brand_name ?? "—"}</td>
                  <td className="py-2">
                    <Badge variant={t.type === "credit" ? "default" : "secondary"} className="text-[10px]">{t.type}</Badge>
                  </td>
                  <td className={`py-2 text-right tabular-nums ${t.type === "debit" ? "text-destructive" : ""}`}>
                    {t.type === "debit" ? "-" : "+"}{inr(Number(t.amount))}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">{t.reference ?? t.notes ?? "—"}</td>
                </tr>
              );
            })}
            {!txs.length && (
              <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">No transactions yet</td></tr>
            )}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-4">
          To top up your wallet, contact your account manager. Self-serve top-up coming soon.
        </p>
      </Card>
    </div>
  );
}
