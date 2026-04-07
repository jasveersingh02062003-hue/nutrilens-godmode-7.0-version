import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MapPin, Tag, IndianRupee, Check } from 'lucide-react';
import { reportPrice } from '@/lib/live-price-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { toast } from 'sonner';
import { SUPPORTED_CITIES } from '@/lib/market-service';

interface ReportPriceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillItem?: string;
}

const COMMON_ITEMS = [
  'Chicken', 'Eggs', 'Paneer', 'Tomato', 'Onion', 'Potato', 'Milk',
  'Fish', 'Mutton', 'Soya Chunks', 'Rice', 'Curd', 'Spinach', 'Banana',
];

const UNITS = ['kg', 'piece', 'dozen', 'liter', '500g', '250g'];

export default function ReportPriceSheet({ open, onOpenChange, prefillItem }: ReportPriceSheetProps) {
  const { profile } = useUserProfile();
  const city = (profile as any)?.city || '';
  const [item, setItem] = useState(prefillItem || '');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!item.trim() || !price || Number(price) <= 0) {
      toast.error('Please fill item name and price');
      return;
    }
    if (!city) {
      toast.error('Please set your city in profile first');
      return;
    }

    setSubmitting(true);
    try {
      await reportPrice(item.trim(), Number(price), unit, city);
      setSubmitted(true);
      toast.success(`Thanks! Price reported for ${item} in ${city}`);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setItem('');
        setPrice('');
      }, 1500);
    } catch (e) {
      toast.error('Failed to report price. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh]">
        <SheetHeader>
          <SheetTitle className="text-base">Report a Price</SheetTitle>
          <SheetDescription className="text-xs">Help improve prices for everyone in your area</SheetDescription>
        </SheetHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground">Price Reported!</p>
            <p className="text-xs text-muted-foreground text-center">
              Your contribution helps other users in {city} see accurate prices
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* City */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                <MapPin className="w-3 h-3 inline mr-1" />City
              </label>
              <div className="px-3 py-2.5 rounded-xl bg-muted text-sm text-foreground">
                {city || 'Set city in your profile'}
              </div>
            </div>

            {/* Item */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                <Tag className="w-3 h-3 inline mr-1" />Item
              </label>
              <input
                value={item}
                onChange={e => setItem(e.target.value)}
                placeholder="e.g., Chicken, Eggs, Tomato..."
                className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_ITEMS.filter(i => !item || i.toLowerCase().includes(item.toLowerCase())).slice(0, 8).map(i => (
                  <button
                    key={i}
                    onClick={() => setItem(i)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                      item === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Price + Unit */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  <IndianRupee className="w-3 h-3 inline mr-1" />Price
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="₹"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="w-28">
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Per</label>
                <div className="flex flex-wrap gap-1">
                  {UNITS.map(u => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                        unit === u ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !item || !price} className="w-full">
              {submitting ? 'Submitting...' : 'Submit Price Report'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
