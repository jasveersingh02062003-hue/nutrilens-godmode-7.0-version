import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Megaphone, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Advertise() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    brand_name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    website: '',
    monthly_budget_inr: '',
    categories: '',
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
    setSubmitting(true);
    const { error } = await supabase.from('brand_intake').insert([{
      brand_name: form.brand_name,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      phone: form.phone || null,
      website: form.website || null,
      monthly_budget_inr: form.monthly_budget_inr ? Number(form.monthly_budget_inr) : null,
      categories: form.categories ? form.categories.split(',').map(s => s.trim()).filter(Boolean) : [],
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
          <h2 className="text-xl font-bold">Thanks — we'll be in touch</h2>
          <p className="text-sm text-muted-foreground">
            Our team reviews new partner requests within 2 business days. We'll email you next steps at{' '}
            <span className="font-medium text-foreground">{form.contact_email}</span>.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Megaphone className="w-3.5 h-3.5" />
            For Brands
          </div>
          <h1 className="text-3xl font-bold">Advertise on NutriLens</h1>
          <p className="text-muted-foreground">
            Reach health-conscious Indian users at the moment of meal decision. Tell us about your brand and our team will reach out.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Brand name *">
              <Input value={form.brand_name} onChange={handle('brand_name')} placeholder="e.g. Yogabar" required />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Contact name *">
                <Input value={form.contact_name} onChange={handle('contact_name')} placeholder="Your name" required />
              </Field>
              <Field label="Email *">
                <Input type="email" value={form.contact_email} onChange={handle('contact_email')} placeholder="you@brand.com" required />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Phone">
                <Input value={form.phone} onChange={handle('phone')} placeholder="+91…" />
              </Field>
              <Field label="Website">
                <Input value={form.website} onChange={handle('website')} placeholder="https://" />
              </Field>
            </div>
            <Field label="Monthly ad budget (INR)">
              <Input type="number" value={form.monthly_budget_inr} onChange={handle('monthly_budget_inr')} placeholder="50000" />
            </Field>
            <Field label="Product categories (comma-separated)">
              <Input value={form.categories} onChange={handle('categories')} placeholder="protein_bar, beverage" />
            </Field>
            <Field label="Tell us about your brand">
              <Textarea value={form.notes} onChange={handle('notes')} placeholder="What you sell, who you target, why NutriLens fits…" rows={4} />
            </Field>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send request
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
