import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

// Session-level frequency cap — shared across all slots
let sessionImpressionCount = 0;
const MAX_SESSION_IMPRESSIONS = 3;

export interface AdCreativeData {
  campaignId: string;
  creativeId: string;
  brandName: string;
  headline: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaText: string;
  ctaUrl: string | null;
  pesScore: number;
  format: string;
  placementSlot: string;
  targetDiet: string;
  targetCategories: string[];
}

interface UseAdServingOptions {
  category?: string;
  query?: string;
  diet?: 'veg' | 'nonveg' | 'all';
}

export function useAdServing(placementSlot: string, options?: UseAdServingOptions) {
  const { data: ad, isLoading } = useQuery({
    queryKey: ['ad-serving', placementSlot, options?.category, options?.diet],
    queryFn: async (): Promise<AdCreativeData | null> => {
      // Session frequency cap
      if (sessionImpressionCount >= MAX_SESSION_IMPRESSIONS) return null;

      // Server-side selection (Phase 5): edge function handles eligibility,
      // budget cap, weighted pick, and atomic impression dedupe.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.functions.invoke('select-ads', {
        body: {
          placement_slot: placementSlot,
          user_id: user.id,
          category: options?.category,
          diet: options?.diet,
          log_impression: false,
        },
      });
      if (error || !data?.ad) return null;
      return data.ad as AdCreativeData;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: false,
  });

  const logImpression = useCallback(async (userId?: string) => {
    if (!ad || !userId) return;
    sessionImpressionCount++;
    try {
      await supabase.functions.invoke('log-ad-event', {
        body: {
          event_type: 'impression',
          campaign_id: ad.campaignId,
          creative_id: ad.creativeId,
          placement_slot: ad.placementSlot,
          user_id: userId,
        },
      });
    } catch {
      // Silent fail — tracking should never break UX
    }
  }, [ad]);

  const logClick = useCallback(async (userId?: string) => {
    if (!ad || !userId) return;
    try {
      await supabase.functions.invoke('log-ad-event', {
        body: {
          event_type: 'click',
          campaign_id: ad.campaignId,
          creative_id: ad.creativeId,
          placement_slot: ad.placementSlot,
          user_id: userId,
        },
      });
      if (ad.ctaUrl) {
        window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Silent fail
    }
  }, [ad]);

  return { ad, isLoading, logImpression, logClick };
}
