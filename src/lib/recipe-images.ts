// Curated food images from Unsplash for each recipe
const RECIPE_IMAGES: Record<string, string> = {
  // Indian Breakfast
  'idli-sambar': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop',
  'poha': 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&h=300&fit=crop',
  'upma': 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=300&fit=crop',
  'moong-dal-chilla': 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=300&fit=crop',
  'masala-oats': 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop',
  'paratha-curd': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',

  // Indian Lunch
  'dal-rice': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
  'rajma-chawal': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
  'chicken-curry-rice': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop',
  'paneer-butter-masala': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
  'chole-bhature': 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&h=300&fit=crop',
  'fish-curry-rice': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=300&fit=crop',

  // Indian Dinner
  'palak-dal-roti': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop',
  'veg-biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
  'grilled-chicken-salad': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  'egg-bhurji-roti': 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop',
  'butter-chicken': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop',

  // Snacks
  'sprout-chaat': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'banana-peanut-butter': 'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400&h=300&fit=crop',
  'roasted-makhana': 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=300&fit=crop',
  'fruit-yogurt': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',

  // Global
  'oatmeal-banana': 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop',
  'grilled-sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'pasta-marinara': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
  'stir-fry-tofu': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
  'chicken-wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop',
  'dosa-chutney': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=300&fit=crop',
  'khichdi': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
  'smoothie-bowl': 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=300&fit=crop',

  // More variety
  'roti-sabzi': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
  'greek-salad': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
  'paneer-tikka': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
  'dal-fry': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
  'overnight-oats': 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop',
  'aloo-gobi': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop',
  'protein-shake': 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&h=300&fit=crop',
  'egg-fried-rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',
  'chana-salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',

  // New dinner recipes
  'mushroom-masala': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  'methi-thepla': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'kadhi-chawal': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
  'baingan-bharta': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop',
  'curd-rice': 'https://images.unsplash.com/photo-1536304993881-571973b8e512?w=400&h=300&fit=crop',
  'grilled-fish-veggies': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
  'tofu-curry-rice': 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop',
};

// Fallback images by meal type
const MEAL_TYPE_FALLBACKS: Record<string, string> = {
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
  lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  dinner: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop',
  snack: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
};

export function getRecipeImage(recipeId: string, mealType?: string): string {
  return RECIPE_IMAGES[recipeId] || MEAL_TYPE_FALLBACKS[mealType || 'lunch'] || MEAL_TYPE_FALLBACKS.lunch;
}
