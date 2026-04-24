// Banner shown on Dashboard when the user's subscription is `past_due`.
// Catches users who didn't open the dunning email — gives them a one-tap
// path to Paddle's customer portal to update their card.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getStatus, subscribeToPlanChanges } from '@/lib/subscription-service';
import { toast } from '@/hooks/use-toast';

export default function PaymentFailedBanner() {
  const [status, setStatus] = useState(getStatus());
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPlanChanges(() => setStatus(getStatus()));
    return unsub;
  }, []);

  if (status !== 'past_due') return null;

  const openPortal = async () => {
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: {
          environment: import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.startsWith('test_') ? 'sandbox' : 'live',
        },
      });
      if (error) throw error;
      const url = data?.url || data?.portalUrl;
      if (!url) throw new Error('No portal URL returned');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('[PaymentFailedBanner] portal open failed', e);
      toast({
        title: 'Could not open billing portal',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3"
    >
      <CreditCard className="w-5 h-5 text-destructive shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">
          Your last payment didn't go through
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Update your card in 1 tap to keep your premium features active.
        </p>
      </div>
      <Button
        size="sm"
        variant="destructive"
        className="shrink-0 text-xs h-8"
        onClick={openPortal}
        disabled={opening}
      >
        {opening ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Update card'}
      </Button>
    </motion.div>
  );
}
