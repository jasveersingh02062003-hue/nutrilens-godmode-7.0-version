// Modal for brand owners to self-serve top up their ad wallet via Paddle.
// Owner-only (parent component gates this). Once confirmed, opens a Paddle
// checkout in a new tab; the webhook credits the wallet asynchronously.

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { getPaddleEnvironment, isPaddleConfigured } from '@/lib/paddle';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
  onTopUpInitiated?: () => void;
}

export default function TopUpWalletDialog({ open, onOpenChange, brandId, brandName, onTopUpInitiated }: Props) {
  const [amount, setAmount] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const finalAmount = customAmount ? Math.max(500, Math.floor(Number(customAmount) || 0)) : amount;

  const handleConfirm = async () => {
    if (!isPaddleConfigured()) {
      toast.error('Payment provider not configured. Please contact support.');
      return;
    }
    if (finalAmount < 500) {
      toast.error('Minimum top-up is ₹500');
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('brand-wallet-checkout', {
        body: {
          brand_id: brandId,
          amount_inr: finalAmount,
          environment: getPaddleEnvironment(),
        },
      });

      if (error || !data?.checkout_url) {
        toast.error(data?.message || error?.message || 'Could not start checkout');
        return;
      }

      // Open Paddle checkout in a new tab. Webhook handles wallet credit.
      window.open(data.checkout_url, '_blank', 'noopener,noreferrer');
      toast.success('Checkout opened in new tab. Wallet will update once payment completes.');
      onTopUpInitiated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Top-up failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Top up wallet</DialogTitle>
          <DialogDescription>
            Add credit to <span className="font-medium text-foreground">{brandName}</span>'s ad wallet.
            You'll be redirected to a secure checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Choose amount</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setAmount(amt); setCustomAmount(''); }}
                  className={`py-3 rounded-lg border text-sm font-semibold transition-colors ${
                    !customAmount && amount === amt
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="custom-amount" className="text-xs text-muted-foreground">
              Or enter custom amount (₹)
            </Label>
            <Input
              id="custom-amount"
              type="number"
              min={500}
              max={1000000}
              placeholder="e.g. 7500"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Min ₹500 · Max ₹10,00,000</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Top-up amount</span>
              <span className="font-semibold">₹{finalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">GST (handled by Paddle)</span>
              <span className="text-muted-foreground">Included</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={busy || finalAmount < 500}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
            Continue to checkout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
