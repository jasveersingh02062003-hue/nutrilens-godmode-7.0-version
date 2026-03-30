import { useRef, useMemo, useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Share2, Download, Copy, Heart, Activity, Target, Scale, Ruler, Flame, Zap, Crown } from 'lucide-react';
import { isPremium } from '@/lib/subscription-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { getProfilePhoto } from '@/components/EditProfileSheet';
import { getBMICategory, getBMIColor } from '@/lib/nutrition';
import { getDailyLog } from '@/lib/store';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

function get7DayAverages() {
  let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFat = 0, days = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const log = getDailyLog(key);
    if (log.meals.length > 0) {
      days++;
      for (const m of log.meals) {
        totalCal += m.totalCalories;
        totalPro += m.totalProtein;
        totalCarbs += m.totalCarbs;
        totalFat += m.totalFat;
      }
    }
  }
  if (days === 0) return null;
  return {
    calories: Math.round(totalCal / days),
    protein: Math.round(totalPro / days),
    carbs: Math.round(totalCarbs / days),
    fat: Math.round(totalFat / days),
    days,
  };
}

export default function HealthCardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useUserProfile();
  const [userEmail, setUserEmail] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user?.email || ''));
  }, [open]);
  const cardRef = useRef<HTMLDivElement>(null);
  const profilePhoto = getProfilePhoto();

  const averages = useMemo(() => get7DayAverages(), [open]);
  const premium = isPremium();

  if (!profile) return null;

  const goalLabel = profile.goal === 'lose' ? 'Weight Loss' : profile.goal === 'gain' ? 'Muscle Gain' : 'Maintenance';

  const conditions: string[] = [];
  if (profile.healthConditions?.length) conditions.push(...profile.healthConditions.map(c => c.replace(/_/g, ' ')));
  if (profile.womenHealth?.length) conditions.push(...profile.womenHealth.map(c => c.toUpperCase()));

  const qrData = JSON.stringify({
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    weight: profile.weightKg,
    target: profile.targetWeight,
    height: profile.heightCm,
    bmi: Number(profile.bmi.toFixed(1)),
    bmr: Math.round(profile.bmr),
    tdee: Math.round(profile.tdee),
    dailyGoal: profile.dailyCalories,
    goal: goalLabel,
    conditions,
  });

  const handleCopyText = () => {
    const text = [
      `🏥 Health Card — ${profile.name}`,
      `Age: ${profile.age} · Gender: ${profile.gender}`,
      `Weight: ${profile.weightKg} kg → Target: ${profile.targetWeight} kg`,
      `Height: ${profile.heightCm} cm · BMI: ${profile.bmi.toFixed(1)} (${getBMICategory(profile.bmi)})`,
      `BMR: ${Math.round(profile.bmr)} kcal · TDEE: ${Math.round(profile.tdee)} kcal`,
      `Daily Goal: ${profile.dailyCalories} kcal`,
      `Goal: ${goalLabel}`,
      conditions.length ? `Conditions: ${conditions.join(', ')}` : '',
      averages ? `\n7-day avg: ${averages.calories} kcal · ${averages.protein}g protein · ${averages.carbs}g carbs · ${averages.fat}g fat` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Health card copied to clipboard');
  };

  const handleShareImage = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'health-card.png', { type: 'image/png' })] })) {
          await navigator.share({
            title: 'My Health Card',
            files: [new File([blob], 'health-card.png', { type: 'image/png' })],
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'health-card.png';
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Health card saved as image');
        }
      }, 'image/png');
    } catch {
      toast.error('Could not capture card');
    }
  };

  const bmiCategory = getBMICategory(profile.bmi);
  const bmiColor = getBMIColor(profile.bmi);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl p-0 overflow-y-auto">
        <SheetHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Heart className="w-5 h-5 text-destructive" /> Health Card
            </SheetTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handleCopyText} className="h-8 w-8">
                <Copy className="w-4 h-4" />
              </Button>
              {premium && <Button variant="ghost" size="icon" onClick={handleShareImage} className="h-8 w-8">
                <Share2 className="w-4 h-4" />
              </Button>}
            </div>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-4 pb-10">
          {/* Capturable card */}
          <div ref={cardRef} className="rounded-2xl bg-gradient-to-br from-primary/5 via-card to-secondary/5 border border-border p-5 space-y-5">

            {/* Personal Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{(profile.name || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-foreground truncate">{profile.name || 'NutriLens User'}</h2>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{profile.age} years · <span className="capitalize">{profile.gender}</span></p>
              </div>
            </div>

            {/* Body & Energy Metrics */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Scale, label: 'Weight', value: `${profile.weightKg}`, unit: 'kg' },
                { icon: Target, label: 'Target', value: `${profile.targetWeight}`, unit: 'kg' },
                { icon: Ruler, label: 'Height', value: `${profile.heightCm}`, unit: 'cm' },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-card border border-border p-3 text-center">
                  <m.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-foreground">{m.value}</p>
                  <p className="text-[9px] text-muted-foreground">{m.unit} · {m.label}</p>
                </div>
              ))}
            </div>

            {/* BMI Bar */}
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">BMI</span>
                <span className={`text-sm font-bold ${bmiColor}`}>{profile.bmi.toFixed(1)} — {bmiCategory}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-destructive transition-all"
                  style={{ width: `${Math.min((profile.bmi / 40) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[8px] text-muted-foreground">
                <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
              </div>
            </div>

            {/* Energy Row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Flame, label: 'BMR', value: Math.round(profile.bmr), unit: 'kcal' },
                { icon: Activity, label: 'TDEE', value: Math.round(profile.tdee), unit: 'kcal' },
                { icon: Zap, label: 'Daily Goal', value: profile.dailyCalories, unit: 'kcal' },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-card border border-border p-3 text-center">
                  <m.icon className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-base font-bold text-foreground">{m.value}</p>
                  <p className="text-[9px] text-muted-foreground">{m.unit}</p>
                  <p className="text-[9px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Goals & Conditions */}
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-2">Goals & Conditions</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{goalLabel}</span>
                {conditions.map((c, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium capitalize">{c}</span>
                ))}
                {conditions.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">No conditions reported</span>
                )}
              </div>
            </div>

            {/* 7-Day Averages */}
            {averages && (
              <div className="rounded-xl bg-card border border-border p-4">
                <h3 className="text-xs font-semibold text-foreground mb-2">Last 7-day Average ({averages.days} active days)</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Calories', value: averages.calories, unit: 'kcal', color: 'text-primary' },
                    { label: 'Protein', value: averages.protein, unit: 'g', color: 'text-coral' },
                    { label: 'Carbs', value: averages.carbs, unit: 'g', color: 'text-accent' },
                    { label: 'Fat', value: averages.fat, unit: 'g', color: 'text-violet' },
                  ].map(m => (
                    <div key={m.label}>
                      <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-[8px] text-muted-foreground">{m.unit} · {m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <QRCodeSVG
                value={qrData}
                size={120}
                bgColor="transparent"
                fgColor="hsl(160, 20%, 12%)"
                level="M"
              />
              <p className="text-[9px] text-muted-foreground">Scan to import health data</p>
            </div>

            {/* Branding */}
            <p className="text-center text-[8px] text-muted-foreground/60 pt-1">Generated by NutriLens AI</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="gap-2" onClick={handleCopyText}>
              <Copy className="w-4 h-4" /> Copy Text
            </Button>
            {premium ? (
              <Button className="gap-2" onClick={handleShareImage}>
                <Download className="w-4 h-4" /> Save Image
              </Button>
            ) : (
              <Button variant="outline" className="gap-2 opacity-50" disabled>
                <Crown className="w-4 h-4" /> Premium Only
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
