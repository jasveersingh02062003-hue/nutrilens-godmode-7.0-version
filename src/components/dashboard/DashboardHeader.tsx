import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getGreeting } from '@/lib/nutrition';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import type { UserProfile } from '@/lib/store';
import type { WeatherData } from '@/lib/weather-service';

interface Props {
  profile: UserProfile;
  weather: WeatherData | null;
}

export default function DashboardHeader({ profile, weather }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
          <span className="text-sm font-bold text-primary">{(profile.name || 'U')[0].toUpperCase()}</span>
        </button>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-foreground">{getGreeting()}, {profile.name || 'there'}</p>
            <SubscriptionBadge />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {weather ? (
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-card border border-border shadow-sm">
            <span className="text-sm">{weather.icon}</span>
            <span className="text-xs font-semibold text-foreground">{weather.temperature}°</span>
          </div>
        ) : (
          <div className="w-16 h-8 rounded-xl bg-muted animate-pulse" />
        )}
        <button className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center relative shadow-sm">
          <Bell className="w-4.5 h-4.5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-coral" />
        </button>
      </div>
    </div>
  );
}
