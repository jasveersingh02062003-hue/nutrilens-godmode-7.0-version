export interface ActivityType {
  id: string;
  name: string;
  icon: string;
  metLight: number;
  metModerate: number;
  metIntense: number;
}

export const ACTIVITY_TYPES: ActivityType[] = [
  { id: 'walking', name: 'Walking', icon: '🚶', metLight: 2.5, metModerate: 3.5, metIntense: 5.0 },
  { id: 'running', name: 'Running', icon: '🏃', metLight: 6.0, metModerate: 8.0, metIntense: 11.0 },
  { id: 'cycling', name: 'Cycling', icon: '🚴', metLight: 4.0, metModerate: 6.8, metIntense: 10.0 },
  { id: 'gym', name: 'Gym / Weights', icon: '🏋️', metLight: 3.5, metModerate: 5.0, metIntense: 8.0 },
  { id: 'swimming', name: 'Swimming', icon: '🏊', metLight: 4.5, metModerate: 7.0, metIntense: 10.0 },
  { id: 'yoga', name: 'Yoga', icon: '🧘', metLight: 2.0, metModerate: 3.0, metIntense: 4.0 },
  { id: 'hiit', name: 'HIIT', icon: '🔥', metLight: 6.0, metModerate: 8.0, metIntense: 12.0 },
  { id: 'dancing', name: 'Dancing', icon: '💃', metLight: 3.5, metModerate: 5.5, metIntense: 7.5 },
  { id: 'sports', name: 'Sports', icon: '⚽', metLight: 4.0, metModerate: 6.0, metIntense: 9.0 },
  { id: 'stairs', name: 'Stair Climbing', icon: '🪜', metLight: 4.0, metModerate: 6.0, metIntense: 8.5 },
  { id: 'jump-rope', name: 'Jump Rope', icon: '🪢', metLight: 8.0, metModerate: 10.0, metIntense: 12.5 },
  { id: 'other', name: 'Other', icon: '🏅', metLight: 3.0, metModerate: 5.0, metIntense: 7.0 },
];

export function calculateCalories(met: number, weightKg: number, durationMin: number): number {
  return Math.round(met * weightKg * (durationMin / 60));
}

export function getMetForIntensity(activity: ActivityType, intensity: 'light' | 'moderate' | 'intense'): number {
  switch (intensity) {
    case 'light': return activity.metLight;
    case 'moderate': return activity.metModerate;
    case 'intense': return activity.metIntense;
  }
}
