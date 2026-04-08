// ─── Nutrition-Gap-Aware Product Recommendation Engine ───
// Matches branded products to user's current nutritional gap + remaining budget.

import { getDailyLog, getDailyTotals, type UserProfile } from './store';
import { getUnifiedBudget } from './budget-engine';
import { supabase } from '@/integrations/supabase/client';

export interface NutritionGaps {
  proteinGap: number;
  calorieGap: number;
  carbGap: number;
  fatGap: number;
}

export interface ProductRecommendation {
  productId: string;
  productName: string;
  brand: string;
  price: number;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  pesScore: number;
  costPerGramProtein: number;
  imageUrl: string | null;
  servingSize: string | null;
  // Sponsored fields (null for organic)
  campaignId: string | null;
  creativeId: string | null;
  isSponsored: boolean;
  ctaText: string | null;
  ctaUrl: string | null;
  brandName: string | null;
  headline: string | null;
  subtitle: string | null;
  // Pre-built suggestion message
  message: string;
  budgetImpact: string;
}

/**
 * Compute current nutritional gaps from today's log vs profile targets.
 */
export function computeCurrentGaps(profile: UserProfile): NutritionGaps {
  const log = getDailyLog();
  const totals = getDailyTotals(log);

  return {
    proteinGap: Math.max(0, (profile.dailyProtein || 60) - totals.protein),
    calorieGap: Math.max(0, (profile.dailyCalories || 2000) - totals.eaten),
    carbGap: Math.max(0, (profile.dailyCarbs || 250) - totals.carbs),
    fatGap: Math.max(0, (profile.dailyFat || 60) - totals.fat),
  };
}

/**
 * Get remaining budget for today based on logged meal costs.
 */
export function getRemainingBudget(): number {
  const unified = getUnifiedBudget();
  const log = getDailyLog();
  let todaySpent = 0;
  for (const meal of log.meals) {
    todaySpent += meal.totalCost || 0;
  }
  return Math.max(0, unified.daily - todaySpent);
}

/**
 * Match organic (non-sponsored) products from packed_products.
 */
export async function matchProducts(
  gaps: NutritionGaps,
  budget: number
): Promise<ProductRecommendation[]> {
  if (gaps.proteinGap < 5 || budget < 10) return [];

  const minProtein = Math.min(gaps.proteinGap, 10);
  const { data: products, error } = await supabase
    .from('packed_products')
    .select('*')
    .gte('protein', minProtein)
    .gte('pes_score', 30)
    .order('cost_per_gram_protein', { ascending: true })
    .limit(5);

  if (error || !products) return [];

  return products
    .filter(p => {
      const price = p.selling_price || p.mrp;
      return price <= budget;
    })
    .slice(0, 3)
    .map(p => {
      const price = p.selling_price || p.mrp;
      return {
        productId: p.id,
        productName: p.product_name,
        brand: p.brand,
        price,
        protein: p.protein || 0,
        calories: p.calories || 0,
        carbs: p.carbs || 0,
        fat: p.fat || 0,
        pesScore: p.pes_score || 0,
        costPerGramProtein: p.cost_per_gram_protein || 0,
        imageUrl: p.image_url,
        servingSize: p.serving_size,
        campaignId: null,
        creativeId: null,
        isSponsored: false,
        ctaText: null,
        ctaUrl: null,
        brandName: null,
        headline: null,
        subtitle: null,
        message: `${p.product_name} — ${p.protein}g protein for ₹${price}`,
        budgetImpact: `₹${price} — ${budget >= price ? `fits your remaining ₹${Math.round(budget)} budget` : 'slightly over budget'}`,
      };
    });
}

/**
 * Match sponsored products: joins packed_products with active ad_campaigns.
 * Sponsored results get priority over organic matches.
 */
