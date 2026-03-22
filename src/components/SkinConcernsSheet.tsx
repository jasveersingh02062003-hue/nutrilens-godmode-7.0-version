import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sparkles, Check, ChevronDown } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { toast } from 'sonner';

export interface SkinConcerns {
  oily?: boolean;
  dry?: boolean;
  acne?: boolean;
  dull?: boolean;
  pigmentation?: boolean;
  sensitive?: boolean;
  severity?: number;
  seasonalChanges?: boolean;
  winterDry?: boolean;
  summerOily?: boolean;
  diagnosedConditions?: string[];
}

const CONCERNS = [
  { key: 'acne' as const, label: 'Acne / Breakouts', emoji: '🔴', desc: 'Pimples, cysts, or frequent breakouts', science: 'Linked to high-glycemic foods & zinc deficiency' },
  { key: 'oily' as const, label: 'Oily Skin', emoji: '💧', desc: 'Excess oil, shiny T-zone', science: 'Zinc & vitamin B6 help regulate sebum' },
  { key: 'dry' as const, label: 'Dry Skin', emoji: '🏜️', desc: 'Flaky, tight, or rough skin', science: 'Omega-3 & vitamin E restore moisture barrier' },
  { key: 'dull' as const, label: 'Dullness', emoji: '😶', desc: 'Lack of glow, uneven tone', science: 'Vitamin C boosts collagen & radiance' },
  { key: 'pigmentation' as const, label: 'Pigmentation', emoji: '🟤', desc: 'Dark spots, uneven patches', science: 'Antioxidants & lycopene reduce melanin overproduction' },
  { key: 'sensitive' as const, label: 'Sensitivity', emoji: '🌡️', desc: 'Redness, irritation, rashes', science: 'Anti-inflammatory foods soothe reactive skin' },
];

const DIAGNOSED_CONDITIONS = [
  { key: 'eczema', label: 'Eczema' },
  { key: 'psoriasis', label: 'Psoriasis' },
  { key: 'rosacea', label: 'Rosacea' },
  { key: 'dermatitis', label: 'Dermatitis' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SkinConcernsSheet({ open, onClose }: Props) {
  const { profile, updateProfile } = useUserProfile();
  const existing: SkinConcerns = (profile as any)?.skinConcerns || {};
  const [selected, setSelected] = useState<SkinConcerns>(existing);
  const [severity, setSeverity] = useState(existing.severity || 3);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggle = (key: keyof Pick<SkinConcerns, 'oily' | 'dry' | 'acne' | 'dull' | 'pigmentation' | 'sensitive'>) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDiagnosed = (key: string) => {
    setSelected(prev => {
      const current = prev.diagnosedConditions || [];
      const next = current.includes(key) ? current.filter(c => c !== key) : [...current, key];
      return { ...prev, diagnosedConditions: next };
    });
  };

  const hasAny = CONCERNS.some(c => selected[c.key]);

  const handleSave = () => {
    const data: SkinConcerns = {
      ...selected,
      severity: hasAny ? severity : undefined,
    };
    updateProfile({ skinConcerns: data } as any);
    toast.success('Skin health profile updated');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Skin Health Profile
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 overflow-y-auto max-h-[72vh] pb-8">
          <p className="text-xs text-muted-foreground">
            Tell us about your skin and we'll recommend foods backed by dermatology research to help improve it naturally.
          </p>

          {/* Main concerns */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Skin Concerns</p>
            {CONCERNS.map(c => {
              const isActive = selected[c.key];
              return (
                <button
                  key={c.key}
                  onClick={() => toggle(c.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${
                    isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{c.label}</p>
                    <p className="text-[10px] text-muted-foreground">{c.desc}</p>
                    {isActive && (
                      <p className="text-[9px] text-primary mt-0.5">💡 {c.science}</p>
                    )}
                  </div>
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Severity */}
          {hasAny && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-foreground">
                How much does this affect you? ({severity}/5)
              </label>
              <Slider
                value={[severity]}
                onValueChange={v => setSeverity(v[0])}
                min={1} max={5} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>Mild</span><span>Moderate</span><span>Severe</span>
              </div>
            </div>
          )}

          {/* Seasonal changes */}
          {hasAny && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-foreground">Seasonal Skin Changes</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(prev => ({ ...prev, winterDry: !prev.winterDry }))}
                  className={`flex-1 p-2.5 rounded-xl border text-center transition-all active:scale-[0.98] ${
                    selected.winterDry ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <span className="text-sm">❄️</span>
                  <p className="text-[10px] font-medium text-foreground mt-1">Drier in winter</p>
                </button>
                <button
                  onClick={() => setSelected(prev => ({ ...prev, summerOily: !prev.summerOily }))}
                  className={`flex-1 p-2.5 rounded-xl border text-center transition-all active:scale-[0.98] ${
                    selected.summerOily ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <span className="text-sm">☀️</span>
                  <p className="text-[10px] font-medium text-foreground mt-1">Oilier in summer</p>
                </button>
              </div>
            </div>
          )}

          {/* Advanced: Diagnosed conditions */}
          {hasAny && (
            <div className="pt-1">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                Diagnosed skin conditions (optional)
              </button>
              {showAdvanced && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {DIAGNOSED_CONDITIONS.map(d => {
                    const isActive = selected.diagnosedConditions?.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        onClick={() => toggleDiagnosed(d.key)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-[0.97] ${
                          isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSave} className="w-full mt-4">
            Save Skin Profile
          </Button>

          {/* Educational footer */}
          {hasAny && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">How it works:</span> Based on dermatology research, 
                certain nutrients directly support skin health. Zinc regulates oil production, Vitamin C boosts collagen 
                for glow, Omega-3 reduces inflammation, and antioxidants protect against UV-related pigmentation. 
                We'll suggest these foods naturally within your meals — no supplements needed.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
