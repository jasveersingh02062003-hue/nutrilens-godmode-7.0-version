// INDB (Indian Nutritional Database) foods - additional items from research datasets
// All values per 100g/100ml. Serving sizes in grams calculated from source data.

import type { IndianFood } from './indian-foods';

// Helper: calculate serving grams from per-100g and per-serving kcal
// servingGrams = (servingKcal / per100Kcal) * 100

export const INDB_FOODS: IndianFood[] = [
  // ==========================================
  // === BEVERAGES (40 items) ===
  // ==========================================
  { id: 'db001', name: 'Hot Tea (Garam Chai)', hindi: 'गरम चाय', category: 'Beverages', calories: 16, protein: 0.4, carbs: 2.6, fat: 0.5, fiber: 0, iron: 0, calcium: 14, vitC: 0.2, defaultServing: 210, servingUnit: 'cup' },
  { id: 'db002', name: 'Instant Coffee', hindi: 'इंस्टेंट कॉफी', category: 'Beverages', calories: 23, protein: 0.6, carbs: 3.7, fat: 0.8, fiber: 0, iron: 0.1, calcium: 21, vitC: 0.3, defaultServing: 450, servingUnit: 'cup' },
  { id: 'db003', name: 'Espresso Coffee', hindi: 'एस्प्रेसो', category: 'Beverages', calories: 52, protein: 1.8, carbs: 6.6, fat: 2.1, fiber: 0, iron: 0.2, calcium: 58, vitC: 1.0, defaultServing: 160, servingUnit: 'cup' },
  { id: 'db004', name: 'Iced Tea', hindi: 'आइस्ड टी', category: 'Beverages', calories: 10, protein: 0, carbs: 2.7, fat: 0, fiber: 0, iron: 0, calcium: 1, vitC: 1.9, defaultServing: 320, servingUnit: 'glass' },
  { id: 'db005', name: 'Raw Mango Drink (Aam Panna)', hindi: 'आम पन्ना', category: 'Beverages', calories: 36, protein: 0.2, carbs: 9.1, fat: 0, fiber: 0.6, iron: 0.1, calcium: 7, vitC: 16.9, defaultServing: 270, servingUnit: 'glass' },
  { id: 'db006', name: 'Fruit Punch (fresh juices)', hindi: 'फ्रूट पंच', category: 'Beverages', calories: 36, protein: 0.1, carbs: 9.4, fat: 0, fiber: 0.1, iron: 0.1, calcium: 5, vitC: 7.6, defaultServing: 545, servingUnit: 'glass' },
  { id: 'db008', name: 'Lemonade', hindi: 'लेमोनेड / शिकंजी', category: 'Beverages', calories: 21, protein: 0, carbs: 5.5, fat: 0, fiber: 0, iron: 0.1, calcium: 2, vitC: 1.5, defaultServing: 350, servingUnit: 'glass' },
  { id: 'db010', name: 'Cumin Water (Jeera Pani)', hindi: 'जीरे का पानी', category: 'Beverages', calories: 9, protein: 0.2, carbs: 1.9, fat: 0.1, fiber: 0.5, iron: 0.3, calcium: 11, vitC: 1.1, defaultServing: 340, servingUnit: 'glass' },
  { id: 'db011', name: 'Coco Pine Cooler', hindi: 'कोको पाइन कूलर', category: 'Beverages', calories: 33, protein: 0.6, carbs: 5.7, fat: 1.0, fiber: 0.3, iron: 0.1, calcium: 18, vitC: 2.5, defaultServing: 432, servingUnit: 'glass' },
  { id: 'db014', name: 'Hot Cocoa', hindi: 'हॉट कोको', category: 'Beverages', calories: 90, protein: 3.4, carbs: 9.2, fat: 4.6, fiber: 0, iron: 0.3, calcium: 114, vitC: 1.9, defaultServing: 191, servingUnit: 'cup' },
  { id: 'db015', name: 'Cold Coffee with Ice Cream', hindi: 'कोल्ड कॉफी', category: 'Beverages', calories: 68, protein: 1.6, carbs: 11.2, fat: 2.1, fiber: 0, iron: 0.1, calcium: 53, vitC: 0.8, defaultServing: 302, servingUnit: 'glass' },
  { id: 'db016', name: 'Banana Milkshake', hindi: 'केला मिल्कशेक', category: 'Beverages', calories: 65, protein: 1.8, carbs: 9.2, fat: 2.4, fiber: 0.3, iron: 0.1, calcium: 63, vitC: 2.0, defaultServing: 345, servingUnit: 'glass' },
  { id: 'db017', name: 'Mango Milkshake', hindi: 'आम मिल्कशेक', category: 'Beverages', calories: 57, protein: 1.7, carbs: 7.2, fat: 2.4, fiber: 0.3, iron: 0.2, calcium: 62, vitC: 5.7, defaultServing: 355, servingUnit: 'glass' },
  { id: 'db018', name: 'Pineapple Milkshake', hindi: 'अनानास मिल्कशेक', category: 'Beverages', calories: 56, protein: 1.7, carbs: 7.6, fat: 2.2, fiber: 0, iron: 0.1, calcium: 60, vitC: 2.8, defaultServing: 365, servingUnit: 'glass' },
  { id: 'db020', name: 'Egg Nog', hindi: 'एग नॉग', category: 'Beverages', calories: 97, protein: 4.8, carbs: 8.2, fat: 5.1, fiber: 0, iron: 0.4, calcium: 102, vitC: 1.6, defaultServing: 304, servingUnit: 'glass' },
  { id: 'db021', name: 'Sweet Lassi', hindi: 'मीठी लस्सी', category: 'Beverages', calories: 36, protein: 1.3, carbs: 6.5, fat: 0.7, fiber: 0, iron: 0, calcium: 46, vitC: 0.2, defaultServing: 443, servingUnit: 'glass' },
  { id: 'db022', name: 'Salted Lassi', hindi: 'नमकीन लस्सी', category: 'Beverages', calories: 19, protein: 1.4, carbs: 1.9, fat: 0.7, fiber: 0, iron: 0, calcium: 48, vitC: 0.2, defaultServing: 423, servingUnit: 'glass' },

  // ==========================================
  // === SANDWICHES (30 items) ===
  // ==========================================
  { id: 'db023', name: 'Cheese Chilli Sandwich', hindi: 'चीज़ चिली सैंडविच', category: 'Sandwiches', calories: 218, protein: 6.8, carbs: 27.4, fat: 9.8, fiber: 2.1, iron: 1.0, calcium: 114, vitC: 22.1, defaultServing: 56, servingUnit: 'triangle' },
  { id: 'db024', name: 'Egg Sandwich', hindi: 'अंडे का सैंडविच', category: 'Sandwiches', calories: 286, protein: 8.7, carbs: 29.2, fat: 15.8, fiber: 1.9, iron: 1.4, calcium: 110, vitC: 0, defaultServing: 51, servingUnit: 'triangle' },
  { id: 'db025', name: 'Cucumber Sandwich', hindi: 'खीरे का सैंडविच', category: 'Sandwiches', calories: 189, protein: 4.8, carbs: 25.8, fat: 8.0, fiber: 2.5, iron: 1.0, calcium: 88, vitC: 2.5, defaultServing: 61, servingUnit: 'triangle' },
  { id: 'db028', name: 'Chicken Sandwich', hindi: 'चिकन सैंडविच', category: 'Sandwiches', calories: 253, protein: 13.1, carbs: 25.4, fat: 11.8, fiber: 1.6, iron: 1.2, calcium: 90, vitC: 0, defaultServing: 58, servingUnit: 'triangle' },
  { id: 'db031', name: 'Club Sandwich', hindi: 'क्लब सैंडविच', category: 'Sandwiches', calories: 235, protein: 7.3, carbs: 18.5, fat: 15.1, fiber: 1.8, iron: 0.9, calcium: 116, vitC: 6.8, defaultServing: 88, servingUnit: 'triangle' },
  { id: 'db032', name: 'Veg Club Sandwich', hindi: 'वेज क्लब सैंडविच', category: 'Sandwiches', calories: 198, protein: 5.5, carbs: 19.7, fat: 11.3, fiber: 2.1, iron: 0.8, calcium: 122, vitC: 7.2, defaultServing: 83, servingUnit: 'triangle' },
  { id: 'db036', name: 'Veg Mayo Sandwich', hindi: 'वेज मेयो सैंडविच', category: 'Sandwiches', calories: 244, protein: 4.5, carbs: 23.2, fat: 15.4, fiber: 2.4, iron: 0.9, calcium: 80, vitC: 18.9, defaultServing: 68, servingUnit: 'triangle' },

  // ==========================================
  // === BREADS & PARATHAS (25 items) ===
  // ==========================================
  { id: 'db100', name: 'Aloo Paratha (INDB)', hindi: 'आलू पराठा', category: 'Cereals', calories: 231, protein: 4.4, carbs: 24.2, fat: 12.6, fiber: 3.4, iron: 1.3, calcium: 13, vitC: 3.2, defaultServing: 85, servingUnit: 'paratha' },
  { id: 'db101', name: 'Gobi Paratha (INDB)', hindi: 'गोभी पराठा', category: 'Cereals', calories: 226, protein: 4.5, carbs: 21.2, fat: 13.1, fiber: 4.0, iron: 1.3, calcium: 24, vitC: 12.2, defaultServing: 85, servingUnit: 'paratha' },
  { id: 'db102', name: 'Mooli Paratha', hindi: 'मूली पराठा', category: 'Cereals', calories: 222, protein: 4.5, carbs: 23.1, fat: 12.0, fiber: 4.1, iron: 1.4, calcium: 24, vitC: 8.1, defaultServing: 85, servingUnit: 'paratha' },
  { id: 'db103', name: 'Methi Paratha (INDB)', hindi: 'मेथी पराठा', category: 'Cereals', calories: 225, protein: 4.7, carbs: 20.3, fat: 13.2, fiber: 4.2, iron: 1.7, calcium: 36, vitC: 8.0, defaultServing: 85, servingUnit: 'paratha' },
  { id: 'db104', name: 'Keema Paratha', hindi: 'कीमा पराठा', category: 'Cereals', calories: 238, protein: 9.4, carbs: 18.4, fat: 13.9, fiber: 3.4, iron: 1.8, calcium: 19, vitC: 1.8, defaultServing: 100, servingUnit: 'paratha' },
  { id: 'db105', name: 'Paneer Paratha (INDB)', hindi: 'पनीर पराठा', category: 'Cereals', calories: 263, protein: 8.0, carbs: 24.3, fat: 14.6, fiber: 4.0, iron: 1.7, calcium: 128, vitC: 2.0, defaultServing: 85, servingUnit: 'paratha' },
  { id: 'db106', name: 'Besan Palak Paratha', hindi: 'बेसन पालक पराठा', category: 'Cereals', calories: 216, protein: 5.5, carbs: 21.4, fat: 12.1, fiber: 4.4, iron: 1.9, calcium: 33, vitC: 8.1, defaultServing: 82, servingUnit: 'paratha' },
  { id: 'db107', name: 'Poori (INDB)', hindi: 'पूरी', category: 'Cereals', calories: 350, protein: 7.5, carbs: 42, fat: 16.8, fiber: 1.5, iron: 0.6, calcium: 4, vitC: 0, defaultServing: 30, servingUnit: 'piece' },
  { id: 'db108', name: 'Tandoori Paratha', hindi: 'तंदूरी पराठा', category: 'Cereals', calories: 295, protein: 5.1, carbs: 30.7, fat: 16.5, fiber: 5.4, iron: 2.0, calcium: 15, vitC: 0, defaultServing: 56, servingUnit: 'paratha' },
  { id: 'db142', name: 'Naan (INDB)', hindi: 'नान', category: 'Cereals', calories: 286, protein: 8.1, carbs: 51.8, fat: 5.0, fiber: 1.9, iron: 1.3, calcium: 88, vitC: 0.4, defaultServing: 53, servingUnit: 'naan' },
  { id: 'db143', name: 'Bhatura (INDB)', hindi: 'भटूरा', category: 'Cereals', calories: 380, protein: 8.0, carbs: 45, fat: 18.5, fiber: 0.4, iron: 0.3, calcium: 12, vitC: 0, defaultServing: 80, servingUnit: 'piece' },

  // ==========================================
  // === RICE DISHES (20 items) ===
  // ==========================================
  { id: 'db113', name: 'Boiled Rice (INDB)', hindi: 'उबले चावल', category: 'Cereals', calories: 117, protein: 2.6, carbs: 25.7, fat: 0.2, fiber: 1.3, iron: 0.2, calcium: 3, vitC: 0, defaultServing: 300, servingUnit: 'plate' },
  { id: 'db114', name: 'Plain Pulao (INDB)', hindi: 'सादा पुलाव', category: 'Cereals', calories: 140, protein: 2.3, carbs: 21.8, fat: 4.6, fiber: 1.7, iron: 0.4, calcium: 13, vitC: 1.1, defaultServing: 308, servingUnit: 'plate' },
  { id: 'db115', name: 'Mixed Veg Pulao', hindi: 'मिक्स वेज पुलाव', category: 'Cereals', calories: 113, protein: 2.7, carbs: 17.5, fat: 3.3, fiber: 2.7, iron: 0.6, calcium: 20, vitC: 6.0, defaultServing: 439, servingUnit: 'plate' },
  { id: 'db116', name: 'Mushroom Pulao', hindi: 'मशरूम पुलाव', category: 'Cereals', calories: 124, protein: 2.5, carbs: 19.0, fat: 4.0, fiber: 1.9, iron: 0.4, calcium: 14, vitC: 1.0, defaultServing: 359, servingUnit: 'plate' },
  { id: 'db118', name: 'Navratan Pulao', hindi: 'नवरत्न पुलाव', category: 'Cereals', calories: 262, protein: 6.2, carbs: 37.0, fat: 9.5, fiber: 3.8, iron: 1.1, calcium: 60, vitC: 7.0, defaultServing: 183, servingUnit: 'plate' },
  { id: 'db122', name: 'Mutton Biryani (INDB)', hindi: 'मटन बिरयानी', category: 'Cereals', calories: 191, protein: 7.4, carbs: 22.5, fat: 7.7, fiber: 2.4, iron: 1.3, calcium: 69, vitC: 5.0, defaultServing: 208, servingUnit: 'plate' },
  { id: 'db123', name: 'Veg Biryani (INDB)', hindi: 'वेज बिरयानी', category: 'Cereals', calories: 175, protein: 3.2, carbs: 18.6, fat: 9.5, fiber: 3.3, iron: 0.9, calcium: 34, vitC: 13.1, defaultServing: 302, servingUnit: 'plate' },
  { id: 'db124', name: 'Lemon Rice (Pulihora/Chitranna)', hindi: 'नींबू चावल / पुलिहोरा', category: 'South Indian', calories: 176, protein: 4.3, carbs: 21.6, fat: 7.9, fiber: 2.5, iron: 0.8, calcium: 13, vitC: 3.2, defaultServing: 319, servingUnit: 'plate' },
  { id: 'db125', name: 'Sweet Rice (Meethe Chawal)', hindi: 'मीठे चावल', category: 'Cereals', calories: 215, protein: 2.1, carbs: 42.6, fat: 4.6, fiber: 1.1, iron: 0.3, calcium: 11, vitC: 0.1, defaultServing: 348, servingUnit: 'plate' },
  { id: 'db126', name: 'Curd Rice (INDB)', hindi: 'दही भात / दही चावल', category: 'South Indian', calories: 196, protein: 5.8, carbs: 32.9, fat: 4.3, fiber: 2.1, iron: 0.6, calcium: 102, vitC: 2.4, defaultServing: 216, servingUnit: 'plate' },
  { id: 'db127', name: 'Tamarind Rice (Puliyodharai)', hindi: 'इमली चावल', category: 'South Indian', calories: 373, protein: 7.5, carbs: 65.1, fat: 8.5, fiber: 5.1, iron: 2.9, calcium: 51, vitC: 0.7, defaultServing: 128, servingUnit: 'plate' },
  { id: 'db129', name: 'Chinese Fried Rice (INDB)', hindi: 'चाइनीज़ फ्राइड राइस', category: 'Fast Food', calories: 121, protein: 4.1, carbs: 13.4, fat: 5.4, fiber: 2.3, iron: 1.0, calcium: 35, vitC: 19.2, defaultServing: 351, servingUnit: 'plate' },
  { id: 'db134', name: 'Spanish Rice', hindi: 'स्पैनिश राइस', category: 'Fast Food', calories: 164, protein: 4.2, carbs: 31.1, fat: 2.2, fiber: 2.8, iron: 0.9, calcium: 19, vitC: 22.4, defaultServing: 218, servingUnit: 'plate' },

  // ==========================================
  // === PASTA & NOODLES (15 items) ===
  // ==========================================
  { id: 'db133', name: 'Macaroni Cheese Pie', hindi: 'मैकरोनी चीज़ पाई', category: 'Fast Food', calories: 171, protein: 5.9, carbs: 21.1, fat: 7.5, fiber: 0.4, iron: 0.5, calcium: 122, vitC: 6.1, defaultServing: 240, servingUnit: 'dish' },
  { id: 'db135', name: 'Veg Chowmein (INDB)', hindi: 'वेज चाऊमीन', category: 'Fast Food', calories: 130, protein: 3.1, carbs: 15.4, fat: 6.4, fiber: 1.9, iron: 1.0, calcium: 28, vitC: 28.5, defaultServing: 300, servingUnit: 'plate' },
  { id: 'db136', name: 'Chicken Chowmein', hindi: 'चिकन चाऊमीन', category: 'Fast Food', calories: 151, protein: 6.3, carbs: 13.3, fat: 8.2, fiber: 1.6, iron: 0.9, calcium: 26, vitC: 24.7, defaultServing: 344, servingUnit: 'plate' },
  { id: 'db138', name: 'Penne Platter', hindi: 'पेन्ने प्लैटर', category: 'Fast Food', calories: 177, protein: 5.0, carbs: 20.9, fat: 8.7, fiber: 1.1, iron: 0.9, calcium: 68, vitC: 6.3, defaultServing: 262, servingUnit: 'plate' },
  { id: 'db140', name: 'Chicken Lasagne', hindi: 'चिकन लसागना', category: 'Fast Food', calories: 187, protein: 10.5, carbs: 13.9, fat: 10.4, fiber: 0.1, iron: 0.6, calcium: 120, vitC: 0.8, defaultServing: 515, servingUnit: 'plate' },
  { id: 'db141', name: 'Fettuccine Spinach Sauce', hindi: 'पालक सॉस पास्ता', category: 'Fast Food', calories: 129, protein: 3.1, carbs: 12.2, fat: 7.8, fiber: 0.8, iron: 1.3, calcium: 54, vitC: 10.8, defaultServing: 355, servingUnit: 'plate' },
  { id: 'db155', name: 'Spaghetti Bolognese', hindi: 'स्पैगेटी बोलोनीज़', category: 'Fast Food', calories: 97, protein: 9.4, carbs: 10.0, fat: 9.5, fiber: 1.1, iron: 2.1, calcium: 74, vitC: 7.5, defaultServing: 374, servingUnit: 'dish' },

  // ==========================================
  // === CURRIES & SABZIS (30 items) ===
  // ==========================================
  { id: 'db204', name: 'Palak Paneer (INDB)', hindi: 'पालक पनीर', category: 'Vegetables', calories: 78, protein: 4.0, carbs: 4.4, fat: 4.8, fiber: 1.9, iron: 1.9, calcium: 113, vitC: 20.4, defaultServing: 295, servingUnit: 'bowl' },
  { id: 'db206', name: 'Sarson Ka Saag (INDB)', hindi: 'सरसों का साग', category: 'Vegetables', calories: 88, protein: 3.0, carbs: 5.3, fat: 5.9, fiber: 3.7, iron: 2.4, calcium: 134, vitC: 42.1, defaultServing: 141, servingUnit: 'bowl' },
  { id: 'db210', name: 'Shahi Paneer (INDB)', hindi: 'शाही पनीर', category: 'Vegetables', calories: 157, protein: 5.1, carbs: 6.6, fat: 12.3, fiber: 1.4, iron: 0.6, calcium: 125, vitC: 11.9, defaultServing: 259, servingUnit: 'bowl' },
  { id: 'db215', name: 'Kadhai Paneer (INDB)', hindi: 'कड़ाही पनीर', category: 'Vegetables', calories: 108, protein: 4.3, carbs: 7.3, fat: 6.8, fiber: 2.1, iron: 0.7, calcium: 92, vitC: 27.0, defaultServing: 318, servingUnit: 'bowl' },
  { id: 'db203', name: 'Dum Aloo (INDB)', hindi: 'दम आलू', category: 'Vegetables', calories: 130, protein: 2.8, carbs: 15, fat: 6.5, fiber: 2.0, iron: 0.4, calcium: 16, vitC: 4.4, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'db219', name: 'Avial (INDB)', hindi: 'अवियल', category: 'South Indian', calories: 125, protein: 2.5, carbs: 8.5, fat: 8.9, fiber: 5.4, iron: 1.0, calcium: 32, vitC: 28.3, defaultServing: 335, servingUnit: 'bowl' },
  { id: 'db227', name: 'Roghan Josh (INDB)', hindi: 'रोगन जोश', category: 'Non-Veg', calories: 140, protein: 9.6, carbs: 4.9, fat: 9.0, fiber: 2.1, iron: 1.8, calcium: 112, vitC: 5.3, defaultServing: 236, servingUnit: 'bowl' },
  { id: 'db228', name: 'Palak Mutton', hindi: 'पालक मटन / साग गोश्त', category: 'Non-Veg', calories: 80, protein: 5.7, carbs: 3.5, fat: 4.7, fiber: 2.2, iron: 2.4, calcium: 97, vitC: 18.1, defaultServing: 486, servingUnit: 'bowl' },
  { id: 'db240', name: 'Chicken Curry (INDB)', hindi: 'चिकन करी', category: 'Non-Veg', calories: 129, protein: 11.8, carbs: 3.4, fat: 7.6, fiber: 1.4, iron: 0.9, calcium: 27, vitC: 6.8, defaultServing: 248, servingUnit: 'bowl' },
  { id: 'db241', name: 'Tandoori Chicken (INDB)', hindi: 'तंदूरी चिकन', category: 'Non-Veg', calories: 145, protein: 16.3, carbs: 2.3, fat: 7.9, fiber: 0.5, iron: 0.9, calcium: 44, vitC: 2.7, defaultServing: 1440, servingUnit: 'chicken' },
  { id: 'db242', name: 'Butter Chicken (INDB)', hindi: 'बटर चिकन', category: 'Non-Veg', calories: 137, protein: 10.9, carbs: 3.7, fat: 8.7, fiber: 1.3, iron: 0.9, calcium: 25, vitC: 11.9, defaultServing: 275, servingUnit: 'piece' },
  { id: 'db244', name: 'Chilli Chicken (INDB)', hindi: 'चिली चिकन', category: 'Non-Veg', calories: 199, protein: 9.6, carbs: 2.9, fat: 16.6, fiber: 1.0, iron: 0.7, calcium: 13, vitC: 14.3, defaultServing: 387, servingUnit: 'bowl' },
  { id: 'db246', name: 'Fish Curry (INDB)', hindi: 'मछली करी', category: 'Non-Veg', calories: 111, protein: 8.8, carbs: 3.8, fat: 6.7, fiber: 1.9, iron: 1.1, calcium: 52, vitC: 8.9, defaultServing: 254, servingUnit: 'bowl' },

  // ==========================================
  // === DALS (15 items from INDB) ===
  // ==========================================
  { id: 'db924', name: 'Dal Makhani (INDB)', hindi: 'दाल मखनी', category: 'Dals', calories: 74, protein: 3.3, carbs: 8.0, fat: 3.1, fiber: 2.3, iron: 1.2, calcium: 21, vitC: 2.6, defaultServing: 353, servingUnit: 'bowl' },
  { id: 'db926', name: 'Chana Dal (INDB)', hindi: 'चना दाल', category: 'Dals', calories: 100, protein: 4.2, carbs: 10.0, fat: 4.6, fiber: 3.7, iron: 1.9, calcium: 22, vitC: 4.6, defaultServing: 292, servingUnit: 'bowl' },
  { id: 'db927', name: 'Kulthi Dal (Horsegram)', hindi: 'कुल्थी दाल', category: 'Dals', calories: 56, protein: 2.9, carbs: 8.2, fat: 1.1, fiber: 1.5, iron: 1.3, calcium: 38, vitC: 3.9, defaultServing: 361, servingUnit: 'bowl' },
  { id: 'db928', name: 'Panchmel Dal (INDB)', hindi: 'पंचमेल दाल', category: 'Dals', calories: 111, protein: 4.6, carbs: 10.7, fat: 5.4, fiber: 3.2, iron: 1.4, calcium: 23, vitC: 2.8, defaultServing: 301, servingUnit: 'bowl' },
  { id: 'db929', name: 'Dal Dhokli', hindi: 'दाल ढोकली', category: 'Dals', calories: 69, protein: 3.0, carbs: 8.6, fat: 2.5, fiber: 1.9, iron: 0.8, calcium: 15, vitC: 0.8, defaultServing: 337, servingUnit: 'bowl' },
  { id: 'db530', name: 'Kabuli Channa Curry', hindi: 'काबुली चना करी', category: 'Dals', calories: 69, protein: 2.9, carbs: 7.6, fat: 3.1, fiber: 1.1, iron: 1.0, calcium: 32, vitC: 4.6, defaultServing: 356, servingUnit: 'bowl' },
  { id: 'db531', name: 'Besan Gatte Curry', hindi: 'बेसन गट्टे की करी', category: 'Dals', calories: 189, protein: 7.8, carbs: 16.3, fat: 10.7, fiber: 3.3, iron: 1.9, calcium: 151, vitC: 5.2, defaultServing: 256, servingUnit: 'bowl' },

  // ==========================================
  // === SOUPS (20 items) ===
  // ==========================================
  { id: 'db913', name: 'Ham and Bean Soup', hindi: 'बीन सूप', category: 'Soups', calories: 96, protein: 10.6, carbs: 4.2, fat: 4.2, fiber: 0.5, iron: 0.9, calcium: 21, vitC: 14.8, defaultServing: 151, servingUnit: 'bowl' },
  { id: 'db915', name: 'Bottle Gourd Soup (Lauki)', hindi: 'लौकी सूप', category: 'Soups', calories: 23, protein: 0.5, carbs: 1.2, fat: 1.8, fiber: 1.0, iron: 0.3, calcium: 15, vitC: 2.0, defaultServing: 295, servingUnit: 'bowl' },
  { id: 'db917', name: 'Pumpkin Soup', hindi: 'कद्दू सूप', category: 'Soups', calories: 40, protein: 0.5, carbs: 2.1, fat: 3.2, fiber: 1.2, iron: 0.2, calcium: 12, vitC: 3.6, defaultServing: 319, servingUnit: 'bowl' },
  { id: 'db918', name: 'Sweet Corn Soup (INDB)', hindi: 'स्वीट कॉर्न सूप', category: 'Soups', calories: 32, protein: 1.0, carbs: 3.6, fat: 1.6, fiber: 0.3, iron: 0.4, calcium: 4, vitC: 2.6, defaultServing: 392, servingUnit: 'bowl' },
  { id: 'db919', name: 'Paneer Soup', hindi: 'पनीर सूप', category: 'Soups', calories: 48, protein: 3.2, carbs: 2.4, fat: 2.8, fiber: 0.3, iron: 0.3, calcium: 83, vitC: 1.2, defaultServing: 611, servingUnit: 'bowl' },
  { id: 'db920', name: 'Curried Cauliflower Soup', hindi: 'गोभी सूप', category: 'Soups', calories: 37, protein: 6.7, carbs: 3.1, fat: 9.8, fiber: 2.3, iron: 2.1, calcium: 37, vitC: 14.9, defaultServing: 348, servingUnit: 'cup' },
  { id: 'db922', name: 'Lemon Coriander Soup', hindi: 'नींबू धनिया सूप', category: 'Soups', calories: 108, protein: 2.3, carbs: 10.3, fat: 6.3, fiber: 6.8, iron: 3.5, calcium: 103, vitC: 17.7, defaultServing: 49, servingUnit: 'bowl' },
  { id: 'db923', name: 'Garlic Soup', hindi: 'लहसुन सूप', category: 'Soups', calories: 195, protein: 2.4, carbs: 7.0, fat: 17.6, fiber: 1.7, iron: 0.7, calcium: 61, vitC: 7.7, defaultServing: 144, servingUnit: 'bowl' },
  { id: 'db966', name: 'Vegetable Soup (INDB)', hindi: 'वेजिटेबल सूप', category: 'Soups', calories: 55, protein: 2.2, carbs: 7.6, fat: 1.6, fiber: 3.0, iron: 0.6, calcium: 18, vitC: 23.2, defaultServing: 200, servingUnit: 'bowl' },

  // ==========================================
  // === BAKED GOODS: CAKES (20 items) ===
  // ==========================================
  { id: 'db710', name: 'Chocolate Sponge Cake', hindi: 'चॉकलेट स्पंज केक', category: 'Baked Goods', calories: 240, protein: 9.1, carbs: 39.5, fat: 5.5, fiber: 0.5, iron: 1.8, calcium: 34, vitC: 0, defaultServing: 70, servingUnit: 'piece' },
  { id: 'db711', name: 'Chocolate Swiss Roll', hindi: 'चॉकलेट स्विस रोल', category: 'Baked Goods', calories: 306, protein: 6.0, carbs: 27.0, fat: 19.8, fiber: 0.3, iron: 1.1, calcium: 43, vitC: 0.4, defaultServing: 47, servingUnit: 'slice' },
  { id: 'db714', name: 'Chocolate Pastry', hindi: 'चॉकलेट पेस्ट्री', category: 'Baked Goods', calories: 243, protein: 7.1, carbs: 32.2, fat: 10.1, fiber: 0.3, iron: 1.4, calcium: 51, vitC: 0.3, defaultServing: 87, servingUnit: 'pastry' },
  { id: 'db718', name: 'Lemon Cake', hindi: 'लेमन केक', category: 'Baked Goods', calories: 374, protein: 5.3, carbs: 43.1, fat: 20.6, fiber: 0.6, iron: 0.9, calcium: 33, vitC: 4.0, defaultServing: 61, servingUnit: 'piece' },
  { id: 'db721', name: 'Eggless Chocolate Cake', hindi: 'एगलेस चॉकलेट केक', category: 'Baked Goods', calories: 312, protein: 6.7, carbs: 43.5, fat: 13.2, fiber: 0.3, iron: 1.0, calcium: 185, vitC: 2.3, defaultServing: 115, servingUnit: 'piece' },
  { id: 'db905', name: 'Wheat Cake', hindi: 'गेहूं का केक', category: 'Baked Goods', calories: 315, protein: 4.8, carbs: 41.1, fat: 15.0, fiber: 2.8, iron: 1.1, calcium: 99, vitC: 1.1, defaultServing: 67, servingUnit: 'piece' },
  { id: 'db906', name: 'Mango Cheesecake', hindi: 'आम चीज़केक', category: 'Baked Goods', calories: 152, protein: 2.4, carbs: 20.1, fat: 7.3, fiber: 1.1, iron: 0.5, calcium: 55, vitC: 14.3, defaultServing: 174, servingUnit: 'slice' },
  { id: 'db907', name: 'Carrot Cake', hindi: 'गाजर का केक', category: 'Baked Goods', calories: 256, protein: 5.6, carbs: 36.0, fat: 10.3, fiber: 2.9, iron: 1.0, calcium: 156, vitC: 3.1, defaultServing: 100, servingUnit: 'slice' },
  { id: 'db908', name: 'Semolina Cake (Rava Cake)', hindi: 'सूजी केक', category: 'Baked Goods', calories: 374, protein: 6.6, carbs: 31.3, fat: 25.2, fiber: 5.4, iron: 1.4, calcium: 128, vitC: 1.6, defaultServing: 59, servingUnit: 'piece' },
  { id: 'db910', name: 'Honey Cake', hindi: 'शहद केक', category: 'Baked Goods', calories: 334, protein: 3.1, carbs: 49.0, fat: 14.7, fiber: 0.5, iron: 0.5, calcium: 51, vitC: 0.3, defaultServing: 164, servingUnit: 'slice' },

  // ==========================================
  // === BAKED GOODS: BISCUITS & COOKIES (25 items) ===
  // ==========================================
  { id: 'db441', name: 'Sweet Plain Biscuit', hindi: 'मीठा बिस्कुट', category: 'Baked Goods', calories: 381, protein: 5.9, carbs: 50.3, fat: 17.7, fiber: 1.1, iron: 0.9, calcium: 43, vitC: 0.2, defaultServing: 14, servingUnit: 'biscuit' },
  { id: 'db442', name: 'Chocolate Biscuit', hindi: 'चॉकलेट बिस्कुट', category: 'Baked Goods', calories: 380, protein: 5.9, carbs: 51.6, fat: 17.1, fiber: 1.0, iron: 1.1, calcium: 42, vitC: 0.2, defaultServing: 15, servingUnit: 'biscuit' },
  { id: 'db443', name: 'Coconut Biscuit', hindi: 'नारियल बिस्कुट', category: 'Baked Goods', calories: 435, protein: 5.8, carbs: 42.9, fat: 27.2, fiber: 3.6, iron: 1.3, calcium: 38, vitC: 0.2, defaultServing: 19, servingUnit: 'biscuit' },
  { id: 'db445', name: 'Peanut Biscuit', hindi: 'मूंगफली बिस्कुट', category: 'Baked Goods', calories: 401, protein: 8.5, carbs: 46.7, fat: 20.4, fiber: 2.5, iron: 1.3, calcium: 51, vitC: 0.2, defaultServing: 18, servingUnit: 'biscuit' },
  { id: 'db404', name: 'Chocolate Walnut Cookies', hindi: 'चॉकलेट अखरोट कुकीज', category: 'Baked Goods', calories: 425, protein: 6.6, carbs: 47.1, fat: 23.6, fiber: 1.5, iron: 1.4, calcium: 36, vitC: 0.6, defaultServing: 26, servingUnit: 'cookie' },
  { id: 'db405', name: 'Chocolate Chip Cookies', hindi: 'चॉकलेट चिप कुकीज', category: 'Baked Goods', calories: 425, protein: 5.8, carbs: 58.0, fat: 19.4, fiber: 1.1, iron: 1.2, calcium: 25, vitC: 0, defaultServing: 22, servingUnit: 'cookie' },
  { id: 'db451', name: 'Danish Cookies', hindi: 'डैनिश कुकीज', category: 'Baked Goods', calories: 475, protein: 5.3, carbs: 58.0, fat: 24.9, fiber: 1.4, iron: 1.0, calcium: 16, vitC: 0, defaultServing: 13, servingUnit: 'biscuit' },
  { id: 'db453', name: 'Coffee Biscuit', hindi: 'कॉफी बिस्कुट', category: 'Baked Goods', calories: 417, protein: 6.9, carbs: 46.6, fat: 23.0, fiber: 1.6, iron: 1.3, calcium: 49, vitC: 0.2, defaultServing: 17, servingUnit: 'biscuit' },
  { id: 'db448', name: 'Masala Biscuit', hindi: 'मसाला बिस्कुट', category: 'Baked Goods', calories: 394, protein: 6.1, carbs: 45.2, fat: 20.8, fiber: 2.1, iron: 1.3, calcium: 54, vitC: 1.0, defaultServing: 16, servingUnit: 'biscuit' },
  { id: 'db450', name: 'Gingerbread Biscuit', hindi: 'अदरक बिस्कुट', category: 'Baked Goods', calories: 365, protein: 6.6, carbs: 60.3, fat: 11.0, fiber: 1.6, iron: 2.1, calcium: 38, vitC: 0.3, defaultServing: 30, servingUnit: 'biscuit' },

  // ==========================================
  // === SNACKS (20 items from INDB) ===
  // ==========================================
  { id: 'db900', name: 'Bhel Puri (INDB)', hindi: 'भेल पूरी', category: 'Snacks', calories: 510, protein: 3.5, carbs: 16.5, fat: 47.9, fiber: 2.2, iron: 1.3, calcium: 24, vitC: 4.5, defaultServing: 700, servingUnit: 'plate' },
  { id: 'db901', name: 'Semolina Dhokla (Rava Dhokla)', hindi: 'सूजी ढोकला', category: 'Snacks', calories: 195, protein: 5.4, carbs: 30.9, fat: 5.2, fiber: 5.1, iron: 2.5, calcium: 31, vitC: 3.7, defaultServing: 100, servingUnit: 'plate' },
  { id: 'db902', name: 'Spicy Corn Chaat', hindi: 'मसाला कॉर्न चाट', category: 'Snacks', calories: 480, protein: 4.6, carbs: 11.5, fat: 46.6, fiber: 2.2, iron: 0.8, calcium: 17, vitC: 2.5, defaultServing: 554, servingUnit: 'plate' },
  { id: 'db903', name: 'Jackfruit Fritters (Pakora)', hindi: 'कटहल पकोड़ा', category: 'Snacks', calories: 598, protein: 2.3, carbs: 24.0, fat: 54.4, fiber: 1.5, iron: 1.2, calcium: 25, vitC: 1.2, defaultServing: 27, servingUnit: 'piece' },
  { id: 'db904', name: 'Banana Chips (INDB)', hindi: 'केले के चिप्स', category: 'Snacks', calories: 666, protein: 0.4, carbs: 7.3, fat: 70.5, fiber: 0.7, iron: 0.2, calcium: 2, vitC: 2.4, defaultServing: 170, servingUnit: 'bowl' },
  { id: 'db931', name: 'Sev (Omapodi)', hindi: 'सेव / ओमापोड़ी', category: 'Snacks', calories: 609, protein: 5.1, carbs: 12.9, fat: 60.1, fiber: 2.4, iron: 0.7, calcium: 14, vitC: 0, defaultServing: 137, servingUnit: 'plate' },
  { id: 'db932', name: 'Papdi', hindi: 'पपड़ी', category: 'Snacks', calories: 709, protein: 1.8, carbs: 12.9, fat: 72.1, fiber: 0.6, iron: 0.4, calcium: 6, vitC: 0, defaultServing: 174, servingUnit: 'plate' },
  { id: 'db952', name: 'Bread Roll', hindi: 'ब्रेड रोल', category: 'Snacks', calories: 435, protein: 2.9, carbs: 16.1, fat: 40.3, fiber: 1.5, iron: 0.7, calcium: 45, vitC: 5.6, defaultServing: 121, servingUnit: 'roll' },
  { id: 'db935', name: 'Soya Seekh Kebab', hindi: 'सोया सीख कबाब', category: 'Snacks', calories: 115, protein: 5.4, carbs: 10.0, fat: 5.9, fiber: 2.2, iron: 1.3, calcium: 16, vitC: 15.0, defaultServing: 57, servingUnit: 'kebab' },
  { id: 'db930', name: 'Gujarati Handvo', hindi: 'गुजराती हांडवो', category: 'Snacks', calories: 207, protein: 8.2, carbs: 31.9, fat: 4.8, fiber: 5.0, iron: 2.0, calcium: 68, vitC: 4.5, defaultServing: 697, servingUnit: 'cake' },

  // ==========================================
  // === SWEETS (additional) ===
  // ==========================================
  { id: 'db459', name: 'Peanut Barfi', hindi: 'मूंगफली बर्फी', category: 'Sweets', calories: 551, protein: 9.3, carbs: 48.1, fat: 36.8, fiber: 4.1, iron: 1.5, calcium: 25, vitC: 0, defaultServing: 21, servingUnit: 'piece' },
  { id: 'db466', name: 'Palak Barfi', hindi: 'पालक बर्फी', category: 'Sweets', calories: 121, protein: 2.7, carbs: 12.8, fat: 6.8, fiber: 1.2, iron: 1.1, calcium: 94, vitC: 9.8, defaultServing: 87, servingUnit: 'piece' },
  { id: 'db467', name: 'Puran Poli (INDB)', hindi: 'पूरन पोली', category: 'Sweets', calories: 367, protein: 9.5, carbs: 62.7, fat: 7.9, fiber: 8.2, iron: 4.4, calcium: 53, vitC: 0, defaultServing: 53, servingUnit: 'roti' },
  { id: 'db470', name: 'Bajra Ladoo', hindi: 'बाजरा लड्डू', category: 'Sweets', calories: 320, protein: 9.6, carbs: 51.0, fat: 8.1, fiber: 6.0, iron: 4.7, calcium: 119, vitC: 0, defaultServing: 48, servingUnit: 'ladoo' },
  { id: 'db465', name: 'Atta Moong Dal Barfi', hindi: 'आटा मूंग दाल बर्फी', category: 'Sweets', calories: 441, protein: 9.8, carbs: 60.0, fat: 18.4, fiber: 6.0, iron: 2.3, calcium: 25, vitC: 0, defaultServing: 26, servingUnit: 'piece' },
  { id: 'db464', name: 'Sweet Poori (Meethi Poori)', hindi: 'मीठी पूरी', category: 'Sweets', calories: 783, protein: 2.1, carbs: 14.3, fat: 79.6, fiber: 1.5, iron: 1.1, calcium: 34, vitC: 0, defaultServing: 153, servingUnit: 'poori' },

  // ==========================================
  // === SAUCES & CONDIMENTS (15 items) ===
  // ==========================================
  { id: 'db072', name: 'White Sauce (Medium)', hindi: 'व्हाइट सॉस', category: 'Sides', calories: 151, protein: 3.4, carbs: 8.0, fat: 11.8, fiber: 0.1, iron: 0.2, calcium: 104, vitC: 1.7, defaultServing: 30, servingUnit: 'tbsp' },
  { id: 'db074', name: 'Cheese Sauce', hindi: 'चीज़ सॉस', category: 'Sides', calories: 195, protein: 7.7, carbs: 7.1, fat: 15.1, fiber: 0.1, iron: 0.3, calcium: 255, vitC: 1.2, defaultServing: 30, servingUnit: 'tbsp' },
  { id: 'db078', name: 'Brown Sauce', hindi: 'ब्राउन सॉस', category: 'Sides', calories: 109, protein: 11.9, carbs: 5.4, fat: 23.7, fiber: 1.7, iron: 2.5, calcium: 40, vitC: 0, defaultServing: 30, servingUnit: 'tbsp' },
  { id: 'db266', name: 'Mayonnaise (INDB)', hindi: 'मेयोनेज़', category: 'Sides', calories: 775, protein: 1.9, carbs: 1.7, fat: 84.5, fiber: 0.1, iron: 0.5, calcium: 15, vitC: 0, defaultServing: 15, servingUnit: 'tbsp' },
  { id: 'db268', name: 'Thousand Island Dressing', hindi: 'थाउज़ेंड आइलैंड', category: 'Sides', calories: 408, protein: 1.4, carbs: 4.5, fat: 42.9, fiber: 0.5, iron: 0.5, calcium: 9, vitC: 11.8, defaultServing: 15, servingUnit: 'tbsp' },
  { id: 'db514', name: 'Tomato Sauce (INDB)', hindi: 'टोमैटो सॉस', category: 'Sides', calories: 34, protein: 0.8, carbs: 7.2, fat: 0.3, fiber: 1.8, iron: 0.3, calcium: 13, vitC: 23.2, defaultServing: 15, servingUnit: 'tbsp' },
  { id: 'db096', name: 'Barbeque Sauce', hindi: 'बारबेक्यू सॉस', category: 'Sides', calories: 122, protein: 1.0, carbs: 20.5, fat: 4.5, fiber: 0.7, iron: 1.2, calcium: 29, vitC: 5.8, defaultServing: 15, servingUnit: 'tbsp' },

  // ==========================================
  // === PICKLES & PRESERVES (from INDB) ===
  // ==========================================
  { id: 'db507', name: 'Mango Pickle (INDB)', hindi: 'आम का अचार', category: 'Sides', calories: 192, protein: 1.6, carbs: 8.1, fat: 17.9, fiber: 3.7, iron: 1.4, calcium: 49, vitC: 61.2, defaultServing: 10, servingUnit: 'tbsp' },
  { id: 'db509', name: 'Mixed Veg Pickle', hindi: 'सब्ज़ियों का अचार', category: 'Sides', calories: 211, protein: 1.9, carbs: 7.5, fat: 19.7, fiber: 2.8, iron: 2.1, calcium: 43, vitC: 30.4, defaultServing: 10, servingUnit: 'tbsp' },
  { id: 'db511', name: 'Sweet Lemon Pickle', hindi: 'नींबू का मीठा अचार', category: 'Sides', calories: 70, protein: 1.2, carbs: 16.9, fat: 0.2, fiber: 2.1, iron: 1.0, calcium: 43, vitC: 22.2, defaultServing: 10, servingUnit: 'tbsp' },
  { id: 'db499', name: 'Apple Jam', hindi: 'सेब का मुरब्बा', category: 'Sides', calories: 189, protein: 0.1, carbs: 48.6, fat: 0.3, fiber: 1.3, iron: 0.2, calcium: 11, vitC: 1.8, defaultServing: 20, servingUnit: 'tbsp' },
  { id: 'db506', name: 'Ginger Candy', hindi: 'अदरक की कैंडी', category: 'Sweets', calories: 196, protein: 0.7, carbs: 50.4, fat: 0.3, fiber: 1.7, iron: 0.7, calcium: 10, vitC: 1.7, defaultServing: 10, servingUnit: 'piece' },

  // ==========================================
  // === SOUTH INDIAN (additional from INDB) ===
  // ==========================================
  { id: 'db144', name: 'Idli (INDB)', hindi: 'इडली', category: 'South Indian', calories: 138, protein: 4.6, carbs: 28.2, fat: 0.3, fiber: 2.3, iron: 0.7, calcium: 8, vitC: 0, defaultServing: 25, servingUnit: 'idli' },
  { id: 'db146', name: 'Masala Dosa (INDB)', hindi: 'मसाला डोसा', category: 'South Indian', calories: 165, protein: 3.3, carbs: 19.6, fat: 7.8, fiber: 2.5, iron: 0.8, calcium: 16, vitC: 6.8, defaultServing: 210, servingUnit: 'dosa' },
  { id: 'db152', name: 'Uttapam (INDB)', hindi: 'उत्तपम', category: 'South Indian', calories: 256, protein: 6.2, carbs: 36.3, fat: 9.0, fiber: 4.4, iron: 1.2, calcium: 41, vitC: 9.0, defaultServing: 68, servingUnit: 'uttapam' },
  { id: 'db153', name: 'Appam (INDB)', hindi: 'अप्पम', category: 'South Indian', calories: 268, protein: 3.1, carbs: 13.3, fat: 22.6, fiber: 6.2, iron: 0.8, calcium: 6, vitC: 1.7, defaultServing: 153, servingUnit: 'appam' },
  { id: 'db933', name: 'Jowar Dosa', hindi: 'ज्वार डोसा', category: 'South Indian', calories: 294, protein: 8.5, carbs: 40.5, fat: 10.3, fiber: 5.6, iron: 2.0, calcium: 19, vitC: 0, defaultServing: 33, servingUnit: 'dosa' },

  // ==========================================
  // === MISCELLANEOUS ===
  // ==========================================
  { id: 'db996', name: 'Garam Masala (INDB)', hindi: 'गरम मसाला', category: 'Spices', calories: 254, protein: 9.9, carbs: 26.2, fat: 11.0, fiber: 35.6, iron: 14.5, calcium: 610, vitC: 9.0, defaultServing: 3, servingUnit: 'tsp' },
  { id: 'db997', name: 'Chat Masala', hindi: 'चाट मसाला', category: 'Spices', calories: 223, protein: 8.2, carbs: 23.9, fat: 9.9, fiber: 18.6, iron: 13.3, calcium: 520, vitC: 6.5, defaultServing: 3, servingUnit: 'tsp' },
  { id: 'db999', name: 'Rasam Powder', hindi: 'रसम मसाला', category: 'Spices', calories: 268, protein: 12.0, carbs: 25.2, fat: 11.8, fiber: 35.7, iron: 14.7, calcium: 562, vitC: 11.7, defaultServing: 5, servingUnit: 'tsp' },
  { id: 'db1000', name: 'Sambar Powder', hindi: 'सांभर मसाला', category: 'Spices', calories: 297, protein: 12.5, carbs: 23.4, fat: 15.6, fiber: 34.6, iron: 12.6, calcium: 440, vitC: 10.3, defaultServing: 5, servingUnit: 'tsp' },
  { id: 'db975', name: 'Lemon Squash', hindi: 'नींबू का स्क्वैश', category: 'Beverages', calories: 185, protein: 0.2, carbs: 48.9, fat: 0.1, fiber: 0, iron: 0.2, calcium: 10, vitC: 10.5, defaultServing: 30, servingUnit: 'tbsp' },
  { id: 'db978', name: 'Mango Squash', hindi: 'आम का स्क्वैश', category: 'Beverages', calories: 195, protein: 0.2, carbs: 51.0, fat: 0.2, fiber: 0.6, iron: 0.3, calcium: 9, vitC: 10.1, defaultServing: 30, servingUnit: 'tbsp' },
];
