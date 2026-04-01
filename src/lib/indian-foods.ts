// Indian Food Composition data based on IFCT2017 + INDB datasets
// Contains 700+ common Indian foods with detailed nutrition per 100g

import { INDB_FOODS } from './indb-foods';
import { getUnitOptionsForFood } from './unit-conversion';

export interface IndianFood {
  id: string;
  name: string;
  hindi: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  iron: number; // mg
  calcium: number; // mg
  vitC: number; // mg
  defaultServing: number; // grams
  servingUnit: string;
  allergens?: string[]; // explicit allergen tags
}

export const INDIAN_FOODS: IndianFood[] = [
  // ==========================================
  // === CEREALS & GRAINS (50 items) ===
  // ==========================================
  { id: 'in001', name: 'Rice (white, cooked)', hindi: 'चावल', category: 'Cereals', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, iron: 0.2, calcium: 10, vitC: 0, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in002', name: 'Wheat Roti', hindi: 'रोटी', category: 'Cereals', calories: 264, protein: 8.7, carbs: 50, fat: 3.7, fiber: 11.4, iron: 4.1, calcium: 48, vitC: 0, defaultServing: 40, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in003', name: 'Paratha (plain)', hindi: 'पराठा', category: 'Cereals', calories: 326, protein: 7.5, carbs: 44, fat: 13.5, fiber: 4.5, iron: 3.5, calcium: 40, vitC: 0, defaultServing: 60, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in004', name: 'Naan', hindi: 'नान', category: 'Cereals', calories: 310, protein: 9.6, carbs: 50, fat: 7.6, fiber: 3.6, iron: 2.8, calcium: 56, vitC: 0, defaultServing: 90, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in005', name: 'Idli', hindi: 'इडली', category: 'Cereals', calories: 130, protein: 4.1, carbs: 25, fat: 0.6, fiber: 1.5, iron: 0.9, calcium: 15, vitC: 0, defaultServing: 60, servingUnit: 'piece' },
  { id: 'in006', name: 'Dosa (plain)', hindi: 'डोसा', category: 'Cereals', calories: 168, protein: 3.9, carbs: 28, fat: 4.5, fiber: 1.2, iron: 1.1, calcium: 20, vitC: 0, defaultServing: 80, servingUnit: 'piece' },
  { id: 'in007', name: 'Masala Dosa', hindi: 'मसाला डोसा', category: 'Cereals', calories: 195, protein: 4.2, carbs: 26, fat: 8.2, fiber: 2.1, iron: 1.5, calcium: 25, vitC: 5, defaultServing: 120, servingUnit: 'piece' },
  { id: 'in008', name: 'Upma', hindi: 'उपमा', category: 'Cereals', calories: 150, protein: 4.5, carbs: 22, fat: 5.2, fiber: 2.0, iron: 1.8, calcium: 20, vitC: 2, defaultServing: 200, servingUnit: 'bowl', allergens: ['gluten'] },
  { id: 'in009', name: 'Poha (flattened rice)', hindi: 'पोहा', category: 'Cereals', calories: 155, protein: 3.2, carbs: 28, fat: 3.5, fiber: 1.8, iron: 3.5, calcium: 18, vitC: 3, defaultServing: 200, servingUnit: 'bowl', allergens: ['peanuts'] },
  { id: 'in010', name: 'Puri', hindi: 'पूरी', category: 'Cereals', calories: 350, protein: 7.5, carbs: 42, fat: 16.8, fiber: 3.2, iron: 3.0, calcium: 35, vitC: 0, defaultServing: 30, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in011', name: 'Bhatura', hindi: 'भटूरा', category: 'Cereals', calories: 380, protein: 8.0, carbs: 45, fat: 18.5, fiber: 2.5, iron: 2.8, calcium: 40, vitC: 0, defaultServing: 80, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in012', name: 'Biryani (chicken)', hindi: 'बिरयानी', category: 'Cereals', calories: 210, protein: 10.5, carbs: 25, fat: 7.5, fiber: 0.8, iron: 1.5, calcium: 28, vitC: 2, defaultServing: 250, servingUnit: 'plate', allergens: ['dairy'] },
  { id: 'in013', name: 'Biryani (veg)', hindi: 'वेज बिरयानी', category: 'Cereals', calories: 170, protein: 4.5, carbs: 28, fat: 4.8, fiber: 1.5, iron: 1.2, calcium: 22, vitC: 4, defaultServing: 250, servingUnit: 'plate', allergens: ['dairy'] },
  { id: 'in014', name: 'Pulao', hindi: 'पुलाव', category: 'Cereals', calories: 165, protein: 3.8, carbs: 26, fat: 5.2, fiber: 0.8, iron: 0.8, calcium: 18, vitC: 2, defaultServing: 200, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in015', name: 'Khichdi', hindi: 'खिचड़ी', category: 'Cereals', calories: 120, protein: 5.5, carbs: 20, fat: 2.0, fiber: 2.5, iron: 1.5, calcium: 22, vitC: 1, defaultServing: 250, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in016', name: 'Bajra Roti', hindi: 'बाजरा रोटी', category: 'Cereals', calories: 361, protein: 11.6, carbs: 67, fat: 5.0, fiber: 1.2, iron: 8.0, calcium: 42, vitC: 0, defaultServing: 50, servingUnit: 'piece' },
  { id: 'in017', name: 'Jowar Roti', hindi: 'ज्वार रोटी', category: 'Cereals', calories: 349, protein: 10.4, carbs: 73, fat: 1.9, fiber: 1.6, iron: 4.1, calcium: 25, vitC: 0, defaultServing: 50, servingUnit: 'piece' },
  { id: 'in018', name: 'Ragi Roti', hindi: 'रागी रोटी', category: 'Cereals', calories: 321, protein: 7.2, carbs: 67, fat: 1.9, fiber: 11.2, iron: 3.9, calcium: 344, vitC: 0, defaultServing: 50, servingUnit: 'piece' },
  { id: 'in019', name: 'Makki Ki Roti', hindi: 'मक्की रोटी', category: 'Cereals', calories: 342, protein: 8.9, carbs: 66, fat: 3.6, fiber: 2.7, iron: 2.3, calcium: 10, vitC: 0, defaultServing: 60, servingUnit: 'piece' },
  { id: 'in01a', name: 'Brown Rice (cooked)', hindi: 'ब्राउन चावल', category: 'Cereals', calories: 112, protein: 2.6, carbs: 24, fat: 0.9, fiber: 1.8, iron: 0.4, calcium: 10, vitC: 0, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in01b', name: 'Oats Porridge', hindi: 'ओट्स दलिया', category: 'Cereals', calories: 71, protein: 2.5, carbs: 12, fat: 1.5, fiber: 1.7, iron: 0.6, calcium: 9, vitC: 0, defaultServing: 250, servingUnit: 'bowl', allergens: ['gluten'] },
  { id: 'in01c', name: 'Dalia (broken wheat porridge)', hindi: 'दलिया', category: 'Cereals', calories: 120, protein: 4.5, carbs: 22, fat: 1.5, fiber: 3.5, iron: 1.8, calcium: 20, vitC: 0, defaultServing: 250, servingUnit: 'bowl', allergens: ['gluten'] },
  { id: 'in01d', name: 'Semolina (raw)', hindi: 'सूजी / रवा', category: 'Cereals', calories: 348, protein: 10.3, carbs: 74, fat: 0.7, fiber: 0.9, iron: 1.6, calcium: 16, vitC: 0, defaultServing: 30, servingUnit: 'tbsp', allergens: ['gluten'] },
  { id: 'in01e', name: 'Vermicelli (cooked)', hindi: 'सेवई', category: 'Cereals', calories: 145, protein: 3.5, carbs: 28, fat: 2.0, fiber: 0.8, iron: 0.8, calcium: 10, vitC: 0, defaultServing: 150, servingUnit: 'bowl', allergens: ['gluten'] },
  { id: 'in01f', name: 'Corn (boiled)', hindi: 'मक्का (उबला)', category: 'Cereals', calories: 96, protein: 3.4, carbs: 21, fat: 1.5, fiber: 2.4, iron: 0.5, calcium: 2, vitC: 5, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in01g', name: 'Sabudana Khichdi', hindi: 'साबूदाना खिचड़ी', category: 'Cereals', calories: 180, protein: 2.0, carbs: 35, fat: 4.5, fiber: 0.5, iron: 0.3, calcium: 10, vitC: 3, defaultServing: 200, servingUnit: 'bowl', allergens: ['peanuts'] },
  { id: 'in01h', name: 'Wheat Flour (atta, raw)', hindi: 'गेहूं आटा', category: 'Cereals', calories: 340, protein: 12.1, carbs: 64, fat: 1.7, fiber: 11.4, iron: 4.9, calcium: 48, vitC: 0, defaultServing: 30, servingUnit: 'tbsp', allergens: ['gluten'] },
  { id: 'in01i', name: 'Rice Flour (raw)', hindi: 'चावल का आटा', category: 'Cereals', calories: 362, protein: 6.0, carbs: 80, fat: 0.6, fiber: 0.6, iron: 0.4, calcium: 10, vitC: 0, defaultServing: 30, servingUnit: 'tbsp' },
  { id: 'in01j', name: 'Besan (gram flour, raw)', hindi: 'बेसन', category: 'Cereals', calories: 387, protein: 22.0, carbs: 58, fat: 7.0, fiber: 5.0, iron: 4.6, calcium: 56, vitC: 0, defaultServing: 30, servingUnit: 'tbsp' },
  { id: 'in01k', name: 'Muesli (dry)', hindi: 'मूसली', category: 'Cereals', calories: 370, protein: 9.0, carbs: 66, fat: 7.0, fiber: 6.5, iron: 3.5, calcium: 50, vitC: 0, defaultServing: 40, servingUnit: 'serving', allergens: ['gluten', 'nuts', 'dairy'] },
  { id: 'in01l', name: 'Cornflakes', hindi: 'कॉर्नफ्लेक्स', category: 'Cereals', calories: 357, protein: 7.0, carbs: 84, fat: 0.4, fiber: 1.0, iron: 8.0, calcium: 3, vitC: 0, defaultServing: 30, servingUnit: 'bowl' },
  { id: 'in01m', name: 'Multigrain Roti', hindi: 'मल्टीग्रेन रोटी', category: 'Cereals', calories: 270, protein: 9.5, carbs: 48, fat: 4.5, fiber: 8.0, iron: 4.5, calcium: 55, vitC: 0, defaultServing: 45, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in01n', name: 'Missi Roti', hindi: 'मिस्सी रोटी', category: 'Cereals', calories: 285, protein: 10.5, carbs: 42, fat: 7.5, fiber: 5.5, iron: 4.0, calcium: 50, vitC: 2, defaultServing: 50, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in01o', name: 'Rumali Roti', hindi: 'रूमाली रोटी', category: 'Cereals', calories: 250, protein: 8.0, carbs: 48, fat: 2.5, fiber: 2.0, iron: 2.5, calcium: 30, vitC: 0, defaultServing: 40, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in01p', name: 'Kulcha', hindi: 'कुल्चा', category: 'Cereals', calories: 305, protein: 8.5, carbs: 48, fat: 8.5, fiber: 2.5, iron: 2.5, calcium: 45, vitC: 0, defaultServing: 80, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in01q', name: 'Lachha Paratha', hindi: 'लच्छा पराठा', category: 'Cereals', calories: 340, protein: 7.0, carbs: 42, fat: 16.0, fiber: 3.0, iron: 3.0, calcium: 38, vitC: 0, defaultServing: 70, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in01r', name: 'Paneer Paratha', hindi: 'पनीर पराठा', category: 'Cereals', calories: 310, protein: 10.0, carbs: 38, fat: 13.0, fiber: 3.0, iron: 3.0, calcium: 120, vitC: 0, defaultServing: 90, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in01s', name: 'Methi Paratha', hindi: 'मेथी पराठा', category: 'Cereals', calories: 290, protein: 8.0, carbs: 40, fat: 11.0, fiber: 5.0, iron: 4.0, calcium: 55, vitC: 3, defaultServing: 80, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in01t', name: 'Tandoori Roti', hindi: 'तंदूरी रोटी', category: 'Cereals', calories: 260, protein: 8.5, carbs: 50, fat: 3.0, fiber: 4.0, iron: 3.8, calcium: 45, vitC: 0, defaultServing: 50, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in01u', name: 'Garlic Naan', hindi: 'गार्लिक नान', category: 'Cereals', calories: 320, protein: 9.5, carbs: 50, fat: 9.0, fiber: 3.5, iron: 3.0, calcium: 55, vitC: 1, defaultServing: 90, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in01v', name: 'Butter Naan', hindi: 'बटर नान', category: 'Cereals', calories: 335, protein: 9.0, carbs: 48, fat: 12.0, fiber: 3.0, iron: 2.8, calcium: 50, vitC: 0, defaultServing: 90, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in01w', name: 'Stuffed Kulcha', hindi: 'स्टफ्ड कुल्चा', category: 'Cereals', calories: 315, protein: 9.0, carbs: 45, fat: 11.0, fiber: 3.5, iron: 3.0, calcium: 50, vitC: 3, defaultServing: 90, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in01x', name: 'Appam with Stew', hindi: 'अप्पम स्ट्यू', category: 'Cereals', calories: 150, protein: 4.0, carbs: 22, fat: 5.0, fiber: 1.5, iron: 0.8, calcium: 15, vitC: 3, defaultServing: 150, servingUnit: 'serving' },

  // ==========================================
  // === DALS & LEGUMES (40 items) ===
  // ==========================================
  { id: 'in020', name: 'Dal Tadka (toor dal)', hindi: 'दाल तड़का', category: 'Dals', calories: 130, protein: 8.5, carbs: 18, fat: 3.2, fiber: 4.5, iron: 2.5, calcium: 55, vitC: 2, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in021', name: 'Dal Makhani', hindi: 'दाल मखनी', category: 'Dals', calories: 165, protein: 7.8, carbs: 15, fat: 8.5, fiber: 5.2, iron: 3.0, calcium: 60, vitC: 1, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in022', name: 'Chana Dal', hindi: 'चना दाल', category: 'Dals', calories: 140, protein: 9.0, carbs: 19, fat: 3.5, fiber: 5.0, iron: 2.8, calcium: 58, vitC: 2, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in023', name: 'Moong Dal', hindi: 'मूंग दाल', category: 'Dals', calories: 105, protein: 8.5, carbs: 15, fat: 1.5, fiber: 3.5, iron: 2.0, calcium: 45, vitC: 2, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in024', name: 'Rajma (kidney beans curry)', hindi: 'राजमा', category: 'Dals', calories: 140, protein: 8.0, carbs: 20, fat: 3.0, fiber: 6.5, iron: 3.2, calcium: 52, vitC: 3, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in025', name: 'Chole (chickpea curry)', hindi: 'छोले', category: 'Dals', calories: 155, protein: 7.5, carbs: 22, fat: 4.5, fiber: 6.0, iron: 2.8, calcium: 48, vitC: 4, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in026', name: 'Sambar', hindi: 'सांभर', category: 'Dals', calories: 75, protein: 4.5, carbs: 10, fat: 2.0, fiber: 3.0, iron: 1.8, calcium: 40, vitC: 8, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in027', name: 'Rasam', hindi: 'रसम', category: 'Dals', calories: 35, protein: 1.5, carbs: 5, fat: 1.0, fiber: 0.8, iron: 0.5, calcium: 15, vitC: 12, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in028', name: 'Masoor Dal', hindi: 'मसूर दाल', category: 'Dals', calories: 116, protein: 9.0, carbs: 20, fat: 0.4, fiber: 3.8, iron: 3.3, calcium: 19, vitC: 1, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in029', name: 'Urad Dal', hindi: 'उड़द दाल', category: 'Dals', calories: 120, protein: 8.0, carbs: 16, fat: 2.5, fiber: 4.2, iron: 2.5, calcium: 52, vitC: 1, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in02a', name: 'Palak Dal', hindi: 'पालक दाल', category: 'Dals', calories: 95, protein: 7.0, carbs: 12, fat: 2.5, fiber: 4.5, iron: 3.5, calcium: 80, vitC: 10, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in02b', name: 'Panchmel Dal', hindi: 'पंचमेल दाल', category: 'Dals', calories: 125, protein: 8.5, carbs: 17, fat: 3.0, fiber: 4.8, iron: 2.8, calcium: 55, vitC: 2, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in02c', name: 'Amti Dal', hindi: 'आमटी', category: 'Dals', calories: 110, protein: 7.5, carbs: 15, fat: 2.5, fiber: 4.0, iron: 2.2, calcium: 48, vitC: 3, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in02d', name: 'Chawli (black-eyed peas)', hindi: 'लोबिया', category: 'Dals', calories: 135, protein: 9.0, carbs: 22, fat: 1.5, fiber: 5.5, iron: 3.5, calcium: 45, vitC: 2, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in02e', name: 'Moth Dal', hindi: 'मोठ दाल', category: 'Dals', calories: 130, protein: 8.5, carbs: 20, fat: 1.8, fiber: 5.0, iron: 3.0, calcium: 50, vitC: 1, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in02f', name: 'Kulthi Dal (Horse Gram)', hindi: 'कुल्थी दाल', category: 'Dals', calories: 140, protein: 10.0, carbs: 22, fat: 1.0, fiber: 5.5, iron: 5.0, calcium: 60, vitC: 1, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in02g', name: 'Sprouts (mixed)', hindi: 'अंकुरित दाल', category: 'Dals', calories: 65, protein: 5.5, carbs: 8, fat: 0.5, fiber: 3.0, iron: 1.5, calcium: 25, vitC: 12, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in02h', name: 'Moong Sprouts Salad', hindi: 'मूंग स्प्राउट्स सलाद', category: 'Dals', calories: 75, protein: 6.0, carbs: 10, fat: 0.8, fiber: 3.5, iron: 1.8, calcium: 30, vitC: 15, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in02i', name: 'Sundal (chickpea)', hindi: 'सुंदल', category: 'Dals', calories: 145, protein: 7.5, carbs: 20, fat: 3.5, fiber: 5.5, iron: 2.5, calcium: 45, vitC: 3, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in02j', name: 'Usal (sprouted moth curry)', hindi: 'उसल', category: 'Dals', calories: 135, protein: 8.0, carbs: 18, fat: 3.5, fiber: 5.0, iron: 3.0, calcium: 48, vitC: 4, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in02k', name: 'Sattu Drink', hindi: 'सत्तू', category: 'Dals', calories: 65, protein: 4.5, carbs: 10, fat: 1.0, fiber: 2.0, iron: 1.5, calcium: 20, vitC: 0, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in02l', name: 'Dal Fry', hindi: 'दाल फ्राई', category: 'Dals', calories: 135, protein: 8.0, carbs: 18, fat: 4.0, fiber: 4.5, iron: 2.5, calcium: 50, vitC: 2, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in02m', name: 'Toor Dal (plain)', hindi: 'तूर दाल', category: 'Dals', calories: 115, protein: 8.5, carbs: 17, fat: 1.5, fiber: 4.0, iron: 2.5, calcium: 50, vitC: 1, defaultServing: 150, servingUnit: 'bowl' },

  // ==========================================
  // === VEGETABLES (80 items) ===
  // ==========================================
  { id: 'in030', name: 'Aloo Gobi', hindi: 'आलू गोभी', category: 'Vegetables', calories: 118, protein: 3.2, carbs: 14, fat: 5.5, fiber: 3.0, iron: 1.2, calcium: 35, vitC: 25, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in031', name: 'Palak Paneer', hindi: 'पालक पनीर', category: 'Vegetables', calories: 175, protein: 10.5, carbs: 8, fat: 12.0, fiber: 3.5, iron: 4.5, calcium: 320, vitC: 18, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in032', name: 'Paneer Butter Masala', hindi: 'पनीर बटर मसाला', category: 'Vegetables', calories: 220, protein: 11.0, carbs: 10, fat: 16.0, fiber: 1.5, iron: 1.8, calcium: 280, vitC: 8, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in033', name: 'Bhindi (Okra fry)', hindi: 'भिंडी', category: 'Vegetables', calories: 95, protein: 2.5, carbs: 8, fat: 6.0, fiber: 3.5, iron: 1.0, calcium: 82, vitC: 15, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in034', name: 'Baingan Bharta', hindi: 'बैंगन भर्ता', category: 'Vegetables', calories: 105, protein: 2.8, carbs: 10, fat: 6.5, fiber: 4.0, iron: 0.8, calcium: 18, vitC: 5, defaultServing: 150, servingUnit: 'bowl', allergens: ['mustard'] },
  { id: 'in035', name: 'Aloo Matar', hindi: 'आलू मटर', category: 'Vegetables', calories: 125, protein: 4.0, carbs: 16, fat: 5.0, fiber: 3.5, iron: 1.5, calcium: 28, vitC: 15, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in036', name: 'Mixed Vegetable Curry', hindi: 'मिक्स सब्जी', category: 'Vegetables', calories: 110, protein: 3.5, carbs: 12, fat: 5.5, fiber: 3.5, iron: 1.5, calcium: 45, vitC: 20, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in037', name: 'Malai Kofta', hindi: 'मलाई कोफ्ता', category: 'Vegetables', calories: 250, protein: 8.0, carbs: 15, fat: 18.0, fiber: 2.0, iron: 1.5, calcium: 150, vitC: 5, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in038', name: 'Kadhi Pakora', hindi: 'कढ़ी पकोड़ा', category: 'Vegetables', calories: 145, protein: 5.5, carbs: 12, fat: 8.5, fiber: 1.5, iron: 1.2, calcium: 95, vitC: 3, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in039', name: 'Lauki (Bottle Gourd)', hindi: 'लौकी', category: 'Vegetables', calories: 65, protein: 1.8, carbs: 8, fat: 3.0, fiber: 2.0, iron: 0.5, calcium: 20, vitC: 8, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in040', name: 'Tinda Masala', hindi: 'टिंडा', category: 'Vegetables', calories: 72, protein: 2.0, carbs: 9, fat: 3.2, fiber: 2.5, iron: 0.8, calcium: 25, vitC: 10, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in041', name: 'Methi Aloo', hindi: 'मेथी आलू', category: 'Vegetables', calories: 130, protein: 3.5, carbs: 15, fat: 6.5, fiber: 3.5, iron: 2.5, calcium: 50, vitC: 10, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in042', name: 'Shahi Paneer', hindi: 'शाही पनीर', category: 'Vegetables', calories: 235, protein: 11.5, carbs: 9, fat: 18.0, fiber: 1.5, iron: 1.8, calcium: 290, vitC: 5, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in043', name: 'Paneer Tikka Masala', hindi: 'पनीर टिक्का मसाला', category: 'Vegetables', calories: 210, protein: 12.0, carbs: 10, fat: 14.5, fiber: 2.0, iron: 2.0, calcium: 275, vitC: 8, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in044', name: 'Matar Paneer', hindi: 'मटर पनीर', category: 'Vegetables', calories: 185, protein: 10.0, carbs: 12, fat: 12.0, fiber: 3.0, iron: 2.0, calcium: 250, vitC: 10, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in045', name: 'Dum Aloo', hindi: 'दम आलू', category: 'Vegetables', calories: 155, protein: 3.5, carbs: 18, fat: 8.0, fiber: 2.5, iron: 1.2, calcium: 25, vitC: 8, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in046', name: 'Aloo Jeera', hindi: 'आलू जीरा', category: 'Vegetables', calories: 135, protein: 2.5, carbs: 18, fat: 6.0, fiber: 2.0, iron: 0.8, calcium: 15, vitC: 10, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in047', name: 'Aloo Palak', hindi: 'आलू पालक', category: 'Vegetables', calories: 120, protein: 3.5, carbs: 14, fat: 5.5, fiber: 3.5, iron: 3.5, calcium: 70, vitC: 15, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in048', name: 'Gobhi Manchurian', hindi: 'गोभी मंचूरियन', category: 'Vegetables', calories: 195, protein: 4.0, carbs: 22, fat: 10.0, fiber: 2.5, iron: 1.0, calcium: 30, vitC: 18, defaultServing: 150, servingUnit: 'bowl', allergens: ['gluten', 'soy'] },
  { id: 'in049', name: 'Paneer Do Pyaza', hindi: 'पनीर दो प्याज़ा', category: 'Vegetables', calories: 200, protein: 11.0, carbs: 10, fat: 14.0, fiber: 2.0, iron: 1.5, calcium: 260, vitC: 6, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in04a', name: 'Tori Ki Sabzi (Ridge Gourd)', hindi: 'तोरी', category: 'Vegetables', calories: 55, protein: 1.5, carbs: 6, fat: 3.0, fiber: 2.5, iron: 0.5, calcium: 18, vitC: 8, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04b', name: 'Parwal Ki Sabzi', hindi: 'परवल', category: 'Vegetables', calories: 60, protein: 1.8, carbs: 7, fat: 3.0, fiber: 2.0, iron: 0.6, calcium: 20, vitC: 6, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04c', name: 'Karela (Bitter Gourd) Fry', hindi: 'करेला', category: 'Vegetables', calories: 80, protein: 2.0, carbs: 6, fat: 5.5, fiber: 3.0, iron: 0.8, calcium: 15, vitC: 30, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in04d', name: 'Kaddu Ki Sabzi (Pumpkin)', hindi: 'कद्दू', category: 'Vegetables', calories: 65, protein: 1.5, carbs: 10, fat: 2.5, fiber: 2.0, iron: 0.5, calcium: 20, vitC: 8, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04e', name: 'Sem Ki Phali (French Beans)', hindi: 'सेम', category: 'Vegetables', calories: 75, protein: 2.5, carbs: 9, fat: 3.5, fiber: 3.0, iron: 1.0, calcium: 30, vitC: 12, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04f', name: 'Gajar Matar (Carrot Peas)', hindi: 'गाजर मटर', category: 'Vegetables', calories: 85, protein: 3.0, carbs: 12, fat: 3.0, fiber: 3.5, iron: 1.0, calcium: 30, vitC: 15, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04g', name: 'Arbi Ki Sabzi (Taro)', hindi: 'अरबी', category: 'Vegetables', calories: 130, protein: 2.0, carbs: 20, fat: 5.0, fiber: 2.5, iron: 0.8, calcium: 25, vitC: 5, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04h', name: 'Kathal Ki Sabzi (Jackfruit)', hindi: 'कटहल', category: 'Vegetables', calories: 110, protein: 2.5, carbs: 16, fat: 4.5, fiber: 3.0, iron: 1.2, calcium: 30, vitC: 8, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04i', name: 'Sahjan Ki Phali (Drumstick)', hindi: 'सहजन', category: 'Vegetables', calories: 60, protein: 2.5, carbs: 8, fat: 2.0, fiber: 3.5, iron: 1.5, calcium: 35, vitC: 15, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in04j', name: 'Stuffed Capsicum', hindi: 'भरवां शिमला मिर्च', category: 'Vegetables', calories: 115, protein: 4.0, carbs: 12, fat: 6.0, fiber: 2.5, iron: 1.0, calcium: 25, vitC: 45, defaultServing: 150, servingUnit: 'piece' },
  { id: 'in04k', name: 'Mushroom Masala', hindi: 'मशरूम मसाला', category: 'Vegetables', calories: 95, protein: 4.5, carbs: 6, fat: 6.0, fiber: 2.0, iron: 1.5, calcium: 15, vitC: 3, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04l', name: 'Baby Corn Masala', hindi: 'बेबी कॉर्न', category: 'Vegetables', calories: 85, protein: 3.0, carbs: 10, fat: 4.0, fiber: 2.5, iron: 0.8, calcium: 20, vitC: 5, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04m', name: 'Palak (Spinach raw)', hindi: 'पालक', category: 'Vegetables', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, iron: 2.7, calcium: 99, vitC: 28, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in04n', name: 'Methi Leaves (raw)', hindi: 'मेथी पत्ती', category: 'Vegetables', calories: 34, protein: 3.7, carbs: 2.2, fat: 0.8, fiber: 4.9, iron: 16.5, calcium: 160, vitC: 52, defaultServing: 50, servingUnit: 'bunch' },
  { id: 'in04o', name: 'Sarson Ka Saag', hindi: 'सरसों का साग', category: 'Vegetables', calories: 90, protein: 3.5, carbs: 8, fat: 5.5, fiber: 3.5, iron: 3.0, calcium: 120, vitC: 20, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04p', name: 'Bathua Saag', hindi: 'बथुआ साग', category: 'Vegetables', calories: 45, protein: 3.5, carbs: 4, fat: 1.5, fiber: 3.0, iron: 4.0, calcium: 150, vitC: 35, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04q', name: 'Aloo Baingan', hindi: 'आलू बैंगन', category: 'Vegetables', calories: 115, protein: 2.5, carbs: 14, fat: 5.5, fiber: 3.0, iron: 0.8, calcium: 20, vitC: 5, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04r', name: 'Stuffed Parwal', hindi: 'भरवां परवल', category: 'Vegetables', calories: 95, protein: 3.0, carbs: 10, fat: 5.0, fiber: 2.5, iron: 0.8, calcium: 25, vitC: 8, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04s', name: 'Navratan Korma', hindi: 'नवरत्न कोरमा', category: 'Vegetables', calories: 195, protein: 5.5, carbs: 15, fat: 13.0, fiber: 2.5, iron: 1.5, calcium: 80, vitC: 10, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in04t', name: 'Veg Kolhapuri', hindi: 'वेज कोल्हापुरी', category: 'Vegetables', calories: 130, protein: 4.0, carbs: 12, fat: 7.5, fiber: 3.0, iron: 1.5, calcium: 40, vitC: 12, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04u', name: 'Cabbage Stir Fry', hindi: 'पत्ता गोभी', category: 'Vegetables', calories: 55, protein: 2.0, carbs: 6, fat: 2.5, fiber: 2.5, iron: 0.5, calcium: 40, vitC: 36, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04v', name: 'Cauliflower Stir Fry', hindi: 'फूलगोभी', category: 'Vegetables', calories: 70, protein: 2.5, carbs: 6, fat: 4.0, fiber: 2.5, iron: 0.8, calcium: 25, vitC: 35, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04w', name: 'Onion (raw)', hindi: 'प्याज', category: 'Vegetables', calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, iron: 0.2, calcium: 23, vitC: 7.4, defaultServing: 50, servingUnit: 'piece' },
  { id: 'in04x', name: 'Tomato (raw)', hindi: 'टमाटर', category: 'Vegetables', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, iron: 0.3, calcium: 10, vitC: 14, defaultServing: 80, servingUnit: 'piece' },
  { id: 'in04y', name: 'Potato (boiled)', hindi: 'आलू (उबला)', category: 'Vegetables', calories: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 1.8, iron: 0.3, calcium: 5, vitC: 13, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in04z', name: 'Sweet Potato (boiled)', hindi: 'शकरकंद', category: 'Vegetables', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3.0, iron: 0.6, calcium: 30, vitC: 2.4, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in04A', name: 'Palak Corn', hindi: 'पालक कॉर्न', category: 'Vegetables', calories: 105, protein: 4.0, carbs: 12, fat: 5.0, fiber: 3.0, iron: 2.5, calcium: 70, vitC: 15, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in04B', name: 'Undhiyu', hindi: 'ऊंधियू', category: 'Vegetables', calories: 145, protein: 4.5, carbs: 16, fat: 7.5, fiber: 4.0, iron: 2.0, calcium: 50, vitC: 10, defaultServing: 200, servingUnit: 'bowl', allergens: ['nuts', 'peanuts', 'mustard'] },

  // ==========================================
  // === NON-VEG (70 items) ===
  // ==========================================
  { id: 'in050', name: 'Butter Chicken', hindi: 'बटर चिकन', category: 'Non-Veg', calories: 195, protein: 15.0, carbs: 8, fat: 12.0, fiber: 1.0, iron: 1.8, calcium: 45, vitC: 5, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in051', name: 'Chicken Curry', hindi: 'चिकन करी', category: 'Non-Veg', calories: 165, protein: 18.0, carbs: 5, fat: 8.5, fiber: 1.0, iron: 2.0, calcium: 30, vitC: 4, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in052', name: 'Tandoori Chicken', hindi: 'तंदूरी चिकन', category: 'Non-Veg', calories: 148, protein: 22.0, carbs: 3, fat: 5.5, fiber: 0.5, iron: 2.2, calcium: 25, vitC: 3, defaultServing: 150, servingUnit: 'piece', allergens: ['dairy'] },
  { id: 'in053', name: 'Chicken Tikka', hindi: 'चिकन टिक्का', category: 'Non-Veg', calories: 155, protein: 24.0, carbs: 4, fat: 5.0, fiber: 0.5, iron: 2.0, calcium: 22, vitC: 3, defaultServing: 120, servingUnit: 'serving', allergens: ['dairy'] },
  { id: 'in054', name: 'Fish Curry', hindi: 'मछली करी', category: 'Non-Veg', calories: 140, protein: 16.0, carbs: 5, fat: 6.5, fiber: 0.8, iron: 1.5, calcium: 35, vitC: 4, defaultServing: 150, servingUnit: 'bowl', allergens: ['fish'] },
  { id: 'in055', name: 'Mutton Curry', hindi: 'मटन करी', category: 'Non-Veg', calories: 195, protein: 16.5, carbs: 5, fat: 12.5, fiber: 0.8, iron: 3.5, calcium: 28, vitC: 3, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in056', name: 'Egg Curry', hindi: 'अंडा करी', category: 'Non-Veg', calories: 155, protein: 10.0, carbs: 6, fat: 10.5, fiber: 1.0, iron: 2.0, calcium: 55, vitC: 4, defaultServing: 150, servingUnit: 'bowl', allergens: ['eggs'] },
  { id: 'in057', name: 'Keema', hindi: 'कीमा', category: 'Non-Veg', calories: 200, protein: 18.0, carbs: 6, fat: 12.0, fiber: 1.5, iron: 3.8, calcium: 30, vitC: 5, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in058', name: 'Prawn Masala', hindi: 'झींगा मसाला', category: 'Non-Veg', calories: 145, protein: 18.0, carbs: 5, fat: 6.0, fiber: 1.0, iron: 2.5, calcium: 75, vitC: 5, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in059', name: 'Chicken Korma', hindi: 'चिकन कोरमा', category: 'Non-Veg', calories: 210, protein: 16.0, carbs: 8, fat: 13.5, fiber: 1.0, iron: 2.0, calcium: 40, vitC: 3, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in05a', name: 'Chicken Do Pyaza', hindi: 'चिकन दो प्याज़ा', category: 'Non-Veg', calories: 175, protein: 17.0, carbs: 6, fat: 9.5, fiber: 1.0, iron: 2.0, calcium: 30, vitC: 5, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05b', name: 'Kadai Chicken', hindi: 'कड़ाही चिकन', category: 'Non-Veg', calories: 180, protein: 18.0, carbs: 6, fat: 10.0, fiber: 1.5, iron: 2.2, calcium: 30, vitC: 8, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05c', name: 'Chicken Chettinad', hindi: 'चेट्टिनाड चिकन', category: 'Non-Veg', calories: 185, protein: 19.0, carbs: 5, fat: 10.5, fiber: 1.5, iron: 2.5, calcium: 28, vitC: 4, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05d', name: 'Chicken Saagwala', hindi: 'चिकन साग', category: 'Non-Veg', calories: 165, protein: 17.0, carbs: 6, fat: 8.5, fiber: 2.5, iron: 3.5, calcium: 80, vitC: 12, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05e', name: 'Rogan Josh (mutton)', hindi: 'रोगन जोश', category: 'Non-Veg', calories: 205, protein: 17.0, carbs: 5, fat: 13.5, fiber: 1.0, iron: 3.8, calcium: 25, vitC: 4, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in05f', name: 'Mutton Biryani', hindi: 'मटन बिरयानी', category: 'Non-Veg', calories: 225, protein: 12.0, carbs: 26, fat: 9.0, fiber: 0.8, iron: 2.5, calcium: 28, vitC: 2, defaultServing: 250, servingUnit: 'plate', allergens: ['dairy', 'nuts'] },
  { id: 'in05g', name: 'Seekh Kebab', hindi: 'सीख कबाब', category: 'Non-Veg', calories: 210, protein: 20.0, carbs: 5, fat: 12.5, fiber: 0.5, iron: 3.0, calcium: 20, vitC: 3, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in05h', name: 'Shammi Kebab', hindi: 'शामी कबाब', category: 'Non-Veg', calories: 225, protein: 15.0, carbs: 10, fat: 14.0, fiber: 1.5, iron: 3.0, calcium: 30, vitC: 2, defaultServing: 60, servingUnit: 'piece', allergens: ['eggs'] },
  { id: 'in05i', name: 'Galouti Kebab', hindi: 'गलौटी कबाब', category: 'Non-Veg', calories: 245, protein: 16.0, carbs: 6, fat: 18.0, fiber: 0.5, iron: 3.5, calcium: 25, vitC: 2, defaultServing: 50, servingUnit: 'piece' },
  { id: 'in05j', name: 'Chicken Malai Tikka', hindi: 'चिकन मलाई टिक्का', category: 'Non-Veg', calories: 180, protein: 22.0, carbs: 4, fat: 9.0, fiber: 0.3, iron: 1.8, calcium: 40, vitC: 2, defaultServing: 120, servingUnit: 'serving' },
  { id: 'in05k', name: 'Mutton Rara', hindi: 'मटन रारा', category: 'Non-Veg', calories: 215, protein: 17.5, carbs: 5, fat: 14.5, fiber: 0.8, iron: 4.0, calcium: 25, vitC: 3, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05l', name: 'Chicken Nihari', hindi: 'चिकन निहारी', category: 'Non-Veg', calories: 190, protein: 16.0, carbs: 8, fat: 11.0, fiber: 1.0, iron: 2.5, calcium: 25, vitC: 3, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in05m', name: 'Fish Fry', hindi: 'मछली फ्राई', category: 'Non-Veg', calories: 210, protein: 18.0, carbs: 8, fat: 12.5, fiber: 0.5, iron: 1.5, calcium: 30, vitC: 2, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in05n', name: 'Fish Tikka', hindi: 'फिश टिक्का', category: 'Non-Veg', calories: 145, protein: 20.0, carbs: 4, fat: 5.5, fiber: 0.3, iron: 1.2, calcium: 25, vitC: 3, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in05o', name: 'Pomfret Fry', hindi: 'पोम्फ्रेट फ्राई', category: 'Non-Veg', calories: 195, protein: 20.0, carbs: 6, fat: 10.5, fiber: 0.3, iron: 1.5, calcium: 30, vitC: 2, defaultServing: 120, servingUnit: 'piece' },
  { id: 'in05p', name: 'Goan Fish Curry', hindi: 'गोवा फिश करी', category: 'Non-Veg', calories: 155, protein: 16.0, carbs: 6, fat: 8.0, fiber: 1.0, iron: 1.5, calcium: 35, vitC: 5, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05q', name: 'Kerala Fish Molee', hindi: 'केरला फिश मोली', category: 'Non-Veg', calories: 165, protein: 15.0, carbs: 5, fat: 10.0, fiber: 1.0, iron: 1.2, calcium: 30, vitC: 3, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05r', name: 'Prawn Curry', hindi: 'झींगा करी', category: 'Non-Veg', calories: 140, protein: 17.0, carbs: 5, fat: 6.0, fiber: 0.8, iron: 2.0, calcium: 70, vitC: 4, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05s', name: 'Crab Masala', hindi: 'केकड़ा मसाला', category: 'Non-Veg', calories: 130, protein: 15.0, carbs: 5, fat: 6.0, fiber: 0.8, iron: 2.5, calcium: 85, vitC: 4, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05t', name: 'Chicken Lollipop', hindi: 'चिकन लॉलीपॉप', category: 'Non-Veg', calories: 250, protein: 15.0, carbs: 12, fat: 16.0, fiber: 0.5, iron: 1.5, calcium: 20, vitC: 3, defaultServing: 80, servingUnit: 'piece' },
  { id: 'in05u', name: 'Chicken 65', hindi: 'चिकन 65', category: 'Non-Veg', calories: 240, protein: 18.0, carbs: 10, fat: 15.0, fiber: 0.5, iron: 2.0, calcium: 22, vitC: 4, defaultServing: 100, servingUnit: 'serving' },
  { id: 'in05v', name: 'Chicken Wings (tandoori)', hindi: 'तंदूरी विंग्स', category: 'Non-Veg', calories: 190, protein: 20.0, carbs: 3, fat: 11.0, fiber: 0.3, iron: 1.8, calcium: 18, vitC: 2, defaultServing: 100, servingUnit: 'serving' },
  { id: 'in05w', name: 'Mutton Paya', hindi: 'मटन पाया', category: 'Non-Veg', calories: 85, protein: 10.0, carbs: 2, fat: 4.5, fiber: 0, iron: 2.0, calcium: 40, vitC: 0, defaultServing: 250, servingUnit: 'bowl' },
  { id: 'in05x', name: 'Keema Matar', hindi: 'कीमा मटर', category: 'Non-Veg', calories: 185, protein: 16.0, carbs: 8, fat: 10.5, fiber: 2.5, iron: 3.5, calcium: 30, vitC: 8, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in05y', name: 'Brain Fry (Bheja Fry)', hindi: 'भेजा फ्राई', category: 'Non-Veg', calories: 180, protein: 10.0, carbs: 2, fat: 15.0, fiber: 0, iron: 2.5, calcium: 10, vitC: 10, defaultServing: 80, servingUnit: 'serving' },
  { id: 'in05z', name: 'Liver Fry (Kaleji)', hindi: 'कलेजी', category: 'Non-Veg', calories: 165, protein: 22.0, carbs: 4, fat: 7.0, fiber: 0, iron: 8.0, calcium: 10, vitC: 25, defaultServing: 80, servingUnit: 'serving' },
  { id: 'in206', name: 'Boiled Egg', hindi: 'उबला अंडा', category: 'Non-Veg', calories: 155, protein: 13.0, carbs: 1.1, fat: 11.0, fiber: 0, iron: 1.2, calcium: 50, vitC: 0, defaultServing: 50, servingUnit: 'piece' },
  { id: 'in207', name: 'Omelette', hindi: 'ऑमलेट', category: 'Non-Veg', calories: 175, protein: 12.0, carbs: 1.5, fat: 13.5, fiber: 0, iron: 1.5, calcium: 55, vitC: 2, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in05A', name: 'Egg Bhurji', hindi: 'एग भुर्जी', category: 'Non-Veg', calories: 165, protein: 11.0, carbs: 3, fat: 12.5, fiber: 0.5, iron: 1.8, calcium: 50, vitC: 5, defaultServing: 100, servingUnit: 'serving' },
  { id: 'in05B', name: 'Anda Paratha', hindi: 'अंडा पराठा', category: 'Non-Veg', calories: 280, protein: 10.0, carbs: 35, fat: 12.0, fiber: 2.5, iron: 2.5, calcium: 45, vitC: 2, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in05C', name: 'Chicken Fried Rice', hindi: 'चिकन फ्राइड राइस', category: 'Non-Veg', calories: 175, protein: 10.0, carbs: 25, fat: 5.0, fiber: 1.0, iron: 1.2, calcium: 20, vitC: 3, defaultServing: 250, servingUnit: 'plate' },
  { id: 'in05D', name: 'Chicken Momos', hindi: 'चिकन मोमो', category: 'Non-Veg', calories: 195, protein: 12.0, carbs: 22, fat: 7.0, fiber: 1.0, iron: 1.5, calcium: 20, vitC: 2, defaultServing: 80, servingUnit: 'serving' },
  { id: 'in05E', name: 'Egg Fried Rice', hindi: 'एग फ्राइड राइस', category: 'Non-Veg', calories: 165, protein: 7.0, carbs: 26, fat: 4.5, fiber: 1.0, iron: 1.0, calcium: 25, vitC: 2, defaultServing: 250, servingUnit: 'plate' },

  // ==========================================
  // === SNACKS & STREET FOOD (60 items) ===
  // ==========================================
  { id: 'in060', name: 'Samosa', hindi: 'समोसा', category: 'Snacks', calories: 262, protein: 5.5, carbs: 30, fat: 13.5, fiber: 2.5, iron: 1.8, calcium: 22, vitC: 5, defaultServing: 80, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in061', name: 'Pakora', hindi: 'पकोड़ा', category: 'Snacks', calories: 280, protein: 6.5, carbs: 25, fat: 17.0, fiber: 2.0, iron: 1.5, calcium: 35, vitC: 8, defaultServing: 50, servingUnit: 'serving' },
  { id: 'in062', name: 'Vada Pav', hindi: 'वड़ा पाव', category: 'Snacks', calories: 290, protein: 5.8, carbs: 38, fat: 13.0, fiber: 2.5, iron: 2.0, calcium: 25, vitC: 5, defaultServing: 120, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in063', name: 'Pav Bhaji', hindi: 'पाव भाजी', category: 'Snacks', calories: 220, protein: 6.5, carbs: 28, fat: 9.5, fiber: 3.5, iron: 2.2, calcium: 40, vitC: 18, defaultServing: 250, servingUnit: 'plate', allergens: ['gluten', 'dairy'] },
  { id: 'in064', name: 'Pani Puri', hindi: 'पानी पूरी', category: 'Snacks', calories: 35, protein: 0.8, carbs: 6, fat: 1.0, fiber: 0.5, iron: 0.3, calcium: 5, vitC: 2, defaultServing: 20, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in065', name: 'Bhel Puri', hindi: 'भेल पूरी', category: 'Snacks', calories: 180, protein: 4.0, carbs: 28, fat: 6.0, fiber: 2.5, iron: 1.5, calcium: 20, vitC: 5, defaultServing: 150, servingUnit: 'plate', allergens: ['gluten', 'peanuts'] },
  { id: 'in066', name: 'Aloo Tikki', hindi: 'आलू टिक्की', category: 'Snacks', calories: 235, protein: 4.5, carbs: 28, fat: 12.0, fiber: 2.5, iron: 1.5, calcium: 20, vitC: 10, defaultServing: 80, servingUnit: 'piece' },
  { id: 'in067', name: 'Medu Vada', hindi: 'मेदु वड़ा', category: 'Snacks', calories: 245, protein: 8.0, carbs: 22, fat: 14.0, fiber: 3.5, iron: 2.0, calcium: 40, vitC: 2, defaultServing: 60, servingUnit: 'piece' },
  { id: 'in068', name: 'Kachori', hindi: 'कचौरी', category: 'Snacks', calories: 320, protein: 6.0, carbs: 32, fat: 18.5, fiber: 2.5, iron: 2.0, calcium: 30, vitC: 2, defaultServing: 60, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in069', name: 'Sev Puri', hindi: 'सेव पूरी', category: 'Snacks', calories: 200, protein: 4.0, carbs: 26, fat: 9.0, fiber: 2.0, iron: 1.5, calcium: 18, vitC: 5, defaultServing: 120, servingUnit: 'plate', allergens: ['gluten'] },
  { id: 'in06a', name: 'Dahi Puri', hindi: 'दही पूरी', category: 'Snacks', calories: 160, protein: 4.0, carbs: 22, fat: 6.0, fiber: 1.5, iron: 1.0, calcium: 60, vitC: 3, defaultServing: 120, servingUnit: 'plate', allergens: ['gluten', 'dairy'] },
  { id: 'in06b', name: 'Ragda Pattice', hindi: 'रगड़ा पेटीस', category: 'Snacks', calories: 210, protein: 6.0, carbs: 30, fat: 7.5, fiber: 3.5, iron: 2.0, calcium: 30, vitC: 8, defaultServing: 200, servingUnit: 'plate' },
  { id: 'in06c', name: 'Dabeli', hindi: 'दाबेली', category: 'Snacks', calories: 265, protein: 5.0, carbs: 38, fat: 10.0, fiber: 2.5, iron: 1.8, calcium: 20, vitC: 5, defaultServing: 100, servingUnit: 'piece', allergens: ['gluten', 'peanuts'] },
  { id: 'in06d', name: 'Kathi Roll (chicken)', hindi: 'काठी रोल', category: 'Snacks', calories: 280, protein: 14.0, carbs: 28, fat: 12.0, fiber: 2.0, iron: 2.5, calcium: 35, vitC: 5, defaultServing: 150, servingUnit: 'piece', allergens: ['gluten', 'eggs'] },
  { id: 'in06e', name: 'Egg Roll', hindi: 'एग रोल', category: 'Snacks', calories: 260, protein: 10.0, carbs: 30, fat: 11.0, fiber: 2.0, iron: 2.0, calcium: 40, vitC: 3, defaultServing: 150, servingUnit: 'piece', allergens: ['gluten', 'eggs'] },
  { id: 'in06f', name: 'Paneer Roll', hindi: 'पनीर रोल', category: 'Snacks', calories: 275, protein: 12.0, carbs: 28, fat: 13.0, fiber: 2.0, iron: 2.0, calcium: 150, vitC: 4, defaultServing: 150, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in06g', name: 'Veg Momos', hindi: 'वेज मोमो', category: 'Snacks', calories: 160, protein: 5.0, carbs: 25, fat: 4.5, fiber: 2.0, iron: 1.2, calcium: 20, vitC: 5, defaultServing: 80, servingUnit: 'serving', allergens: ['gluten'] },
  { id: 'in06h', name: 'Chole Bhature', hindi: 'छोले भटूरे', category: 'Snacks', calories: 310, protein: 9.0, carbs: 38, fat: 14.0, fiber: 4.0, iron: 3.0, calcium: 45, vitC: 3, defaultServing: 250, servingUnit: 'plate', allergens: ['gluten'] },
  { id: 'in06i', name: 'Chaat (mixed)', hindi: 'चाट', category: 'Snacks', calories: 175, protein: 4.0, carbs: 25, fat: 7.0, fiber: 2.5, iron: 1.5, calcium: 30, vitC: 8, defaultServing: 150, servingUnit: 'plate', allergens: ['gluten'] },
  { id: 'in06j', name: 'Bread Pakora', hindi: 'ब्रेड पकोड़ा', category: 'Snacks', calories: 310, protein: 6.5, carbs: 32, fat: 17.0, fiber: 1.5, iron: 1.5, calcium: 25, vitC: 3, defaultServing: 80, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in06k', name: 'Paneer Pakora', hindi: 'पनीर पकोड़ा', category: 'Snacks', calories: 295, protein: 12.0, carbs: 18, fat: 20.0, fiber: 1.5, iron: 1.5, calcium: 200, vitC: 2, defaultServing: 80, servingUnit: 'serving', allergens: ['dairy'] },
  { id: 'in06l', name: 'Corn Chaat', hindi: 'कॉर्न चाट', category: 'Snacks', calories: 130, protein: 3.5, carbs: 20, fat: 4.5, fiber: 2.5, iron: 0.8, calcium: 15, vitC: 8, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in06m', name: 'Roasted Chana', hindi: 'भुने चने', category: 'Snacks', calories: 369, protein: 22.0, carbs: 58, fat: 5.0, fiber: 12.0, iron: 4.5, calcium: 58, vitC: 0, defaultServing: 30, servingUnit: 'serving' },
  { id: 'in06n', name: 'Makhana (roasted)', hindi: 'मखाना', category: 'Snacks', calories: 350, protein: 9.7, carbs: 77, fat: 0.1, fiber: 2.0, iron: 1.4, calcium: 60, vitC: 0, defaultServing: 20, servingUnit: 'bowl' },
  { id: 'in06o', name: 'Murukku', hindi: 'मुरुक्कू', category: 'Snacks', calories: 420, protein: 8.0, carbs: 55, fat: 20.0, fiber: 2.5, iron: 2.5, calcium: 30, vitC: 0, defaultServing: 30, servingUnit: 'piece' },
  { id: 'in06p', name: 'Banana Chips', hindi: 'केला चिप्स', category: 'Snacks', calories: 520, protein: 2.0, carbs: 58, fat: 32.0, fiber: 4.0, iron: 0.8, calcium: 10, vitC: 5, defaultServing: 30, servingUnit: 'serving' },
  { id: 'in06q', name: 'Namkeen (mixed)', hindi: 'नमकीन', category: 'Snacks', calories: 450, protein: 10.0, carbs: 50, fat: 24.0, fiber: 3.5, iron: 3.0, calcium: 35, vitC: 0, defaultServing: 30, servingUnit: 'serving' },
  { id: 'in06r', name: 'Mathri', hindi: 'मठरी', category: 'Snacks', calories: 440, protein: 7.0, carbs: 48, fat: 25.0, fiber: 2.5, iron: 2.5, calcium: 30, vitC: 0, defaultServing: 30, servingUnit: 'piece' },
  { id: 'in06s', name: 'Chakli', hindi: 'चकली', category: 'Snacks', calories: 410, protein: 8.0, carbs: 52, fat: 20.0, fiber: 3.0, iron: 2.5, calcium: 28, vitC: 0, defaultServing: 30, servingUnit: 'piece' },
  { id: 'in06t', name: 'Khakhra', hindi: 'खाखरा', category: 'Snacks', calories: 380, protein: 10.0, carbs: 60, fat: 12.0, fiber: 5.0, iron: 4.0, calcium: 40, vitC: 0, defaultServing: 25, servingUnit: 'piece' },
  { id: 'in133', name: 'Dhokla', hindi: 'ढोकला', category: 'Snacks', calories: 155, protein: 6.5, carbs: 22, fat: 4.5, fiber: 1.5, iron: 1.5, calcium: 25, vitC: 2, defaultServing: 80, servingUnit: 'piece' },
  { id: 'in06u', name: 'Khandvi', hindi: 'खांडवी', category: 'Snacks', calories: 135, protein: 6.0, carbs: 18, fat: 4.5, fiber: 1.0, iron: 1.2, calcium: 20, vitC: 1, defaultServing: 80, servingUnit: 'serving' },
  { id: 'in06v', name: 'Fafda', hindi: 'फाफड़ा', category: 'Snacks', calories: 450, protein: 10.0, carbs: 48, fat: 25.0, fiber: 3.0, iron: 3.0, calcium: 35, vitC: 0, defaultServing: 40, servingUnit: 'serving' },
  { id: 'in06w', name: 'Gathiya', hindi: 'गांठिया', category: 'Snacks', calories: 440, protein: 12.0, carbs: 45, fat: 25.0, fiber: 3.5, iron: 3.5, calcium: 40, vitC: 0, defaultServing: 40, servingUnit: 'serving' },

  // ==========================================
  // === DAIRY (25 items) ===
  // ==========================================
  { id: 'in070', name: 'Paneer (cottage cheese)', hindi: 'पनीर', category: 'Dairy', calories: 265, protein: 18.3, carbs: 3.6, fat: 20.8, fiber: 0, iron: 0.2, calcium: 480, vitC: 0, defaultServing: 50, servingUnit: 'piece' },
  { id: 'in071', name: 'Curd (Dahi)', hindi: 'दही', category: 'Dairy', calories: 60, protein: 3.1, carbs: 4.7, fat: 3.3, fiber: 0, iron: 0.1, calcium: 149, vitC: 1, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in072', name: 'Lassi (sweet)', hindi: 'लस्सी', category: 'Dairy', calories: 95, protein: 3.5, carbs: 15, fat: 2.5, fiber: 0, iron: 0.1, calcium: 120, vitC: 2, defaultServing: 200, servingUnit: 'glass' },
  { id: 'in073', name: 'Chaas (Buttermilk)', hindi: 'छाछ', category: 'Dairy', calories: 35, protein: 2.5, carbs: 3.5, fat: 1.0, fiber: 0, iron: 0.1, calcium: 80, vitC: 1, defaultServing: 200, servingUnit: 'glass' },
  { id: 'in074', name: 'Raita', hindi: 'रायता', category: 'Dairy', calories: 55, protein: 2.8, carbs: 5, fat: 2.5, fiber: 0.5, iron: 0.2, calcium: 100, vitC: 3, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in075', name: 'Ghee', hindi: 'घी', category: 'Dairy', calories: 900, protein: 0, carbs: 0, fat: 99.5, fiber: 0, iron: 0, calcium: 0, vitC: 0, defaultServing: 5, servingUnit: 'tsp' },
  { id: 'in076', name: 'Milk (whole)', hindi: 'दूध', category: 'Dairy', calories: 67, protein: 3.2, carbs: 4.7, fat: 3.9, fiber: 0, iron: 0.1, calcium: 120, vitC: 1, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in077', name: 'Milk (toned)', hindi: 'टोन्ड दूध', category: 'Dairy', calories: 50, protein: 3.2, carbs: 4.7, fat: 2.0, fiber: 0, iron: 0.1, calcium: 120, vitC: 1, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in078', name: 'Paneer Bhurji', hindi: 'पनीर भुर्जी', category: 'Dairy', calories: 230, protein: 15.0, carbs: 5, fat: 17.0, fiber: 1.0, iron: 0.5, calcium: 350, vitC: 5, defaultServing: 100, servingUnit: 'serving' },
  { id: 'in079', name: 'Shrikhand', hindi: 'श्रीखंड', category: 'Dairy', calories: 185, protein: 6.0, carbs: 28, fat: 6.0, fiber: 0, iron: 0.2, calcium: 130, vitC: 1, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in07a', name: 'Misti Doi', hindi: 'मिष्टी दोई', category: 'Dairy', calories: 120, protein: 4.0, carbs: 18, fat: 3.5, fiber: 0, iron: 0.1, calcium: 130, vitC: 1, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in07b', name: 'Lassi (salted)', hindi: 'नमकीन लस्सी', category: 'Dairy', calories: 50, protein: 3.0, carbs: 5, fat: 2.0, fiber: 0, iron: 0.1, calcium: 100, vitC: 1, defaultServing: 200, servingUnit: 'glass' },
  { id: 'in07c', name: 'Cream (fresh)', hindi: 'मलाई', category: 'Dairy', calories: 340, protein: 2.0, carbs: 3, fat: 36.0, fiber: 0, iron: 0, calcium: 65, vitC: 0, defaultServing: 15, servingUnit: 'tbsp' },
  { id: 'in07d', name: 'Khoya (Mawa)', hindi: 'खोया / मावा', category: 'Dairy', calories: 420, protein: 14.0, carbs: 20, fat: 32.0, fiber: 0, iron: 0.5, calcium: 300, vitC: 0, defaultServing: 30, servingUnit: 'piece' },
  { id: 'in07e', name: 'Butter (unsalted)', hindi: 'मक्खन', category: 'Dairy', calories: 717, protein: 0.9, carbs: 0.1, fat: 81.0, fiber: 0, iron: 0, calcium: 24, vitC: 0, defaultServing: 10, servingUnit: 'tbsp' },

  // ==========================================
  // === SWEETS & DESSERTS (40 items) ===
  // ==========================================
  { id: 'in080', name: 'Gulab Jamun', hindi: 'गुलाब जामुन', category: 'Sweets', calories: 380, protein: 5.5, carbs: 50, fat: 18.0, fiber: 0.5, iron: 0.8, calcium: 60, vitC: 0, defaultServing: 40, servingUnit: 'piece', allergens: ['dairy', 'gluten'] },
  { id: 'in081', name: 'Jalebi', hindi: 'जलेबी', category: 'Sweets', calories: 370, protein: 3.5, carbs: 60, fat: 14.0, fiber: 0.5, iron: 1.0, calcium: 15, vitC: 0, defaultServing: 50, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in082', name: 'Kheer (rice pudding)', hindi: 'खीर', category: 'Sweets', calories: 150, protein: 4.5, carbs: 22, fat: 5.0, fiber: 0.3, iron: 0.3, calcium: 120, vitC: 1, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in083', name: 'Rasgulla', hindi: 'रसगुल्ला', category: 'Sweets', calories: 186, protein: 5.8, carbs: 30, fat: 5.0, fiber: 0, iron: 0.2, calcium: 100, vitC: 0, defaultServing: 40, servingUnit: 'piece', allergens: ['dairy'] },
  { id: 'in084', name: 'Barfi', hindi: 'बर्फी', category: 'Sweets', calories: 405, protein: 8.0, carbs: 50, fat: 20.0, fiber: 0.5, iron: 0.5, calcium: 120, vitC: 0, defaultServing: 30, servingUnit: 'piece', allergens: ['dairy', 'nuts'] },
  { id: 'in085', name: 'Halwa (sooji)', hindi: 'हलवा', category: 'Sweets', calories: 350, protein: 5.0, carbs: 45, fat: 16.0, fiber: 1.0, iron: 1.5, calcium: 30, vitC: 0, defaultServing: 100, servingUnit: 'bowl', allergens: ['gluten', 'dairy'] },
  { id: 'in086', name: 'Laddu (besan)', hindi: 'लड्डू', category: 'Sweets', calories: 420, protein: 8.5, carbs: 45, fat: 24.0, fiber: 2.0, iron: 2.0, calcium: 35, vitC: 0, defaultServing: 40, servingUnit: 'piece', allergens: ['dairy'] },
  { id: 'in087', name: 'Payasam', hindi: 'पायसम', category: 'Sweets', calories: 145, protein: 4.0, carbs: 22, fat: 4.5, fiber: 0.5, iron: 0.3, calcium: 100, vitC: 1, defaultServing: 150, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in088', name: 'Kaju Katli', hindi: 'काजू कतली', category: 'Sweets', calories: 490, protein: 12.0, carbs: 52, fat: 28.0, fiber: 1.0, iron: 1.0, calcium: 15, vitC: 0, defaultServing: 25, servingUnit: 'piece', allergens: ['nuts'] },
  { id: 'in089', name: 'Sandesh', hindi: 'संदेश', category: 'Sweets', calories: 280, protein: 8.0, carbs: 38, fat: 11.0, fiber: 0, iron: 0.2, calcium: 130, vitC: 0, defaultServing: 30, servingUnit: 'piece', allergens: ['dairy'] },
  { id: 'in08a', name: 'Peda', hindi: 'पेड़ा', category: 'Sweets', calories: 400, protein: 10.0, carbs: 48, fat: 20.0, fiber: 0, iron: 0.3, calcium: 200, vitC: 0, defaultServing: 25, servingUnit: 'piece', allergens: ['dairy'] },
  { id: 'in08b', name: 'Rasmalai', hindi: 'रसमलाई', category: 'Sweets', calories: 195, protein: 7.0, carbs: 25, fat: 8.0, fiber: 0, iron: 0.2, calcium: 140, vitC: 0, defaultServing: 60, servingUnit: 'piece', allergens: ['dairy', 'nuts'] },
  { id: 'in08c', name: 'Gajar Halwa', hindi: 'गाजर हलवा', category: 'Sweets', calories: 180, protein: 3.5, carbs: 22, fat: 9.0, fiber: 1.5, iron: 0.5, calcium: 80, vitC: 3, defaultServing: 100, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in08d', name: 'Moong Dal Halwa', hindi: 'मूंग दाल हलवा', category: 'Sweets', calories: 340, protein: 7.0, carbs: 40, fat: 18.0, fiber: 2.0, iron: 1.5, calcium: 40, vitC: 0, defaultServing: 80, servingUnit: 'bowl', allergens: ['dairy', 'nuts'] },
  { id: 'in08e', name: 'Malpua', hindi: 'मालपुआ', category: 'Sweets', calories: 320, protein: 5.0, carbs: 42, fat: 15.0, fiber: 1.0, iron: 1.0, calcium: 50, vitC: 0, defaultServing: 60, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in08f', name: 'Rabri', hindi: 'रबड़ी', category: 'Sweets', calories: 210, protein: 6.0, carbs: 22, fat: 12.0, fiber: 0, iron: 0.2, calcium: 180, vitC: 1, defaultServing: 100, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in08g', name: 'Imarti', hindi: 'इमारती', category: 'Sweets', calories: 360, protein: 5.0, carbs: 55, fat: 14.0, fiber: 1.0, iron: 1.0, calcium: 30, vitC: 0, defaultServing: 50, servingUnit: 'piece' },
  { id: 'in08h', name: 'Kulfi', hindi: 'कुल्फी', category: 'Sweets', calories: 190, protein: 5.0, carbs: 22, fat: 10.0, fiber: 0, iron: 0.2, calcium: 120, vitC: 0, defaultServing: 80, servingUnit: 'piece', allergens: ['dairy', 'nuts'] },
  { id: 'in08i', name: 'Phirni', hindi: 'फिरनी', category: 'Sweets', calories: 155, protein: 4.0, carbs: 24, fat: 5.0, fiber: 0.3, iron: 0.3, calcium: 100, vitC: 0, defaultServing: 100, servingUnit: 'bowl', allergens: ['dairy'] },
  { id: 'in08j', name: 'Mysore Pak', hindi: 'मैसूर पाक', category: 'Sweets', calories: 520, protein: 8.0, carbs: 45, fat: 36.0, fiber: 1.5, iron: 1.5, calcium: 35, vitC: 0, defaultServing: 30, servingUnit: 'piece', allergens: ['dairy'] },
  { id: 'in08k', name: 'Modak', hindi: 'मोदक', category: 'Sweets', calories: 280, protein: 4.0, carbs: 38, fat: 12.0, fiber: 2.0, iron: 1.0, calcium: 15, vitC: 0, defaultServing: 40, servingUnit: 'piece', allergens: ['gluten'] },
  { id: 'in08l', name: 'Puran Poli', hindi: 'पूरन पोली', category: 'Sweets', calories: 295, protein: 6.0, carbs: 48, fat: 9.0, fiber: 3.0, iron: 2.0, calcium: 30, vitC: 0, defaultServing: 80, servingUnit: 'piece', allergens: ['gluten', 'dairy'] },
  { id: 'in08m', name: 'Rava Kesari', hindi: 'रवा केसरी', category: 'Sweets', calories: 335, protein: 4.5, carbs: 45, fat: 15.0, fiber: 0.8, iron: 1.2, calcium: 25, vitC: 0, defaultServing: 80, servingUnit: 'bowl', allergens: ['gluten', 'dairy', 'nuts'] },
  { id: 'in08n', name: 'Coconut Laddu', hindi: 'नारियल लड्डू', category: 'Sweets', calories: 385, protein: 4.0, carbs: 42, fat: 22.0, fiber: 4.0, iron: 1.0, calcium: 20, vitC: 1, defaultServing: 30, servingUnit: 'piece' },
  { id: 'in08o', name: 'Chikki (peanut)', hindi: 'चिक्की', category: 'Sweets', calories: 440, protein: 12.0, carbs: 50, fat: 22.0, fiber: 3.0, iron: 2.0, calcium: 30, vitC: 0, defaultServing: 25, servingUnit: 'piece', allergens: ['peanuts'] },
  { id: 'in08p', name: 'Til Laddu (sesame)', hindi: 'तिल लड्डू', category: 'Sweets', calories: 460, protein: 10.0, carbs: 38, fat: 30.0, fiber: 4.5, iron: 5.0, calcium: 350, vitC: 0, defaultServing: 30, servingUnit: 'piece', allergens: ['sesame'] },
  { id: 'in08q', name: 'Basundi', hindi: 'बासुंदी', category: 'Sweets', calories: 195, protein: 6.5, carbs: 24, fat: 8.5, fiber: 0, iron: 0.2, calcium: 170, vitC: 1, defaultServing: 100, servingUnit: 'bowl', allergens: ['dairy'] },

  // ==========================================
  // === BEVERAGES (25 items) ===
  // ==========================================
  { id: 'in090', name: 'Masala Chai', hindi: 'मसाला चाय', category: 'Beverages', calories: 65, protein: 2.0, carbs: 9, fat: 2.5, fiber: 0, iron: 0.2, calcium: 50, vitC: 0, defaultServing: 150, servingUnit: 'cup' },
  { id: 'in091', name: 'Filter Coffee', hindi: 'फ़िल्टर कॉफ़ी', category: 'Beverages', calories: 75, protein: 2.5, carbs: 8, fat: 3.5, fiber: 0, iron: 0.1, calcium: 60, vitC: 0, defaultServing: 150, servingUnit: 'cup' },
  { id: 'in092', name: 'Nimbu Pani (lemon water)', hindi: 'नींबू पानी', category: 'Beverages', calories: 40, protein: 0.2, carbs: 10, fat: 0, fiber: 0, iron: 0.1, calcium: 5, vitC: 20, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in093', name: 'Mango Lassi', hindi: 'आम लस्सी', category: 'Beverages', calories: 140, protein: 4.0, carbs: 24, fat: 3.5, fiber: 0.5, iron: 0.2, calcium: 100, vitC: 15, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in094', name: 'Coconut Water', hindi: 'नारियल पानी', category: 'Beverages', calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2, fiber: 1.1, iron: 0.3, calcium: 24, vitC: 2.4, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in095', name: 'Aam Panna', hindi: 'आम पन्ना', category: 'Beverages', calories: 55, protein: 0.5, carbs: 14, fat: 0, fiber: 0.5, iron: 0.3, calcium: 8, vitC: 25, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in096', name: 'Jaljeera', hindi: 'जलजीरा', category: 'Beverages', calories: 25, protein: 0.5, carbs: 6, fat: 0, fiber: 0.3, iron: 0.5, calcium: 10, vitC: 5, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in097', name: 'Sugarcane Juice', hindi: 'गन्ने का रस', category: 'Beverages', calories: 75, protein: 0.3, carbs: 18, fat: 0, fiber: 0, iron: 0.3, calcium: 10, vitC: 3, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in098', name: 'Thandai', hindi: 'ठंडाई', category: 'Beverages', calories: 155, protein: 5.0, carbs: 20, fat: 6.5, fiber: 0.5, iron: 0.5, calcium: 120, vitC: 2, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in099', name: 'Badam Milk', hindi: 'बादाम दूध', category: 'Beverages', calories: 130, protein: 5.0, carbs: 16, fat: 5.5, fiber: 0.5, iron: 0.5, calcium: 140, vitC: 1, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in09a', name: 'Haldi Doodh (Turmeric Milk)', hindi: 'हल्दी दूध', category: 'Beverages', calories: 80, protein: 3.5, carbs: 8, fat: 4.0, fiber: 0, iron: 0.3, calcium: 125, vitC: 1, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in09b', name: 'Chai (plain)', hindi: 'चाय', category: 'Beverages', calories: 55, protein: 1.5, carbs: 8, fat: 2.0, fiber: 0, iron: 0.1, calcium: 40, vitC: 0, defaultServing: 150, servingUnit: 'cup' },
  { id: 'in09c', name: 'Black Coffee', hindi: 'ब्लैक कॉफ़ी', category: 'Beverages', calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, iron: 0, calcium: 2, vitC: 0, defaultServing: 150, servingUnit: 'cup' },
  { id: 'in09d', name: 'Green Tea', hindi: 'ग्रीन टी', category: 'Beverages', calories: 1, protein: 0.2, carbs: 0, fat: 0, fiber: 0, iron: 0, calcium: 1, vitC: 0, defaultServing: 150, servingUnit: 'cup' },
  { id: 'in09e', name: 'Kokum Sharbat', hindi: 'कोकम शरबत', category: 'Beverages', calories: 45, protein: 0.3, carbs: 11, fat: 0, fiber: 0.5, iron: 0.2, calcium: 5, vitC: 3, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in09f', name: 'Rose Sharbat', hindi: 'गुलाब शरबत', category: 'Beverages', calories: 65, protein: 0, carbs: 16, fat: 0, fiber: 0, iron: 0, calcium: 5, vitC: 2, defaultServing: 250, servingUnit: 'glass' },
  { id: 'in09g', name: 'Sol Kadhi', hindi: 'सोल कढ़ी', category: 'Beverages', calories: 70, protein: 1.0, carbs: 5, fat: 5.0, fiber: 0.5, iron: 0.5, calcium: 10, vitC: 3, defaultServing: 200, servingUnit: 'glass' },

  // ==========================================
  // === SOUTH INDIAN (25 items) ===
  // ==========================================
  { id: 'in100', name: 'Uttapam', hindi: 'उत्तपम', category: 'South Indian', calories: 155, protein: 4.5, carbs: 25, fat: 4.0, fiber: 2.0, iron: 1.2, calcium: 20, vitC: 5, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in101', name: 'Appam', hindi: 'अप्पम', category: 'South Indian', calories: 120, protein: 2.5, carbs: 22, fat: 2.5, fiber: 1.0, iron: 0.5, calcium: 10, vitC: 0, defaultServing: 60, servingUnit: 'piece' },
  { id: 'in102', name: 'Puttu', hindi: 'पुट्टू', category: 'South Indian', calories: 145, protein: 3.0, carbs: 28, fat: 2.5, fiber: 2.0, iron: 0.8, calcium: 15, vitC: 0, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in103', name: 'Avial', hindi: 'अवियल', category: 'South Indian', calories: 95, protein: 3.0, carbs: 8, fat: 6.0, fiber: 3.5, iron: 1.5, calcium: 35, vitC: 12, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in104', name: 'Kootu', hindi: 'कूटू', category: 'South Indian', calories: 90, protein: 5.0, carbs: 10, fat: 3.5, fiber: 3.5, iron: 1.8, calcium: 40, vitC: 8, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in105', name: 'Coconut Chutney', hindi: 'नारियल चटनी', category: 'South Indian', calories: 165, protein: 2.5, carbs: 6, fat: 15.0, fiber: 3.0, iron: 0.8, calcium: 10, vitC: 2, defaultServing: 30, servingUnit: 'tbsp' },
  { id: 'in134', name: 'Pongal', hindi: 'पोंगल', category: 'South Indian', calories: 140, protein: 5.0, carbs: 22, fat: 3.5, fiber: 2.0, iron: 1.2, calcium: 20, vitC: 1, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in106', name: 'Rava Dosa', hindi: 'रवा डोसा', category: 'South Indian', calories: 185, protein: 4.0, carbs: 26, fat: 7.5, fiber: 1.0, iron: 1.0, calcium: 18, vitC: 2, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in107', name: 'Pesarattu', hindi: 'पेसरट्टू', category: 'South Indian', calories: 135, protein: 7.0, carbs: 18, fat: 3.5, fiber: 3.0, iron: 1.5, calcium: 25, vitC: 3, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in108', name: 'Bisi Bele Bath', hindi: 'बिसि बेले बाथ', category: 'South Indian', calories: 165, protein: 6.0, carbs: 25, fat: 4.5, fiber: 3.0, iron: 2.0, calcium: 35, vitC: 5, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in109', name: 'Ven Pongal', hindi: 'वेन पोंगल', category: 'South Indian', calories: 155, protein: 5.5, carbs: 22, fat: 5.0, fiber: 2.0, iron: 1.5, calcium: 22, vitC: 1, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in10a', name: 'Idiyappam (String Hoppers)', hindi: 'इडियप्पम', category: 'South Indian', calories: 130, protein: 2.5, carbs: 28, fat: 0.5, fiber: 1.0, iron: 0.5, calcium: 10, vitC: 0, defaultServing: 80, servingUnit: 'serving' },
  { id: 'in10b', name: 'Tomato Rice', hindi: 'टोमैटो राइस', category: 'South Indian', calories: 160, protein: 3.5, carbs: 28, fat: 4.0, fiber: 1.0, iron: 0.8, calcium: 15, vitC: 8, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in10c', name: 'Tamarind Rice (Pulihora)', hindi: 'पुलिहोरा', category: 'South Indian', calories: 170, protein: 3.0, carbs: 30, fat: 4.5, fiber: 1.0, iron: 1.0, calcium: 15, vitC: 3, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in10d', name: 'Poriyal (dry veg)', hindi: 'पोरियल', category: 'South Indian', calories: 70, protein: 2.5, carbs: 6, fat: 4.0, fiber: 3.0, iron: 1.0, calcium: 30, vitC: 15, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in10e', name: 'Kuzhambu', hindi: 'कुझम्बु', category: 'South Indian', calories: 85, protein: 3.0, carbs: 10, fat: 4.0, fiber: 2.5, iron: 1.5, calcium: 35, vitC: 5, defaultServing: 150, servingUnit: 'bowl' },

  // ==========================================
  // === CHUTNEYS & SIDES (20 items) ===
  // ==========================================
  { id: 'in110', name: 'Mint Chutney', hindi: 'पुदीना चटनी', category: 'Sides', calories: 45, protein: 1.5, carbs: 5, fat: 2.0, fiber: 1.5, iron: 2.5, calcium: 30, vitC: 15, defaultServing: 20, servingUnit: 'tbsp' },
  { id: 'in111', name: 'Tamarind Chutney', hindi: 'इमली चटनी', category: 'Sides', calories: 130, protein: 0.5, carbs: 32, fat: 0.3, fiber: 1.0, iron: 1.0, calcium: 25, vitC: 3, defaultServing: 20, servingUnit: 'tbsp' },
  { id: 'in112', name: 'Pickle (mixed)', hindi: 'अचार', category: 'Sides', calories: 175, protein: 1.5, carbs: 8, fat: 15.0, fiber: 2.0, iron: 2.5, calcium: 20, vitC: 5, defaultServing: 10, servingUnit: 'tsp' },
  { id: 'in113', name: 'Papad (roasted)', hindi: 'पापड़', category: 'Sides', calories: 310, protein: 18.0, carbs: 45, fat: 5.0, fiber: 5.0, iron: 5.5, calcium: 45, vitC: 0, defaultServing: 15, servingUnit: 'piece' },
  { id: 'in114', name: 'Salad (Indian)', hindi: 'सलाद', category: 'Sides', calories: 25, protein: 1.0, carbs: 4, fat: 0.3, fiber: 1.5, iron: 0.5, calcium: 15, vitC: 15, defaultServing: 50, servingUnit: 'serving' },
  { id: 'in115', name: 'Tomato Chutney', hindi: 'टमाटर चटनी', category: 'Sides', calories: 55, protein: 1.0, carbs: 8, fat: 2.5, fiber: 1.0, iron: 0.5, calcium: 10, vitC: 10, defaultServing: 20, servingUnit: 'tbsp' },
  { id: 'in116', name: 'Onion Chutney', hindi: 'प्याज चटनी', category: 'Sides', calories: 50, protein: 1.0, carbs: 7, fat: 2.0, fiber: 1.0, iron: 0.3, calcium: 12, vitC: 5, defaultServing: 20, servingUnit: 'tbsp' },
  { id: 'in117', name: 'Peanut Chutney', hindi: 'मूंगफली चटनी', category: 'Sides', calories: 180, protein: 6.0, carbs: 8, fat: 15.0, fiber: 2.5, iron: 1.0, calcium: 25, vitC: 1, defaultServing: 20, servingUnit: 'tbsp' },
  { id: 'in118', name: 'Papad (fried)', hindi: 'तला पापड़', category: 'Sides', calories: 380, protein: 16.0, carbs: 42, fat: 16.0, fiber: 4.5, iron: 5.0, calcium: 42, vitC: 0, defaultServing: 15, servingUnit: 'piece' },
  { id: 'in119', name: 'Mango Pickle', hindi: 'आम का अचार', category: 'Sides', calories: 185, protein: 1.0, carbs: 10, fat: 16.0, fiber: 1.5, iron: 2.0, calcium: 15, vitC: 8, defaultServing: 10, servingUnit: 'tsp' },
  { id: 'in11a', name: 'Lemon Pickle', hindi: 'नींबू का अचार', category: 'Sides', calories: 120, protein: 1.0, carbs: 12, fat: 8.0, fiber: 2.0, iron: 1.5, calcium: 15, vitC: 15, defaultServing: 10, servingUnit: 'tsp' },
  { id: 'in11b', name: 'Coriander Chutney', hindi: 'धनिया चटनी', category: 'Sides', calories: 40, protein: 1.5, carbs: 4, fat: 2.0, fiber: 1.5, iron: 2.0, calcium: 25, vitC: 12, defaultServing: 20, servingUnit: 'tbsp' },
  { id: 'in11c', name: 'Garlic Chutney', hindi: 'लहसुन चटनी', category: 'Sides', calories: 85, protein: 2.0, carbs: 6, fat: 6.0, fiber: 1.0, iron: 0.5, calcium: 15, vitC: 3, defaultServing: 10, servingUnit: 'tsp' },

  // ==========================================
  // === FRUITS (40 items) ===
  // ==========================================
  { id: 'in200', name: 'Banana', hindi: 'केला', category: 'Fruits', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, iron: 0.3, calcium: 5, vitC: 8.7, defaultServing: 120, servingUnit: 'piece' },
  { id: 'in201', name: 'Apple', hindi: 'सेब', category: 'Fruits', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, iron: 0.1, calcium: 6, vitC: 4.6, defaultServing: 180, servingUnit: 'piece' },
  { id: 'in202', name: 'Mango', hindi: 'आम', category: 'Fruits', calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, iron: 0.2, calcium: 11, vitC: 36.4, defaultServing: 150, servingUnit: 'piece' },
  { id: 'in203', name: 'Papaya', hindi: 'पपीता', category: 'Fruits', calories: 43, protein: 0.5, carbs: 11, fat: 0.3, fiber: 1.7, iron: 0.3, calcium: 20, vitC: 60.9, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in204', name: 'Guava', hindi: 'अमरूद', category: 'Fruits', calories: 68, protein: 2.6, carbs: 14, fat: 1.0, fiber: 5.4, iron: 0.3, calcium: 18, vitC: 228, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in205', name: 'Chiku (Sapota)', hindi: 'चीकू', category: 'Fruits', calories: 83, protein: 0.4, carbs: 20, fat: 1.1, fiber: 5.3, iron: 0.8, calcium: 21, vitC: 14.7, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in208', name: 'Watermelon', hindi: 'तरबूज', category: 'Fruits', calories: 30, protein: 0.6, carbs: 8, fat: 0.2, fiber: 0.4, iron: 0.2, calcium: 7, vitC: 8.1, defaultServing: 200, servingUnit: 'slice' },
  { id: 'in209', name: 'Pomegranate', hindi: 'अनार', category: 'Fruits', calories: 83, protein: 1.7, carbs: 19, fat: 1.2, fiber: 4.0, iron: 0.3, calcium: 10, vitC: 10.2, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in20a', name: 'Orange', hindi: 'संतरा', category: 'Fruits', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, iron: 0.1, calcium: 40, vitC: 53.2, defaultServing: 150, servingUnit: 'piece' },
  { id: 'in20b', name: 'Grapes', hindi: 'अंगूर', category: 'Fruits', calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9, iron: 0.4, calcium: 10, vitC: 3.2, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in20c', name: 'Pineapple', hindi: 'अनानास', category: 'Fruits', calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4, iron: 0.3, calcium: 13, vitC: 47.8, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in20d', name: 'Litchi', hindi: 'लीची', category: 'Fruits', calories: 66, protein: 0.8, carbs: 17, fat: 0.4, fiber: 1.3, iron: 0.3, calcium: 5, vitC: 71.5, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in20e', name: 'Jamun (Indian Blackberry)', hindi: 'जामुन', category: 'Fruits', calories: 62, protein: 0.7, carbs: 16, fat: 0.2, fiber: 0.9, iron: 0.2, calcium: 19, vitC: 14, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in20f', name: 'Pear', hindi: 'नाशपाती', category: 'Fruits', calories: 57, protein: 0.4, carbs: 15, fat: 0.1, fiber: 3.1, iron: 0.2, calcium: 9, vitC: 4.3, defaultServing: 160, servingUnit: 'piece' },
  { id: 'in20g', name: 'Custard Apple (Sitaphal)', hindi: 'सीताफल', category: 'Fruits', calories: 94, protein: 2.1, carbs: 24, fat: 0.3, fiber: 3.0, iron: 0.6, calcium: 24, vitC: 19.2, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in20h', name: 'Jackfruit (ripe)', hindi: 'कटहल (पका)', category: 'Fruits', calories: 95, protein: 1.7, carbs: 24, fat: 0.6, fiber: 1.5, iron: 0.2, calcium: 24, vitC: 6.7, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in20i', name: 'Dates (Khajoor)', hindi: 'खजूर', category: 'Fruits', calories: 277, protein: 1.8, carbs: 75, fat: 0.2, fiber: 7.0, iron: 1.0, calcium: 39, vitC: 0, defaultServing: 20, servingUnit: 'piece' },
  { id: 'in20j', name: 'Raisins (Kishmish)', hindi: 'किशमिश', category: 'Fruits', calories: 299, protein: 3.1, carbs: 79, fat: 0.5, fiber: 3.7, iron: 1.9, calcium: 50, vitC: 2.3, defaultServing: 15, servingUnit: 'tbsp' },
  { id: 'in20k', name: 'Fig (dried)', hindi: 'अंजीर', category: 'Fruits', calories: 249, protein: 3.3, carbs: 64, fat: 1.0, fiber: 10.0, iron: 2.0, calcium: 162, vitC: 1, defaultServing: 20, servingUnit: 'piece' },
  { id: 'in20l', name: 'Coconut (fresh)', hindi: 'नारियल (ताजा)', category: 'Fruits', calories: 354, protein: 3.3, carbs: 15, fat: 33.5, fiber: 9.0, iron: 2.4, calcium: 14, vitC: 3, defaultServing: 30, servingUnit: 'piece' },
  { id: 'in20m', name: 'Amla (Indian Gooseberry)', hindi: 'आंवला', category: 'Fruits', calories: 44, protein: 0.9, carbs: 10, fat: 0.6, fiber: 4.3, iron: 0.3, calcium: 25, vitC: 600, defaultServing: 30, servingUnit: 'piece' },
  { id: 'in20n', name: 'Strawberry', hindi: 'स्ट्रॉबेरी', category: 'Fruits', calories: 32, protein: 0.7, carbs: 8, fat: 0.3, fiber: 2.0, iron: 0.4, calcium: 16, vitC: 58.8, defaultServing: 100, servingUnit: 'bowl' },
  { id: 'in20o', name: 'Kiwi', hindi: 'कीवी', category: 'Fruits', calories: 61, protein: 1.1, carbs: 15, fat: 0.5, fiber: 3.0, iron: 0.3, calcium: 34, vitC: 92.7, defaultServing: 75, servingUnit: 'piece' },
  { id: 'in20p', name: 'Plum (Aloo Bukhara)', hindi: 'आलू बुखारा', category: 'Fruits', calories: 46, protein: 0.7, carbs: 11, fat: 0.3, fiber: 1.4, iron: 0.2, calcium: 6, vitC: 9.5, defaultServing: 60, servingUnit: 'piece' },
  { id: 'in20q', name: 'Muskmelon', hindi: 'खरबूजा', category: 'Fruits', calories: 34, protein: 0.8, carbs: 8, fat: 0.2, fiber: 0.9, iron: 0.2, calcium: 9, vitC: 36.7, defaultServing: 200, servingUnit: 'slice' },
  { id: 'in20r', name: 'Peach', hindi: 'आड़ू', category: 'Fruits', calories: 39, protein: 0.9, carbs: 10, fat: 0.3, fiber: 1.5, iron: 0.3, calcium: 6, vitC: 6.6, defaultServing: 100, servingUnit: 'piece' },
  { id: 'in20s', name: 'Bael Fruit', hindi: 'बेल', category: 'Fruits', calories: 137, protein: 1.8, carbs: 32, fat: 0.3, fiber: 2.9, iron: 0.6, calcium: 85, vitC: 60, defaultServing: 100, servingUnit: 'piece' },

  // ==========================================
  // === NUTS & SEEDS (20 items) ===
  // ==========================================
  { id: 'in300', name: 'Almonds (Badam)', hindi: 'बादाम', category: 'Nuts & Seeds', calories: 576, protein: 21.2, carbs: 22, fat: 49.4, fiber: 12.2, iron: 3.7, calcium: 264, vitC: 0, defaultServing: 10, servingUnit: 'piece' },
  { id: 'in301', name: 'Cashew (Kaju)', hindi: 'काजू', category: 'Nuts & Seeds', calories: 553, protein: 18.2, carbs: 30, fat: 43.9, fiber: 3.3, iron: 6.7, calcium: 37, vitC: 0, defaultServing: 10, servingUnit: 'piece' },
  { id: 'in302', name: 'Walnuts (Akhrot)', hindi: 'अखरोट', category: 'Nuts & Seeds', calories: 654, protein: 15.2, carbs: 14, fat: 65.2, fiber: 6.7, iron: 2.9, calcium: 98, vitC: 1.3, defaultServing: 15, servingUnit: 'piece' },
  { id: 'in303', name: 'Peanuts (Mungfali)', hindi: 'मूंगफली', category: 'Nuts & Seeds', calories: 567, protein: 25.8, carbs: 16, fat: 49.2, fiber: 8.5, iron: 4.6, calcium: 92, vitC: 0, defaultServing: 20, servingUnit: 'serving' },
  { id: 'in304', name: 'Pistachios (Pista)', hindi: 'पिस्ता', category: 'Nuts & Seeds', calories: 560, protein: 20.2, carbs: 28, fat: 45.3, fiber: 10.3, iron: 3.9, calcium: 105, vitC: 5.6, defaultServing: 10, servingUnit: 'serving' },
  { id: 'in305', name: 'Flax Seeds (Alsi)', hindi: 'अलसी', category: 'Nuts & Seeds', calories: 534, protein: 18.3, carbs: 29, fat: 42.2, fiber: 27.3, iron: 5.7, calcium: 255, vitC: 0.6, defaultServing: 10, servingUnit: 'tbsp' },
  { id: 'in306', name: 'Chia Seeds', hindi: 'चिया बीज', category: 'Nuts & Seeds', calories: 486, protein: 16.5, carbs: 42, fat: 30.7, fiber: 34.4, iron: 7.7, calcium: 631, vitC: 1.6, defaultServing: 10, servingUnit: 'tbsp' },
  { id: 'in307', name: 'Sunflower Seeds', hindi: 'सूरजमुखी बीज', category: 'Nuts & Seeds', calories: 584, protein: 20.8, carbs: 20, fat: 51.5, fiber: 8.6, iron: 5.3, calcium: 78, vitC: 1.4, defaultServing: 15, servingUnit: 'tbsp' },
  { id: 'in308', name: 'Pumpkin Seeds (Kaddu Beej)', hindi: 'कद्दू बीज', category: 'Nuts & Seeds', calories: 559, protein: 30.2, carbs: 11, fat: 49.1, fiber: 6.0, iron: 8.8, calcium: 46, vitC: 1.9, defaultServing: 15, servingUnit: 'tbsp' },
  { id: 'in309', name: 'Sesame Seeds (Til)', hindi: 'तिल', category: 'Nuts & Seeds', calories: 573, protein: 17.7, carbs: 23, fat: 49.7, fiber: 11.8, iron: 14.6, calcium: 975, vitC: 0, defaultServing: 10, servingUnit: 'tbsp' },
  { id: 'in30a', name: 'Desiccated Coconut', hindi: 'सूखा नारियल', category: 'Nuts & Seeds', calories: 660, protein: 6.9, carbs: 24, fat: 64.5, fiber: 16.3, iron: 3.3, calcium: 26, vitC: 0, defaultServing: 10, servingUnit: 'tbsp' },
  { id: 'in30b', name: 'Dry Fruits Mix (trail mix)', hindi: 'ड्राई फ्रूट मिक्स', category: 'Nuts & Seeds', calories: 480, protein: 14.0, carbs: 40, fat: 30.0, fiber: 6.0, iron: 3.0, calcium: 80, vitC: 1, defaultServing: 30, servingUnit: 'serving' },

  // ==========================================
  // === OILS & FATS (10 items) ===
  // ==========================================
  { id: 'in400', name: 'Mustard Oil', hindi: 'सरसों का तेल', category: 'Oils', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, calcium: 0, vitC: 0, defaultServing: 5, servingUnit: 'tsp' },
  { id: 'in401', name: 'Coconut Oil', hindi: 'नारियल तेल', category: 'Oils', calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, calcium: 0, vitC: 0, defaultServing: 5, servingUnit: 'tsp' },
  { id: 'in402', name: 'Groundnut Oil', hindi: 'मूंगफली तेल', category: 'Oils', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, calcium: 0, vitC: 0, defaultServing: 5, servingUnit: 'tsp' },
  { id: 'in403', name: 'Sunflower Oil', hindi: 'सूरजमुखी तेल', category: 'Oils', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, calcium: 0, vitC: 0, defaultServing: 5, servingUnit: 'tsp' },
  { id: 'in404', name: 'Sesame Oil (Til Oil)', hindi: 'तिल तेल', category: 'Oils', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, calcium: 0, vitC: 0, defaultServing: 5, servingUnit: 'tsp' },
  { id: 'in405', name: 'Olive Oil', hindi: 'जैतून तेल', category: 'Oils', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, calcium: 0, vitC: 0, defaultServing: 5, servingUnit: 'tsp' },

  // ==========================================
  // === SPICES & CONDIMENTS (20 items) ===
  // ==========================================
  { id: 'in500', name: 'Turmeric Powder (Haldi)', hindi: 'हल्दी', category: 'Spices', calories: 312, protein: 9.7, carbs: 67, fat: 3.3, fiber: 22.7, iron: 55.0, calcium: 168, vitC: 0, defaultServing: 3, servingUnit: 'tsp' },
  { id: 'in501', name: 'Red Chili Powder', hindi: 'लाल मिर्च', category: 'Spices', calories: 282, protein: 13.5, carbs: 50, fat: 6.2, fiber: 34.8, iron: 14.3, calcium: 129, vitC: 76, defaultServing: 3, servingUnit: 'tsp' },
  { id: 'in502', name: 'Cumin Seeds (Jeera)', hindi: 'जीरा', category: 'Spices', calories: 375, protein: 17.8, carbs: 44, fat: 22.3, fiber: 10.5, iron: 66.4, calcium: 931, vitC: 7.7, defaultServing: 3, servingUnit: 'tsp' },
  { id: 'in503', name: 'Coriander Powder (Dhaniya)', hindi: 'धनिया', category: 'Spices', calories: 298, protein: 12.4, carbs: 55, fat: 4.8, fiber: 41.9, iron: 16.3, calcium: 709, vitC: 21, defaultServing: 3, servingUnit: 'tsp' },
  { id: 'in504', name: 'Garam Masala', hindi: 'गरम मसाला', category: 'Spices', calories: 350, protein: 12.0, carbs: 50, fat: 12.0, fiber: 15.0, iron: 15.0, calcium: 300, vitC: 5, defaultServing: 3, servingUnit: 'tsp' },
  { id: 'in505', name: 'Ginger (Adrak)', hindi: 'अदरक', category: 'Spices', calories: 80, protein: 1.8, carbs: 18, fat: 0.8, fiber: 2.0, iron: 0.6, calcium: 16, vitC: 5, defaultServing: 5, servingUnit: 'piece' },
  { id: 'in506', name: 'Garlic (Lahsun)', hindi: 'लहसुन', category: 'Spices', calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, iron: 1.7, calcium: 181, vitC: 31, defaultServing: 5, servingUnit: 'clove' },
  { id: 'in507', name: 'Green Chili', hindi: 'हरी मिर्च', category: 'Spices', calories: 40, protein: 2.0, carbs: 9, fat: 0.2, fiber: 1.5, iron: 1.2, calcium: 18, vitC: 242, defaultServing: 5, servingUnit: 'piece' },
  { id: 'in508', name: 'Mustard Seeds (Rai)', hindi: 'राई', category: 'Spices', calories: 508, protein: 26.1, carbs: 28, fat: 36.2, fiber: 12.2, iron: 9.2, calcium: 266, vitC: 0, defaultServing: 3, servingUnit: 'tsp' },
  { id: 'in509', name: 'Fenugreek Seeds (Methi)', hindi: 'मेथी दाना', category: 'Spices', calories: 323, protein: 23.0, carbs: 58, fat: 6.4, fiber: 25.0, iron: 33.5, calcium: 176, vitC: 3, defaultServing: 3, servingUnit: 'tsp' },
  { id: 'in50a', name: 'Black Pepper', hindi: 'काली मिर्च', category: 'Spices', calories: 251, protein: 10.4, carbs: 64, fat: 3.3, fiber: 25.3, iron: 9.7, calcium: 443, vitC: 0, defaultServing: 2, servingUnit: 'tsp' },
  { id: 'in50b', name: 'Cinnamon (Dalchini)', hindi: 'दालचीनी', category: 'Spices', calories: 247, protein: 4.0, carbs: 81, fat: 1.2, fiber: 53.1, iron: 8.3, calcium: 1002, vitC: 3.8, defaultServing: 2, servingUnit: 'piece' },
  { id: 'in50c', name: 'Cardamom (Elaichi)', hindi: 'इलायची', category: 'Spices', calories: 311, protein: 10.8, carbs: 68, fat: 6.7, fiber: 28.0, iron: 14.0, calcium: 383, vitC: 21, defaultServing: 1, servingUnit: 'piece' },
  { id: 'in50d', name: 'Sugar (white)', hindi: 'चीनी', category: 'Spices', calories: 387, protein: 0, carbs: 100, fat: 0, fiber: 0, iron: 0, calcium: 1, vitC: 0, defaultServing: 5, servingUnit: 'tsp' },
  { id: 'in50e', name: 'Jaggery (Gur)', hindi: 'गुड़', category: 'Spices', calories: 383, protein: 0.4, carbs: 98, fat: 0.1, fiber: 0, iron: 11.0, calcium: 80, vitC: 0, defaultServing: 10, servingUnit: 'piece' },
  { id: 'in50f', name: 'Honey (Shahad)', hindi: 'शहद', category: 'Spices', calories: 304, protein: 0.3, carbs: 82, fat: 0, fiber: 0.2, iron: 0.4, calcium: 6, vitC: 0.5, defaultServing: 10, servingUnit: 'tsp' },

  // ==========================================
  // === THALI COMPONENTS (10 items) ===
  // ==========================================
  { id: 'in120', name: 'Plain Rice', hindi: 'सादा चावल', category: 'Cereals', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, iron: 0.2, calcium: 10, vitC: 0, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in121', name: 'Jeera Rice', hindi: 'जीरा चावल', category: 'Cereals', calories: 160, protein: 3.0, carbs: 28, fat: 3.8, fiber: 0.5, iron: 0.5, calcium: 15, vitC: 0, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in122', name: 'Lemon Rice', hindi: 'नींबू चावल', category: 'Cereals', calories: 165, protein: 3.2, carbs: 29, fat: 4.0, fiber: 0.5, iron: 0.5, calcium: 12, vitC: 5, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in123', name: 'Curd Rice', hindi: 'दही चावल', category: 'Cereals', calories: 145, protein: 4.0, carbs: 25, fat: 3.0, fiber: 0.4, iron: 0.3, calcium: 80, vitC: 1, defaultServing: 200, servingUnit: 'bowl' },

  // ==========================================
  // === BREAKFAST ITEMS (15 items) ===
  // ==========================================
  { id: 'in130', name: 'Aloo Paratha', hindi: 'आलू पराठा', category: 'Cereals', calories: 300, protein: 6.5, carbs: 40, fat: 13.0, fiber: 3.5, iron: 2.8, calcium: 35, vitC: 5, defaultServing: 80, servingUnit: 'piece' },
  { id: 'in131', name: 'Gobi Paratha', hindi: 'गोभी पराठा', category: 'Cereals', calories: 280, protein: 7.0, carbs: 38, fat: 11.5, fiber: 4.0, iron: 3.0, calcium: 40, vitC: 15, defaultServing: 80, servingUnit: 'piece' },
  { id: 'in132', name: 'Thepla', hindi: 'थेपला', category: 'Cereals', calories: 250, protein: 7.5, carbs: 35, fat: 9.5, fiber: 4.5, iron: 3.5, calcium: 55, vitC: 5, defaultServing: 50, servingUnit: 'piece' },

  // ==========================================
  // === FAST FOOD / CHINESE (20 items) ===
  // ==========================================
  { id: 'in600', name: 'Veg Fried Rice', hindi: 'वेज फ्राइड राइस', category: 'Fast Food', calories: 155, protein: 3.5, carbs: 26, fat: 4.0, fiber: 1.5, iron: 0.8, calcium: 15, vitC: 5, defaultServing: 250, servingUnit: 'plate' },
  { id: 'in601', name: 'Veg Noodles', hindi: 'वेज नूडल्स', category: 'Fast Food', calories: 170, protein: 4.0, carbs: 28, fat: 5.0, fiber: 2.0, iron: 1.0, calcium: 15, vitC: 5, defaultServing: 250, servingUnit: 'plate' },
  { id: 'in602', name: 'Chicken Noodles', hindi: 'चिकन नूडल्स', category: 'Fast Food', calories: 185, protein: 10.0, carbs: 26, fat: 5.5, fiber: 1.5, iron: 1.2, calcium: 18, vitC: 3, defaultServing: 250, servingUnit: 'plate' },
  { id: 'in603', name: 'Manchurian (veg)', hindi: 'वेज मंचूरियन', category: 'Fast Food', calories: 185, protein: 3.5, carbs: 20, fat: 10.0, fiber: 2.0, iron: 1.0, calcium: 25, vitC: 10, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in604', name: 'Spring Roll (veg)', hindi: 'स्प्रिंग रोल', category: 'Fast Food', calories: 245, protein: 4.0, carbs: 28, fat: 13.0, fiber: 1.5, iron: 1.0, calcium: 15, vitC: 3, defaultServing: 60, servingUnit: 'piece' },
  { id: 'in605', name: 'Paneer Chilli', hindi: 'पनीर चिली', category: 'Fast Food', calories: 230, protein: 12.0, carbs: 12, fat: 16.0, fiber: 1.5, iron: 1.5, calcium: 250, vitC: 15, defaultServing: 150, servingUnit: 'bowl' },
  { id: 'in606', name: 'Schezwan Fried Rice', hindi: 'शेजवान फ्राइड राइस', category: 'Fast Food', calories: 175, protein: 4.0, carbs: 28, fat: 5.5, fiber: 1.5, iron: 1.0, calcium: 12, vitC: 5, defaultServing: 250, servingUnit: 'plate' },
  { id: 'in607', name: 'Burger (veg)', hindi: 'वेज बर्गर', category: 'Fast Food', calories: 280, protein: 8.0, carbs: 35, fat: 12.0, fiber: 2.5, iron: 2.0, calcium: 30, vitC: 5, defaultServing: 150, servingUnit: 'piece' },
  { id: 'in608', name: 'Burger (chicken)', hindi: 'चिकन बर्गर', category: 'Fast Food', calories: 310, protein: 15.0, carbs: 32, fat: 14.0, fiber: 2.0, iron: 2.5, calcium: 25, vitC: 3, defaultServing: 180, servingUnit: 'piece' },
  { id: 'in609', name: 'Pizza (veg, 1 slice)', hindi: 'पिज़्ज़ा', category: 'Fast Food', calories: 266, protein: 10.0, carbs: 33, fat: 10.0, fiber: 2.0, iron: 1.5, calcium: 120, vitC: 5, defaultServing: 100, servingUnit: 'slice' },
  { id: 'in60a', name: 'French Fries', hindi: 'फ्रेंच फ्राइज़', category: 'Fast Food', calories: 312, protein: 3.4, carbs: 41, fat: 15.0, fiber: 3.5, iron: 0.8, calcium: 12, vitC: 5, defaultServing: 100, servingUnit: 'serving' },
  { id: 'in60b', name: 'Maggi Noodles (cooked)', hindi: 'मैगी', category: 'Fast Food', calories: 188, protein: 4.5, carbs: 26, fat: 7.5, fiber: 1.0, iron: 2.5, calcium: 15, vitC: 0, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in60c', name: 'Pasta (red sauce)', hindi: 'पास्ता', category: 'Fast Food', calories: 160, protein: 5.5, carbs: 28, fat: 3.5, fiber: 2.0, iron: 1.5, calcium: 20, vitC: 8, defaultServing: 200, servingUnit: 'bowl' },
  { id: 'in60d', name: 'Sandwich (veg)', hindi: 'सैंडविच', category: 'Fast Food', calories: 235, protein: 7.0, carbs: 28, fat: 10.0, fiber: 2.5, iron: 1.5, calcium: 50, vitC: 5, defaultServing: 120, servingUnit: 'piece' },
  { id: 'in60e', name: 'Grilled Sandwich', hindi: 'ग्रिल्ड सैंडविच', category: 'Fast Food', calories: 270, protein: 8.0, carbs: 28, fat: 14.0, fiber: 2.0, iron: 1.5, calcium: 80, vitC: 5, defaultServing: 130, servingUnit: 'piece' },
  { id: 'in60f', name: 'Dahi Vada', hindi: 'दही वड़ा', category: 'Fast Food', calories: 175, protein: 6.0, carbs: 22, fat: 7.0, fiber: 2.5, iron: 1.5, calcium: 70, vitC: 3, defaultServing: 100, servingUnit: 'serving' },

  // ==========================================
  // === PICKLES & PRESERVES (5 items) ===
  // ==========================================
  { id: 'in700', name: 'Chilli Pickle', hindi: 'मिर्च का अचार', category: 'Sides', calories: 160, protein: 2.0, carbs: 8, fat: 13.0, fiber: 2.0, iron: 2.0, calcium: 15, vitC: 30, defaultServing: 10, servingUnit: 'tsp' },
  { id: 'in701', name: 'Garlic Pickle', hindi: 'लहसुन का अचार', category: 'Sides', calories: 170, protein: 2.5, carbs: 10, fat: 13.0, fiber: 1.5, iron: 1.5, calcium: 20, vitC: 5, defaultServing: 10, servingUnit: 'tsp' },
  { id: 'in702', name: 'Murabba (Amla)', hindi: 'आंवला मुरब्बा', category: 'Sides', calories: 210, protein: 0.5, carbs: 52, fat: 0.2, fiber: 1.5, iron: 0.5, calcium: 20, vitC: 150, defaultServing: 30, servingUnit: 'piece' },

  // ==========================================
  // === PROTEIN ITEMS (10 items) ===
  // ==========================================
  { id: 'in800', name: 'Soy Chunks (cooked)', hindi: 'सोया चंक्स', category: 'Protein', calories: 345, protein: 52.0, carbs: 33, fat: 0.5, fiber: 13.0, iron: 20.0, calcium: 350, vitC: 0, defaultServing: 30, servingUnit: 'bowl', allergens: ['soy'] },
  { id: 'in801', name: 'Tofu', hindi: 'टोफू', category: 'Protein', calories: 76, protein: 8.0, carbs: 1.9, fat: 4.8, fiber: 0.3, iron: 5.4, calcium: 350, vitC: 0, defaultServing: 100, servingUnit: 'piece', allergens: ['soy'] },
  { id: 'in802', name: 'Soy Milk', hindi: 'सोया दूध', category: 'Protein', calories: 54, protein: 3.3, carbs: 6, fat: 1.8, fiber: 0.6, iron: 0.6, calcium: 25, vitC: 0, defaultServing: 250, servingUnit: 'glass', allergens: ['soy'] },
  { id: 'in803', name: 'Whey Protein (scoop)', hindi: 'व्हे प्रोटीन', category: 'Protein', calories: 120, protein: 24.0, carbs: 3, fat: 1.0, fiber: 0, iron: 0.5, calcium: 100, vitC: 0, defaultServing: 30, servingUnit: 'scoop', allergens: ['dairy'] },
  { id: 'in804', name: 'Tempeh', hindi: 'टेम्पे', category: 'Protein', calories: 192, protein: 20.3, carbs: 8, fat: 11.0, fiber: 7.0, iron: 2.7, calcium: 111, vitC: 0, defaultServing: 100, servingUnit: 'serving', allergens: ['soy'] },
];

// Search function that matches across name, hindi name, and category
export function searchIndianFoods(query: string): IndianFood[] {
  if (!query.trim()) return INDIAN_FOODS.slice(0, 20);
  const q = query.toLowerCase().trim();
  
  const scored = INDIAN_FOODS.map(food => {
    const name = food.name.toLowerCase();
    const hindi = food.hindi.toLowerCase();
    const cat = food.category.toLowerCase();
    
    let score = 0;
    if (name === q || hindi === q) score = 100;
    else if (name.startsWith(q) || hindi.startsWith(q)) score = 80;
    else if (name.includes(q) || hindi.includes(q)) score = 60;
    else if (cat.includes(q)) score = 30;
    else {
      // fuzzy: check each word
      const words = q.split(/\s+/);
      const matches = words.filter(w => name.includes(w) || hindi.includes(w) || cat.includes(w));
      score = (matches.length / words.length) * 50;
    }
    return { food, score };
  }).filter(r => r.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.map(r => r.food).slice(0, 20);
}

// Get foods rich in specific nutrient
export function getFoodsRichIn(nutrient: 'protein' | 'iron' | 'calcium' | 'fiber' | 'vitC', limit = 10): IndianFood[] {
  return [...INDIAN_FOODS]
    .sort((a, b) => b[nutrient] - a[nutrient])
    .slice(0, limit);
}

// Convert Indian food to FoodItem format (for store)
// Returns nutrition for ONE serving (1 piece, 1 bowl, etc.)
// quantity=1 means 1 serving. The UI multiplies calories*quantity.
export function indianFoodToFoodItem(food: IndianFood, servingMultiplier?: number) {
  const unitOpts = getUnitOptionsForFood(food.id, food.category, food.defaultServing, food.servingUnit);
  const grams = food.defaultServing;
  const factor = grams / 100;
  const unitOptions = unitOpts;
  return {
    id: food.id,
    name: food.name,
    calories: Math.round(food.calories * factor),
    protein: +(food.protein * factor).toFixed(1),
    carbs: +(food.carbs * factor).toFixed(1),
    fat: +(food.fat * factor).toFixed(1),
    fiber: +(food.fiber * factor).toFixed(1),
    quantity: servingMultiplier || 1,
    unit: food.servingUnit || 'serving',
    estimatedWeightGrams: grams,
    per100g: {
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
    },
    unitOptions,
  };
}

/** Get a food by exact ID */
export function getFoodById(id: string): IndianFood | undefined {
  return INDIAN_FOODS.find(f => f.id === id);
}

/** Get a food by name (case-insensitive, partial match) */
export function getFoodByName(name: string): IndianFood | undefined {
  const q = name.toLowerCase().trim();
  return INDIAN_FOODS.find(f => f.name.toLowerCase() === q) ||
         INDIAN_FOODS.find(f => f.name.toLowerCase().includes(q)) ||
         INDIAN_FOODS.find(f => f.hindi.toLowerCase().includes(q));
}

/** 
 * Calculate nutrition for a specific quantity in grams.
 * Returns scaled nutrition data for the given food and weight.
 */
export function getNutritionForQuantity(foodName: string, quantityGrams: number) {
  const food = getFoodByName(foodName);
  if (!food) return null;
  const factor = quantityGrams / 100;
  return {
    food: food.name,
    hindi: food.hindi,
    category: food.category,
    quantity: quantityGrams,
    unit: 'g',
    nutrients: {
      calories: Math.round(food.calories * factor),
      protein: +(food.protein * factor).toFixed(1),
      carbs: +(food.carbs * factor).toFixed(1),
      fat: +(food.fat * factor).toFixed(1),
      fiber: +(food.fiber * factor).toFixed(1),
      iron: +(food.iron * factor).toFixed(2),
      calcium: +(food.calcium * factor).toFixed(1),
      vitC: +(food.vitC * factor).toFixed(1),
    },
  };
}

/** Get all unique categories */
export function getCategories(): string[] {
  return [...new Set(INDIAN_FOODS.map(f => f.category))];
}

/** Get foods by category */
export function getFoodsByCategory(category: string): IndianFood[] {
  return INDIAN_FOODS.filter(f => f.category.toLowerCase() === category.toLowerCase());
}

// ─── Merge INDB foods, skipping duplicates by normalized name ───
const existingNames = new Set(INDIAN_FOODS.map(f => f.name.toLowerCase().replace(/\s*\(indb\)\s*/i, '').replace(/\s*\(ifct\)\s*/i, '').trim()));

for (const food of INDB_FOODS) {
  const normalizedName = food.name.toLowerCase().replace(/\s*\(indb\)\s*/i, '').replace(/\s*\(ifct\)\s*/i, '').trim();
  if (!existingNames.has(normalizedName)) {
    INDIAN_FOODS.push({ ...food, name: food.name.replace(/\s*\(INDB\)\s*/i, '').trim() });
    existingNames.add(normalizedName);
  }
}

/** Total count of foods in database */
export const FOOD_COUNT = INDIAN_FOODS.length;
