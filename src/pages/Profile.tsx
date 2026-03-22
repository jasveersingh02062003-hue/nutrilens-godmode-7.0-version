import { useState, useRef } from 'react';
import { ArrowLeft, Edit2, Bell, Activity, Download, HelpCircle, ChevronRight, Package, LogOut, Loader2, Heart, SlidersHorizontal, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBMICategory } from '@/lib/nutrition';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import EditProfileSheet, { getProfilePhoto } from '@/components/EditProfileSheet';
import CoachSettingsSheet from '@/components/CoachSettingsSheet';
import AILearningSheet from '@/components/AILearningSheet';
import GoogleFitSheet from '@/components/GoogleFitSheet';
import ExportDataSheet from '@/components/ExportDataSheet';
import HelpSupportSheet from '@/components/HelpSupportSheet';
import NotificationSettingsPanel from '@/components/NotificationSettingsPanel';
import SkinConcernsSheet from '@/components/SkinConcernsSheet';
import { getTrackingMode, setTrackingMode, type TrackingMode } from '@/lib/smart-adjustment';
import { getCorrections } from '@/lib/corrections';
import HealthCardSheet from '@/components/HealthCardSheet';
import { getCoachSettings } from '@/lib/coach';
import { Sparkles, Brain, Flower2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPlan, setPlan, resetDailyCounters, checkAndExpireTrial, isTrialActive, hasTrialExpired, hasUsedTrial, getTrialDaysRemaining, type Plan } from '@/lib/subscription-service';
import UpgradeModal from '@/components/UpgradeModal';
import PlansPage from '@/components/PlansPage';
import SubscriptionBadge from '@/components/SubscriptionBadge';

