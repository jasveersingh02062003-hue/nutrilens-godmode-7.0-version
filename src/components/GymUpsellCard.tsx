import { useMemo } from 'react';
import { Crown, Dumbbell, ArrowRight } from 'lucide-react';
import { getProfile } from '@/lib/store';
import { getGymSessionsInDays } from '@/lib/gym-service';
import { useNavigate } from 'react-router-dom';
import { isPremium } from '@/lib/subscription-service';

export default function GymUpsellCard() {
  const navigate = useNavigate();
  const profile = getProfile();
  const premium = isPremium();

  const shouldShow = useMemo(() => {
    if (!profile?.gym?.goer || premium) return false;
    const sessions = getGymSessionsInDays(30);
    const streak = profile.gym.stats?.currentStreak || 0;
    return sessions >= 5 && streak >= 3;
  }, [profile, premium]);

  if (!shouldShow) return null;

  return (
    <div className="card-elevated p-4 border-l-4 border-l-primary space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Crown className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Unlock Your Gym Diet Plan 💪</p>
          <p className="text-[10px] text-muted-foreground">Tailored to your workout routine</p>
        </div>
      </div>

      <ul className="space-y-1.5 pl-1">
        {[
          'Exact macros for workout & rest days',
          'Post-workout recovery meal suggestions',
          'Supplement timing reminders',
          'Workout-day calorie split optimization',
        ].map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Dumbbell className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <button
        onClick={() => navigate('/planner?tab=plans')}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
      >
        Upgrade – ₹199/month <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
