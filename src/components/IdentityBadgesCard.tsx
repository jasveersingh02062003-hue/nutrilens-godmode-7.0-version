import { useState, useEffect } from 'react';
import { checkIdentityBadges, getIdentityBadges, markBadgeNotified, IDENTITY_BADGES } from '@/lib/identity-badges';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react';

export default function IdentityBadgesCard() {
  const [badges, setBadges] = useState(getIdentityBadges());
  const [celebrateBadge, setCelebrateBadge] = useState<typeof IDENTITY_BADGES[number] | null>(null);

  useEffect(() => {
    const newlyEarned = checkIdentityBadges();
    if (newlyEarned.length > 0) {
      setBadges(getIdentityBadges());
      // Show celebration for first new badge
      const first = IDENTITY_BADGES.find(b => b.id === newlyEarned[0].id);
      if (first) {
        setCelebrateBadge(first);
        markBadgeNotified(first.id);
      }
    }
  }, []);

  const earnedCount = badges.filter(b => b.earned).length;
  if (earnedCount === 0 && badges.every(b => !b.earned)) {
    // Show placeholder only if there are no earned badges
  }

  return (
    <>
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm text-foreground">Identity Badges</h3>
          <span className="ml-auto text-[10px] text-muted-foreground font-medium">
            {earnedCount}/{IDENTITY_BADGES.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {badges.map(({ badge, earned }) => (
            <div
              key={badge.id}
              className={`rounded-xl p-3 text-center border transition-all ${
                earned
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-border bg-muted/30 opacity-50'
              }`}
            >
              <span className="text-2xl">{badge.emoji}</span>
              <p className="text-[11px] font-bold text-foreground mt-1">{badge.name}</p>
              <p className="text-[9px] text-muted-foreground">{badge.description}</p>
              {earned && (
                <p className="text-[9px] text-primary font-semibold mt-1">✓ Earned</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!celebrateBadge} onOpenChange={(v) => !v && setCelebrateBadge(null)}>
        <DialogContent className="max-w-xs rounded-2xl text-center">
          <div className="py-6">
            <span className="text-6xl">{celebrateBadge?.emoji}</span>
            <h3 className="text-lg font-bold text-foreground mt-4">🎉 New Identity Unlocked!</h3>
            <p className="text-sm font-semibold text-primary mt-2">{celebrateBadge?.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{celebrateBadge?.description}</p>
            <Button className="mt-6 w-full" onClick={() => setCelebrateBadge(null)}>
              Awesome! 💪
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