export async function matchSponsoredProducts(
  gaps: NutritionGaps,
  budget: number,
  surface: string = 'dashboard'
): Promise<ProductRecommendation[]> {
  if (gaps.proteinGap < 3) return [];

  const today = new Date().toISOString().split('T')[0];

  // Get active campaigns with targeting data
  const { data: campaigns, error } = await supabase
    .from('ad_campaigns')
    .select(`
      id, campaign_name, pes_score, target_diet, budget_total, budget_spent,
      brand_accounts!inner(brand_name),
      ad_creatives!inner(id, headline, subtitle, cta_text, cta_url, image_url, is_active),
      ad_targeting(min_protein_gap, max_user_budget, meal_context)
    `)
    .eq('status', 'active')
    .gte('pes_score', 30)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('pes_score', { ascending: false })
    .limit(5);

  if (error || !campaigns) return [];

  const results: ProductRecommendation[] = [];

  for (const campaign of campaigns as any[]) {
    // Budget check
    if (campaign.budget_total > 0 && campaign.budget_spent >= campaign.budget_total) continue;

    // Targeting check
    const targeting = Array.isArray(campaign.ad_targeting) ? campaign.ad_targeting[0] : campaign.ad_targeting;
    if (targeting) {
      if (targeting.min_protein_gap > 0 && gaps.proteinGap < targeting.min_protein_gap) continue;
      if (targeting.max_user_budget > 0 && budget > targeting.max_user_budget) continue;
    }

    const creative = Array.isArray(campaign.ad_creatives)
      ? campaign.ad_creatives.find((c: any) => c.is_active)
      : campaign.ad_creatives;
    if (!creative) continue;

    const brand = Array.isArray(campaign.brand_accounts)
      ? campaign.brand_accounts[0]
      : campaign.brand_accounts;

    // Try to find matching packed_product for this brand
    const { data: brandProducts } = await supabase
      .from('packed_products')
      .select('*')
      .ilike('brand', `%${brand?.brand_name || ''}%`)
      .gte('protein', Math.min(gaps.proteinGap, 8))
      .gte('pes_score', 30)
      .order('cost_per_gram_protein', { ascending: true })
      .limit(1);

    const product = brandProducts?.[0];
    const price = product ? (product.selling_price || product.mrp) : 0;

    results.push({
      productId: product?.id || campaign.id,
      productName: product?.product_name || creative.headline,
      brand: brand?.brand_name || 'Sponsored',
      price,
      protein: product?.protein || 0,
      calories: product?.calories || 0,
      carbs: product?.carbs || 0,
      fat: product?.fat || 0,
      pesScore: campaign.pes_score,
      costPerGramProtein: product?.cost_per_gram_protein || 0,
      imageUrl: creative.image_url || product?.image_url,
      servingSize: product?.serving_size || null,
      campaignId: campaign.id,
      creativeId: creative.id,
      isSponsored: true,
      ctaText: creative.cta_text || 'View Details',
      ctaUrl: creative.cta_url,
      brandName: brand?.brand_name || 'Sponsored',
      headline: creative.headline,
      subtitle: creative.subtitle,
      message: product
        ? `${product.product_name} — ${product.protein}g protein for ₹${price}`
        : creative.headline,
      budgetImpact: price > 0
        ? `₹${price} — ${budget >= price ? `fits your remaining ₹${Math.round(budget)} budget` : `₹${Math.round(price - budget)} over budget`}`
        : creative.subtitle || '',
    });
  }

  return results.slice(0, 3);
}

/**
 * Get all recommendations: sponsored first, then organic fills.
 */
export async function getRecommendations(
  profile: UserProfile,
  surface: string = 'dashboard'
): Promise<{
  recommendations: ProductRecommendation[];
  gaps: NutritionGaps;
  remainingBudget: number;
}> {
  const gaps = computeCurrentGaps(profile);
  const budget = getRemainingBudget();

  // Get sponsored first
  const sponsored = await matchSponsoredProducts(gaps, budget, surface);

  // Fill with organic if sponsored doesn't cover 3
  let organic: ProductRecommendation[] = [];
  if (sponsored.length < 3) {
    organic = await matchProducts(gaps, budget);
    // Filter out duplicates
    organic = organic.filter(o =>
      !sponsored.some(s => s.productId === o.productId)
    );
  }

  const all = [...sponsored, ...organic].slice(0, 3);

  return { recommendations: all, gaps, remainingBudget: budget };
}

/**
 * Log a conversion event when user adds a recommended product.
 */
export async function logConversion(
  campaignId: string,
  userId: string,
  productId: string | null,
  conversionType: 'add_to_plan' | 'add_to_cart' | 'logged' = 'add_to_plan'
) {
  try {
    await supabase.functions.invoke('log-ad-event', {
      body: {
        event_type: 'conversion',
        campaign_id: campaignId,
        user_id: userId,
        product_id: productId,
        conversion_type: conversionType,
      },
    });
  } catch {
    // Silent fail
  }
}
