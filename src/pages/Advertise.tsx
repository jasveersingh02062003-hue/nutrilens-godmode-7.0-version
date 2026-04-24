import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Megaphone, CheckCircle2, Loader2, Target, ShoppingBag, ShieldCheck, Wallet, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Advertise() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    brand_name: '',
    legal_entity: '',
    gstin: '',
    fssai_license: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    website: '',
    monthly_budget_inr: '',
    categories: '',
    top_skus: '',
    price_range: '',
    zepto_url: '',
    blinkit_url: '',
    instamart_url: '',
    amazon_url: '',
    notes: '',
  });

  const handle = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brand_name || !form.contact_name || !form.contact_email) {
      toast.error('Please fill brand, contact name and email');
      return;
    }
    const hasQC = !!(form.zepto_url || form.blinkit_url || form.instamart_url);
    if (!hasQC && form.amazon_url) {
      toast.error('Please add at least one quick-commerce link (Zepto / Blinkit / Instamart). Amazon-only listings cannot be approved.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('brand_intake').insert([{
      brand_name: form.brand_name,
      legal_entity: form.legal_entity || null,
      gstin: form.gstin || null,
      fssai_license: form.fssai_license || null,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      phone: form.phone || null,
      website: form.website || null,
      monthly_budget_inr: form.monthly_budget_inr ? Number(form.monthly_budget_inr) : null,
      categories: form.categories ? form.categories.split(',').map(s => s.trim()).filter(Boolean) : [],
      top_skus: form.top_skus || null,
      price_range: form.price_range || null,
      zepto_url: form.zepto_url || null,
      blinkit_url: form.blinkit_url || null,
      instamart_url: form.instamart_url || null,
      amazon_url: form.amazon_url || null,
      notes: form.notes || null,
    }]);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold">Thanks — application received</h2>
          <p className="text-sm text-muted-foreground">
            Our partnerships team will review within 2 business days. We'll email next steps to{' '}
            <span className="font-medium text-foreground">{form.contact_email}</span>.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* PITCH */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Megaphone className="w-3.5 h-3.5" />
            For Brands
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Reach users at the moment of meal decision</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            NutriLens shows your products only to people who have a real, measured nutritional gap right now —
            not random scrollers. Every ad has a one-tap path to Zepto, Blinkit and Instamart.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Avg CTR" value="4.2%" sub="vs 0.9% industry" />
          <Stat label="Add-to-plan rate" value="12%" sub="of clicks convert" />
          <Stat label="Premium gating" value="PES ≥ 30" sub="no junk ads" />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <USP icon={Target} title="Contextual targeting" body="We serve your ad only when a user has a matching protein, calorie or budget gap — not on every scroll." />
          <USP icon={ShoppingBag} title="Quick-commerce CTAs" body="Direct links to Zepto / Blinkit / Instamart — users buy in 10 minutes, not 3-4 days." />
          <USP icon={ShieldCheck} title="Manual approval" body="Every brand and every campaign is reviewed by our team. Your brand sits next to other premium products." />
          <USP icon={Wallet} title="Pay only when seen" body="Wallet debits per impression. Zero balance? Campaign auto-pauses. No surprise bills." />
          <USP icon={BarChart3} title="Real conversion tracking" body="See impressions, clicks, add-to-plan and add-to-pantry events — not just vanity metrics." />
          <USP icon={Megaphone} title="4 ad formats" body="Nutrition-gap card, meal suggestion, market sponsored, smart contextual nudge." />
        </section>

        {/* APPLICATION FORM */}
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Apply to advertise</h2>
            <p className="text-sm text-muted-foreground">
              We verify GSTIN, FSSAI and quick-commerce listings. Reviewed within 2 business days.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <Section title="Company">
              <Field label="Brand name *">
                <Input value={form.brand_name} onChange={handle('brand_name')} placeholder="e.g. Yogabar" required />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Legal entity">
                  <Input value={form.legal_entity} onChange={handle('legal_entity')} placeholder="Sproutlife Foods Pvt Ltd" />
                </Field>
                <Field label="Website">
                  <Input value={form.website} onChange={handle('website')} placeholder="https://" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="GSTIN">
                  <Input value={form.gstin} onChange={handle('gstin')} placeholder="29AABCS1234L1Z5" maxLength={15} />
                </Field>
                <Field label="FSSAI license #">
                  <Input value={form.fssai_license} onChange={handle('fssai_license')} placeholder="10012345678901" maxLength={14} />
                </Field>
              </div>
            </Section>

            <Section title="Contact">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Your name *">
                  <Input value={form.contact_name} onChange={handle('contact_name')} required />
                </Field>
                <Field label="Work email *">
                  <Input type="email" value={form.contact_email} onChange={handle('contact_email')} placeholder="you@brand.com" required />
                </Field>
              </div>
              <Field label="Phone">
                <Input value={form.phone} onChange={handle('phone')} placeholder="+91…" />
              </Field>
            </Section>

            <Section title="Products">
              <Field label="Categories (comma-separated)">
                <Input value={form.categories} onChange={handle('categories')} placeholder="protein_bar, beverage" />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Top SKUs">
                  <Input value={form.top_skus} onChange={handle('top_skus')} placeholder="Multigrain Bar, Whey Bar" />
                </Field>
                <Field label="Price range">
                  <Input value={form.price_range} onChange={handle('price_range')} placeholder="₹40 – ₹150" />
                </Field>
              </div>
            </Section>

            <Section title="Quick commerce availability (key check)">
              <p className="text-xs text-muted-foreground -mt-1 mb-1">
                Paste live product page links. We require at least one of Zepto / Blinkit / Instamart — Amazon-only is not eligible.
              </p>
              <Field label="Zepto link">
                <Input value={form.zepto_url} onChange={handle('zepto_url')} placeholder="https://zepto…" />
              </Field>
              <Field label="Blinkit link">
                <Input value={form.blinkit_url} onChange={handle('blinkit_url')} placeholder="https://blinkit…" />
              </Field>
              <Field label="Instamart link">
                <Input value={form.instamart_url} onChange={handle('instamart_url')} placeholder="https://swiggy…/instamart…" />
              </Field>
              <Field label="Amazon link (fallback only)">
                <Input value={form.amazon_url} onChange={handle('amazon_url')} placeholder="https://amazon.in…" />
              </Field>
            </Section>

            <Section title="Budget & intent">
              <Field label="Monthly ad budget (INR)">
                <Input type="number" value={form.monthly_budget_inr} onChange={handle('monthly_budget_inr')} placeholder="50000" />
              </Field>
              <Field label="Why NutriLens?">
                <Textarea value={form.notes} onChange={handle('notes')} placeholder="Who you target, why this fits…" rows={3} />
              </Field>
            </Section>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit application
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              We never share your details. Reviewed within 2 business days.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </Card>
  );
}

function USP({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
        </div>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