export default function Profile() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { user, logout } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showAILearning, setShowAILearning] = useState(false);
  const [showGoogleFit, setShowGoogleFit] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHealthCard, setShowHealthCard] = useState(false);
  const [showSkinConcerns, setShowSkinConcerns] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [trackingModeState, setTrackingModeState] = useState<TrackingMode>(getTrackingMode());
  const [currentPlan, setCurrentPlan] = useState<Plan>(() => { checkAndExpireTrial(); return getPlan(); });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const devTapRef = useRef({ count: 0, timer: null as any });
  const profilePhoto = getProfilePhoto();
  const correctionCount = getCorrections().length;
  const coachSettings = getCoachSettings();

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout? Local data will be cleared.')) return;
    setLoggingOut(true);
    await logout();
    toast.success('Logged out successfully');
  };

  const handleTrackingModeToggle = () => {
    const next = trackingModeState === 'flex' ? 'strict' : 'flex';
    setTrackingMode(next);
    setTrackingModeState(next);
    toast.success(`Switched to ${next === 'flex' ? 'Flex' : 'Strict'} mode`);
  };

  if (!profile) { navigate('/onboarding'); return null; }

  const statCards = [
    { label: 'Weight', value: `${profile.weightKg}`, unit: 'kg' },
    { label: 'Target', value: `${profile.targetWeight}`, unit: 'kg' },
    { label: 'BMI', value: profile.bmi.toFixed(1), unit: getBMICategory(profile.bmi) },
    { label: 'Daily Goal', value: `${profile.dailyCalories}`, unit: 'kcal' },
    { label: 'BMR', value: `${Math.round(profile.bmr)}`, unit: 'kcal' },
    { label: 'TDEE', value: `${Math.round(profile.tdee)}`, unit: 'kcal' },
  ];

  const settings = [
    { icon: Edit2, label: 'Edit Profile', sub: 'Update your personal data', action: () => setShowEditProfile(true) },
    { icon: Bell, label: 'Notifications', sub: 'Meal and water reminders', action: () => setShowNotifications(true) },
    { icon: Sparkles, label: 'Daily Coach', sub: coachSettings.enabled ? 'Active – giving tips' : 'Disabled', action: () => setShowCoach(true) },
    { icon: Brain, label: 'AI Learning', sub: `${correctionCount} corrections stored`, action: () => setShowAILearning(true) },
    { icon: Package, label: 'My Pantry', sub: 'Track grocery inventory', action: () => navigate('/pantry') },
    { icon: Flower2, label: 'Skin Health', sub: skinSub(), action: () => setShowSkinConcerns(true) },
    { icon: SlidersHorizontal, label: 'Tracking Mode', sub: trackingModeState === 'flex' ? 'Flex – gentle adjustments' : 'Strict – tighter limits', action: handleTrackingModeToggle },
    { icon: Crown, label: 'Subscription', sub: currentPlan === 'free' ? (hasUsedTrial() && hasTrialExpired() ? 'Trial expired – Upgrade' : 'Free plan – Upgrade') : (isTrialActive() ? `Pro trial – ${getTrialDaysRemaining()} days left` : `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan`), action: () => setShowPlans(true) },
    { icon: Activity, label: 'Google Fit', sub: 'Sync steps and activity', action: () => setShowGoogleFit(true) },
    { icon: Download, label: 'Export Data', sub: 'Download your logs', action: () => setShowExport(true) },
    { icon: HelpCircle, label: 'Help & Support', sub: 'FAQ and contact', action: () => setShowHelp(true) },
  ];

  function skinSub() {
    const sc = (profile as any)?.skinConcerns;
    if (!sc) return 'Set skin concerns for food tips';
    const active = ['acne','oily','dry','dull','pigmentation','sensitive'].filter(k => sc[k]);
    return active.length ? `${active.length} concern${active.length > 1 ? 's' : ''} tracked` : 'Set skin concerns for food tips';
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold text-foreground">Profile</h1>
        </div>

        {/* Profile Header */}
        <div className="card-elevated p-5 cursor-pointer" onClick={() => setShowHealthCard(true)}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">{(profile.name || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-foreground">{profile.name || 'NutriLens User'}</h2>
                <SubscriptionBadge />
              </div>
              <p className="text-xs text-muted-foreground">{user?.email || profile.occupation || 'Health Enthusiast'} · {profile.age} years</p>
              <div className="flex gap-2 mt-2">
                <span className="chip text-[10px]">{profile.goal === 'lose' ? 'Weight Loss' : profile.goal === 'gain' ? 'Muscle Gain' : 'Maintenance'}</span>
                <span className="chip text-[10px] capitalize">{profile.activityLevel}</span>
              </div>
            </div>
            <Heart className="w-5 h-5 text-destructive/50" />
          </div>
          <p className="text-[9px] text-muted-foreground mt-2 text-center">Tap to view your Health Card</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          {statCards.map(s => (
            <div key={s.label} className="card-subtle p-3 text-center">
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-medium">{s.unit}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="card-elevated overflow-hidden">
          {settings.map((s, i) => (
            <button
              key={s.label}
              onClick={s.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors ${i < settings.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <s.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">{s.label}</span>
                <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-3.5 rounded-xl border border-destructive/30 text-destructive font-medium text-sm flex items-center justify-center gap-2 hover:bg-destructive/5 transition-colors disabled:opacity-50"
        >
          {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>

        {/* Version + Developer Mode */}
        <p
          className="text-center text-[10px] text-muted-foreground/50 cursor-default select-none"
          onClick={() => {
            devTapRef.current.count++;
            clearTimeout(devTapRef.current.timer);
            devTapRef.current.timer = setTimeout(() => { devTapRef.current.count = 0; }, 2000);
            if (devTapRef.current.count >= 5) {
              setDevMode(true);
              devTapRef.current.count = 0;
              toast('Developer mode enabled');
            }
          }}
        >
          NutriLens AI v1.0.0
        </p>

        {devMode && (
          <div className="card-elevated p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">🛠 Developer Options</p>
            <div className="flex flex-wrap gap-2">
              {(['free', 'premium', 'ultra'] as Plan[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPlan(p); setCurrentPlan(p); toast.success(`Plan set to ${p}`); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${currentPlan === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
              <button
                onClick={() => { resetDailyCounters(); toast.success('Counters reset'); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground"
              >
                Reset Counters
              </button>
            </div>
          </div>
        )}

        {/* Sheets */}
        <EditProfileSheet open={showEditProfile} onClose={() => setShowEditProfile(false)} />
        {showNotifications && <NotificationSheet open={showNotifications} onClose={() => setShowNotifications(false)} />}
        <CoachSettingsSheet open={showCoach} onClose={() => setShowCoach(false)} />
        <AILearningSheet open={showAILearning} onClose={() => setShowAILearning(false)} />
        <GoogleFitSheet open={showGoogleFit} onClose={() => setShowGoogleFit(false)} />
        <ExportDataSheet open={showExport} onClose={() => setShowExport(false)} />
        <HelpSupportSheet open={showHelp} onClose={() => setShowHelp(false)} />
        <HealthCardSheet open={showHealthCard} onClose={() => setShowHealthCard(false)} />
        <SkinConcernsSheet open={showSkinConcerns} onClose={() => setShowSkinConcerns(false)} />
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} onUpgraded={() => setCurrentPlan(getPlan())} />
        <PlansPage open={showPlans} onClose={() => setShowPlans(false)} onPlanChanged={() => setCurrentPlan(getPlan())} />
      </div>
    </div>
  );
}

// Wrap the existing NotificationSettingsPanel in a Sheet
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function NotificationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Notification Settings
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto max-h-[70vh] pb-8">
          <NotificationSettingsPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
