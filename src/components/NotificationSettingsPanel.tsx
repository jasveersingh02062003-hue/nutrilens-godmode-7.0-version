import { useState } from 'react';
import { Bell, Droplets, Trophy, Clock, ChevronDown, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestBrowserPermission,
  hasBrowserPermission,
  NotificationSettings,
} from '@/lib/notifications';
import { getProfile } from '@/lib/store';
import { toast } from 'sonner';

interface Props {
  onSettingsChange?: (settings: NotificationSettings) => void;
}

export default function NotificationSettingsPanel({ onSettingsChange }: Props) {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const profile = getProfile();

  const update = (partial: Partial<NotificationSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveNotificationSettings(next);
    onSettingsChange?.(next);
  };

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (value && !hasBrowserPermission()) {
      const granted = await requestBrowserPermission();
      if (!granted) {
        toast.error('Browser notifications blocked. You can enable them in browser settings.');
        // Still enable in-app toasts
      }
    }
    update({ [key]: value });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(prev => (prev === section ? null : section));
  };

  const waterIntervalOptions = [
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '1.5 hours', value: 90 },
    { label: '2 hours', value: 120 },
  ];

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    label: `${i === 0 ? '12' : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}`,
    value: i,
  }));

  return (
    <div className="space-y-1">
      {/* Meal Reminders */}
      <div className="card-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('meal')}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-foreground">Meal Reminders</span>
            <p className="text-[10px] text-muted-foreground">
              {settings.mealReminders ? 'On' : 'Off'} · Remind you at meal times
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSection === 'meal' ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {expandedSection === 'meal' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Enable meal reminders</span>
                  <button
                    onClick={() => handleToggle('mealReminders', !settings.mealReminders)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.mealReminders ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.mealReminders ? 'translate-x-5' : ''}`}
                    />
                  </button>
                </label>

                {settings.mealReminders && profile?.mealTimes && (
                  <div className="space-y-2 bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Scheduled times</p>
                    {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map(meal => (
                      <div key={meal} className="flex items-center justify-between">
                        <span className="text-xs text-foreground capitalize flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {meal}
                        </span>
                        <span className="text-xs font-medium text-primary">
                          {profile.mealTimes[meal] || 'Not set'}
                        </span>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Edit times in your profile settings
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Water Reminders */}
      <div className="card-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('water')}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-foreground">Water Reminders</span>
            <p className="text-[10px] text-muted-foreground">
              {settings.waterReminders
                ? `Every ${settings.waterIntervalMinutes} min · ${settings.waterStartHour}:00–${settings.waterEndHour}:00`
                : 'Off'}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSection === 'water' ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {expandedSection === 'water' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Enable water reminders</span>
                  <button
                    onClick={() => handleToggle('waterReminders', !settings.waterReminders)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.waterReminders ? 'bg-blue-500' : 'bg-muted'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.waterReminders ? 'translate-x-5' : ''}`}
                    />
                  </button>
                </label>

                {settings.waterReminders && (
                  <div className="space-y-3 bg-muted/50 rounded-xl p-3">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Interval</p>
                      <div className="flex gap-1.5">
                        {waterIntervalOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => update({ waterIntervalMinutes: opt.value })}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                              settings.waterIntervalMinutes === opt.value
                                ? 'bg-blue-500 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Start</p>
                        <select
                          value={settings.waterStartHour}
                          onChange={e => update({ waterStartHour: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 rounded-lg bg-muted text-xs text-foreground outline-none"
                        >
                          {hourOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">End</p>
                        <select
                          value={settings.waterEndHour}
                          onChange={e => update({ waterEndHour: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 rounded-lg bg-muted text-xs text-foreground outline-none"
                        >
                          {hourOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Weekly Weight Reminder */}
      <div className="card-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('weight')}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-foreground">Weekly Weight Reminder</span>
            <p className="text-[10px] text-muted-foreground">
              {settings.weeklyWeightReminder
                ? `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][settings.weightReminderDay]} at ${settings.weightReminderHour}:00`
                : 'Off'}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSection === 'weight' ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {expandedSection === 'weight' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Enable weekly reminder</span>
                  <button
                    onClick={() => handleToggle('weeklyWeightReminder', !settings.weeklyWeightReminder)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.weeklyWeightReminder ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.weeklyWeightReminder ? 'translate-x-5' : ''}`} />
                  </button>
                </label>

                {settings.weeklyWeightReminder && (
                  <div className="space-y-3 bg-muted/50 rounded-xl p-3">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Day</p>
                      <div className="flex gap-1">
                        {['S','M','T','W','T','F','S'].map((d, i) => (
                          <button
                            key={i}
                            onClick={() => update({ weightReminderDay: i })}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                              settings.weightReminderDay === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Time</p>
                      <select
                        value={settings.weightReminderHour}
                        onChange={e => update({ weightReminderHour: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-muted text-xs text-foreground outline-none"
                      >
                        {hourOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Achievement Alerts */}
      <div className="card-subtle overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-foreground">Achievement Alerts</span>
            <p className="text-[10px] text-muted-foreground">Celebrate when you earn badges</p>
          </div>
          <button
            onClick={() => handleToggle('achievementAlerts', !settings.achievementAlerts)}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.achievementAlerts ? 'bg-amber-500' : 'bg-muted'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.achievementAlerts ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
