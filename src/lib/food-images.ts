// Food images mapped by market item ID
// Using Unsplash CDN with optimized crop parameters

const FOOD_IMAGES: Record<string, string> = {
  // Chicken
  mk_chicken_whole: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=200&h=200&fit=crop',
  mk_chicken_breast: 'https://images.unsplash.com/photo-1604503468506-a8da13d82571?w=200&h=200&fit=crop',
  mk_chicken_thigh: 'https://images.unsplash.com/photo-1615937722923-67f6deaf2cc9?w=200&h=200&fit=crop',
  mk_chicken_leg: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop',
  mk_chicken_keema: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=200&h=200&fit=crop',
  // Fish
  mk_rohu: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&h=200&fit=crop',
  mk_pomfret: 'https://images.unsplash.com/photo-1535140728325-a4d3707eee61?w=200&h=200&fit=crop',
  mk_surmai: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=200&h=200&fit=crop',
  mk_hilsa: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200&h=200&fit=crop',
  mk_katla: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&h=200&fit=crop',
  mk_bangda: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=200&h=200&fit=crop',
  mk_basa: 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=200&h=200&fit=crop',
  // Mutton
  mk_mutton_leg: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=200&h=200&fit=crop',
  mk_mutton_keema: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=200&h=200&fit=crop',
  mk_mutton_ribs: 'https://images.unsplash.com/photo-1558030006-450675393462?w=200&h=200&fit=crop',
  mk_mutton_liver: 'https://images.unsplash.com/photo-1608039829572-eed259b1a605?w=200&h=200&fit=crop',
  // Prawns
  mk_prawns_small: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=200&h=200&fit=crop',
  mk_prawns_medium: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=200&h=200&fit=crop',
  mk_prawns_jumbo: 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=200&h=200&fit=crop',
  // Eggs
  mk_egg_white: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop',
  mk_egg_brown: 'https://images.unsplash.com/photo-1491524062933-cb6c76a1b8c5?w=200&h=200&fit=crop',
  mk_egg_desi: 'https://images.unsplash.com/photo-1598965675045-45c5e72c7d05?w=200&h=200&fit=crop',
  // Vegetables
  mk_spinach: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&h=200&fit=crop',
  mk_methi: 'https://images.unsplash.com/photo-1515686811547-3b4b4e4a5b67?w=200&h=200&fit=crop',
  mk_amaranth: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&h=200&fit=crop',
  mk_potato: 'https://images.unsplash.com/photo-1518977676601-b53f82bbe9e8?w=200&h=200&fit=crop',
  mk_sweet_potato: 'https://images.unsplash.com/photo-1596097635121-14b63b7a5c61?w=200&h=200&fit=crop',
  mk_beetroot: 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=200&h=200&fit=crop',
  mk_carrot: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=200&h=200&fit=crop',
  mk_tomato: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=200&h=200&fit=crop',
  mk_onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=200&h=200&fit=crop',
  mk_cabbage: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=200&h=200&fit=crop',
  mk_cauliflower: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&h=200&fit=crop',
  mk_capsicum: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=200&h=200&fit=crop',
  mk_peas: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=200&h=200&fit=crop',
  mk_broccoli: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=200&h=200&fit=crop',
  mk_mushroom: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop',
  // Dairy
  mk_milk_toned: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop',
  mk_milk_full: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop',
  mk_curd: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop',
  mk_paneer: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&h=200&fit=crop',
  mk_ghee: 'https://images.unsplash.com/photo-1612187209266-c2b648b7a3ed?w=200&h=200&fit=crop',
  mk_butter: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&h=200&fit=crop',
  mk_cheese: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop',
  // Dals
  mk_moong_dal: 'https://images.unsplash.com/photo-1585996048043-1ac2bff8feeb?w=200&h=200&fit=crop',
  mk_toor_dal: 'https://images.unsplash.com/photo-1585996048043-1ac2bff8feeb?w=200&h=200&fit=crop',
  mk_masoor_dal: 'https://images.unsplash.com/photo-1585996048043-1ac2bff8feeb?w=200&h=200&fit=crop',
  mk_chana_dal: 'https://images.unsplash.com/photo-1585996048043-1ac2bff8feeb?w=200&h=200&fit=crop',
  mk_urad_dal: 'https://images.unsplash.com/photo-1585996048043-1ac2bff8feeb?w=200&h=200&fit=crop',
  mk_rajma: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=200&h=200&fit=crop',
  mk_chickpeas: 'https://images.unsplash.com/photo-1515543904413-63c3b28f1360?w=200&h=200&fit=crop',
  mk_soya_chunks: 'https://images.unsplash.com/photo-1612257416648-ee7a6c5b4265?w=200&h=200&fit=crop',
  // Fruits
  mk_banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop',
  mk_apple: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=200&h=200&fit=crop',
  mk_guava: 'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=200&h=200&fit=crop',
  mk_papaya: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=200&h=200&fit=crop',
  mk_watermelon: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=200&h=200&fit=crop',
  mk_orange: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=200&h=200&fit=crop',
  mk_pomegranate: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=200&h=200&fit=crop',
  mk_mango: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=200&h=200&fit=crop',
  // Dry Fruits
  mk_almonds: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=200&h=200&fit=crop',
  mk_cashews: 'https://images.unsplash.com/photo-1563292769-4e05b684851a?w=200&h=200&fit=crop',
  mk_walnuts: 'https://images.unsplash.com/photo-1563292769-4e05b684851a?w=200&h=200&fit=crop',
  mk_peanuts: 'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=200&h=200&fit=crop',
  mk_flaxseeds: 'https://images.unsplash.com/photo-1615485020887-4b0db63d22c4?w=200&h=200&fit=crop',
  mk_chia_seeds: 'https://images.unsplash.com/photo-1541990931398-7fedb80ccc56?w=200&h=200&fit=crop',
  mk_pumpkin_seeds: 'https://images.unsplash.com/photo-1622484212850-eb596d769eab?w=200&h=200&fit=crop',
  mk_sunflower_seeds: 'https://images.unsplash.com/photo-1622484212850-eb596d769eab?w=200&h=200&fit=crop',
  mk_dates: 'https://images.unsplash.com/photo-1593904326985-f75b2d5a0e26?w=200&h=200&fit=crop',
  mk_raisins: 'https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?w=200&h=200&fit=crop',
  // Grains
  mk_brown_rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop',
  mk_white_rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop',
  mk_wheat_atta: 'https://images.unsplash.com/photo-1556040220-4096d522378d?w=200&h=200&fit=crop',
  mk_oats: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=200&h=200&fit=crop',
  mk_ragi: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop',
  mk_bajra: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop',
  mk_jowar: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop',
};

// Category hero images
export const CATEGORY_IMAGES: Record<string, string> = {
  meat_seafood: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=200&fit=crop',
  eggs: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=200&fit=crop',
  vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=200&fit=crop',
  dals_pulses: 'https://images.unsplash.com/photo-1585996048043-1ac2bff8feeb?w=400&h=200&fit=crop',
  dairy: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=200&fit=crop',
  grains_millets: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=200&fit=crop',
  fruits: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=200&fit=crop',
  dry_fruits: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400&h=200&fit=crop',
  superfoods: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&h=200&fit=crop',
  packed_foods: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=200&fit=crop',
  supplements: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400&h=200&fit=crop',
};

export function getFoodImage(itemId: string): string | null {
  return FOOD_IMAGES[itemId] || null;
}

export function getCategoryImage(category: string): string | null {
  return CATEGORY_IMAGES[category] || null;
}
