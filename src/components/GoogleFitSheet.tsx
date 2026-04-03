import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Activity, Smartphone, RefreshCw, Footprints, Flame, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleFitSettings {
  connected: boolean;
  syncFrequency: 'realtime' | 'daily' | 'manual';
  syncSteps: boolean;
  syncCalories: boolean;
  syncWorkouts: boolean;
  lastSynced: string | null;
}

const SETTINGS_KEY = 'nutrilens_googlefit_settings';

function getGFSettings(): GoogleFitSettings {
  const d = scopedGet(SETTINGS_KEY);
  if (d) return JSON.parse(d);
  return { connected: false, syncFrequency: 'daily', syncSteps: true, syncCalories: true, syncWorkouts: true, lastSynced: null };
}

function saveGFSettings(s: GoogleFitSettings) {
  scopedSet(SETTINGS_KEY, JSON.stringify(s));
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GoogleFitSheet({ open, onClose }: Props) {
  const [settings, setSettings] = useState<GoogleFitSettings>(getGFSettings);

  const update = (partial: Partial<GoogleFitSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveGFSettings(next);
  };

  const handleConnect = () => {
    // Web app limitation - show informational message
    toast.info('Google Fit integration requires the native mobile app. Steps can be logged manually in the Activity section.', { duration: 5000 });
  };

  const handleSync = () => {
    if (!settings.connected) return;
    update({ lastSynced: new Date().toISOString() });
    toast.success('Sync complete');
  };

  const freqOptions: { label: string; value: GoogleFitSettings['syncFrequency'] }[] = [
    { label: 'Real-time', value: 'realtime' },
    { label: 'Daily', value: 'daily' },
    { label: 'Manual', value: 'manual' },
  ];

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Google Fit / Health Connect
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4 overflow-y-auto max-h-[70vh] pb-8">
          {/* Connection Status */}
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {settings.connected ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {settings.connected
                    ? `Last synced: ${settings.lastSynced ? new Date(settings.lastSynced).toLocaleString() : 'Never'}`
                    : 'Connect to sync steps and workouts'}
                </p>
              </div>
              <button
                onClick={settings.connected ? () => update({ connected: false }) : handleConnect}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  settings.connected
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {settings.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              ℹ️ Google Fit / Apple Health sync requires the native mobile app.
              In the web version, you can manually log steps and activities from the Dashboard.
            </p>
          </div>

          {/* Data to Sync */}
          <div className="card-elevated p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data to Sync</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Steps</span>
              </div>
              <Switch checked={settings.syncSteps} onCheckedChange={v => update({ syncSteps: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Calories Burned</span>
              </div>
              <Switch checked={settings.syncCalories} onCheckedChange={v => update({ syncCalories: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Workouts</span>
              </div>
              <Switch checked={settings.syncWorkouts} onCheckedChange={v => update({ syncWorkouts: v })} />
            </div>
          </div>

          {/* Sync Frequency */}
          <div className="card-elevated p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sync Frequency</p>
            <div className="flex gap-2">
              {freqOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update({ syncFrequency: opt.value })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    settings.syncFrequency === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Force Sync */}
          <button
            onClick={handleSync}
            disabled={!settings.connected}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
          >
            <RefreshCw className="w-4 h-4" /> Sync Now
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
