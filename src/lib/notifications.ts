// ==========================================
// NutriLens AI – Smart Notification System
// ==========================================
// Combines in-app toast reminders (when app is open)
// with browser push notifications (when tab is in background).

import { toast } from 'sonner';

// ── Settings types ──

export interface NotificationSettings {
  mealReminders: boolean;
  waterReminders: boolean;
  achievementAlerts: boolean;
  weeklyWeightReminder: boolean;
  weightReminderDay: number;   // 0=Sun, 1=Mon...6=Sat (default 0=Sunday)
  weightReminderHour: number;  // 0-23 (default 8)
  waterIntervalMinutes: number; // 30, 60, 90, 120
  waterStartHour: number;      // 0-23
  waterEndHour: number;        // 0-23
}

const SETTINGS_KEY = 'nutrilens_notification_settings';

const DEFAULT_SETTINGS: NotificationSettings = {
  mealReminders: false,
  waterReminders: false,
  achievementAlerts: true,
  weeklyWeightReminder: true,
  weightReminderDay: 0,   // Sunday
  weightReminderHour: 8,  // 8 AM
  waterIntervalMinutes: 60,
  waterStartHour: 9,
  waterEndHour: 21,
};

// ── Settings persistence ──

export function getNotificationSettings(): NotificationSettings {
  const data = scopedGet(SETTINGS_KEY);
  if (data) {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveNotificationSettings(settings: NotificationSettings) {
  scopedSet(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Browser permission ──

export async function requestBrowserPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function hasBrowserPermission(): boolean {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

// ── Send browser notification ──

function sendBrowserNotification(title: string, body: string, tag?: string) {
  if (!hasBrowserPermission()) return;
  try {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: tag || undefined,
    });
  } catch {
    // Silently fail (e.g. in service worker context)
  }
}

// ── Send in-app toast ──

function sendInAppToast(title: string, body: string, icon?: string) {
  toast(title, { description: body, duration: 6000 });
}

// ── Combined send ──

export function sendNotification(title: string, body: string, opts?: { tag?: string }) {
  // If document is hidden (tab in background), use browser notification
  if (document.hidden) {
    sendBrowserNotification(title, body, opts?.tag);
  } else {
    // In-app toast
    sendInAppToast(title, body);
  }
}

// ── Missed Meal Notifications ──

let lastFiredMissedMeals: Record<string, string> = {};

const MISSED_MEAL_NOTIFICATION_HOURS: Record<string, number> = {
  breakfast: 10,
  lunch: 15,
  dinner: 21,
  snack: 17,
};

export function checkMissedMealNotifications(settings: NotificationSettings) {
  if (!settings.mealReminders) return;
  const now = new Date();
  const hour = now.getHours();
  const now2 = new Date();
  const today = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-${String(now2.getDate()).padStart(2, '0')}`;

  for (const [mealType, thresholdHour] of Object.entries(MISSED_MEAL_NOTIFICATION_HOURS)) {
    if (hour === thresholdHour && lastFiredMissedMeals[mealType] !== today) {
      // Check if meal is logged (import dynamically to avoid circular deps)
      try {
        const logData = scopedGet(`nutrilens_log_${today}`);
        const log = logData ? JSON.parse(logData) : { meals: [] };
        const hasMeal = log.meals?.some((m: any) => m.type === mealType);
        if (!hasMeal) {
          lastFiredMissedMeals[mealType] = today;
          const label = mealType.charAt(0).toUpperCase() + mealType.slice(1);
          sendNotification(
            `🔔 ${label} not logged yet!`,
            `You haven't logged ${label.toLowerCase()} yet. Still time to add it!`,
            { tag: `missed-${mealType}` }
          );
        }
      } catch {}
    }
  }
}

// ── Scheduler ──
// Uses setInterval to check every minute if a notification should fire.

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let lastFiredMeals: Record<string, string> = {}; // mealType -> date last fired
let lastFiredWater: string = ''; // "HH:MM" last fired

interface MealTimes {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
}

function getCurrentHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getCurrentDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function checkMealReminders(mealTimes: MealTimes) {
  const now = getCurrentHHMM();
  const today = getCurrentDate();
  const meals: Array<{ type: string; time: string; emoji: string }> = [
    { type: 'breakfast', time: mealTimes.breakfast, emoji: '🌞' },
    { type: 'lunch', time: mealTimes.lunch, emoji: '☀️' },
    { type: 'dinner', time: mealTimes.dinner, emoji: '🌙' },
    { type: 'snacks', time: mealTimes.snacks, emoji: '🍎' },
  ];

  for (const meal of meals) {
    if (!meal.time) continue;
    // Check if current time matches (same hour:minute)
    if (now === meal.time && lastFiredMeals[meal.type] !== today) {
      lastFiredMeals[meal.type] = today;
      const label = meal.type.charAt(0).toUpperCase() + meal.type.slice(1);
      sendNotification(
        `Time for ${label}! ${meal.emoji}`,
        `Log your meal with NutriLens AI`,
        { tag: `meal-${meal.type}` }
      );
    }
  }
}

