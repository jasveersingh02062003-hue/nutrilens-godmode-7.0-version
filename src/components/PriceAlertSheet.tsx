import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, BellRing } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PriceAlertSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  city: string;
  currentPrice?: number;
}

export default function PriceAlertSheet({ open, onOpenChange, itemName, city, currentPrice }: PriceAlertSheetProps) {
  const { user } = useAuth();
  const [threshold, setThreshold] = useState(currentPrice ? Math.floor(currentPrice * 0.9).toString() : '');
  const [direction, setDirection] = useState<'below' | 'above'>('below');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !threshold) return;
    const price = parseFloat(threshold);
    if (isNaN(price) || price <= 0) {
      toast.error('Enter a valid price');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('price_alerts' as any).insert({
        user_id: user.id,
        item_name: itemName,
        city: city.toLowerCase() || 'india',
        threshold_price: price,
        comparison_type: direction,
      } as any);

      if (error) throw error;
      toast.success(`Alert set! We'll notify you when ${itemName} goes ${direction} ₹${price}`, { icon: '🔔' });
      onOpenChange(false);
    } catch (e) {
      console.error('Failed to set alert:', e);
      toast.error('Could not save alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-base flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" /> Set Price Alert
          </SheetTitle>
          <SheetDescription>Get notified when {itemName} price changes</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="p-3 rounded-xl bg-muted">
            <p className="text-sm font-semibold text-foreground">{itemName}</p>
            <p className="text-xs text-muted-foreground">📍 {city || 'All cities'}</p>
            {currentPrice && (
              <p className="text-xs text-muted-foreground mt-1">Current price: ₹{currentPrice}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Alert when price goes...</p>
            <div className="flex gap-2">
              {(['below', 'above'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    direction === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {d === 'below' ? '↓ Below' : '↑ Above'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Threshold price (₹)</p>
            <Input
              type="number"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              placeholder="e.g. 250"
              className="text-sm"
            />
          </div>

          <Button onClick={handleSave} disabled={saving || !threshold} className="w-full">
            <Bell className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Set Alert'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
