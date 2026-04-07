import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

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
      const today = new Date().toISOString().split('T')[0];

      // Query active campaigns for this slot
      const { data: campaigns, error } = await supabase
        .from('ad_campaigns')
        .select(`
          id, campaign_name, placement_slot, budget_total, budget_spent,
          pes_score, target_diet, target_categories, status,
          brand_accounts!inner(brand_name),
          ad_creatives!inner(id, image_url, headline, subtitle, cta_text, cta_url, format, is_active)
        `)
        .eq('status', 'active')
        .eq('placement_slot', placementSlot)
        .gte('pes_score', 30)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('pes_score', { ascending: false })
        .limit(1);

      if (error || !campaigns || campaigns.length === 0) return null;

      const campaign = campaigns[0] as any;
      
      // Check budget remaining
      if (campaign.budget_total > 0 && campaign.budget_spent >= campaign.budget_total) return null;

      // Diet filter
      if (options?.diet && campaign.target_diet !== 'all' && campaign.target_diet !== options.diet) return null;

      // Category filter
      if (options?.category && campaign.target_categories?.length > 0) {
        if (!campaign.target_categories.includes(options.category)) return null;
      }

      const creative = Array.isArray(campaign.ad_creatives) 
        ? campaign.ad_creatives.find((c: any) => c.is_active) 
        : campaign.ad_creatives;
      
      if (!creative) return null;

      const brand = Array.isArray(campaign.brand_accounts)
        ? campaign.brand_accounts[0]
        : campaign.brand_accounts;

      return {
        campaignId: campaign.id,
        creativeId: creative.id,
        brandName: brand?.brand_name || 'Sponsored',
        headline: creative.headline,
        subtitle: creative.subtitle,
        imageUrl: creative.image_url,
        ctaText: creative.cta_text || 'Learn More',
        ctaUrl: creative.cta_url,
        pesScore: campaign.pes_score,
        format: creative.format,
        placementSlot: campaign.placement_slot,
        targetDiet: campaign.target_diet,
        targetCategories: campaign.target_categories || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: false,
  });

  const logImpression = useCallback(async (userId?: string) => {
    if (!ad || !userId) return;
    try {
      await supabase.from('ad_impressions').insert({
        campaign_id: ad.campaignId,
        creative_id: ad.creativeId,
        placement_slot: ad.placementSlot,
        user_id: userId,
      });
    } catch (e) {
      // Silent fail — tracking should never break UX
    }
  }, [ad]);

  const logClick = useCallback(async (userId?: string) => {
    if (!ad || !userId) return;
    try {
      // Log click
      await supabase.from('ad_clicks').insert({
        campaign_id: ad.campaignId,
        user_id: userId,
      });
      // Open CTA URL if available
      if (ad.ctaUrl) {
        window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      // Silent fail
    }
  }, [ad]);

  return { ad, isLoading, logImpression, logClick };
}
