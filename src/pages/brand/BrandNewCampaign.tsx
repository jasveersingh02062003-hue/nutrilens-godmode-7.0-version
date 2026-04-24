import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/admin-metrics";

interface Brand {
  id: string;
  brand_name: string;
  balance: number;
}

const SLOTS = ["hero_banner", "feed_native", "search_top", "meal_suggest"];
const DIETS = ["all", "veg", "nonveg"];
const CATEGORIES = ["protein_drink", "protein_bar", "ready_to_eat", "frozen", "spread", "supplement", "beverage", "snack"];

export default function BrandNewCampaign() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    brand_id: "",
    campaign_name: "",
    placement_slot: "hero_banner",
    target_diet: "all",
    target_categories: [] as string[],
    cities: "",
    budget_total: 5000,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    headline: "",
    subtitle: "",
    image_url: "",
    cta_text: "Learn More",
    cta_url: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: members } = await supabase.from("brand_members").select("brand_id").eq("user_id", user.id);
      const ids = (members ?? []).map((m: any) => m.brand_id);
      if (!ids.length) return;
      const { data } = await supabase.from("brand_accounts").select("id, brand_name, balance").in("id", ids);
      setBrands((data ?? []) as Brand[]);
      if (data?.[0]) setForm((f) => ({ ...f, brand_id: data[0].id }));
    })();
  }, [user]);

  const update = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCat = (c: string) =>
    update("target_categories", form.target_categories.includes(c) ? form.target_categories.filter((x) => x !== c) : [...form.target_categories, c]);

  const selectedBrand = brands.find((b) => b.id === form.brand_id);
  const insufficientFunds = selectedBrand && Number(selectedBrand.balance) < form.budget_total;

  const submit = async () => {
    if (!form.brand_id || !form.campaign_name || !form.headline) {
      toast.error("Fill all required fields");
      return;
    }
    setSubmitting(true);
    const { data: camp, error: campErr } = await supabase
      .from("ad_campaigns")
      .insert({
        brand_id: form.brand_id,
        campaign_name: form.campaign_name,
        placement_slot: form.placement_slot,
        target_diet: form.target_diet,
        target_categories: form.target_categories,
        budget_total: form.budget_total,
        start_date: form.start_date,
        end_date: form.end_date,
        status: "draft",
        pricing_model: "fixed",
      })
      .select("id")
      .single();
    if (campErr || !camp) {
      setSubmitting(false);
      toast.error(campErr?.message ?? "Failed to create campaign");
      return;
    }
    const cities = form.cities
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await Promise.all([
      supabase.from("ad_creatives").insert({
        campaign_id: camp.id,
        headline: form.headline,
        subtitle: form.subtitle || null,
        image_url: form.image_url || null,
        cta_text: form.cta_text,
        cta_url: form.cta_url || null,
        format: "native",
        is_active: true,
      }),
      cities.length || form.target_categories.length
        ? supabase.from("ad_targeting").insert({ campaign_id: camp.id, cities, meal_context: "any" })
        : Promise.resolve({ error: null } as any),
    ]);
    setSubmitting(false);
    toast.success("Campaign created — pending review");
    nav("/brand/campaigns");
  };

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">New campaign</h1>
      <p className="text-sm text-muted-foreground mb-6">Step {step} of 5</p>

      <div className="flex gap-1 mb-6">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded ${n <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <Card className="p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Basics</h2>
            <div>
              <Label>Brand</Label>
              <Select value={form.brand_id} onValueChange={(v) => update("brand_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.brand_name} · wallet {inr(Number(b.balance))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campaign name</Label>
              <Input value={form.campaign_name} onChange={(e) => update("campaign_name", e.target.value)} placeholder="Summer protein push" />
            </div>
            <div>
              <Label>Placement</Label>
              <Select value={form.placement_slot} onValueChange={(v) => update("placement_slot", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Targeting</h2>
            <div>
              <Label>Diet</Label>
              <Select value={form.target_diet} onValueChange={(v) => update("target_diet", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIETS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CATEGORIES.map((c) => (
                  <Badge
                    key={c}
                    variant={form.target_categories.includes(c) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCat(c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Cities (comma-separated, leave blank for all)</Label>
              <Input value={form.cities} onChange={(e) => update("cities", e.target.value)} placeholder="Mumbai, Delhi, Bengaluru" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Creative</h2>
            <div>
              <Label>Headline *</Label>
              <Input value={form.headline} onChange={(e) => update("headline", e.target.value)} maxLength={60} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => update("image_url", e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CTA text</Label>
                <Input value={form.cta_text} onChange={(e) => update("cta_text", e.target.value)} />
              </div>
              <div>
                <Label>CTA URL</Label>
                <Input value={form.cta_url} onChange={(e) => update("cta_url", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Budget & schedule</h2>
            <div>
              <Label>Total budget (INR)</Label>
              <Input type="number" value={form.budget_total} onChange={(e) => update("budget_total", Number(e.target.value))} />
              {insufficientFunds && (
                <p className="text-xs text-destructive mt-1">Wallet balance is below this budget. Top up in Billing.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <h2 className="font-semibold">Preview</h2>
            <div className="rounded-md border border-border p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">{selectedBrand?.brand_name} · sponsored</p>
              <p className="font-bold">{form.headline || "Your headline"}</p>
              {form.subtitle && <p className="text-sm text-muted-foreground">{form.subtitle}</p>}
              {form.image_url && <img src={form.image_url} alt="" loading="lazy" decoding="async" className="mt-2 max-h-40 rounded" />}
              <Button size="sm" className="mt-3">{form.cta_text}</Button>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <dt className="text-muted-foreground">Placement</dt><dd>{form.placement_slot}</dd>
              <dt className="text-muted-foreground">Diet</dt><dd>{form.target_diet}</dd>
              <dt className="text-muted-foreground">Categories</dt><dd>{form.target_categories.join(", ") || "all"}</dd>
              <dt className="text-muted-foreground">Budget</dt><dd>{inr(form.budget_total)}</dd>
              <dt className="text-muted-foreground">Window</dt><dd>{form.start_date} → {form.end_date}</dd>
            </dl>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 5 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Submit for review
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
