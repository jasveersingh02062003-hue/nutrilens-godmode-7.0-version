import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSourceEmoji,
  getSourceLabel,
  getCookingMethodEmoji,
  getCookingMethodLabel,
  COOKING_METHODS,
  learnCookingMethod,
  getDefaultCookingMethod,
} from '@/lib/context-learning';

describe('Context Learning - Source helpers', () => {
  it('returns correct emoji for each source category', () => {
    expect(getSourceEmoji('home')).toBe('🏠');
    expect(getSourceEmoji('restaurant')).toBe('🍽️');
    expect(getSourceEmoji('street_food')).toBe('🛺');
    expect(getSourceEmoji('packaged')).toBe('📦');
    expect(getSourceEmoji('fast_food')).toBe('🍔');
    expect(getSourceEmoji('office')).toBe('💼');
    expect(getSourceEmoji('friends')).toBe('👥');
    expect(getSourceEmoji('other')).toBe('📌');
  });

  it('returns correct label for each source category', () => {
    expect(getSourceLabel('home')).toBe('Home');
    expect(getSourceLabel('restaurant')).toBe('Restaurant');
    expect(getSourceLabel('street_food')).toBe('Street Food');
    expect(getSourceLabel('packaged')).toBe('Packaged');
  });
});

describe('Context Learning - Cooking Method helpers', () => {
  it('has 7 cooking method options', () => {
    expect(COOKING_METHODS).toHaveLength(7);
  });

  it('returns correct emoji for cooking methods', () => {
    expect(getCookingMethodEmoji('fried')).toBe('🍟');
    expect(getCookingMethodEmoji('grilled')).toBe('🍖');
    expect(getCookingMethodEmoji('boiled_steamed')).toBe('💧');
    expect(getCookingMethodEmoji('raw')).toBe('🥕');
    expect(getCookingMethodEmoji('air_fried')).toBe('🔥');
    expect(getCookingMethodEmoji('baked')).toBe('🍪');
    expect(getCookingMethodEmoji('sauteed')).toBe('🍳');
  });

  it('returns correct label for cooking methods', () => {
    expect(getCookingMethodLabel('fried')).toBe('Fried');
    expect(getCookingMethodLabel('grilled')).toBe('Grilled');
    expect(getCookingMethodLabel('boiled_steamed')).toBe('Boiled / Steamed');
    expect(getCookingMethodLabel('sauteed')).toBe('Sautéed');
    expect(getCookingMethodLabel('raw')).toBe('Raw');
  });
});

describe('Context Learning - Cooking Method Learning', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no cooking prefs exist', () => {
    expect(getDefaultCookingMethod(['Chicken Breast'])).toBeNull();
  });

  it('learns and returns default cooking method after 2+ entries', () => {
    learnCookingMethod(['Chicken Breast'], 'grilled');
    // After 1 entry, threshold not met
    expect(getDefaultCookingMethod(['Chicken Breast'])).toBeNull();

    learnCookingMethod(['Chicken Breast'], 'grilled');
    // After 2 entries with same method, should return it
    expect(getDefaultCookingMethod(['Chicken Breast'])).toBe('grilled');
  });

  it('returns the most common method when multiple exist', () => {
    learnCookingMethod(['Egg Omelette'], 'sauteed');
    learnCookingMethod(['Egg Omelette'], 'sauteed');
    learnCookingMethod(['Egg Omelette'], 'fried');
    expect(getDefaultCookingMethod(['Egg Omelette'])).toBe('sauteed');
  });

  it('handles case-insensitive food names', () => {
    learnCookingMethod(['PANEER TIKKA'], 'grilled');
    learnCookingMethod(['paneer tikka'], 'grilled');
    expect(getDefaultCookingMethod(['Paneer Tikka'])).toBe('grilled');
  });

  it('aggregates across multiple food items', () => {
    learnCookingMethod(['Rice'], 'boiled_steamed');
    learnCookingMethod(['Dal'], 'boiled_steamed');
    learnCookingMethod(['Rice'], 'boiled_steamed');
    // "Rice" has 2 counts of boiled_steamed, enough
    expect(getDefaultCookingMethod(['Rice', 'Dal'])).toBe('boiled_steamed');
  });
});

describe('Store - MealEntry cooking method field', () => {
  it('CookingMethod type includes all expected values', () => {
    const validMethods = ['fried', 'air_fried', 'grilled', 'baked', 'boiled_steamed', 'sauteed', 'raw'];
    for (const method of validMethods) {
      expect(getCookingMethodLabel(method as any)).toBeTruthy();
    }
  });
});
