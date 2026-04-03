import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { getCoachSettings, saveCoachSettings, resetCoachPreferences, CoachSettings } from '@/lib/coach';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CoachSettingsSheet({ open, onClose }: Props) {
  const [settings, setSettings] = useState<CoachSettings>(getCoachSettings);

  const update = (partial: Partial<CoachSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveCoachSettings(next);
  };

  const toneOptions: { label: string; value: string; emoji: string }[] = [
    { label: 'Friendly', value: 'friendly', emoji: '😊' },
    { label: 'Professional', value: 'professional', emoji: '📋' },
    { label: 'Motivational', value: 'motivational', emoji: '🔥' },
  ];

  const freqOptions: { label: string; value: string; desc: string }[] = [
    { label: 'Low', value: 'low', desc: '2-3 nudges/day' },
    { label: 'Medium', value: 'medium', desc: '4-6 nudges/day' },
    { label: 'High', value: 'high', desc: '8+ nudges/day' },
  ];

  // Store tone and frequency as extended settings in localStorage
  const extKey = 'nutrilens_coach_extended';
  let ext = { tone: 'friendly', frequency: 'medium' };
  try { ext = JSON.parse(localStorage.getItem(extKey) || '{}'); if (!ext.tone) ext.tone = 'friendly'; if (!ext.frequency) ext.frequency = 'medium'; } catch {}

  const updateExt = (partial: Record<string, string>) => {
    const next = { ...ext, ...partial };
    localStorage.setItem(extKey, JSON.stringify(next));
  };

  const [tone, setTone] = useState(ext.tone || 'friendly');
  const [freq, setFreq] = useState(ext.frequency || 'medium');

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Daily Coach Settings
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4 overflow-y-auto max-h-[70vh] pb-8">
          {/* Enable Toggle */}
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Enable Coach</p>
                <p className="text-[10px] text-muted-foreground">Get personalized tips throughout the day</p>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={v => update({ enabled: v })} />
            </div>
          </div>

          {settings.enabled && (
            <>
              {/* Frequency */}
              <div className="card-elevated p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Frequency</p>
                <div className="flex gap-2">
                  {freqOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setFreq(opt.value); updateExt({ frequency: opt.value }); }}
                      className={`flex-1 py-2.5 rounded-xl text-center transition-colors ${
                        freq === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="text-[9px] opacity-80">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div className="card-elevated p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tone</p>
                <div className="flex gap-2">
                  {toneOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setTone(opt.value); updateExt({ tone: opt.value }); }}
                      className={`flex-1 py-2.5 rounded-xl text-center transition-colors ${
                        tone === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-base">{opt.emoji}</p>
                      <p className="text-xs font-semibold">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics */}
              <div className="card-elevated p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Topics</p>
                {([
                  { key: 'mealFeedback', label: 'Meal feedback', desc: 'Tips after logging meals' },
                  { key: 'hydrationAlerts', label: 'Hydration alerts', desc: 'Water drinking reminders' },
                  { key: 'activityReminders', label: 'Activity reminders', desc: 'Move and exercise nudges' },
                  { key: 'progressSummaries', label: 'Progress summaries', desc: 'Calorie and macro insights' },
                  { key: 'weeklyReports', label: 'Weekly reports', desc: 'Weekly performance analysis' },
                ] as { key: keyof CoachSettings; label: string; desc: string }[]).map(topic => (
                  <div key={topic.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground">{topic.label}</p>
                      <p className="text-[10px] text-muted-foreground">{topic.desc}</p>
                    </div>
                    <Switch
                      checked={settings[topic.key] as boolean}
                      onCheckedChange={v => update({ [topic.key]: v })}
                    />
                  </div>
                ))}
              </div>

              {/* Quiet Hours */}
              <div className="card-elevated p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quiet Hours</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1">From</p>
                    <select
                      value={settings.quietStartHour}
                      onChange={e => update({ quietStartHour: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded-lg bg-muted text-xs text-foreground outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{`${i === 0 ? 12 : i > 12 ? i - 12 : i} ${i < 12 ? 'AM' : 'PM'}`}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-xs text-muted-foreground mt-4">to</span>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1">To</p>
                    <select
                      value={settings.quietEndHour}
                      onChange={e => update({ quietEndHour: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded-lg bg-muted text-xs text-foreground outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{`${i === 0 ? 12 : i > 12 ? i - 12 : i} ${i < 12 ? 'AM' : 'PM'}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={() => { resetCoachPreferences(); toast.success('Coach preferences reset'); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Reset Coach Preferences
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
