// One-time DPDP consent backfill banner. Renders for any logged-in user who
// has no `terms_and_privacy` row in `consent_records`. Once they accept, we
// insert the consent rows and the banner stops appearing.
//
// Why: India's DPDP Act requires explicit, recorded consent for processing
// health/personal data. Users who signed up before consent capture was wired
// in must be re-consented for the app to remain compliant.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export function ConsentBackfillBanner() {
  const { user } = useAuth();
  const [needsConsent, setNeedsConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { count } = await (supabase.from as any)('consent_records')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('purpose', ['terms_and_privacy', 'terms_privacy_minor_guardian']);
      if (!cancelled && (count ?? 0) === 0) setNeedsConsent(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const accept = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await (supabase.from as any)('consent_records').insert([
        { user_id: user.id, purpose: 'terms_and_privacy', granted: true, source: 'backfill' },
        { user_id: user.id, purpose: 'marketing', granted: marketingOptIn, source: 'backfill' },
      ]);
      if (marketingOptIn) {
        await (supabase.from as any)('profiles')
          .update({ marketing_consent: true })
          .eq('id', user.id);
      }
      toast.success('Thanks — your consent has been recorded.');
      setNeedsConsent(false);
    } catch (e: any) {
      toast.error('Could not save consent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!needsConsent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-xl mx-auto bg-card border border-border rounded-2xl p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">We've updated our Terms & Privacy Policy</p>
          <p className="text-xs text-muted-foreground mt-1">
            To keep using NutriLens we need your consent under India's DPDP Act. Please review and accept our{' '}
            <Link to="/terms" target="_blank" className="text-primary underline">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.
          </p>
          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none mt-3">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
            />
            <span>Send me product updates, tips, and offers (optional).</span>
          </label>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={accept} disabled={busy}>
              {busy ? 'Saving…' : 'Accept & continue'}
            </Button>
          </div>
        </div>
        <button
          onClick={() => setNeedsConsent(false)}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