function checkWaterReminders(settings: NotificationSettings) {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const hhMM = getCurrentHHMM();

  // Only within the configured window
  if (hour < settings.waterStartHour || hour >= settings.waterEndHour) return;

  // Check if this minute is an interval boundary
  const minutesSinceStart = (hour - settings.waterStartHour) * 60 + minute;
  if (minutesSinceStart % settings.waterIntervalMinutes === 0 && lastFiredWater !== hhMM) {
    lastFiredWater = hhMM;
    sendNotification(
      '💧 Time to hydrate!',
      'Drink a glass of water to stay on track.',
      { tag: 'water-reminder' }
    );
  }
}

let lastFiredWeightReminder = '';

function checkWeeklyWeightReminder(settings: NotificationSettings) {
  const now = new Date();
  if (now.getDay() !== settings.weightReminderDay) return;
  if (now.getHours() !== settings.weightReminderHour) return;
  const today = getCurrentDate();
  if (lastFiredWeightReminder === today) return;
  lastFiredWeightReminder = today;
  sendNotification(
    '⚖️ Weekly Weigh-in Time!',
    'Take a live photo on your scale to track your progress with NutriLens AI.',
    { tag: 'weekly-weight' }
  );
}

export function startNotificationScheduler(mealTimes: MealTimes, settings: NotificationSettings) {
  stopNotificationScheduler();

  // Check every 30 seconds for precision without being expensive
  schedulerInterval = setInterval(() => {
    if (settings.mealReminders) {
      checkMealReminders(mealTimes);
      checkMissedMealNotifications(settings);
    }
    if (settings.waterReminders) {
      checkWaterReminders(settings);
    }
    if (settings.weeklyWeightReminder) {
      checkWeeklyWeightReminder(settings);
    }
  }, 30_000);

  // Also run immediately once
  if (settings.mealReminders) {
    checkMealReminders(mealTimes);
    checkMissedMealNotifications(settings);
  }
  if (settings.waterReminders) checkWaterReminders(settings);
  if (settings.weeklyWeightReminder) checkWeeklyWeightReminder(settings);
}

export function stopNotificationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

// ── Proactive Intelligence Checks ──

let proactiveInterval: ReturnType<typeof setInterval> | null = null;
const PROACTIVE_KEY = 'nutrilens_proactive_notif_last';

function getProactiveLast(): Record<string, string> {
  try { return JSON.parse(scopedGet(PROACTIVE_KEY) || '{}'); } catch { return {}; }
}
function setProactiveLast(key: string, date: string) {
  const data = getProactiveLast();
  data[key] = date;
  scopedSet(PROACTIVE_KEY, JSON.stringify(data));
}

export function startProactiveChecks() {
  if (proactiveInterval) clearInterval(proactiveInterval);

  const check = () => {
    const now = new Date();
    const hour = now.getHours();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const last = getProactiveLast();

    // 1 PM: Lunch protein suggestion
    if (hour === 13 && last['lunch_protein'] !== today) {
      setProactiveLast('lunch_protein', today);
      sendNotification(
        '🥗 Lunch time!',
        'Try a high-protein option — dal + eggs or soya chunks for max value.',
        { tag: 'proactive-lunch' }
      );
    }

    // 6 PM: Protein remaining check
    if (hour === 18 && last['evening_protein'] !== today) {
      try {
        const logData = scopedGet(`nutrilens_log_${today}`);
        const log = logData ? JSON.parse(logData) : { meals: [] };
        let totalProtein = 0;
        for (const meal of (log.meals || [])) {
          for (const item of (meal.items || [])) {
            totalProtein += (item.protein || 0) * (item.quantity || 1);
          }
        }
        const profile = scopedGet('nutrilens_profile');
        const proteinTarget = profile ? (JSON.parse(profile).dailyProtein || 60) : 60;
        const remaining = proteinTarget - totalProtein;
        if (remaining > 40) {
          setProactiveLast('evening_protein', today);
          sendNotification(
            `💪 You still need ${Math.round(remaining)}g protein`,
            'Add eggs, curd, or soya chunks to hit your goal tonight.',
            { tag: 'proactive-protein' }
          );
        }
      } catch {}
    }

    // Saturday 9 AM: Weekend risk
    if (now.getDay() === 6 && hour === 9 && last['weekend_risk'] !== today) {
      setProactiveLast('weekend_risk', today);
      sendNotification(
        '😄 Weekend risk detected!',
        "Weekends can be tricky. We'll help you stay on track with smart choices.",
        { tag: 'proactive-weekend' }
      );
    }
  };

  proactiveInterval = setInterval(check, 60_000); // check every minute
  check(); // run immediately
}

// ── Achievement alert helper ──

export function sendAchievementAlert(badgeName: string) {
  const settings = getNotificationSettings();
  if (!settings.achievementAlerts) return;
  sendNotification(
    '🎉 New Achievement!',
    `You earned the "${badgeName}" badge! Keep crushing it!`,
    { tag: `achievement-${badgeName}` }
  );
}
