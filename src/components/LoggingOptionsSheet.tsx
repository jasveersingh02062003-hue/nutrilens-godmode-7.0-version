import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Camera, Mic, Search, ScanBarcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { canUseVoiceScan, incrementVoiceScan, getRemainingVoiceScans, canUseBarcodeScan, incrementBarcodeScan, getRemainingBarcodeScans } from '@/lib/subscription-service';
import UpgradePrompt from '@/components/UpgradePrompt';

interface Props {
  open: boolean;
  onClose: () => void;
  mealType: string;
  mealLabel: string;
  targetDate?: string;
}

const options = [
  { key: 'camera', icon: Camera, label: 'Camera', desc: 'Take a photo of your meal', emoji: '📷', color: 'bg-primary/10 text-primary' },
  { key: 'voice', icon: Mic, label: 'Voice', desc: 'Describe your meal', emoji: '🎤', color: 'bg-coral/10 text-coral' },
  { key: 'manual', icon: Search, label: 'Manual', desc: 'Search and add foods', emoji: '✍️', color: 'bg-violet/10 text-violet' },
  { key: 'barcode', icon: ScanBarcode, label: 'Barcode', desc: 'Scan a product barcode', emoji: '📱', color: 'bg-gold/10 text-gold' },
] as const;

export default function LoggingOptionsSheet({ open, onClose, mealType, mealLabel, targetDate }: Props) {
  const navigate = useNavigate();
  const [upgradeFeature, setUpgradeFeature] = useState<'voice' | 'barcode' | null>(null);

  const handleOption = (key: string) => {
    const dateParam = targetDate ? `&date=${targetDate}` : '';

    if (key === 'voice') {
      if (!canUseVoiceScan()) {
        setUpgradeFeature('voice');
        return;
      }
      incrementVoiceScan();
    }
    if (key === 'barcode') {
      if (!canUseBarcodeScan()) {
        setUpgradeFeature('barcode');
        return;
      }
      incrementBarcodeScan();
    }

    onClose();
    if (key === 'camera') {
      navigate(`/?meal=${mealType}${dateParam}`);
    } else if (key === 'manual') {
      navigate(`/log?meal=${mealType}${dateParam}`);
    } else if (key === 'voice') {
      navigate(`/log?meal=${mealType}&mode=voice${dateParam}`);
    } else if (key === 'barcode') {
      navigate(`/log?meal=${mealType}&mode=barcode${dateParam}`);
    }
  };

  const voiceRemaining = getRemainingVoiceScans();
  const barcodeRemaining = getRemainingBarcodeScans();

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { onClose(); setUpgradeFeature(null); } }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
        <div className="mb-5 mt-2">
          <h3 className="text-base font-bold text-foreground">Log {mealLabel}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Choose how you'd like to log this meal</p>
        </div>

        {upgradeFeature ? (
          <UpgradePrompt
            feature={upgradeFeature === 'voice' ? 'camera' : 'camera'}
            remaining={upgradeFeature === 'voice' ? voiceRemaining : barcodeRemaining}
            onUpgraded={() => setUpgradeFeature(null)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {options.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleOption(opt.key)}
                className="card-subtle p-4 flex flex-col items-center gap-2.5 hover:shadow-md transition-all active:scale-[0.97] text-center relative"
              >
                <div className={`w-12 h-12 rounded-2xl ${opt.color} flex items-center justify-center`}>
                  <opt.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{opt.desc}</p>
                </div>
                {opt.key === 'voice' && voiceRemaining !== Infinity && voiceRemaining < 3 && (
                  <span className="absolute top-1 right-1 text-[8px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold">{voiceRemaining} left</span>
                )}
                {opt.key === 'barcode' && barcodeRemaining !== Infinity && barcodeRemaining < 3 && (
                  <span className="absolute top-1 right-1 text-[8px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold">{barcodeRemaining} left</span>
                )}
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
