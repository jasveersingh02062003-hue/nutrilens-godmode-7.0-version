import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRecommendations,
  logConversion,
  type ProductRecommendation,
  type NutritionGaps,
} from '@/lib/nutrition-gap-ads';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Session-level cap shared with useAdServing
let sessionGapAdCount = 0;
const MAX_GAP_ADS_PER_SESSION = 3;

type Surface = 'dashboard' | 'chat' | 'planner' | 'market' | 'budget';

export function useNutritionGapAds(surface: Surface = 'dashboard') {
  const { profile } = useUserProfile();
  const { user } = useAuth();

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['nutrition-gap-ads', surface, profile?.dailyProtein, profile?.dailyCalories],
    queryFn: async () => {
      if (!profile || sessionGapAdCount >= MAX_GAP_ADS_PER_SESSION) {
        return { recommendations: [] as ProductRecommendation[], gaps: { proteinGap: 0, calorieGap: 0, carbGap: 0, fatGap: 0 }, remainingBudget: 0 };
      }
      return getRecommendations(profile as any, surface);
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!profile,
    retry: false,
  });

  const logImpression = useCallback(async (recommendation: ProductRecommendation) => {
    if (!recommendation.isSponsored || !user?.id || !recommendation.campaignId) return;
    sessionGapAdCount++;
    try {
      await supabase.functions.invoke('log-ad-event', {
        body: {
          event_type: 'impression',
          campaign_id: recommendation.campaignId,
          creative_id: recommendation.creativeId,
          placement_slot: `gap_${surface}`,
          user_id: user.id,
        },
      });
    } catch {
      // Silent
    }
  }, [user?.id, surface]);

  const logClick = useCallback(async (recommendation: ProductRecommendation) => {
    if (!recommendation.isSponsored || !user?.id || !recommendation.campaignId) return;
    try {
      await supabase.functions.invoke('log-ad-event', {
        body: {
          event_type: 'click',
          campaign_id: recommendation.campaignId,
          creative_id: recommendation.creativeId,
          placement_slot: `gap_${surface}`,
          user_id: user.id,
        },
      });
      if (recommendation.ctaUrl) {
        window.open(recommendation.ctaUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Silent
    }
  }, [user?.id, surface]);

  const trackConversion = useCallback(async (recommendation: ProductRecommendation, type: 'add_to_plan' | 'add_to_cart' | 'logged' = 'add_to_plan') => {
    if (!recommendation.campaignId || !user?.id) return;
    await logConversion(recommendation.campaignId, user.id, recommendation.productId, type);
  }, [user?.id]);

  return {
    recommendations: data?.recommendations || [],
    gaps: data?.gaps || { proteinGap: 0, calorieGap: 0, carbGap: 0, fatGap: 0 },
    remainingBudget: data?.remainingBudget || 0,
    isLoading,
    logImpression,
    logClick,
    trackConversion,
  };
}
